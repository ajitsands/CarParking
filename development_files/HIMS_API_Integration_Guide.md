# Universal 3rd-Party & HIMS / HIS API Integration & Parking QR Specification
**Smart Hospital & Facility Parking Management & Visitor Validation System**
**Version**: 2.0 (REST JSON)  
**Status**: Active & Deployed  

---

## 1. Architectural Overview & Workflow

The Smart Parking Management System provides dedicated REST APIs for bilateral integration with **ANY 3rd-Party Software Platform**. While extensively used for Hospital Information Systems (HIMS / HIS / EHR), this standard REST API integrates seamlessly with:
- 🏥 Hospital Information Systems (HIMS / HIS / EHR)
- 🩺 Clinic Management Systems (CMS)
- 🏢 Enterprise Resource Planning (ERP) & CRM Systems
- 🏨 Hotel Property Management & Valet Systems (PMS)
- 📱 Mobile Applications & Web Appointment Schedulers
- 🎟️ Visitor Management Kiosks & Access Gates

### Complete Sequence Workflow:

```
[1. Booking Created in External Software (HIMS/CMS/ERP/App)]
           │
           ▼
[2. External Software Calls POST /api/v1/his/appointments/sync] ───► [Parking System Stores Record & Generates QR Image]
           │                                                                                     │
           ▼                                                                                     ▼
[3. External System Receives Base64 QR Image & Prints on Slip / WhatsApp] ◄──────────────────────┘
           │
           ▼
[4. Patient/Visitor Arrives & ANPR Camera Captures Vehicle at Entry Gate]
           │
           ▼
[5. Patient Scans QR Slip at Clinic Desk OR Software Calls Auto-Checkout Validation]
           │
           ▼
[6. Parking Session Marked "VALIDATED" -> Barrier Auto-Opens at Exit (Free Parking)]
```

### Dynamic QR Token Prefix Configuration:
The system dynamically creates QR tokens formatted as `{PREFIX}-{IDENTIFIER}-{TIMESTAMP}-{RANDOM}`.
1. **System Settings**: Configured under **Settings &rarr; HIMS Integration &rarr; QR Token Prefix** (`qr_token_prefix` key in `system_settings`), such as `QR-KIMS`, `QR-PARK`, `QR-HOSP`, or `QR-VIP`.
2. **Request Override**: External software can pass a `token_prefix` in the JSON request body.
3. **Default**: If unconfigured, the system defaults to `QR-KIMS`.

---

## 2. Real-Time Parking Availability & Floor Status API

External systems or digital outdoor display boards can call this API periodically to fetch the live parking availability, total capacity, occupied spots, and floor-wise slot breakdowns.

- **Endpoint**: `GET /api/v1/his/parking-status`
- **Authentication**: Public or Internal LAN
- **Format**: JSON

### Query Parameters:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `(none)` | - | No | Returns overall facility parking capacity, occupied count, available slots, occupancy rate, and floor-wise breakdown. |
| `plate_number` | string | No | Lookup a specific vehicle plate (e.g. `BHR 43210`) for current entry time, duration, and validation status. |
| `patient_mrn` | string | No | Lookup vehicle status linked to patient / visitor ID or MRN (e.g. `MRN-88192`). |

### Sample Response (Overall Facility Parking Capacity & Floor Breakdown):

```json
{
  "success": true,
  "data": {
    "parking_status": "AVAILABLE",
    "total_capacity": 500,
    "currently_occupied": 182,
    "available_slots": 318,
    "occupancy_rate_percent": 36.4,
    "breakdown": {
      "validation_pending": 45,
      "validated_free": 110,
      "charging_active": 27
    },
    "floor_breakdown": [
      {
        "floor_id": "GF",
        "floor_name": "Ground Floor",
        "total_capacity": 125,
        "occupied_slots": 45,
        "available_slots": 80,
        "occupancy_rate": 36.0,
        "status": "AVAILABLE"
      },
      {
        "floor_id": "B1",
        "floor_name": "Basement 1 (Patient & Visitor)",
        "total_capacity": 200,
        "occupied_slots": 73,
        "available_slots": 127,
        "occupancy_rate": 36.5,
        "status": "AVAILABLE"
      },
      {
        "floor_id": "B2",
        "floor_name": "Basement 2 (Doctors & Staff)",
        "total_capacity": 175,
        "occupied_slots": 64,
        "available_slots": 111,
        "occupancy_rate": 36.6,
        "status": "AVAILABLE"
      }
    ],
    "last_updated": "2026-09-12 13:10:00"
  },
  "message": "Hospital Parking Status retrieved successfully"
}
```

---

## 3. Universal Booking Ingestion & Printable QR Code API

When an appointment is confirmed in HIMS, CMS, ERP, or web/mobile application, the software calls this endpoint. The parking system creates the appointment record, generates a unique secure QR token, produces high-resolution Base64 PNG and SVG vector images, and returns the printable payload immediately.

