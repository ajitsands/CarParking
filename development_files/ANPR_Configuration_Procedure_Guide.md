# Smart Hospital Car Parking Solution
## ANPR Camera Webhook Integration & System Configuration Manual
**Document Reference:** `DOC-SANDS-ANPR-CONFIG-2026`  
**Version:** 1.0  
**Target Systems:** Dahua (ITC Series), Hikvision (Smart LPR), Uniview (UNV), and Generic HTTP ANPR Cameras  
**Date:** September 2026  

---

## Table of Contents
1. [Architecture & System Flow](#1-architecture--system-flow)
2. [Network Setup & IP Addressing](#2-network-setup--ip-addressing)
3. [Webhook Push URLs & Endpoints](#3-webhook-push-urls--endpoints)
4. [Dahua ANPR Camera Configuration (Step-by-Step)](#4-dahua-anpr-camera-configuration-step-by-step)
5. [Hikvision ANPR Camera Configuration](#5-hikvision-anpr-camera-configuration)
6. [Uniview (UNV) & Generic Camera Setup](#6-uniview-unv--generic-camera-setup)
7. [System Settings & Parameter Mapping Configuration](#7-system-settings--parameter-mapping-configuration)
8. [Camera Snapshot Image Storage Setup](#8-camera-snapshot-image-storage-setup)
9. [Boom Barrier Relay Hardware Configuration](#9-boom-barrier-relay-hardware-configuration)
10. [Prepaid Passes & Vehicle Whitelisting Procedure](#10-prepaid-passes--vehicle-whitelisting-procedure)
11. [Troubleshooting & Field Verification Checklist](#11-troubleshooting--field-verification-checklist)

---

## 1. Architecture & System Flow

```
+--------------------------+          HTTP POST JSON           +---------------------------------------+
|    ANPR Camera Lane 1    | --------------------------------> |  Parking Management Server (PHP/MySQL)|
| (e.g. Dahua ITC413 Entry)|   (Plate, Channel, Time, Image)   |  http://<HOST_IP>:8000/api/v1/webhook |
+--------------------------+                                   +---------------------------------------+
                                                                                  |
                                                                        Decision Engine (<80ms)
                                                                                  |
                                                                                  v
+--------------------------+         Relay Pulse Signal        +---------------------------------------+
| Boom Barrier Controller  | <-------------------------------- | Ethernet IP Relay Controller          |
| (NO/COM Dry Contact)     |        (800ms dry contact)        | (e.g., 192.168.1.201:8080)            |
+--------------------------+                                   +---------------------------------------+
```

1. The vehicle approaches the entry or exit barrier.
2. The ANPR camera recognizes the license plate, vehicle type, and captures an image.
3. The camera's onboard software sends an **HTTP POST** webhook request with JSON data to this parking solution.
4. The system's **Decision Engine**:
   - Matches whitelisted, emergency, doctor, and active prepaid pass vehicles $\rightarrow$ grants **instant barrier opening** with zero fee.
   - For standard visitors $\rightarrow$ opens entry barrier, logs entry timestamp, and initiates visitor grace period tracking.
   - For blacklisted vehicles $\rightarrow$ keeps barrier down, logs security alert, and triggers operator manual review.
5. If barrier opening is authorized, an automated relay signal is dispatched to the barrier controller.

---

## 2. Network Setup & IP Addressing

### Recommended LAN Subnet Configuration:

| Device Role | Default / Recommended IP | Subnet Mask | Port | Protocol |
|---|---|---|---|---|
| **Parking Management Server** | `192.168.100.4` (or static `192.168.1.100`) | `255.255.255.0` | `8000` | HTTP / TCP |
| **Entry Gate ANPR Camera** | `192.168.1.101` (or `192.168.100.101`) | `255.255.255.0` | `80` / `8000` | HTTP Webhook |
| **Exit Gate ANPR Camera** | `192.168.1.102` (or `192.168.100.102`) | `255.255.255.0` | `80` / `8000` | HTTP Webhook |
| **Entry Barrier IP Relay** | `192.168.1.201` | `255.255.255.0` | `8080` | TCP Socket |
| **Exit Barrier IP Relay** | `192.168.1.202` | `255.255.255.0` | `8080` | TCP Socket |
| **Default Gateway / Router** | `192.168.100.1` | `255.255.255.0` | - | - |

> [!IMPORTANT]
> **Windows Firewall Configuration**:  
> On the host server machine running Windows, ensure incoming TCP port **`8000`** is allowed through Windows Defender Firewall:
> ```powershell
> New-NetFirewallRule -DisplayName "Car Parking API Webhook (Port 8000)" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
> ```

---

## 3. Webhook Push URLs & Endpoints

Depending on your installation mode, configure the ANPR Camera software to push to the appropriate URL:

### A. Local Network (On-Premise LAN)
Use this when cameras and this computer communicate over the same hospital/building network switch:
```text
http://192.168.100.4:8000/api/v1/webhook/anpr
```
*(Replace `192.168.100.4` with your host server's assigned static IP address).*

### B. Cloud Server / Production (Public Domain Name)
Use this when the server is hosted in the cloud with an SSL certificate:
```text
https://parking.sandslab.com/api/v1/webhook/anpr
```

### C. Localhost (Same PC Testing)
```text
http://127.0.0.1:8000/api/v1/webhook/anpr
```

---

## 4. Dahua ANPR Camera Configuration (Step-by-Step)

Applicable models: **Dahua DHI-ITC413-PW4D**, **ITC237**, **ITC215**, and Dahua Traffic ITS cameras.

### Step 4.1: Access the Camera Web Interface
1. Open Google Chrome or Microsoft Edge.
2. Enter the camera IP in the address bar (e.g., `http://192.168.1.108` default).
3. Log in using the camera administrator credentials.

### Step 4.2: Enable Vehicle Plate Recognition
1. Navigate to: **Setting** $\rightarrow$ **Event** $\rightarrow$ **Traffic Recognition** (or **Road Traffic / Vehicle Detection**).
2. Check **Enable Road Traffic**.
3. Under **Detection Area**, define the detection virtual loop on the roadway.
4. Set **Plate Country/Region** to **Bahrain (BHR)** or **GCC**.
5. Click **Save**.

### Step 4.3: Configure HTTP Push / Alarm Server Webhook
1. Navigate to: **Setting** $\rightarrow$ **Network** $\rightarrow$ **Access Platform** $\rightarrow$ **HTTP Push** (or **Alarm Server** / **HTTP Listening** depending on firmware).
2. Configure the following parameters:
   - **Enable**: `[x] Checked`
   - **Protocol**: `HTTP`
   - **Method**: `POST`
   - **Destination IP / Host**: `192.168.100.4` *(Your Server IP)*
   - **Port**: `8000`
   - **Request URL / Path**: `/api/v1/webhook/anpr`
   - **Full Webhook Address**: `http://192.168.100.4:8000/api/v1/webhook/anpr`
   - **Data Format**: `JSON` (UTF-8 encoding)
   - **Authentication**: `None` (or Anonymous)
   - **Upload Pictures**: Check **Plate Cutout Image** and **Overview Snapshot**.
   - **Snapshot Transmission**: Check **Base64** or **Multipart/Form-Data**.
3. Click **Save** and **Apply**.

### Dahua JSON Payload Sent by Camera:
```json
{
  "PlateNumber": "BHR 55443",
  "PlateColor": "Blue",
  "VehicleColor": "Silver",
  "VehicleType": "Sedan",
  "TimeStamp": "2026-09-10 12:45:00",
  "Channel": 1,
  "Lane": 1,
  "SnapPicURL": "http://192.168.100.20/snapshot/img1.jpg"
}
```

---

## 5. Hikvision ANPR Camera Configuration

Applicable models: **DS-2CD7A series**, **iDS-TCM403**, **iDS DeepinView Traffic IPC**.

### Step 5.1: Configure ANPR Event
1. Navigate to: **Configuration** $\rightarrow$ **Road Traffic** $\rightarrow$ **Vehicle Detection**.
2. Select **Country/Region** (Bahrain/GCC).
3. Set lane line calibration and confidence threshold to `90%`.

### Step 5.2: Configure HTTP Listening Webhook
1. Navigate to: **Configuration** $\rightarrow$ **Network** $\rightarrow$ **Advanced Settings** $\rightarrow$ **HTTP Listening** (or **Alarm Server**).
2. Set:
   - **Server Type**: `HTTP Listening`
   - **Destination Address**: `192.168.100.4`
   - **Port**: `8000`
   - **URL**: `/api/v1/webhook/anpr`
   - **Protocol**: `HTTP POST`
   - **Picture Upload**: Enable `Plate Image` & `Vehicle Overview Picture`.
3. Click **Save**.

### Hikvision JSON Payload Sent by Camera:
```json
{
  "licensePlate": "BHR 11223",
  "laneNo": 1,
  "dateTime": "2026-09-10 12:45:00",
  "vehicleType": "Car",
  "vehicleColor": "Silver",
  "picture": ""
}
```

---

## 6. Uniview (UNV) & Generic Camera Setup

### Uniview (UNV LPR):
1. Navigate to: **Setup** $\rightarrow$ **Intelligent** $\rightarrow$ **Vehicle / LPR** $\rightarrow$ **Alarm Push / HTTP Service**.
2. Set Server IP `192.168.100.4`, Port `8000`, URL `/api/v1/webhook/anpr`.
3. Target parameters:
   - Plate Text: `PlateText`
   - Channel: `ChannelID`
   - Time: `PassTime`

### Generic Third-Party Software / LPR Broker:
Any system can push standard JSON:
```json
{
  "camera_id": "ANPR-ENTRY-CAM-01",
  "plate_number": "BHR 11223",
  "gate_code": "GATE-IN-01",
  "direction": "ENTRY",
  "confidence": 98.5,
  "vehicle_type": "car",
  "image_base64": "<base64_string>",
  "timestamp": "2026-09-10 12:45:00"
}
```

---

## 7. System Settings & Parameter Mapping Configuration

In the web interface: **System Settings** $\rightarrow$ **ANPR Camera Webhook Integration & Gateway URLs**:

### Step 7.1: Choose Manufacturer Preset
Click your camera manufacturer preset button:
- **📷 Dahua Technology (ITC Series)**: Automatically maps `PlateNumber`, `Channel`, `TimeStamp`, `VehicleType`, `VehicleColor`, `Image`.
- **📷 Hikvision (Smart LPR)**: Maps `licensePlate`, `laneNo`, `dateTime`, `vehicleType`, `picture`.
- **📷 Uniview (UNV LPR)**: Maps `PlateText`, `ChannelID`, `PassTime`, `CarType`.
- **🤖 Auto-Detect (All Brands)**: Inspects all common vendor keys with zero configuration.

### Step 7.2: Verify Channel to Gate Mapping
- **Channel for Entry Gate**: Set to `1` (or your entry camera channel).
- **Channel for Exit Gate**: Set to `2` (or your exit camera channel).

### Step 7.3: Live Parameter Mapping Validator
1. In the **Test Camera Parameter Mapping** text box, paste sample JSON from your camera.
2. Click **Test Field Mapping**.
3. Confirm that the **Plate Number**, **Gate**, **Direction**, and **Vehicle Type** show green checkmarks.

---

## 8. Camera Snapshot Image Storage Setup

Incoming vehicle images are saved automatically on the server disk:

### Step 8.1: Configure Storage Folder
In **System Settings** under **Camera Image & Snapshot Storage Folder Path**:
- **Default Path**: `storage/uploads/anpr_snapshots`
- **Full Path on Host Disk**:
  ```text
  E:\parkingsolution\backend\storage\uploads\anpr_snapshots
  ```
- Any custom absolute folder on local drive (e.g., `D:\ParkingImages\Snapshots`) can be entered.

### Step 8.2: File Naming Convention
Stored images follow an automated audit-proof format:
```text
[PLATE]_[DIRECTION]_[YYYYMMDD_HHMMSS]_[RAND].jpg
Example: BHR_55443_entry_20260910_124500_91a2.jpg
```
Images are automatically accessible from the **Parking Sessions**, **Live Gate Monitor**, and **Audit Logs** screens.

---

## 9. Boom Barrier Relay Hardware Configuration

The system integrates with Ethernet / IP Dry Contact Relay modules to trigger boom barrier opening:

### Wiring:
- **Relay Channel 1 (COM & NO)** $\rightarrow$ Connected to Boom Barrier **Open Signal** terminals.
- **Pulse Duration**: `800 milliseconds` (Configurable in Settings).

### IP Settings:
- **Entry Barrier Relay IP**: `192.168.1.201:8080` (Gate: `GATE-IN-01`)
- **Exit Barrier Relay IP**: `192.168.1.202:8080` (Gate: `GATE-OUT-01`)
- **Relay Command**: `RELAY_CH1_PULSE`

---

## 10. Prepaid Passes & Vehicle Whitelisting Procedure

For recurring visitors, staff, and contractors requiring unlimited parking for Days, Weeks, or Months:

1. In top menu, navigate to **Prepaid Passes**.
2. Click **+ Issue New Prepaid Pass**.
3. Enter:
   - **Vehicle Plate Number**: e.g., `BHR 99887`
   - **Vehicle Type**: Sedan / SUV / Staff
   - **Duration Plan**: Day(s), Week(s), Month(s), or Custom Days
   - **Start Date**: Date of commencement
   - **Owner / Driver Name**: e.g., `Dr. Salman Al-Khalifa`
   - **Mobile Phone**: e.g., `+973 39123456`
   - **Payment Method**: Cash / BenefitPay QR / Credit Card / Bank Transfer
4. Click **Confirm & Issue Prepaid Pass**.
5. **Immediate System Effect**:
   - The vehicle is instantly added to the `vehicles` table with `access_status = 'whitelisted'` until the pass expiration date.
   - When the ANPR camera detects this plate at the entry or exit gate, the Decision Engine grants **PREPAID_PASS_ENTRY**, dispatches the barrier open signal, and logs fee as `BD 0.000`.
   - The payment is permanently indexed into the **Financial Ledger** and **Vehicle Ledger History**.

---

## 11. Troubleshooting & Field Verification Checklist

| Symptom | Root Cause | Resolution |
|---|---|---|
| **Camera posts event but server returns connection timeout** | Windows Firewall blocking Port 8000 | Add inbound rule for TCP Port 8000 in Windows Defender Firewall. |
| **Server returns HTTP 400 "License plate number could not be extracted"** | JSON parameter name mismatch | In System Settings, select the camera manufacturer preset (e.g. Dahua) or specify the plate key name. |
| **Plate recognized but barrier does not open** | Relay IP disconnected or IP address changed | Check Ethernet cable to IP relay (e.g. `192.168.1.201`). Verify barrier manual button works. |
| **Prepaid vehicle charged a fee** | Pass expired or plate number typed with different spacing | Search plate in **Prepaid Passes** tab and verify expiry date; the system normalizes spaces automatically. |
| **Snapshot images missing** | Upload folder path does not have write permissions | In System Settings, check folder path status (`Folder Active & Writable`). |

### Default Credentials:
- **Hospital Admin**: `admin` / `Admin@12345`
- **Gate Operator**: `operator` / `User@12345`

---
*Created by SaNDS Lab — Smart Car Parking & Hospital Visitor Validation System*
