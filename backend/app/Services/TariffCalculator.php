<?php
namespace App\Services;

use App\Core\Database;
use App\Helpers\CurrencyHelper;
use DateTime;

class TariffCalculator {
    public static function getAdminGraceMinutes(): int {
        try {
            $db = Database::getInstance();
            $stmt = $db->query("SELECT setting_value FROM system_settings WHERE setting_key = 'default_grace_minutes' LIMIT 1");
            $val = $stmt->fetchColumn();
            return $val !== false ? (int)$val : 30;
        } catch (\Throwable $e) {
            return 30;
        }
    }

    public static function calculate(array $session, ?string $exitTimeStr = null): array {
        \App\Helpers\TimezoneHelper::init();
        $adminGraceMinutes = self::getAdminGraceMinutes();

        $entryTs = strtotime($session['entry_time']);
        $exitTs = $exitTimeStr ? strtotime($exitTimeStr) : strtotime(\App\Helpers\TimezoneHelper::now());

        if ($exitTs < $entryTs) {
            $exitTs = $entryTs;
        }

        $totalMinutes = max(0, (int)round(($exitTs - $entryTs) / 60));

        // For active sessions, always use active admin-configured grace period
        $graceMinutes = empty($session['exit_time']) 
            ? $adminGraceMinutes 
            : (isset($session['grace_period_minutes']) && $session['grace_period_minutes'] > 0 ? (int)$session['grace_period_minutes'] : $adminGraceMinutes);

        // If session is already validated or whitelisted, rate is 0
        if ($session['status'] === 'VALIDATED') {
            return [
                'total_minutes'     => $totalMinutes,
                'grace_minutes'     => $graceMinutes,
                'chargeable_minutes'=> 0,
                'slots'             => 0,
                'rate_per_slot'     => 0.000,
                'gross_amount'      => 0.000,
                'discount'          => 0.000,
                'net_amount'        => 0.000,
                'formatted_net'     => CurrencyHelper::format(0.000),
                'currency'          => CurrencyHelper::getConfig()['code'],
                'is_free'           => true,
                'reason'            => 'Visitor / Patient appointment validated'
            ];
        }

        // Check if vehicle has an active Prepaid Parking Pass
        $activePass = \App\Services\PrepaidPassService::getActivePassForPlate($session['plate_number'] ?? '');
        if ($activePass) {
            return [
                'total_minutes'     => $totalMinutes,
                'grace_minutes'     => $graceMinutes,
                'chargeable_minutes'=> 0,
                'slots'             => 0,
                'rate_per_slot'     => 0.000,
                'gross_amount'      => 0.000,
                'discount'          => 0.000,
                'net_amount'        => 0.000,
                'formatted_net'     => CurrencyHelper::format(0.000),
                'currency'          => CurrencyHelper::getConfig()['code'],
                'is_free'           => true,
                'is_prepaid'        => true,
                'pass_code'         => $activePass['pass_code'],
                'reason'            => "Active Prepaid Parking Pass ({$activePass['pass_code']})"
            ];
        }

        // If vehicle leaves within the grace period (e.g. 5m, 10m, 30m), parking is 100% free!
        if ($totalMinutes <= $graceMinutes) {
            return [
                'total_minutes'     => $totalMinutes,
                'grace_minutes'     => $graceMinutes,
                'chargeable_minutes'=> 0,
                'slots'             => 0,
                'rate_per_slot'     => 0.000,
                'gross_amount'      => 0.000,
                'discount'          => 0.000,
                'net_amount'        => 0.000,
                'formatted_net'     => CurrencyHelper::format(0.000),
                'currency'          => CurrencyHelper::getConfig()['code'],
                'is_free'           => true,
                'reason'            => "Within grace period ({$graceMinutes} mins)"
            ];
        }

        // Fetch configured tariff rates from system settings
        $rates = \App\Services\PrepaidPassService::getTariffRates();
        $ratePerMinute = (float)($rates['rate_per_minute'] ?? 0.005);
        $ratePerHour   = (float)($rates['rate_per_hour'] ?? 0.200);
        $ratePerDay    = (float)($rates['rate_per_day'] ?? 2.000);
        $tariffMode    = $rates['tariff_mode'] ?? 'hourly_daily_cap';

        // Chargeable duration begins after grace period
        $chargeableMinutes = $totalMinutes - $graceMinutes;

        if ($tariffMode === 'per_minute') {
            $gross = round($chargeableMinutes * $ratePerMinute, 3);
            $reason = "Per-minute billing: {$chargeableMinutes} mins @ " . CurrencyHelper::format($ratePerMinute) . "/min";
        } else {
            // Standard Hourly Billing with 24-hour Daily Cap
            $days = (int)floor($chargeableMinutes / 1440);
            $remMinutes = $chargeableMinutes % 1440;
            $hours = (int)ceil($remMinutes / 60);

            $dayCharge = $days * $ratePerDay;
            $hourCharge = ($hours * $ratePerHour > $ratePerDay) ? $ratePerDay : ($hours * $ratePerHour);
            $gross = round($dayCharge + $hourCharge, 3);

            if ($days > 0) {
                $reason = "Multi-day billing: {$days} days + {$hours} hrs";
            } else {
                $reason = "Hourly billing: {$hours} hrs @ " . CurrencyHelper::format($ratePerHour) . "/hr (Daily cap: " . CurrencyHelper::format($ratePerDay) . ")";
            }
        }

        $discount = (float)($session['discount_amount'] ?? 0.000);
        $net = max(0.000, $gross - $discount);

        return [
            'total_minutes'     => $totalMinutes,
            'grace_minutes'     => $graceMinutes,
            'chargeable_minutes'=> $chargeableMinutes,
            'rate_per_minute'   => $ratePerMinute,
            'rate_per_hour'     => $ratePerHour,
            'rate_per_day'      => $ratePerDay,
            'gross_amount'      => $gross,
            'discount'          => $discount,
            'net_amount'        => $net,
            'formatted_net'     => CurrencyHelper::format($net),
            'currency'          => CurrencyHelper::getConfig()['code'],
            'is_free'           => false,
            'reason'            => $reason
        ];
    }
}
