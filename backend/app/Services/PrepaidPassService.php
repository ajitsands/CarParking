<?php
namespace App\Services;

use App\Core\Database;
use App\Helpers\TimezoneHelper;
use App\Helpers\CurrencyHelper;
use DateTime;
use Exception;

class PrepaidPassService {
    /**
     * Get configured tariff rates from system settings
     */
    public static function getTariffRates(): array {
        $db = Database::getInstance();
        $stmt = $db->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (
            'rate_per_minute', 'rate_per_hour', 'rate_per_day', 'rate_per_week', 'rate_per_month', 'default_grace_minutes', 'tariff_mode'
        )");
        $rows = $stmt->fetchAll();
        $rates = [
            'rate_per_minute' => 0.005,
            'rate_per_hour'   => 0.200,
            'rate_per_day'    => 2.000,
            'rate_per_week'   => 10.000,
            'rate_per_month'  => 35.000,
            'default_grace_minutes' => 30,
            'tariff_mode'     => 'hourly_daily_cap'
        ];

        foreach ($rows as $r) {
            $rates[$r['setting_key']] = is_numeric($r['setting_value']) ? (float)$r['setting_value'] : $r['setting_value'];
        }

        return $rates;
    }

    /**
     * Calculate cost and days for a prepaid pass duration
     */
    public static function calculateCost(string $durationType, int $durationValue): array {
        $rates = self::getTariffRates();
        $val = max(1, $durationValue);

        switch (strtolower($durationType)) {
            case 'day':
                $days = $val;
                $rate = $rates['rate_per_day'];
                $total = round($val * $rate, 3);
                break;
            case 'week':
                $days = $val * 7;
                $rate = $rates['rate_per_week'];
                $total = round($val * $rate, 3);
                break;
            case 'month':
                $days = $val * 30;
                $rate = $rates['rate_per_month'];
                $total = round($val * $rate, 3);
                break;
            case 'custom':
            default:
                $days = $val;
                $rate = $rates['rate_per_day'];
                $total = round($val * $rate, 3);
                break;
        }

        return [
            'duration_type'   => $durationType,
            'duration_value'  => $val,
            'total_days'      => $days,
            'rate_applied'    => $rate,
            'total_amount'    => $total,
            'formatted_total' => CurrencyHelper::format($total),
            'currency'        => CurrencyHelper::getConfig()['code']
        ];
    }

