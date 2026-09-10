# Smart Car Parking & Hospital Visitor Validation System

A modern, full-stack Smart Car Parking Management & Visitor Validation Solution built for hospitals, commercial venues, and residential complexes. Designed for high-throughput ANPR camera processing (<80ms decision engine), automated boom barrier hardware relay control, and comprehensive revenue management.

---

## 🌟 Key Features

- **Automated License Plate Recognition (ANPR)**:
  - Universal webhook integration supporting Dahua, Hikvision, and standard camera push formats.
  - Configurable JSON/Payload field mapping for camera parameters and plate snapshot upload folders.
  - Instant vehicle categorization: Whitelist (Staff/Doctors), Blacklist (Restricted), and Regular Visitors.
- **Boom Barrier Hardware Relay Control**:
  - Direct pulse signal integration (configurable 200ms–2000ms duration).
  - Manual boom barrier override modal with mandatory security reason logging and operator audit stamps.
- **Live Gate Monitor**:
  - Real-time lane activity monitoring, active vehicle entry/exit cards, and 1-click cash/validation checkout.
- **Hospital Visitor Validation**:
  - Method A: Simulated Camera QR scanner for appointment slips.
  - Method B: Reception lookup by Civil ID (CPR), Mobile Number, or MRN.
  - Method C: Automated match with pre-registered vehicle plate.
- **Prepaid Passes & Vehicle Ledger**:
  - Daily, weekly, and monthly prepaid passes with automated whitelist synchronization.
  - Multi-payment collection: Cash, BenefitPay (QR), and Credit/Debit Card.
  - Complete financial ledger and vehicle-specific transaction history.
- **Unified Reactive DataTables**:
  - Fast client-side search filtering, interactive column sorting, flexible pagination (`10, 25, 50, 100 entries`), and 1-click CSV export across all data tables.
- **Role-Based Access Control (RBAC)**:
  - Superadmin file-vault authentication, Administrator, and Operator/Cashier tiers.
- **Dynamic Theme Customization**:
  - Horizontal top navigation menu with default Pink & Blue color scheme, custom color pickers, and instant Light/Dark mode toggle.

---

## 🛠️ Technology Stack

- **Backend**: PHP 8.x MVC REST API, PDO, MySQL 8.x
- **Frontend**: React 18, Vite, Lucide Icons, Vanilla CSS Design System
- **Security**: JWT Authentication, Server-Side File Vault (HMAC-SHA256), Prepared SQL Statements

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
# Ensure MySQL is running and import database schema:
mysql -u root -p car_parking_solution < database/schema.sql
mysql -u root -p car_parking_solution < database/seed.sql

# Start PHP built-in server:
php -S 127.0.0.1:8000 -t public public/index.php
```

### 2. Frontend Setup
```bash
cd frontend
# Install dependencies:
npm install

# Start Vite development server:
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 📖 Documentation & Guides

- [ANPR Configuration Procedure Guide (HTML)](development_files/ANPR_Configuration_Procedure_Guide.html)
- [ANPR Configuration Procedure Guide (Markdown)](development_files/ANPR_Configuration_Procedure_Guide.md)
- [System Architecture & Flow Diagram](development_files/flow_diagram.jpg)
