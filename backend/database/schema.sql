-- Smart Hospital Parking Management & Visitor Validation System
-- Database Schema for MySQL 8.x
-- Local: car_parking_solution / Server: sandsl23_parking_db

CREATE DATABASE IF NOT EXISTS `car_parking_solution` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `car_parking_solution`;

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) UNIQUE NOT NULL,
  `setting_value` TEXT,
  `category` VARCHAR(50) DEFAULT 'general',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. System Licenses (SaNDS Lab Asymmetric Offline Licensing System)
CREATE TABLE IF NOT EXISTS `system_licenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `license_key` VARCHAR(255) NOT NULL,
  `token` LONGTEXT NULL,
  `public_key` TEXT NULL,
  `domain_name` VARCHAR(255) NULL,
  `ip_address` VARCHAR(100) NULL,
  `payload_data` LONGTEXT NULL,
  `issued_to` VARCHAR(255) NOT NULL DEFAULT 'KIMSHEALTH',
  `duration_days` INT NOT NULL DEFAULT 365,
  `expires_at` DATETIME NOT NULL,
  `max_lanes` INT DEFAULT 10,
  `status` ENUM('active', 'expired', 'suspended') DEFAULT 'active',
  `activated_at` DATETIME NULL,
  `checksum` VARCHAR(255) NULL,
  `updated_by` INT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Server Configuration Table (Superadmin Configurable URL & DB)
CREATE TABLE IF NOT EXISTS `server_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `environment` ENUM('local', 'production', 'custom') DEFAULT 'local',
  `server_url` VARCHAR(255) NOT NULL DEFAULT 'http://localhost:8000',
  `db_host` VARCHAR(100) NOT NULL DEFAULT '127.0.0.1',
  `db_port` INT NOT NULL DEFAULT 3306,
  `db_name` VARCHAR(100) NOT NULL DEFAULT 'car_parking_solution',
  `db_user` VARCHAR(100) NOT NULL DEFAULT 'root',
  `db_password` VARCHAR(255) NOT NULL DEFAULT 'S@nds1@b',
  `production_server_url` VARCHAR(255) DEFAULT 'https://parking.sandslab.com',
  `production_db_host` VARCHAR(100) DEFAULT 'parking.sandslab.com',
  `production_db_port` INT DEFAULT 3306,
  `production_db_name` VARCHAR(100) DEFAULT 'sandsl23_parking_db',
  `production_db_user` VARCHAR(100) DEFAULT 'sandsl23_parking_users',
  `production_db_password` VARCHAR(255) DEFAULT 'S@nds1@b',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Users Table (RBAC)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30),
  `role` ENUM('superadmin', 'admin', 'operator') NOT NULL DEFAULT 'operator',
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `last_login` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Vehicles Table (Whitelist, Blacklist, Priority, Categories)
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plate_number` VARCHAR(30) UNIQUE NOT NULL,
  `plate_code` VARCHAR(20) DEFAULT '',
  `country_code` VARCHAR(10) DEFAULT 'BHR',
  `vehicle_type` VARCHAR(30) DEFAULT 'car',
  `category` ENUM('general', 'patient', 'visitor', 'staff', 'doctor', 'vendor', 'emergency', 'hospital_owned') DEFAULT 'general',
  `access_status` ENUM('standard', 'whitelisted', 'blacklisted') DEFAULT 'standard',
  `owner_name` VARCHAR(100) NULL,
  `owner_phone` VARCHAR(30) NULL,
  `owner_department` VARCHAR(100) NULL,
  `valid_from` DATETIME NULL,
  `valid_to` DATETIME NULL,
  `block_reason` TEXT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_plate` (`plate_number`),
  INDEX `idx_status` (`access_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Parking Sessions Table (Core Lifecycle)
CREATE TABLE IF NOT EXISTS `parking_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_code` VARCHAR(50) UNIQUE NOT NULL,
  `vehicle_id` INT NULL,
  `plate_number` VARCHAR(30) NOT NULL,
  `entry_time` DATETIME NOT NULL,
  `exit_time` DATETIME NULL,
  `entry_gate_id` VARCHAR(50) DEFAULT 'GATE-IN-01',
  `exit_gate_id` VARCHAR(50) NULL,
  `entry_image_url` TEXT NULL,
  `exit_image_url` TEXT NULL,
  `entry_confidence` DECIMAL(5,2) DEFAULT 98.50,
  `exit_confidence` DECIMAL(5,2) NULL,
  `status` ENUM(
    'ENTRY_DETECTED', 
    'ENTRY_ALLOWED', 
    'VALIDATION_PENDING', 
    'VALIDATED', 
    'CHARGING', 
    'PAYMENT_PENDING', 
    'PAID', 
    'EXIT_AUTHORIZED', 
    'EXIT_COMPLETED', 
    'BLACKLISTED', 
    'MANUAL_REVIEW', 
    'CANCELLED'
  ) DEFAULT 'VALIDATION_PENDING',
  `validation_deadline` DATETIME NOT NULL,
  `validated_at` DATETIME NULL,
  `validation_method` ENUM('none', 'appointment_qr', 'reception', 'auto_appointment', 'whitelisted', 'emergency', 'manual_waived') DEFAULT 'none',
  `validation_ref` VARCHAR(100) NULL,
  `validated_by` INT NULL,
  `grace_period_minutes` INT DEFAULT 30,
  `total_duration_minutes` INT DEFAULT 0,
  `charged_duration_minutes` INT DEFAULT 0,
  `rate_applied` DECIMAL(10,3) DEFAULT 0.000,
  `total_amount` DECIMAL(10,3) DEFAULT 0.000,
  `discount_amount` DECIMAL(10,3) DEFAULT 0.000,
  `net_amount` DECIMAL(10,3) DEFAULT 0.000,
  `paid_amount` DECIMAL(10,3) DEFAULT 0.000,
  `payment_status` ENUM('unpaid', 'paid', 'waived', 'failed') DEFAULT 'unpaid',
  `manual_review_reason` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sess_plate` (`plate_number`),
  INDEX `idx_sess_status` (`status`),
  INDEX `idx_sess_entry` (`entry_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ANPR Events Table (Raw webhook logs & images)
CREATE TABLE IF NOT EXISTS `anpr_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` INT NULL,
  `camera_id` VARCHAR(50) NOT NULL,
  `gate_id` VARCHAR(50) NOT NULL,
  `direction` ENUM('ENTRY', 'EXIT') NOT NULL,
  `plate_number` VARCHAR(30) NOT NULL,
  `confidence` DECIMAL(5,2) DEFAULT 0.00,
  `plate_image_url` TEXT NULL,
  `overview_image_url` TEXT NULL,
  `clip_url` TEXT NULL,
  `raw_payload` LONGTEXT NULL,
  `received_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('processed', 'ignored', 'manual_review') DEFAULT 'processed',
  INDEX `idx_anpr_plate` (`plate_number`),
  INDEX `idx_anpr_time` (`received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Visitor Validations Table (Methods A, B, C)
CREATE TABLE IF NOT EXISTS `visitor_validations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` INT NOT NULL,
  `patient_mrn` VARCHAR(50) NULL,
  `appointment_id` VARCHAR(50) NULL,
  `visitor_name` VARCHAR(100) NULL,
  `visitor_phone` VARCHAR(30) NULL,
  `qr_token` VARCHAR(255) NULL,
  `validation_type` ENUM('appointment_qr', 'reception_manual', 'auto_matched', 'doctor_signed', 'vip_waive') DEFAULT 'reception_manual',
  `validated_by_user_id` INT NULL,
  `free_minutes_granted` INT DEFAULT 180,
  `discount_percent` DECIMAL(5,2) DEFAULT 100.00,
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_val_session` (`session_id`),
  INDEX `idx_val_token` (`qr_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. HIS Appointments Table (Sync with Hospital HIS / Schedulers)
CREATE TABLE IF NOT EXISTS `his_appointments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `appointment_code` VARCHAR(50) UNIQUE NOT NULL,
  `patient_mrn` VARCHAR(50) NOT NULL,
  `patient_name` VARCHAR(100) NOT NULL,
  `patient_phone` VARCHAR(30) NULL,
  `doctor_name` VARCHAR(100) NULL,
  `department` VARCHAR(100) NULL,
  `appointment_datetime` DATETIME NOT NULL,
  `registered_plate_number` VARCHAR(30) NULL,
  `qr_token` VARCHAR(255) UNIQUE NOT NULL,
  `status` ENUM('scheduled', 'checked_in', 'completed', 'cancelled') DEFAULT 'scheduled',
  `is_validated` TINYINT(1) DEFAULT 0,
  `validated_session_id` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_his_plate` (`registered_plate_number`),
  INDEX `idx_his_token` (`qr_token`),
  INDEX `idx_his_date` (`appointment_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tariff Rules Table (Slabs, Grace Period, Maximum Cap)
CREATE TABLE IF NOT EXISTS `tariff_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rule_name` VARCHAR(100) NOT NULL,
  `vehicle_category` VARCHAR(50) DEFAULT 'general',
  `free_grace_minutes` INT NOT NULL DEFAULT 30,
  `slot_duration_minutes` INT NOT NULL DEFAULT 30,
  `rate_per_slot` DECIMAL(10,3) NOT NULL DEFAULT 0.100,
  `max_daily_cap` DECIMAL(10,3) NOT NULL DEFAULT 2.000,
  `lost_ticket_fee` DECIMAL(10,3) NOT NULL DEFAULT 5.000,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Payments Table (Cash, Card, BenefitPay, ApplePay, QR)
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` INT NOT NULL,
  `transaction_code` VARCHAR(64) UNIQUE NOT NULL,
  `amount` DECIMAL(10,3) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'BHD',
  `payment_method` ENUM('cash', 'card', 'benefit_pay', 'apple_pay', 'knet', 'upi', 'gateway_qr') NOT NULL DEFAULT 'cash',
  `gateway_ref` VARCHAR(100) NULL,
  `gateway_status` VARCHAR(50) DEFAULT 'COMPLETED',
  `collected_by_user_id` INT NULL,
  `notes` TEXT NULL,
  `paid_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pay_session` (`session_id`),
  INDEX `idx_pay_tx` (`transaction_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Barrier Logs Table (Audit of every barrier command and manual override)
CREATE TABLE IF NOT EXISTS `barrier_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `gate_id` VARCHAR(50) NOT NULL,
  `direction` ENUM('ENTRY', 'EXIT') NOT NULL,
  `plate_number` VARCHAR(30) NULL,
  `trigger_type` ENUM('anpr_auto_entry', 'anpr_auto_exit', 'payment_success', 'manual_override', 'emergency_priority', 'test_signal') NOT NULL,
  `command_sent` VARCHAR(100) NOT NULL,
  `relay_response` VARCHAR(100) DEFAULT 'SUCCESS',
  `operator_id` INT NULL,
  `override_reason` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_barrier_gate` (`gate_id`),
  INDEX `idx_barrier_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Gates and Cameras Table
CREATE TABLE IF NOT EXISTS `gates_and_cameras` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `gate_code` VARCHAR(50) UNIQUE NOT NULL,
  `gate_name` VARCHAR(100) NOT NULL,
  `gate_type` ENUM('entry', 'exit', 'bidirectional') DEFAULT 'entry',
  `camera_name` VARCHAR(100) DEFAULT 'ANPR Cam 1',
  `camera_ip` VARCHAR(50) DEFAULT '192.168.1.101',
  `relay_ip` VARCHAR(50) DEFAULT '192.168.1.201',
  `relay_port` INT DEFAULT 8080,
  `relay_command` VARCHAR(100) DEFAULT 'OPEN_RELAY_1',
  `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Audit Logs Table (Immutable system history)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `username` VARCHAR(50) NULL,
  `action` VARCHAR(100) NOT NULL,
  `plate_number` VARCHAR(30) NULL,
  `start_time` DATETIME NULL,
  `end_time` DATETIME NULL,
  `duration_minutes` INT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(50) NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(50) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_plate` (`plate_number`),
  INDEX `idx_audit_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Prepaid Parking Passes Table (Daily, Weekly, Monthly Passes)
CREATE TABLE IF NOT EXISTS `prepaid_passes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pass_code` VARCHAR(50) UNIQUE NOT NULL,
  `plate_number` VARCHAR(30) NOT NULL,
  `owner_name` VARCHAR(100) NOT NULL,
  `owner_phone` VARCHAR(30) NULL,
  `owner_email` VARCHAR(100) NULL,
  `vehicle_type` VARCHAR(50) DEFAULT 'Sedan',
  `duration_type` ENUM('day', 'week', 'month', 'custom') NOT NULL DEFAULT 'month',
  `duration_value` INT NOT NULL DEFAULT 1,
  `total_days` INT NOT NULL DEFAULT 30,
  `start_date` DATETIME NOT NULL,
  `expiry_date` DATETIME NOT NULL,
  `rate_applied` DECIMAL(10,3) NOT NULL,
  `total_amount` DECIMAL(10,3) NOT NULL,
  `payment_method` ENUM('cash', 'card', 'qr_benefitpay', 'bank_transfer', 'cheque') NOT NULL DEFAULT 'cash',
  `payment_reference` VARCHAR(100) NULL,
  `payment_status` ENUM('paid', 'pending', 'cancelled', 'refunded') NOT NULL DEFAULT 'paid',
  `status` ENUM('active', 'expired', 'suspended', 'cancelled') NOT NULL DEFAULT 'active',
  `created_by_user_id` INT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_pp_plate` (`plate_number`),
  INDEX `idx_pp_status` (`status`),
  INDEX `idx_pp_dates` (`start_date`, `expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Prepaid Financial & Vehicle Ledger Table
CREATE TABLE IF NOT EXISTS `prepaid_ledger` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `receipt_number` VARCHAR(60) UNIQUE NOT NULL,
  `pass_id` INT NOT NULL,
  `plate_number` VARCHAR(30) NOT NULL,
  `owner_name` VARCHAR(100) NOT NULL,
  `transaction_type` ENUM('NEW_PASS', 'RENEWAL', 'EXTENSION', 'ADJUSTMENT', 'REFUND') NOT NULL DEFAULT 'NEW_PASS',
  `duration_type` VARCHAR(30) NOT NULL,
  `days_added` INT NOT NULL,
  `period_start` DATETIME NOT NULL,
  `period_end` DATETIME NOT NULL,
  `amount` DECIMAL(10,3) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'BHD',
  `payment_method` ENUM('cash', 'card', 'qr_benefitpay', 'bank_transfer', 'cheque') NOT NULL DEFAULT 'cash',
  `payment_ref` VARCHAR(100) NULL,
  `collected_by` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pl_plate` (`plate_number`),
  INDEX `idx_pl_date` (`created_at`),
  INDEX `idx_pl_method` (`payment_method`),
  CONSTRAINT `fk_pl_pass` FOREIGN KEY (`pass_id`) REFERENCES `prepaid_passes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
