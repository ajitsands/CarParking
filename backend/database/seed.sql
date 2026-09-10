-- Seed Data for Smart Hospital Parking & Visitor Validation System
USE `car_parking_solution`;

-- 1. System Settings Defaults
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `category`) VALUES
('company_name', 'KIMSHEALTH Medical Center', 'branding'),
('company_subtitle', 'Smart Hospital Parking & Visitor Validation', 'branding'),
('company_logo', '', 'branding'),
('timezone', 'Asia/Bahrain', 'localization'),
('date_format', 'DD/MM/YYYY', 'localization'),
('time_format', '12h', 'localization'),
('currency_code', 'BHD', 'localization'),
('currency_symbol', 'BD', 'localization'),
('currency_decimals', '3', 'localization'),
('default_grace_minutes', '30', 'parking'),
('emergency_auto_open', '1', 'parking'),
('anti_tailgating_enabled', '1', 'safety'),
('relay_pulse_duration_ms', '800', 'hardware'),
('payment_gateway_provider', 'BenefitPay', 'payment'),
('notification_channel', 'whatsapp', 'notification'),
('menu_theme', 'pink_blue', 'appearance'),
('menu_color_primary', '#ec4899', 'appearance'),
('menu_color_secondary', '#2563eb', 'appearance')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 2. Server Configuration
INSERT INTO `server_configs` (
  `id`, `environment`, `server_url`, `db_host`, `db_port`, `db_name`, `db_user`, `db_password`,
  `production_server_url`, `production_db_host`, `production_db_port`, `production_db_name`, `production_db_user`, `production_db_password`
) VALUES (
  1, 'local', 'http://localhost:8000', '127.0.0.1', 3306, 'car_parking_solution', 'root', 'S@nds1@b',
  'https://parking.sandslab.com', 'parking.sandslab.com', 3306, 'sandsl23_parking_db', 'sandsl23_parking_users', 'S@nds1@b'
) ON DUPLICATE KEY UPDATE `server_url` = VALUES(`server_url`);

-- 3. System License (Default 365 days)
INSERT INTO `system_licenses` (`id`, `license_key`, `issued_to`, `duration_days`, `expires_at`, `max_lanes`, `status`, `checksum`)
VALUES (
  1,
  'KIMS-SANDS-2026-PARK-8829X',
  'KIMSHEALTH',
  365,
  DATE_ADD(NOW(), INTERVAL 365 DAY),
  10,
  'active',
  'SHA256:4d8e92a17b0c3f56e890c2'
) ON DUPLICATE KEY UPDATE `expires_at` = VALUES(`expires_at`);

