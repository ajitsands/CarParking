<?php
namespace App\Helpers;

use App\Core\Database;

class CurrencyHelper {
    private static ?array $cachedConfig = null;

    public static function getConfig(): array {
        if (self::$cachedConfig !== null) {
            return self::$cachedConfig;
        }

        $code = 'BHD';
        $symbol = 'BD';
        $decimals = 3;

        try {
            $db = Database::getInstance();
            $stmt = $db->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('currency_code', 'currency_symbol', 'currency_decimals')");
            $rows = $stmt->fetchAll();
            foreach ($rows as $r) {
                if ($r['setting_key'] === 'currency_code') $code = strtoupper($r['setting_value']);
                if ($r['setting_key'] === 'currency_symbol') $symbol = $r['setting_value'];
                if ($r['setting_key'] === 'currency_decimals') $decimals = (int)$r['setting_value'];
            }
        } catch (\Throwable $e) {}

        // Enforce rule: Bahrain is strictly 3 digits, rest 2 digits (unless KWD/OMR)
        if ($code === 'BHD' || $code === 'KWD' || $code === 'OMR') {
            $decimals = 3;
        } else {
            $decimals = 2;
        }

        self::$cachedConfig = [
            'code'     => $code,
            'symbol'   => $symbol,
            'decimals' => $decimals
        ];

        return self::$cachedConfig;
    }

    public static function format(float $amount, ?string $currencyCode = null): string {
        $cfg = self::getConfig();
        $code = $currencyCode ? strtoupper($currencyCode) : $cfg['code'];
        $decimals = ($code === 'BHD' || $code === 'KWD' || $code === 'OMR') ? 3 : 2;

        return number_format($amount, $decimals, '.', '');
    }

    public static function formatWithSymbol(float $amount, ?string $currencyCode = null): string {
        $cfg = self::getConfig();
        $formatted = self::format($amount, $currencyCode);
        return $cfg['symbol'] . ' ' . $formatted;
    }
}
