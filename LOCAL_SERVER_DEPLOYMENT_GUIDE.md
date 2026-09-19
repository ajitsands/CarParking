# Localhost & Local Server Deployment Guide
**SaNDS Lab Smart Parking Management System**

This guide explains how to deploy, run, and configure the Smart Parking Management System on a **Local Server**, **On-Premises Windows PC**, or **Hospital / Facility LAN Subnet**.

---

## 1. System Overview & Architecture

The application runs completely on-premises on your local facility network (e.g. `192.168.8.x`). It does not require continuous cloud internet to operate automated barrier control, ANPR camera recognition, or cashier terminals.

### Core Service Ports:
| Service | Default Port | Description |
| :--- | :--- | :--- |
| **PHP Backend API** | `8081` | REST API, ANPR Camera VIID/Webhook Push receiver, Gate Controller |
| **Frontend Web Portal** | `5173` | React Web Dashboard, Live Gate Monitor, Validation, Cashier |
| **RTSP Stream Gateway** | `8889` | MediaMTX ultra-low latency WebRTC video bridge for live camera feeds |
| **MySQL Database** | `3306` | Parking sessions, tariffs, floor capacities, and audit logs |

---

## 2. Prerequisites

1. **Operating System**: Windows 10 / 11 / Windows Server 2019+ *(or Ubuntu 20.04+ Linux)*
2. **PHP 8.1+**: With extensions `pdo_mysql`, `curl`, `mbstring`, `openssl`, `fileinfo`
3. **MySQL 8.0+** or **MariaDB 10.6+**
4. **Node.js 18+** & **npm** *(for building/running React Portal)*
5. **Static Server IP** on LAN (e.g. `192.168.8.11`)

---

## 3. Quick 1-Click Startup (Windows)

1. Open project root directory (`E:\parkingsolution\`).
2. Double-click **`START_PARKING_SYSTEM.bat`**.
3. The launcher automatically:
   - Detects your Server IPv4 LAN Address (e.g. `192.168.8.11`).
   - Checks & starts MySQL service.
   - Starts RTSP Stream Gateway on Port `8889`.
   - Starts PHP Backend Server on Port `8081`.
   - Starts Frontend Web Portal on Port `5173`.
   - Launches your browser automatically to `http://localhost:5173`.
4. To stop all services cleanly, press **`Q`** in the launcher window or double-click **`STOP_PARKING_SYSTEM.bat`**.

---

## 4. Manual Installation Steps

### Step 1: Database Setup
```sql
CREATE DATABASE parking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Import schema and initial seed data:
```bash
mysql -u root -p parking_db < backend/database/schema.sql
mysql -u root -p parking_db < backend/database/seed.sql
```

### Step 2: Configure Database Credentials
Edit `backend/config/database.php`:
```php
<?php
return [
    'host'     => '127.0.0.1',
    'port'     => 3306,
    'database' => 'parking_db',
    'username' => 'root',
    'password' => 'YOUR_MYSQL_PASSWORD',
    'charset'  => 'utf8mb4'
];
```

### Step 3: Start PHP Backend Server
```bash
php -S 0.0.0.0:8081 backend/public/index.php
```

### Step 4: Start Frontend Web Portal
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

---

## 5. Configuring ANPR Cameras

Configure your ANPR Cameras to push vehicle plate events to your local server IP:

| Camera Brand | Protocol / Method | Server IP | Port | Push Path / URL |
| :--- | :--- | :--- | :--- | :--- |
| **Uniview (UNV)** | Photo Server 1 / VIID | `192.168.8.11` | `8081` | `/VIID/MotorVehicles` |
| **Dahua ANPR** | HTTP Post / Webhook | `192.168.8.11` | `8081` | `/api/v1/webhook/anpr` |
| **Hikvision LPR** | HTTP Listening / Alarm | `192.168.8.11` | `8081` | `/api/v1/webhook/anpr` |

---

## 6. Accessing the System from Other PCs on the Local Network

Any cashier or operator PC on the hospital network can access the system:
- **Operator Portal**: `http://192.168.8.11:5173`
- **Parking Display Board**: `http://192.168.8.11:5173/display`

### Windows Firewall Rule:
Allow Inbound TCP traffic for ports `8081`, `5173`, and `8889` in **Windows Defender Firewall with Advanced Security**.

---

## 7. Auto-Start on Windows Boot

1. Press `Win + R`, type `shell:startup` and press Enter.
2. Right-click > **New > Shortcut**.
3. Browse to `E:\parkingsolution\START_PARKING_SYSTEM.bat`.
4. Click **Finish**. The parking system will now boot automatically with Windows!
