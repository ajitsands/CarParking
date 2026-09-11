<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Helpers\CurrencyHelper;

class ReportsController extends Controller {
    public function getSummary(): void {
        $db = Database::getInstance();

        // 1. Revenue by Payment Method
        $stmtMethods = $db->query("SELECT payment_method, COUNT(*) as count, SUM(amount) as total FROM payments GROUP BY payment_method");
        $methods = $stmtMethods->fetchAll();

        // 2. Validation Breakdown
        $stmtVal = $db->query("SELECT validation_method, COUNT(*) as count FROM parking_sessions WHERE validation_method != 'none' GROUP BY validation_method");
        $validationStats = $stmtVal->fetchAll();

        // 3. Hourly traffic today
        $stmtHourly = $db->query("SELECT HOUR(entry_time) as hour, COUNT(*) as count FROM parking_sessions WHERE DATE(entry_time) = CURDATE() GROUP BY HOUR(entry_time) ORDER BY hour ASC");
        $hourlyTraffic = $stmtHourly->fetchAll();

        // 4. Overall Totals
        $totalSessions = (int)$db->query("SELECT COUNT(*) FROM parking_sessions")->fetchColumn();
        $activeParked = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NULL AND status NOT IN ('EXIT_COMPLETED', 'COMPLETED', 'CANCELLED')")->fetchColumn();
        $completedSessions = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NOT NULL OR status IN ('EXIT_COMPLETED', 'COMPLETED')")->fetchColumn();
        $totalRevenue = (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM payments")->fetchColumn();
        $totalValidated = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE status IN ('VALIDATED', 'EXIT_COMPLETED') AND validation_method != 'none'")->fetchColumn();

        // 5. Recent Audit Logs & Session Records (Enriched with vehicle plate, start time, end time, duration, and gate route)
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;

        $whereClauses = [];
        $sessWhereClauses = [];
        $queryParams = [];
        $sessQueryParams = [];

        if (!empty($startDate)) {
            $whereClauses[] = "DATE(created_at) >= :start_date";
            $sessWhereClauses[] = "DATE(entry_time) >= :start_date";
            $queryParams[':start_date'] = $startDate;
            $sessQueryParams[':start_date'] = $startDate;
        }
        if (!empty($endDate)) {
            $whereClauses[] = "DATE(created_at) <= :end_date";
            $sessWhereClauses[] = "DATE(entry_time) <= :end_date";
            $queryParams[':end_date'] = $endDate;
            $sessQueryParams[':end_date'] = $endDate;
        }

        $whereSql = !empty($whereClauses) ? "WHERE " . implode(" AND ", $whereClauses) : "";
        $sessWhereSql = !empty($sessWhereClauses) ? "WHERE " . implode(" AND ", $sessWhereClauses) : "";

        // Query raw audit logs cleanly without cross-table collation conflicts
        $stmtAudit = $db->prepare("SELECT * FROM audit_logs {$whereSql} ORDER BY id DESC LIMIT 300");
        $stmtAudit->execute($queryParams);
        $rawLogs = $stmtAudit->fetchAll();

        // Load recent parking sessions for enrichment
        $stmtSess = $db->query("SELECT id, session_code, plate_number, entry_time, exit_time, total_duration_minutes, status, entry_gate_id, exit_gate_id FROM parking_sessions ORDER BY id DESC LIMIT 500");
        $allSessions = $stmtSess->fetchAll();

        $sessionsById = [];
        $sessionsByPlate = [];
        foreach ($allSessions as $sess) {
            $sessionsById[$sess['id']] = $sess;
            $cleanP = preg_replace('/[^A-Za-z0-9]/', '', strtoupper($sess['plate_number'] ?? ''));
            if ($cleanP !== '') {
                $sessionsByPlate[$cleanP][] = $sess;
            }
        }

        $auditLogs = [];
        foreach ($rawLogs as $log) {
            $details = $log['details'] ?? '';
            $plate = !empty($log['plate_number']) ? $log['plate_number'] : null;

            // Extract plate from details if not in plate_number column
            if (!$plate && preg_match('/Plate:\s*([A-Za-z0-9 ]+?)(?:\s*\||$)/i', $details, $m)) {
                $plate = trim($m[1]);
            }

            // Find matching parking session
            $matchedSession = null;
            if ($log['entity_type'] === 'parking_sessions' && !empty($log['entity_id']) && is_numeric($log['entity_id'])) {
                $matchedSession = $sessionsById[(int)$log['entity_id']] ?? null;
            }

            if (!$matchedSession && $plate) {
                $cleanP = preg_replace('/[^A-Za-z0-9]/', '', strtoupper($plate));
                if (!empty($sessionsByPlate[$cleanP])) {
                    $logTime = strtotime($log['created_at']);
                    // Find session with entry_time <= audit created_at (or closest)
                    foreach ($sessionsByPlate[$cleanP] as $cand) {
                        $candEntryTs = strtotime($cand['entry_time'] ?? '');
                        if ($candEntryTs && $candEntryTs <= ($logTime + 60)) {
                            $matchedSession = $cand;
                            break;
                        }
                    }
                    if (!$matchedSession) {
                        $matchedSession = $sessionsByPlate[$cleanP][0];
                    }
                }
            }

            $isExitEvent = (stripos($details, 'Direction: EXIT') !== false) || 
                           (stripos($log['entity_id'] ?? '', 'OUT') !== false) ||
                           (stripos($log['action'] ?? '', 'EXIT') !== false);

            $startTime = !empty($log['start_time']) 
                ? $log['start_time'] 
                : ($matchedSession['entry_time'] ?? $log['created_at']);

            $endTime = !empty($log['end_time'])
                ? $log['end_time']
                : ($matchedSession['exit_time'] ?? ($isExitEvent ? $log['created_at'] : null));

            // Determine if vehicle is ACTUALLY currently inside
            $isCurrentlyInside = false;
            if ($matchedSession) {
                $sessStatus = $matchedSession['status'] ?? '';
                $isCompleted = in_array($sessStatus, ['EXIT_COMPLETED', 'COMPLETED', 'CANCELLED'], true) || !empty($matchedSession['exit_time']);
                if (!$isCompleted && !$isExitEvent) {
                    $isCurrentlyInside = true;
                }
            }

            // Calculate duration in minutes
            $durMins = null;
            if ($log['duration_minutes'] !== null && $log['duration_minutes'] !== '') {
                $durMins = (int)$log['duration_minutes'];
            } elseif (!empty($matchedSession['total_duration_minutes'])) {
                $durMins = (int)$matchedSession['total_duration_minutes'];
            } elseif ($startTime && $endTime) {
                $sTs = strtotime($startTime);
                $eTs = strtotime($endTime);
                if ($sTs && $eTs && $eTs >= $sTs) {
                    $durMins = max(1, (int)round(($eTs - $sTs) / 60));
                }
            } elseif ($isCurrentlyInside && $startTime) {
                $sTs = strtotime($startTime);
                if ($sTs) {
                    $durMins = max(0, (int)round((time() - $sTs) / 60));
                }
            }

            // Gate Route
            $entryGate = $matchedSession['entry_gate_id'] ?? ($isExitEvent ? null : ($log['entity_id'] ?? 'GATE-IN-01'));
            $exitGate = $matchedSession['exit_gate_id'] ?? ($isExitEvent ? ($log['entity_id'] ?? 'GATE-OUT-01') : null);
            $gateRoute = 'GATE-IN-01';
            if ($entryGate && $exitGate) {
                $gateRoute = "{$entryGate} → {$exitGate}";
            } elseif ($exitGate) {
                $gateRoute = $exitGate;
            } elseif ($entryGate) {
                $gateRoute = $entryGate;
            } elseif (!empty($log['entity_id']) && str_starts_with($log['entity_id'], 'GATE')) {
                $gateRoute = $log['entity_id'];
            }

            // Override Reason extraction
            $overrideReason = null;
            if (preg_match('/Override Reason:\s*([^|]+)/i', $details, $rm)) {
                $overrideReason = trim($rm[1]);
            } elseif (preg_match('/Reason:\s*([^|]+)/i', $details, $rm)) {
                $overrideReason = trim($rm[1]);
            } elseif (stripos($details, 'AUTO_CLOSED_NEW_ENTRY') !== false) {
                $overrideReason = 'Auto Closed (Anti-Passback Duplicate Entry Reconciled)';
            }

            $auditLogs[] = [
                'id'                  => (int)$log['id'],
                'user_id'             => $log['user_id'] ? (int)$log['user_id'] : null,
                'username'            => $log['username'] ?? 'System',
                'action'              => $log['action'],
                'plate_number'        => $plate ?: ($matchedSession['plate_number'] ?? '-'),
                'start_time'          => $startTime,
                'end_time'            => $endTime,
                'duration_minutes'    => $durMins,
                'session_status'      => $matchedSession['status'] ?? null,
                'is_currently_inside' => $isCurrentlyInside ? 1 : 0,
                'entry_gate'          => $entryGate,
                'exit_gate'           => $exitGate,
                'gate_route'          => $gateRoute,
                'override_reason'     => $overrideReason,
                'entity_type'         => $log['entity_type'],
                'entity_id'           => $log['entity_id'],
                'details'             => $details,
                'ip_address'          => $log['ip_address'],
                'created_at'          => $log['created_at']
            ];
        }

        // Format all vehicle sessions for the sessions report tab
        $stmtSessionsReport = $db->prepare("SELECT * FROM parking_sessions {$sessWhereSql} ORDER BY id DESC LIMIT 500");
        $stmtSessionsReport->execute($sessQueryParams);
        $rawSessionsReport = $stmtSessionsReport->fetchAll();

        $sessionsReport = [];
        foreach ($rawSessionsReport as $s) {
            $eTs = strtotime($s['entry_time'] ?? '');
            $xTs = !empty($s['exit_time']) ? strtotime($s['exit_time']) : null;
            $isInside = (empty($s['exit_time']) && !in_array($s['status'] ?? '', ['EXIT_COMPLETED', 'COMPLETED', 'CANCELLED'], true));
            $dur = !empty($s['total_duration_minutes']) 
                ? (int)$s['total_duration_minutes'] 
                : ($eTs && $xTs ? max(1, (int)round(($xTs - $eTs) / 60)) : ($isInside && $eTs ? max(0, (int)round((time() - $eTs) / 60)) : null));

            $sessionsReport[] = [
                'id'                      => (int)$s['id'],
                'session_code'            => $s['session_code'],
                'plate_number'            => $s['plate_number'],
                'entry_time'              => $s['entry_time'],
                'exit_time'               => $s['exit_time'],
                'entry_gate_id'           => $s['entry_gate_id'],
                'exit_gate_id'            => $s['exit_gate_id'],
                'status'                  => $s['status'],
                'is_currently_inside'     => $isInside ? 1 : 0,
                'total_duration_minutes'  => $dur,
                'total_amount'            => (float)($s['total_amount'] ?? 0),
                'net_amount'              => (float)($s['net_amount'] ?? 0),
                'paid_amount'             => (float)($s['paid_amount'] ?? 0),
                'payment_status'          => $s['payment_status'] ?? 'unpaid',
                'validation_method'       => $s['validation_method'] ?? 'none',
                'manual_review_reason'    => $s['manual_review_reason'] ?? null,
                'created_at'              => $s['created_at'] ?? $s['entry_time']
            ];
        }

        $this->success([
            'totals' => [
                'total_sessions'     => $totalSessions,
                'active_parked'      => $activeParked,
                'completed_sessions' => $completedSessions,
                'total_revenue'      => $totalRevenue,
                'formatted_revenue'  => CurrencyHelper::formatWithSymbol($totalRevenue),
                'total_validated'    => $totalValidated
            ],
            'payment_methods'   => $methods,
            'validation_stats'  => $validationStats,
            'hourly_traffic'    => $hourlyTraffic,
            'sessions_report'   => $sessionsReport,
            'audit_logs'        => $auditLogs
        ]);
    }
}