- **Endpoint**: `POST /api/v1/his/appointments/sync`
- **Content-Type**: `application/json`

### Request Body Fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `patient_mrn` | string | **Yes** | Medical Record Number, Visitor ID, or User Reference (e.g. `MRN-88192`). |
| `patient_name` | string | **Yes** | Full Name of the patient / visitor (e.g. `Ahmed Al-Sayed`). |
| `patient_phone` | string | Optional | Contact phone number (e.g. `+973 3611 0022`). |
| `doctor_name` | string | Optional | Attending consultant / doctor name (e.g. `Dr. Tariq Al-Hashimi`). |
| `department` | string | Optional | Medical department or clinic (e.g. `Cardiology`, `Pediatrics`). |
| `appointment_datetime` | string | Optional | Appointment date & time in `YYYY-MM-DD HH:MM:SS` format. Defaults to current timestamp. |
| `registered_plate_number` | string | Optional | Vehicle plate number if known (e.g. `BHR 43210`). Enables automatic ANPR match. |
| `free_hours` | integer | Optional | Free parking duration granted upon QR validation (default: `3` hours = 180 mins). |
| `token_prefix` | string | Optional | Custom QR token prefix (e.g. `QR-CMS`, `QR-PARK`). If omitted, uses System Settings or default `QR-KIMS`. |

### Sample JSON Request:

```json
{
  "patient_mrn": "MRN-88192",
  "patient_name": "Ahmed Al-Sayed",
  "patient_phone": "+973 3611 0022",
  "doctor_name": "Dr. Tariq Al-Hashimi",
  "department": "Cardiology",
  "appointment_datetime": "2026-09-12 14:30:00",
  "registered_plate_number": "BHR 43210",
  "free_hours": 3,
  "token_prefix": "QR-KIMS"
}
```

### Sample JSON Response:

```json
{
  "success": true,
  "data": {
    "appointment_id": 42,
    "appointment_code": "APT-20260912-7A9B1",
    "patient_name": "Ahmed Al-Sayed",
    "patient_mrn": "MRN-88192",
    "registered_plate": "BHR 43210",
    "qr_token": "QR-KIMS-88192-1788983570-491",
    "qr_data_string": "KIMSHEALTH://VAL?TOKEN=QR-KIMS-88192-1788983570-491&MRN=MRN-88192&CODE=APT-20260912-7A9B1",
    "qr_png_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5g51...",
    "qr_svg_data_uri": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz...",
    "printable_slip_html": "<div style=\"font-family: monospace; width: 280px; ...\">...</div>",
    "free_hours_granted": 3,
    "free_minutes_granted": 180,
    "sync_status": "SYNCHRONIZED",
    "created_at": "2026-09-12 13:10:00"
  },
  "message": "HIMS appointment received and Parking QR code generated successfully"
}
```

---

## 4. Consultation Checkout Direct Validation API

If the doctor or nurse clicks "Complete Consultation" inside HIMS / external software, the system can automatically validate the patient's parking without requiring manual QR scanning.

- **Endpoint**: `POST /api/v1/his/validate-visitor`
- **Content-Type**: `application/json`

### Sample Request:
```json
{
  "patient_mrn": "MRN-88192",
  "plate_number": "BHR 43210",
  "appointment_code": "APT-20260912-7A9B1"
}
```

### Sample Response:
```json
{
  "success": true,
  "data": {
    "session_code": "SESS-20260912-0014",
    "plate_number": "BHR 43210",
    "status": "VALIDATED",
    "message": "Parking session SESS-20260912-0014 for vehicle BHR 43210 validated successfully via HIMS consultation checkout."
  }
}
```

---

## 5. Emergency Ambulance Priority Access API

Used for emergency inbound ambulances or emergency room code reds to instantly open the inbound boom barrier and log priority access.

- **Endpoint**: `POST /api/v1/his/emergency-access`

### Sample Request:
```json
{
  "plate_number": "AMBULANCE-04",
  "gate_id": "GATE-IN-01",
  "reason": "Trauma Emergency Inbound"
}
```

---

## 6. Thermal Slip Printer Integration Guidelines

When printing patient consultation slips or appointment receipts on 80mm or 58mm POS thermal printers (Epson ESC/POS, Zebra ZPL, Citizen, Bixolon, Star Micronics):
- **Base64 PNG Direct Print**: Convert `qr_png_base64` to a bitonal bitmap image and send via standard ESC/POS raster graphics command (`ESC *` or `GS v 0`).
- **Native Thermal QR Command**: If using native printer QR commands, pass the `qr_token` string to printer function `GS ( k`.
- **Recommended QR Dimension**: 150px × 150px to 240px × 240px (minimum 25mm on physical thermal paper) for instantaneous 100% scanning rate.