-- 4. Initial Users
-- Passwords:
-- superadmin -> S@nds1@b
-- admin -> Admin@12345
-- operator -> User@12345
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `phone`, `role`, `status`) VALUES
(1, 'superadmin', 'superadmin@sandslab.com', '$2y$10$PrQ.kcowU.94/wQp4O/Gsu6gaEegWGB2DdE0atmpaw2zBazKMdxVS', 'SaNDS Super Administrator', '+973 3300 0000', 'superadmin', 'active'),
(2, 'admin', 'admin@kimshealth.com', '$2y$10$7BRA3BOeIgxYz5ftvCaYX.n4DLfcHJVJwYedC7Qqe50oY1c1Hu0LK', 'Hospital Security Admin', '+973 3311 2233', 'admin', 'active'),
(3, 'operator', 'operator@kimshealth.com', '$2y$10$WTtCdAiisW8e7mg3dJZWYehrbGNRqz85C0QpoFBAMCZlVDpWkfEMG', 'Gate Operator - Day Shift', '+973 3344 5566', 'operator', 'active'),
(4, 'receptionist', 'reception@kimshealth.com', '$2y$10$WTtCdAiisW8e7mg3dJZWYehrbGNRqz85C0QpoFBAMCZlVDpWkfEMG', 'OPD Reception Desk', '+973 3377 8899', 'operator', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- 5. Default Gates & Cameras
INSERT INTO `gates_and_cameras` (`id`, `gate_code`, `gate_name`, `gate_type`, `camera_name`, `camera_ip`, `relay_ip`, `relay_port`, `relay_command`, `is_active`) VALUES
(1, 'GATE-IN-01', 'North Gate Entry (Main Entrance)', 'entry', 'ANPR-ENTRY-CAM-01', '192.168.1.101', '192.168.1.201', 8080, 'RELAY_CH1_PULSE', 1),
(2, 'GATE-OUT-01', 'North Gate Exit (Main Exit)', 'exit', 'ANPR-EXIT-CAM-01', '192.168.1.102', '192.168.1.202', 8080, 'RELAY_CH1_PULSE', 1)
ON DUPLICATE KEY UPDATE `gate_name` = VALUES(`gate_name`);

-- 6. Tariff Rules (30 min grace period, 0.100 BHD per 30 mins, 2.000 max daily cap)
INSERT INTO `tariff_rules` (`id`, `rule_name`, `vehicle_category`, `free_grace_minutes`, `slot_duration_minutes`, `rate_per_slot`, `max_daily_cap`, `lost_ticket_fee`, `is_active`) VALUES
(1, 'Standard Visitor Tariff', 'general', 30, 30, 0.100, 2.000, 5.000, 1),
(2, 'Patient Validated Tariff', 'patient', 180, 60, 0.000, 0.000, 0.000, 1),
(3, 'Staff / Doctor Tariff', 'staff', 1440, 60, 0.000, 0.000, 0.000, 1)
ON DUPLICATE KEY UPDATE `rule_name` = VALUES(`rule_name`);

-- 7. Sample Vehicles (Whitelist, Blacklist, Priority)
INSERT INTO `vehicles` (`id`, `plate_number`, `plate_code`, `country_code`, `vehicle_type`, `category`, `access_status`, `owner_name`, `owner_phone`, `owner_department`, `valid_from`, `valid_to`, `block_reason`, `notes`) VALUES
(1, 'BHR 11223', 'A', 'BHR', 'car', 'doctor', 'whitelisted', 'Dr. Tariq Al-Hashimi', '+973 3911 2233', 'Cardiology Dept', '2026-01-01', '2027-12-31', NULL, 'Chief Consultant - Level 1 Parking'),
(2, 'BHR 99999', '', 'BHR', 'van', 'emergency', 'whitelisted', 'KIMSHEALTH Ambulance Unit 1', '+973 3999 9999', 'Emergency Services', '2026-01-01', '2030-12-31', NULL, 'Priority Emergency Vehicle - Auto Open'),
(3, 'BHR 55443', 'B', 'BHR', 'car', 'staff', 'whitelisted', 'Fatima Ebrahim', '+973 3855 4433', 'Hospital Administration', '2026-01-01', '2027-12-31', NULL, 'Administrative Director'),
(4, 'BHR 66666', '', 'BHR', 'car', 'general', 'blacklisted', 'Unknown Offender', '', 'Security Alert', '2026-01-01', '2027-12-31', 'Repeated unauthorized commercial parking and tailgating offenses', 'Alert security immediately on entry attempt')
ON DUPLICATE KEY UPDATE `owner_name` = VALUES(`owner_name`);

-- 8. Sample HIS Appointments (For QR validation and auto-match testing)
INSERT INTO `his_appointments` (`id`, `appointment_code`, `patient_mrn`, `patient_name`, `patient_phone`, `doctor_name`, `department`, `appointment_datetime`, `registered_plate_number`, `qr_token`, `status`, `is_validated`) VALUES
(1, 'APT-2026-001', 'MRN-88192', 'Ahmed Al-Sayed', '+973 3611 0022', 'Dr. Tariq Al-Hashimi', 'Cardiology', NOW(), 'BHR 43210', 'QR-KIMS-88192-43210-XYZ', 'scheduled', 0),
(2, 'APT-2026-002', 'MRN-90214', 'Sara Mohammed', '+973 3622 3344', 'Dr. Laila Yousif', 'Pediatrics', NOW(), 'BHR 78901', 'QR-KIMS-90214-78901-ABC', 'scheduled', 0)
ON DUPLICATE KEY UPDATE `patient_name` = VALUES(`patient_name`);
