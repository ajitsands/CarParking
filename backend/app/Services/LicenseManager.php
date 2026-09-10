<?php
namespace App\Services;

use App\Core\Database;
use DateTime;

class LicenseManager {
    public static function getStatus(): array {
        try {
            $db = Database::getInstance();
            $stmt = $db->query("SELECT * FROM system_licenses ORDER BY id DESC LIMIT 1");
            $lic = $stmt->fetch();

            if (!$lic) {
                return [
                    'is_valid'       => false,
                    'status'         => 'expired',
                    'message'        => 'No license record found',
                    'expires_at'     => null,
                    'days_remaining' => 0
                ];
            }

            $now = new DateTime();
            $exp = new DateTime($lic['expires_at']);
            $diff = $now->diff($exp);
            $isPast = $now > $exp;

            $daysRemaining = $isPast ? 0 : (int)$diff->format('%r%a');

            $status = $lic['status'];
            if ($isPast && $status === 'active') {
                $status = 'expired';
                $db->prepare("UPDATE system_licenses SET status = 'expired' WHERE id = ?")->execute([$lic['id']]);
            }

            return [
                'is_valid'       => !$isPast && $status === 'active',
                'status'         => $status,
                'license_key'    => $lic['license_key'],
                'issued_to'      => $lic['issued_to'],
                'duration_days'  => (int)$lic['duration_days'],
                'expires_at'     => $lic['expires_at'],
                'days_remaining' => $daysRemaining,
                'max_lanes'      => (int)$lic['max_lanes']
            ];
        } catch (\Throwable $e) {
            return [
                'is_valid'       => true, // fallback safe
                'status'         => 'active',
                'days_remaining' => 365,
                'expires_at'     => date('Y-m-d H:i:s', strtotime('+1 year'))
            ];
        }
    }

    public static function updateDuration(int $daysToAdd, ?int $superadminId = null): array {
        $db = Database::getInstance();
        $stmt = $db->query("SELECT * FROM system_licenses ORDER BY id DESC LIMIT 1");
        $lic = $stmt->fetch();

        $now = new DateTime();
        if ($lic && new DateTime($lic['expires_at']) > $now) {
            $base = new DateTime($lic['expires_at']);
        } else {
            $base = $now;
        }

        $base->modify("+{$daysToAdd} days");
        $newExpiry = $base->format('Y-m-d H:i:s');

        if ($lic) {
            $db->prepare("UPDATE system_licenses SET expires_at = ?, duration_days = duration_days + ?, status = 'active', updated_by = ? WHERE id = ?")
               ->execute([$newExpiry, $daysToAdd, $superadminId, $lic['id']]);
        } else {
            $db->prepare("INSERT INTO system_licenses (license_key, issued_to, duration_days, expires_at, status, updated_by) VALUES (?, ?, ?, ?, 'active', ?)")
               ->execute(['KIMS-LIC-' . time(), 'KIMSHEALTH', $daysToAdd, $newExpiry, $superadminId]);
        }

        return self::getStatus();
    }

    public static function setExactExpiry(string $expiryDate, ?int $superadminId = null): array {
        $db = Database::getInstance();
        $stmt = $db->query("SELECT * FROM system_licenses ORDER BY id DESC LIMIT 1");
        $lic = $stmt->fetch();

        $exp = new DateTime($expiryDate);
        $now = new DateTime();
        $days = (int)$now->diff($exp)->format('%r%a');
        $status = $days > 0 ? 'active' : 'expired';

        if ($lic) {
            $db->prepare("UPDATE system_licenses SET expires_at = ?, duration_days = ?, status = ?, updated_by = ? WHERE id = ?")
               ->execute([$exp->format('Y-m-d H:i:s'), max(0, $days), $status, $superadminId, $lic['id']]);
        } else {
            $db->prepare("INSERT INTO system_licenses (license_key, issued_to, duration_days, expires_at, status, updated_by) VALUES (?, ?, ?, ?, ?, ?)")
               ->execute(['KIMS-LIC-' . time(), 'KIMSHEALTH', max(0, $days), $exp->format('Y-m-d H:i:s'), $status, $superadminId]);
        }

        return self::getStatus();
    }
}
