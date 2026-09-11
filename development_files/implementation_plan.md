# Implementation Plan: Flexible Tariff Engine & Prepaid Parking Passes with Vehicle Ledger

## Overview
Expand the Smart Car Parking & Hospital Visitor Validation System to support:
1. **Multi-tier Parking Tariff Rates** configurable in Settings (Per Minute, Per Hour, Per Day, Per Month).
2. **Prepaid Parking Passes** (Daily, Weekly, Monthly, Custom) with automated ANPR Whitelisting.
3. **Vehicle-Based Financial Ledger** recording all cash, QR (BenefitPay), card, and transfer collections, with monthly revenue analytics.

---

## 1. Database Schema Changes (MySQL 8.x)

### Table Updates & Additions:
- `system_settings`: Add default rates:
  - `rate_per_minute`: `0.005`
  - `rate_per_hour`: `0.200`
  - `rate_per_day`: `2.000`
  - `rate_per_month`: `35.000`
  - `rate_per_week`: `10.000`
  - `tariff_calculation_mode`: `hourly_daily_cap`
- [NEW] `prepaid_passes`: Stores active/expired passes linked to vehicle plate, owner name, start date, expiry date, duration, total days, amount paid, and whitelisted status.
- [NEW] `prepaid_ledger`: Immutable financial ledger capturing every prepaid pass issuance, renewal, extension, payment method (`cash`, `card`, `qr_benefitpay`, `bank_transfer`), collector identity, receipt number, and period.

---

## 2. Backend Implementation (PHP 8.x MVC)

- [TariffCalculator.php](file:///e:/parkingsolution/backend/app/Services/TariffCalculator.php):
  - Enhance calculation engine to apply:
    - Free Grace Period (e.g. 5 mins)
    - Hourly rates with 24-hour Daily Cap (`days * rate_per_day + remaining_hours * rate_per_hour`)
    - Minute-based or monthly subscription overrides
    - Active Prepaid Pass check (if active prepaid pass exists, Net Fee = `0.000`)
- [PrepaidPassService.php](file:///e:/parkingsolution/backend/app/Services/PrepaidPassService.php):
  - Issues new prepaid passes and automatically adds/updates the vehicle in `vehicles` table with `access_status = 'whitelisted'`.
  - Generates unique receipt codes (`REC-YYYYMMDD-XXXX`).
  - Logs transactions into `prepaid_ledger`.
  - Renews/extends existing passes.
- [PrepaidController.php](file:///e:/parkingsolution/backend/app/Controllers/PrepaidController.php):
  - `GET /api/v1/prepaid/passes`: List active and expired prepaid passes with filters.
  - `POST /api/v1/prepaid/passes`: Issue a new prepaid pass (validates start date, days, amount, payment method).
  - `POST /api/v1/prepaid/passes/{id}/renew`: Extend an existing pass.
  - `GET /api/v1/prepaid/ledger`: Vehicle-based ledger records with monthly/date filtering.
  - `GET /api/v1/prepaid/stats`: Monthly & daily revenue KPIs (`collected_this_month`, `collected_today`, `active_count`).
  - `GET /api/v1/prepaid/vehicle/{plate}/history`: Full ledger history for a specific vehicle.
- [DisplayController.php](file:///e:/parkingsolution/backend/app/Controllers/DisplayController.php):
  - `GET /api/v1/kiosk/status`: Returns current vehicle detected at given gate (`gate_id`), plate number, entry/exit timestamp, duration in minutes, tariff amount, payment status, dynamic QR code payload (BenefitPay / UPI / Web Checkout URL), and barrier state.
  - `POST /api/v1/kiosk/pay-qr`: Public endpoint allowing the driver's phone (or simulated scan) to complete payment for a session and trigger the exit barrier.
  - `POST /api/v1/kiosk/simulate-approach`: Endpoint to test vehicle arrival at a specific exit gate for kiosk demo.
- [DecisionEngine.php](file:///e:/parkingsolution/backend/app/Services/DecisionEngine.php):
  - On vehicle entry/exit, checks for active prepaid pass:
    - If active pass exists: marks as `PREPAID_PASS_ENTRY` / `PREPAID_PASS_EXIT`, opens boom barrier, and waives fee to `0.000`.
- [SettingsController.php](file:///e:/parkingsolution/backend/app/Controllers/SettingsController.php):
  - Saves minute, hourly, daily, weekly, and monthly rates.
- [public/index.php](file:///e:/parkingsolution/backend/public/index.php):
  - Register `/api/v1/kiosk/*` routes.

---

## 3. Frontend Implementation (React JS + Vite) & Mobile Display Kiosk

- **System Settings ([SettingsPage.jsx](file:///e:/parkingsolution/frontend/src/pages/SettingsPage.jsx))**:
  - Add Tariff Rate Configuration Panel: Per Minute, Per Hour, Per Day (24h Cap), Per Week, Per Month.
  - Interactive tariff calculator simulator preview.
- **Prepaid Parking Module ([PrepaidParkingPage.jsx](file:///e:/parkingsolution/frontend/src/pages/PrepaidParkingPage.jsx))**:
  - **Revenue & Pass Metrics**:
    - *Collected This Month* (e.g. `BD 450.000`)
    - *Collected Today*
    - *Active Whitelisted Passes*
    - *Expiring in 7 Days*
  - **Tabs**:
    1. **Prepaid Passes**: Searchable table showing Plate, Owner, Vehicle Type, Duration (Days/Weeks/Months), Start Date, Expiry Date, Days Remaining pill, and Actions (Renew, View Ledger, Receipt).
    2. **Financial Ledger**: Full audit log of all transactions with Receipt #, Date, Plate, Owner, Amount, Payment Method (Cash, QR BenefitPay, Card), and Month Filter.
    3. **Vehicle Search & History**: Individual car ledger showing all historical passes and payments.
  - **Add Prepaid Pass Modal**:
    - Plate number, Owner name, Phone number, Vehicle category.
    - Start date (date-picker) & Pass Duration (Day, Week, Month, Custom Days).
    - Auto-computed expiry date & total fee based on settings.
    - Payment Method: Cash, BenefitPay / QR, Credit Card, Bank Transfer.
    - Reference number and cashier notes.
- **Horizontal Menu ([HorizontalMenu.jsx](file:///e:/parkingsolution/frontend/src/components/layout/HorizontalMenu.jsx))**:
  - Add "Prepaid Parking" navigation link with pass icon.

---

## 4. Verification Plan

1. **Database Migration**: Run migration to create `prepaid_passes` and `prepaid_ledger` tables, and seed initial settings.
2. **Backend Unit Tests**: Verify `PrepaidPassService`, `TariffCalculator`, and `DecisionEngine`.
3. **End-to-End Browser Tests**:
   - Update tariff settings in System Settings: Set Per Min (`BD 0.005`), Per Hour (`BD 0.200`), Per Day (`BD 2.000`), Per Month (`BD 35.000`).
   - Issue a 1-Month Prepaid Pass for vehicle `BHR 55443`, collected via `BenefitPay / QR`.
   - Verify `BHR 55443` is automatically whitelisted.
   - Verify financial ledger records the transaction and increments "Collected This Month".
   - Test ANPR Simulator entry for `BHR 55443` -> barrier auto-opens with `PREPAID_PASS_ENTRY`, Net Fee `0.000`.
   - Verify vehicle-based ledger page displays the car's complete payment history.
