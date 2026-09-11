#!/usr/bin/env bash
# ==============================================================================
# SaNDS Lab Parking Solution - 1-Click Cloud VPS Auto-Installer
# Target OS: Ubuntu 22.04 / 24.04 LTS or Debian 11 / 12
# ==============================================================================

set -e

echo "==============================================================================="
echo "       SaNDS Lab Smart Parking System - Cloud Production Setup"
echo "==============================================================================="

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo "[!] Non-root user detected. If you are on cPanel / shared hosting (e.g., parking.sandslab.com):"
  echo "    Running cPanel auto-setup instead..."
  echo ""
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "${SCRIPT_DIR}/cpanel_setup.sh" ]; then
      exec bash "${SCRIPT_DIR}/cpanel_setup.sh"
  fi
  echo "[-] For dedicated Ubuntu/Debian VPS, please run with sudo: sudo bash cloud_setup.sh"
  exit 1
fi

# 2. Update System Packages
echo "[+] Updating apt repositories..."
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git unzip software-properties-common ufw certbot python3-certbot-nginx

# 3. Install PHP 8.2 + Extensions
echo "[+] Installing PHP 8.2 and extensions..."
add-apt-repository -y ppa:ondrej/php
apt-get update
apt-get install -y php8.2 php8.2-cli php8.2-fpm php8.2-mysql php8.2-curl php8.2-gd php8.2-mbstring php8.2-xml php8.2-zip php8.2-bcmath

# 4. Install MySQL Server & Nginx
echo "[+] Installing MySQL Server & Nginx..."
apt-get install -y mysql-server nginx

# 5. Install Node.js 20 LTS
echo "[+] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 6. Database Setup
DB_NAME="car_parking_solution"
DB_USER="parking_user"
DB_PASS="S@nds1@b_Secret_2026"

echo "[+] Creating MySQL database and user..."
mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

echo "[+] Importing database schema & seed..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mysql ${DB_NAME} < "${SCRIPT_DIR}/backend/database/schema.sql"
mysql ${DB_NAME} < "${SCRIPT_DIR}/backend/database/seed.sql"

# 7. Build Frontend Production SPA
echo "[+] Building Frontend React application..."
cd "${SCRIPT_DIR}/frontend"
npm install
npm run build

# Copy built frontend to web root
mkdir -p /var/www/parking/frontend
cp -r dist/* /var/www/parking/frontend/
mkdir -p /var/www/parking/frontend/downloads
if [ -f "${SCRIPT_DIR}/ParkingDisplayBoard_v1.0.apk" ]; then
    cp "${SCRIPT_DIR}/ParkingDisplayBoard_v1.0.apk" /var/www/parking/frontend/downloads/ParkingDisplayBoard.apk
fi

# 8. Setup Backend App Directory
echo "[+] Setting up Backend files..."
mkdir -p /var/www/parking/backend
cp -r "${SCRIPT_DIR}/backend"/* /var/www/parking/backend/
chown -R www-data:www-data /var/www/parking
chmod -R 755 /var/www/parking

# 9. Create Systemd Service for PHP Backend Server
echo "[+] Creating systemd background service (parking-backend.service)..."
cat << 'EOF' > /etc/systemd/system/parking-backend.service
[Unit]
Description=SaNDS Lab Parking Backend API Server
After=network.target mysql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/parking/backend
ExecStart=/usr/bin/php -S 127.0.0.1:8081 -t /var/www/parking/backend/public /var/www/parking/backend/public/index.php
Restart=always
RestartSec=3
Environment=APP_ENV=production
Environment=DB_HOST=127.0.0.1
Environment=DB_PORT=3306
Environment=DB_DATABASE=car_parking_solution
Environment=DB_USERNAME=parking_user
Environment=DB_PASSWORD=S@nds1@b_Secret_2026

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable parking-backend
systemctl restart parking-backend

# 10. Configure Nginx Virtual Host
echo "[+] Configuring Nginx..."
cat << 'EOF' > /etc/nginx/sites-available/parking
server {
    listen 80;
    server_name _;
    client_max_body_size 64M;

    root /var/www/parking/frontend;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    location /api/ {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /downloads/ {
        alias /var/www/parking/frontend/downloads/;
        autoindex off;
        add_header Content-Disposition 'attachment';
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/parking /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# 11. Configure Firewall
echo "[+] Configuring UFW Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 8081/tcp
ufw --force enable

PUBLIC_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')

echo ""
echo "==============================================================================="
echo "                   CLOUD DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "==============================================================================="
echo ""
echo "  [1] Web Portal URL:         http://${PUBLIC_IP}"
echo "  [2] Backend API URL:        http://${PUBLIC_IP}:8081"
echo "  [3] Standalone APK Link:    http://${PUBLIC_IP}/downloads/ParkingDisplayBoard.apk"
echo ""
echo "  [4] In Android Display App: Set Cloud URL to: http://${PUBLIC_IP}"
echo "  [5] Enable SSL/HTTPS:       Run: certbot --nginx -d yourdomain.com"
echo ""
echo "==============================================================================="
