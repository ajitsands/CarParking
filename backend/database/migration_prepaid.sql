USE `car_parking_solution`;

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

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `category`) VALUES
('rate_per_minute', '0.005', 'tariff'),
('rate_per_hour', '0.200', 'tariff'),
('rate_per_day', '2.000', 'tariff'),
('rate_per_week', '10.000', 'tariff'),
('rate_per_month', '35.000', 'tariff'),
('tariff_mode', 'hourly_daily_cap', 'tariff')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
