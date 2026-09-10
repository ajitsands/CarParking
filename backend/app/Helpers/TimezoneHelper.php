<?php
namespace App\Helpers;

use App\Core\Database;
use DateTime;
use DateTimeZone;

class TimezoneHelper {
    private static ?string $cachedTimezone = null;

    public static function getTimezone(): string {
        if (self::$cachedTimezone !== null) {
            return self::$cachedTimezone;
        }

        try {
            $db = Database::getInstance();
            $stmt = $db->query("SELECT setting_value FROM system_settings WHERE setting_key = 'timezone' LIMIT 1");
            $tz = $stmt->fetchColumn();
            if ($tz && in_array($tz, DateTimeZone::listIdentifiers())) {
                self::$cachedTimezone = $tz;
            } else {
                self::$cachedTimezone = 'Asia/Bahrain';
            }
        } catch (\Throwable $e) {
            self::$cachedTimezone = 'Asia/Bahrain';
        }

        date_default_timezone_set(self::$cachedTimezone);
        return self::$cachedTimezone;
    }

    public static function init(): void {
        date_default_timezone_set(self::getTimezone());
    }

    public static function getOffset(): string {
        $tz = new DateTimeZone(self::getTimezone());
        $now = new DateTime('now', $tz);
        return $now->format('P'); // e.g. +03:00
    }

    public static function now(): string {
        self::init();
        return date('Y-m-d H:i:s');
    }

    public static function format(?string $datetime, ?string $format = null): string {
        if (!$datetime) return '-';
        self::init();
        
        $targetFormat = $format ?: 'd/m/Y h:i A';
        try {
            $tz = new DateTimeZone(self::getTimezone());
            $dt = new DateTime($datetime, $tz);
            return $dt->format($targetFormat);
        } catch (\Throwable $e) {
            return $datetime;
        }
    }
}
