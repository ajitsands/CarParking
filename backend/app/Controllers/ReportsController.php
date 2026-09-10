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

        // 5. Recent Audit Logs
        $stmtAudit = $db->query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50");
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
