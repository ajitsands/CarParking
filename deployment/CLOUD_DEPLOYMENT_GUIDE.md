# SaNDS Lab Parking Solution — Deployment & Server Operations Guide

---

## 1. Local Server Operations (Windows PC / Local Booth)

### 🚀 Starting All Services Automatically (1-Click)
Double-click [`START_PARKING_SYSTEM.bat`](../START_PARKING_SYSTEM.bat) located in the project root directory.

This automatically:
1. Detects your local WiFi/LAN IPv4 address (e.g. `192.168.8.11`).
2. Starts the **MySQL Database Service**.
3. Launches the **PHP Backend API** on port `8081` (`0.0.0.0:8081`).
4. Launches the **Frontend Management Portal** on port `5173` (`0.0.0.0:5173`).
5. Opens the Admin Management Dashboard in your default web browser (`http://localhost:5173`).

---

### 🔄 Making the System Auto-Start on Windows Boot
To have the parking system start automatically whenever the computer restarts:
1. Press `Win + R` on your keyboard.
2. Type **`shell:startup`** and press **Enter**. *(This opens the Windows Startup folder)*.
3. Right-click [`START_PARKING_SYSTEM.bat`](../START_PARKING_SYSTEM.bat) &rarr; **Create Shortcut**.
4. Drag or paste that shortcut into the Startup folder.
*Now, whenever the PC boots up, all backend and frontend services start automatically in the background.*

---

### 🛑 Stopping Services
Double-click [`STOP_PARKING_SYSTEM.bat`](../STOP_PARKING_SYSTEM.bat) to terminate all running background services and free ports `8081` and `5173`.

---

## 2. Cloud Server Setup (DigitalOcean, AWS, Linode, Ubuntu VPS)

You can deploy the complete parking system to the cloud using either **Docker** or the **1-Click Linux VPS script**.

---

### Option A: 1-Click Linux VPS Auto-Installer (Recommended for Ubuntu 22.04 / 24.04)

1. Upload the project folder to your VPS (via Git or SFTP):
   ```bash
   git clone https://github.com/ajitsands/CarParking.git /var/www/parkingsolution
   cd /var/www/parkingsolution
   ```

2. Run the automated installer:
   ```bash
   sudo bash deployment/cloud_setup.sh
   ```

3. **What it configures automatically:**
   - Installs PHP 8.2 (with MySQL, GD, cURL, BCMath, Zip).
   - Installs Nginx & MySQL 8.0.
   - Creates database `car_parking_solution` and imports tables & seeds.
   - Builds the React frontend production bundle.
   - Configures `parking-backend.service` (Systemd background daemon that restarts on boot).
   - Sets up Nginx reverse proxy on port `80` / `443`.
   - Opens firewall ports (`ufw`).

4. **Add Free SSL Certificate (HTTPS):**
   ```bash
   sudo certbot --nginx -d parking.yourdomain.com
   ```

---

### Option B: Docker Compose Deployment

If your cloud server runs Docker:

1. Navigate to the `deployment/` directory:
   ```bash
   cd deployment
   ```

2. Start all containers in the background:
   ```bash
   docker compose up -d --build
   ```

3. View live logs:
   ```bash
   docker compose logs -f
   ```

4. Containers included:
   - `parking_mysql`: MySQL 8.0 database with persistent volume.
   - `parking_backend`: PHP 8.2 backend service running on port `8081`.
   - `parking_frontend`: Nginx web server serving React SPA & routing API requests on ports `80`/`443`.

---

## 3. Connecting Android Display Tablets / Phones

### A. Download & Install the Standalone APK
- **Direct file**: [`ParkingDisplayBoard_v1.0.apk`](../ParkingDisplayBoard_v1.0.apk)
- **Web Download Link**: `http://<YOUR_SERVER_IP>:5173/downloads/ParkingDisplayBoard.apk` (or `https://parking.yourdomain.com/downloads/ParkingDisplayBoard.apk`)

### B. Device Configuration:
1. Open **Parking Display Board** on the Android device.
2. In the setup screen:
   - **Local WiFi Mode**: Enter `http://192.168.8.11:8081` *(replace with your local PC IP)*.
   - **Cloud Mode**: Toggle **Cloud / Internet** and enter `https://parking.yourdomain.com`.
3. Set **Exit Gate ID** (e.g. `GATE-OUT-01`).
4. Tap **Test Connection** &rarr; Tap **🚀 Launch Kiosk Display**.
5. The device will automatically run full-screen, rotate between Portrait and Landscape, and auto-reconnect on boot.
6. **Admin Gesture**: Tap the screen **5 times rapidly** anytime to return to the Setup screen.
