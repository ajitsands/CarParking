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
        $totalRevenue = (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM payments")->fetchColumn();
        $totalValidated = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE status IN ('VALIDATED', 'EXIT_COMPLETED') AND validation_method != 'none'")->fetchColumn();

        // 5. Recent Audit Logs (Enriched with vehicle plate, start time, end time, duration, and gate route)
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;

        $whereClauses = [];
        $queryParams = [];

        if (!empty($startDate)) {
            $whereClauses[] = "DATE(a.created_at) >= :start_date";
            $queryParams[':start_date'] = $startDate;
        }
        if (!empty($endDate)) {
            $whereClauses[] = "DATE(a.created_at) <= :end_date";
            $queryParams[':end_date'] = $endDate;
        }

        $whereSql = !empty($whereClauses) ? "WHERE " . implode(" AND ", $whereClauses) : "";

        $auditSql = "
            SELECT 
                a.id,
                a.user_id,
                a.username,
                a.action,
                COALESCE(
                    NULLIF(a.plate_number, ''),
                    s.plate_number,
                    CASE 
                        WHEN a.details REGEXP 'Plate: ([A-Za-z0-9 ]+)' THEN TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(a.details, 'Plate: ', -1), ' |', 1))
                        ELSE '-'
                    END
                ) as plate_number,
                COALESCE(a.start_time, s.entry_time, a.created_at) as start_time,
                COALESCE(a.end_time, s.exit_time) as end_time,
                COALESCE(
                    a.duration_minutes, 
                    s.total_duration_minutes,
                    CASE 
                        WHEN s.entry_time IS NOT NULL AND s.exit_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, s.entry_time, s.exit_time)
                        WHEN s.entry_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, s.entry_time, NOW())
                        ELSE NULL
                    END
                ) as duration_minutes,
                COALESCE(
                    s.entry_gate_id,
                    CASE WHEN a.entity_id LIKE 'GATE%' AND a.details LIKE '%Direction: ENTRY%' THEN a.entity_id ELSE NULL END,
                    CASE WHEN a.entity_id LIKE 'GATE%' THEN a.entity_id ELSE NULL END,
                    'GATE-IN-01'
                ) as entry_gate,
                s.exit_gate_id as exit_gate,
                CASE
                    WHEN s.entry_gate_id IS NOT NULL AND s.exit_gate_id IS NOT NULL THEN CONCAT(s.entry_gate_id, ' → ', s.exit_gate_id)
                    WHEN s.exit_gate_id IS NOT NULL THEN s.exit_gate_id
                    WHEN s.entry_gate_id IS NOT NULL THEN s.entry_gate_id
                    WHEN a.entity_id LIKE 'GATE%' THEN a.entity_id
                    ELSE 'GATE-IN-01'
                END as gate_route,
                CASE 
                    WHEN a.details LIKE 'Override Reason: %' THEN SUBSTRING_INDEX(SUBSTRING_INDEX(a.details, 'Override Reason: ', -1), ' |', 1)
                    WHEN a.details LIKE 'Reason: %' THEN SUBSTRING_INDEX(SUBSTRING_INDEX(a.details, 'Reason: ', -1), ' |', 1)
                    WHEN a.details LIKE '%AUTO_CLOSED_NEW_ENTRY%' THEN 'Auto Closed (Anti-Passback Duplicate Entry Reconciled)'
                    ELSE NULL
                END as override_reason,
                a.entity_type,
                a.entity_id,
                a.details,
                a.ip_address,
                a.created_at
            FROM audit_logs a
            LEFT JOIN parking_sessions s ON (a.entity_type = 'parking_sessions' AND a.entity_id = s.id)
            {$whereSql}
            ORDER BY a.id DESC 
            LIMIT 300
        ";
        $stmtAudit = $db->prepare($auditSql);
        $stmtAudit->execute($queryParams);
        $auditLogs = $stmtAudit->fetchAll();

        $this->success([
            'totals' => [
                'total_sessions'  => $totalSessions,
                'total_revenue'   => $totalRevenue,
                'formatted_revenue' => CurrencyHelper::formatWithSymbol($totalRevenue),
                'total_validated' => $totalValidated
            ],
            'payment_methods'   => $methods,
            'validation_stats'  => $validationStats,
            'hourly_traffic'    => $hourlyTraffic,
            'audit_logs'        => $auditLogs
        ]);
    }
}
