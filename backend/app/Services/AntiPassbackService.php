<?php
namespace App\Services;

use App\Core\Database;
use App\Helpers\TimezoneHelper;
use PDO;

class AntiPassbackService {
    /**
     * Reconcile any existing open / unclosed sessions for this vehicle plate.
     * Marks previous open entries as EXIT_COMPLETED with an auto-close audit reason,
     * ensuring only ONE active session exists per vehicle at any time.
     */
    public static function reconcileExistingActiveSessions(string $plate, string $newSessionCode = '', ?string $nowStr = null): array {
        $plate = trim($plate);
        if (empty($plate) || $plate === 'MANUAL_OVERRIDE') {
            return [];
        }

        $db = Database::getInstance();
        $now = $nowStr ?: TimezoneHelper::now();
        $cleanPlate = preg_replace('/[^A-Za-z0-9]/', '', $plate);

        // Find all currently active / open sessions for this vehicle plate
        $stmt = $db->prepare("SELECT * FROM parking_sessions 
            WHERE (plate_number = ? OR REPLACE(plate_number, ' ', '') = ?)
            AND exit_time IS NULL 
            AND status NOT IN ('EXIT_COMPLETED', 'CANCELLED')
            ORDER BY id ASC");
        $stmt->execute([$plate, $cleanPlate]);
        $activeSessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $reconciled = [];
        foreach ($activeSessions as $prevSess) {
            $entryTs = strtotime($prevSess['entry_time']);
            $exitTs = strtotime($now);
            $durationMin = max(1, (int)round(($exitTs - $entryTs) / 60));

            $autoReason = "AUTO_CLOSED_NEW_ENTRY: Reconciled & closed because vehicle re-entered parking area (New Entry: {$newSessionCode})";
            $prevReason = $prevSess['manual_review_reason'] ?? '';
            $finalReason = $prevReason ? "{$prevReason} | {$autoReason}" : $autoReason;

            $updateStmt = $db->prepare("UPDATE parking_sessions SET 
                exit_time = ?, 
                status = 'EXIT_COMPLETED', 
                total_duration_minutes = ?,
                manual_review_reason = ?
                WHERE id = ?");
            $updateStmt->execute([$now, $durationMin, $finalReason, $prevSess['id']]);

            // Audit log the anti-passback reconciliation event
            try {
                $db->prepare("INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details) 
                    VALUES (?, 'system', 'ANTI_PASSBACK_RECONCILE', 'parking_sessions', ?, ?)")
                   ->execute([null, $prevSess['id'], "Anti-Passback: Auto-closed previous session #{$prevSess['session_code']} for plate {$plate} upon new entry #{$newSessionCode}."]);
            } catch (\Throwable $e) {
                // non-blocking
            }

            $reconciled[] = [
                'session_id'   => $prevSess['id'],
                'session_code' => $prevSess['session_code'],
                'plate_number' => $prevSess['plate_number'],
                'duration'     => "{$durationMin} mins",
                'reason'       => $autoReason
            ];
        }

        return $reconciled;
    }
}
