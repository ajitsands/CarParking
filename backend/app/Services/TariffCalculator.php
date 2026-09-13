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

        $entryTs = strtotime($session['entry_time'] ?? 'now');
        $exitTs = $exitTimeStr ? strtotime($exitTimeStr) : strtotime(\App\Helpers\TimezoneHelper::now());

        if ($exitTs < $entryTs) {
            $exitTs = $entryTs;
        }

        $totalMinutes = max(0, (int)round(($exitTs - $entryTs) / 60));

        $valMethod = $session['validation_method'] ?? 'none';
        $plate = $session['plate_number'] ?? '';

        // 1. Unlimited Free: Whitelisted Vehicles or Emergency
        if ($valMethod === 'whitelisted' || $valMethod === 'emergency' || ($session['access_status'] ?? '') === 'whitelisted') {
            return [
                'total_minutes'     => $totalMinutes,
                'grace_minutes'     => $totalMinutes,
                'chargeable_minutes'=> 0,
                'slots'             => 0,
                'rate_per_slot'     => 0.000,
                'gross_amount'      => 0.000,
                'discount'          => 0.000,
                'net_amount'        => 0.000,
                'formatted_net'     => CurrencyHelper::format(0.000),
                'currency'          => CurrencyHelper::getConfig()['code'],
                'is_free'           => true,
                'reason'            => ($valMethod === 'emergency') ? 'Emergency vehicle authorized (100% Free)' : 'Whitelisted vehicle authorized (100% Free)'
            ];
        }

        // 2. Active Prepaid Parking Pass
        if ($plate) {
            $activePass = \App\Services\PrepaidPassService::getActivePassForPlate($plate);
            if ($activePass) {
                return [
                    'total_minutes'     => $totalMinutes,
                    'grace_minutes'     => $totalMinutes,
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
        }

        // 3. Determine Granted Free Allowance Minutes (Grace / Validation)
        $freeMinutes = 0;
        $isValidated = ($session['status'] === 'VALIDATED') || (!empty($valMethod) && $valMethod !== 'none');

        if (!empty($session['grace_period_minutes']) && (int)$session['grace_period_minutes'] > 0) {
            $freeMinutes = (int)$session['grace_period_minutes'];
        } elseif (!empty($session['free_minutes_granted']) && (int)$session['free_minutes_granted'] > 0) {
            $freeMinutes = (int)$session['free_minutes_granted'];
        } elseif ($isValidated && !empty($session['id'])) {
            try {
                $db = Database::getInstance();
                $stmtVal = $db->prepare("SELECT free_minutes_granted FROM visitor_validations WHERE session_id = ? ORDER BY id DESC LIMIT 1");
                $stmtVal->execute([(int)$session['id']]);
                $valMins = $stmtVal->fetchColumn();
                if ($valMins !== false && (int)$valMins > 0) {
                    $freeMinutes = (int)$valMins;
                }
            } catch (\Throwable $e) {}
        }

        // If no custom validation minutes found, fallback to system grace period
        if ($freeMinutes <= 0) {
            $freeMinutes = $adminGraceMinutes;
        }

        // 4. If within granted free minutes (e.g. 5 hours / 300 mins or 30 mins grace), parking is 100% Free!
        if ($totalMinutes <= $freeMinutes) {
            $label = $isValidated 
                ? "Within hospital validated free period ({$freeMinutes} mins)" 
                : "Within grace period ({$freeMinutes} mins)";

            return [
                'total_minutes'     => $totalMinutes,
                'grace_minutes'     => $freeMinutes,
                'chargeable_minutes'=> 0,
                'slots'             => 0,
                'rate_per_slot'     => 0.000,
                'gross_amount'      => 0.000,
                'discount'          => 0.000,
                'net_amount'        => 0.000,
                'formatted_net'     => CurrencyHelper::format(0.000),
                'currency'          => CurrencyHelper::getConfig()['code'],
                'is_free'           => true,
                'reason'            => $label
            ];
        }

        // 5. Exceeded Free Duration -> Chargeable Overstay Minutes!
        $chargeableMinutes = $totalMinutes - $freeMinutes;

        // Fetch configured tariff rates
        $rates = \App\Services\PrepaidPassService::getTariffRates();
        $ratePerMinute = (float)($rates['rate_per_minute'] ?? 0.005);
        $ratePerHour   = (float)($rates['rate_per_hour'] ?? 0.200);
        $ratePerDay    = (float)($rates['rate_per_day'] ?? 2.000);
        $tariffMode    = $rates['tariff_mode'] ?? 'hourly_daily_cap';

        if ($tariffMode === 'per_minute') {
            $gross = round($chargeableMinutes * $ratePerMinute, 3);
            $reason = $isValidated 
                ? "Validated for {$freeMinutes} mins. Overstay billing: {$chargeableMinutes} mins @ " . CurrencyHelper::format($ratePerMinute) . "/min"
                : "Per-minute billing: {$chargeableMinutes} mins @ " . CurrencyHelper::format($ratePerMinute) . "/min";
        } else {
            // Standard Hourly Billing with 24-hour Daily Cap
            $days = (int)floor($chargeableMinutes / 1440);
            $remMinutes = $chargeableMinutes % 1440;
            $hours = (int)ceil($remMinutes / 60);

            $dayCharge = $days * $ratePerDay;
            $hourCharge = ($hours * $ratePerHour > $ratePerDay) ? $ratePerDay : ($hours * $ratePerHour);
            $gross = round($dayCharge + $hourCharge, 3);

            if ($isValidated) {
                $valHrs = round($freeMinutes / 60, 1);
                $reason = "Validated for {$valHrs} hrs free. Overstay fee: " . ($days > 0 ? "{$days} days + {$hours} hrs" : "{$hours} hrs @ " . CurrencyHelper::format($ratePerHour) . "/hr");
            } else {
                if ($days > 0) {
                    $reason = "Multi-day billing: {$days} days + {$hours} hrs";
                } else {
                    $reason = "Hourly billing: {$hours} hrs @ " . CurrencyHelper::format($ratePerHour) . "/hr (Daily cap: " . CurrencyHelper::format($ratePerDay) . ")";
                }
            }
        }

        $discount = (float)($session['discount_amount'] ?? 0.000);
        $net = max(0.000, $gross - $discount);

        return [
            'total_minutes'     => $totalMinutes,
            'grace_minutes'     => $freeMinutes,
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
            'is_overstay'       => $isValidated,
            'reason'            => $reason
        ];
    }
}