    /**
     * Issue a new prepaid parking pass, whitelist the vehicle, and record in ledger
     */
    public static function issuePass(array $data, ?int $userId = null, ?string $collectedByName = 'Front Desk Cashier'): array {
        $db = Database::getInstance();
        TimezoneHelper::init();

        $plate = strtoupper(trim($data['plate_number'] ?? ''));
        $owner = trim($data['owner_name'] ?? '');
        $phone = trim($data['owner_phone'] ?? '');
        $email = trim($data['owner_email'] ?? '');
        $vehType = trim($data['vehicle_type'] ?? 'Sedan');
        $durationType = trim($data['duration_type'] ?? 'month');
        $durationVal = max(1, (int)($data['duration_value'] ?? 1));
        $payMethod = strtolower(trim($data['payment_method'] ?? 'cash'));
        if (in_array($payMethod, ['qr', 'qr_code', 'benefit', 'benefitpay', 'benefit_pay'])) {
            $payMethod = 'qr_benefitpay';
        } elseif (in_array($payMethod, ['credit_card', 'debit_card', 'pos', 'creditcard'])) {
            $payMethod = 'card';
        } elseif (in_array($payMethod, ['bank', 'transfer', 'wire'])) {
            $payMethod = 'bank_transfer';
        }
        $payRef = trim($data['payment_reference'] ?? '');
        $notes = trim($data['notes'] ?? '');

        if (!$plate) {
            throw new Exception("Vehicle Plate Number is required");
        }
        if (!$owner) {
            throw new Exception("Vehicle Owner / Driver name is required");
        }

        $costData = self::calculateCost($durationType, $durationVal);
        $totalAmount = isset($data['total_amount']) && is_numeric($data['total_amount']) 
            ? (float)$data['total_amount'] 
            : $costData['total_amount'];

        $startDateStr = !empty($data['start_date']) ? $data['start_date'] : TimezoneHelper::now();
        $startDt = new DateTime($startDateStr);
        $totalDays = $costData['total_days'];

        // Expiry date = start date + total_days
        $expiryDt = clone $startDt;
        $expiryDt->modify("+{$totalDays} days");
        $expiryDateStr = $expiryDt->format('Y-m-d 23:59:59');
        $formattedStartDate = $startDt->format('Y-m-d H:i:s');

        $passCode = 'PASS-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
        $receiptNum = 'REC-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));

        // 1. Insert Prepaid Pass
        $stmtPass = $db->prepare("INSERT INTO prepaid_passes (
            pass_code, plate_number, owner_name, owner_phone, owner_email, vehicle_type,
            duration_type, duration_value, total_days, start_date, expiry_date,
            rate_applied, total_amount, payment_method, payment_reference, payment_status,
            status, created_by_user_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'active', ?, ?)");

        $stmtPass->execute([
            $passCode, $plate, $owner, $phone, $email, $vehType,
            $durationType, $durationVal, $totalDays, $formattedStartDate, $expiryDateStr,
            $costData['rate_applied'], $totalAmount, $payMethod, $payRef,
            $userId, $notes
        ]);
        $passId = (int)$db->lastInsertId();

        // 2. Automatically Whitelist Vehicle in vehicles table
        $stmtVeh = $db->prepare("INSERT INTO vehicles (
            plate_number, owner_name, owner_phone, vehicle_type, category, access_status,
            valid_from, valid_to, notes
        ) VALUES (?, ?, ?, ?, 'general', 'whitelisted', ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            owner_name = VALUES(owner_name),
            owner_phone = VALUES(owner_phone),
            category = 'general',
            access_status = 'whitelisted',
            valid_from = VALUES(valid_from),
            valid_to = VALUES(valid_to),
            notes = VALUES(notes)");

        $stmtVeh->execute([
            $plate, $owner, $phone, $vehType,
            $formattedStartDate, $expiryDateStr,
            "Prepaid Pass {$passCode} - Valid until " . $expiryDateStr
        ]);

        // 3. Insert into Financial Ledger
        $stmtLedger = $db->prepare("INSERT INTO prepaid_ledger (
            receipt_number, pass_id, plate_number, owner_name, transaction_type,
            duration_type, days_added, period_start, period_end, amount, currency,
            payment_method, payment_ref, collected_by, notes
        ) VALUES (?, ?, ?, ?, 'NEW_PASS', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $stmtLedger->execute([
            $receiptNum, $passId, $plate, $owner,
            ucfirst($durationType) . " ({$durationVal})",
            $totalDays, $formattedStartDate, $expiryDateStr,
            $totalAmount, CurrencyHelper::getConfig()['code'],
            $payMethod, $payRef, $collectedByName, $notes
        ]);
        $ledgerId = (int)$db->lastInsertId();

        return [
            'pass_id'        => $passId,
            'pass_code'      => $passCode,
            'receipt_number' => $receiptNum,
            'plate_number'   => $plate,
            'owner_name'     => $owner,
            'start_date'     => $formattedStartDate,
            'expiry_date'    => $expiryDateStr,
            'total_days'     => $totalDays,
            'amount_paid'    => $totalAmount,
            'formatted_amount'=> CurrencyHelper::format($totalAmount),
            'payment_method' => $payMethod,
            'status'         => 'active',
            'is_whitelisted' => true
        ];
    }

    /**
     * Renew an existing prepaid pass
     */
    public static function renewPass(int $passId, int $additionalUnits, ?string $payMethod = 'cash', ?string $payRef = '', ?string $collectedBy = 'Front Desk Cashier'): array {
        $db = Database::getInstance();
        TimezoneHelper::init();

        $stmt = $db->prepare("SELECT * FROM prepaid_passes WHERE id = ? LIMIT 1");
        $stmt->execute([$passId]);
        $pass = $stmt->fetch();

        if (!$pass) {
            throw new Exception("Prepaid pass not found");
        }

        $units = max(1, $additionalUnits);
        $costData = self::calculateCost($pass['duration_type'], $units);
        $additionalDays = $costData['total_days'];
        $amount = $costData['total_amount'];

        $payMethod = strtolower(trim($payMethod ?: 'cash'));
        if (in_array($payMethod, ['qr', 'qr_code', 'benefit', 'benefitpay', 'benefit_pay'])) {
            $payMethod = 'qr_benefitpay';
        } elseif (in_array($payMethod, ['credit_card', 'debit_card', 'pos', 'creditcard'])) {
            $payMethod = 'card';
        } elseif (in_array($payMethod, ['bank', 'transfer', 'wire'])) {
            $payMethod = 'bank_transfer';
        }

        // Base date for extension: if already expired, start from now; otherwise from current expiry
        $now = TimezoneHelper::now();
        $currentExpiry = $pass['expiry_date'];
        $baseDate = (strtotime($currentExpiry) < strtotime($now)) ? $now : $currentExpiry;

        $dt = new DateTime($baseDate);
        $newStart = $baseDate;
        $dt->modify("+{$additionalDays} days");
        $newExpiry = $dt->format('Y-m-d 23:59:59');

        // Update pass
        $db->prepare("UPDATE prepaid_passes SET 
            expiry_date = ?, 
            status = 'active', 
            total_days = total_days + ?, 
            total_amount = total_amount + ? 
            WHERE id = ?")->execute([$newExpiry, $additionalDays, $amount, $passId]);

        // Update vehicle whitelisting
        $db->prepare("UPDATE vehicles SET access_status = 'whitelisted', valid_to = ? WHERE plate_number = ?")
           ->execute([$newExpiry, $pass['plate_number']]);

        // Add to ledger
        $receiptNum = 'REC-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
        $stmtLedger = $db->prepare("INSERT INTO prepaid_ledger (
            receipt_number, pass_id, plate_number, owner_name, transaction_type,
            duration_type, days_added, period_start, period_end, amount, currency,
            payment_method, payment_ref, collected_by, notes
        ) VALUES (?, ?, ?, ?, 'RENEWAL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $stmtLedger->execute([
            $receiptNum, $passId, $pass['plate_number'], $pass['owner_name'],
            ucfirst($pass['duration_type']) . " ({$units})",
            $additionalDays, $newStart, $newExpiry,
            $amount, CurrencyHelper::getConfig()['code'],
            $payMethod, $payRef, $collectedBy, "Pass renewal for {$additionalDays} days"
        ]);

        return [
            'pass_id'        => $passId,
            'pass_code'      => $pass['pass_code'],
            'receipt_number' => $receiptNum,
            'plate_number'   => $pass['plate_number'],
            'new_expiry'     => $newExpiry,
            'amount_paid'    => $amount,
            'formatted_amount'=> CurrencyHelper::format($amount),
            'days_added'     => $additionalDays
        ];
    }

    /**
     * Check if a vehicle has an active valid prepaid pass
     */
    public static function getActivePassForPlate(string $plate): ?array {
        $db = Database::getInstance();
        $now = TimezoneHelper::now();
        $stmt = $db->prepare("SELECT * FROM prepaid_passes 
            WHERE plate_number = ? AND status = 'active' AND expiry_date >= ? 
            ORDER BY expiry_date DESC LIMIT 1");
        $stmt->execute([$plate, $now]);
        $pass = $stmt->fetch();
        return $pass ?: null;
    }

    /**
     * Get statistics including revenue collected this month, today, etc.
     */
    public static function getStats(?string $yearMonth = null): array {
        $db = Database::getInstance();
        TimezoneHelper::init();

        $monthStr = $yearMonth ?: date('Y-m'); // e.g. 2026-09
        $todayStr = date('Y-m-d');

        // 1. This Month's Collection
        $stmtMonth = $db->prepare("SELECT COALESCE(SUM(amount), 0) FROM prepaid_ledger WHERE DATE_FORMAT(created_at, '%Y-%m') = ?");
        $stmtMonth->execute([$monthStr]);
        $monthRevenue = (float)$stmtMonth->fetchColumn();

        // 2. Today's Collection
        $stmtToday = $db->prepare("SELECT COALESCE(SUM(amount), 0) FROM prepaid_ledger WHERE DATE(created_at) = ?");
        $stmtToday->execute([$todayStr]);
        $todayRevenue = (float)$stmtToday->fetchColumn();

        // 3. Active Passes Count
        $now = TimezoneHelper::now();
        $stmtActive = $db->prepare("SELECT COUNT(*) FROM prepaid_passes WHERE status = 'active' AND expiry_date >= ?");
        $stmtActive->execute([$now]);
        $activeCount = (int)$stmtActive->fetchColumn();

        // 4. Passes Expiring in 7 Days
        $in7Days = date('Y-m-d 23:59:59', strtotime('+7 days'));
        $stmtExp = $db->prepare("SELECT COUNT(*) FROM prepaid_passes WHERE status = 'active' AND expiry_date BETWEEN ? AND ?");
        $stmtExp->execute([$now, $in7Days]);
        $expiringCount = (int)$stmtExp->fetchColumn();

        // 5. Total All-time Prepaid Collection
        $stmtAll = $db->query("SELECT COALESCE(SUM(amount), 0) FROM prepaid_ledger");
        $totalAll = (float)$stmtAll->fetchColumn();

        // 6. Payment methods breakdown for this month
        $stmtMethods = $db->prepare("SELECT payment_method, COUNT(*) as count, SUM(amount) as total 
            FROM prepaid_ledger 
            WHERE DATE_FORMAT(created_at, '%Y-%m') = ? 
            GROUP BY payment_method");
        $stmtMethods->execute([$monthStr]);
        $methodsBreakdown = $stmtMethods->fetchAll();

        return [
            'selected_month'         => $monthStr,
            'collected_this_month'   => $monthRevenue,
            'formatted_this_month'   => CurrencyHelper::format($monthRevenue),
            'collected_today'        => $todayRevenue,
            'formatted_today'        => CurrencyHelper::format($todayRevenue),
            'active_passes_count'    => $activeCount,
            'expiring_soon_count'    => $expiringCount,
            'total_all_time'         => $totalAll,
            'formatted_total_all'    => CurrencyHelper::format($totalAll),
            'payment_breakdown'      => $methodsBreakdown,
            'currency'               => CurrencyHelper::getConfig()
        ];
    }
}
