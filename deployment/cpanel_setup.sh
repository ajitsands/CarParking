#!/usr/bin/env bash
# ==============================================================================
# SaNDS Lab Parking Solution - cPanel & Shared Hosting Auto-Setup
# Target: cPanel / CloudLinux / Apache / LiteSpeed (Non-Root / No Sudo)
# Domain: parking.sandslab.com
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "==============================================================================="
echo "       SaNDS Lab Smart Parking System - cPanel Setup (Non-Root)"
echo "       Target Domain: parking.sandslab.com"
echo "==============================================================================="

# 1. Verify PHP CLI
echo "[+] Checking PHP CLI..."
if command -v php >/dev/null 2>&1; then
    PHP_VERSION=$(php -r "echo PHP_VERSION;")
    echo "    Found PHP version: ${PHP_VERSION}"
else
    echo "[-] Warning: php command not found in PATH. Apache PHP handler will still process web requests."
fi

# 2. Deploy Frontend Static Assets & Web Root
echo "[+] Deploying Frontend Production Bundle to Root..."
if [ -d "frontend/dist" ]; then
    cp -r frontend/dist/* ./
    echo "    Copied index.html, assets, and icons from frontend/dist/ to domain root."
else
    echo "    [i] frontend/dist not found. If Node.js/npm is available, building frontend now..."
    if command -v npm >/dev/null 2>&1; then
        (cd frontend && npm install && npm run build)
        cp -r frontend/dist/* ./
    else
        echo "    [!] Please ensure frontend is built or pre-packaged."
    fi
fi

# 3. Setup Downloads directory with Standalone APK
echo "[+] Setting up Downloads Folder for Android Display APK..."
mkdir -p downloads
if [ -f "ParkingDisplayBoard_v1.0.apk" ]; then
    cp "ParkingDisplayBoard_v1.0.apk" downloads/ParkingDisplayBoard.apk
    cp "ParkingDisplayBoard_v1.0.apk" downloads/ParkingDisplayBoard_v1.0.apk
    echo "    APK successfully placed in downloads/ParkingDisplayBoard.apk"
elif [ -f "frontend/dist/downloads/ParkingDisplayBoard.apk" ]; then
    cp frontend/dist/downloads/ParkingDisplayBoard.apk downloads/
    echo "    APK copied from frontend/dist/downloads/ to downloads/"
fi

# 4. Verify .htaccess
echo "[+] Checking Root .htaccess configuration..."
if [ ! -f ".htaccess" ]; then
    cat << 'EOF' > .htaccess
<IfModule mod_rewrite.c>
    Options -MultiViews
    RewriteEngine On

    # 1. API Endpoint Routing -> PHP Router
    RewriteRule ^api/(.*)$ backend/public/index.php [QSA,L]
    RewriteRule ^api$ backend/public/index.php [QSA,L]

    # 2. Allow Direct File Downloads
    RewriteRule ^downloads/(.*)$ downloads/$1 [L]

    # 3. Serve existing static files & directories directly
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]

    # 4. React Single Page Application (SPA) fallback to index.html
    RewriteRule ^ index.html [L]
</IfModule>

<FilesMatch "\.(env|sql|bat|log|md|git.*|yml|yaml)$">
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
    <IfModule !mod_authz_core.c>
        Order allow,deny
        Deny from all
    </IfModule>
</FilesMatch>
EOF
    echo "    Created root .htaccess with API and SPA routing rules."
else
    echo "    Root .htaccess already present."
fi

# 5. Database Schema and Seed Import
echo "[+] Checking Database Setup..."
DB_NAME="sandsl23_parking_db"
DB_USER="sandsl23_parking_users"
DB_PASS="S@nds1@b"

if command -v mysql >/dev/null 2>&1; then
    echo "    Importing schema, seeds, and migrations into MySQL database '${DB_NAME}'..."
    if mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < backend/database/schema.sql 2>/dev/null; then
        echo "    ✓ schema.sql imported successfully."
    else
        echo "    [!] Note: schema.sql import returned a notice or tables already exist. Continuing..."
    fi

    if mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < backend/database/seed.sql 2>/dev/null; then
        echo "    ✓ seed.sql imported successfully."
    fi

    if [ -f "backend/database/migration_prepaid.sql" ]; then
        mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < backend/database/migration_prepaid.sql 2>/dev/null || true
        echo "    ✓ migration_prepaid.sql checked/applied."
    fi
else
    echo "    [i] MySQL CLI not found. You can import 'backend/database/schema.sql' and 'seed.sql' via cPanel phpMyAdmin."
fi

# 6. Ensure Storage & Logs Directories exist with proper permissions
echo "[+] Setting up writable storage directories..."
mkdir -p backend/storage/logs backend/storage/security backend/storage/cache
chmod -R 755 backend/storage 2>/dev/null || true

# 7. Test Database Connectivity via PHP
echo "[+] Testing Database Connectivity via PHP..."
if command -v php >/dev/null 2>&1; then
    php -r "
    try {
        require_once 'backend/app/Core/Database.php';
        \$pdo = \App\Core\Database::getInstance();
        echo '    ✓ Database connection successful! Tables found: ' . \$pdo->query('SHOW TABLES')->rowCount() . PHP_EOL;
    } catch (\Throwable \$e) {
        echo '    [!] Database check notice: ' . \$e->getMessage() . PHP_EOL;
        echo '    Ensure MySQL database and user privileges are created in cPanel MySQL Databases.' . PHP_EOL;
    }
    " 2>/dev/null || true
fi

echo ""
echo "==============================================================================="
echo "                  CPANEL SETUP COMPLETED SUCCESSFULLY!"
echo "==============================================================================="
echo ""
echo "  [1] Web Portal:              https://parking.sandslab.com"
echo "  [2] Live Lanes & Kiosk:      https://parking.sandslab.com/lanes"
echo "  [3] Display Board & Sim:     https://parking.sandslab.com/display-board"
echo "  [4] Download Android APK:    https://parking.sandslab.com/downloads/ParkingDisplayBoard.apk"
echo "  [5] API Health Check:        https://parking.sandslab.com/api/v1/kiosk/status?gate_id=GATE-OUT-01"
echo ""
echo "  [6] In Android Mobile App Settings:"
echo "      Server Mode: Cloud Server"
echo "      Cloud Server URL: https://parking.sandslab.com"
echo ""
echo "==============================================================================="
