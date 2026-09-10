<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Helpers\CurrencyHelper;
use App\Helpers\TimezoneHelper;
use App\Services\LicenseManager;

class DashboardController extends Controller {
    public function getMetrics(): void {
        $db = Database::getInstance();

        // 1. Total inside
        $inside = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NULL AND status NOT IN ('EXIT_COMPLETED', 'CANCELLED')")->fetchColumn();

        // 2. Pending validation
        $pending = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NULL AND status = 'VALIDATION_PENDING'")->fetchColumn();

        // 3. Validated (Free)
        $validated = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NULL AND status = 'VALIDATED'")->fetchColumn();

        // 4. Charging
        $charging = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NULL AND status IN ('CHARGING', 'PAYMENT_PENDING')")->fetchColumn();

        // 5. Today entries & exits
        $todayEntries = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE DATE(entry_time) = CURDATE()")->fetchColumn();
        $todayExits = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE DATE(exit_time) = CURDATE()")->fetchColumn();

        // 6. Today Revenue
        $todayRevenue = (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE DATE(paid_at) = CURDATE()")->fetchColumn();

        // 7. Recent ANPR events (latest 8)
        $stmtEvents = $db->query("SELECT * FROM anpr_events ORDER BY id DESC LIMIT 8");
        $recentEvents = $stmtEvents->fetchAll();

        // 8. Active sessions (latest 10)
        $stmtSessions = $db->query("SELECT * FROM parking_sessions WHERE exit_time IS NULL AND status NOT IN ('EXIT_COMPLETED', 'CANCELLED') ORDER BY id DESC LIMIT 10");
        $activeSessions = $stmtSessions->fetchAll();
        $nowTs = time();
        $adminGraceMinutes = \App\Services\TariffCalculator::getAdminGraceMinutes();

        foreach ($activeSessions as &$s) {
            $eTs = strtotime($s['entry_time']);
            $dur = max(0, (int)round(($nowTs - $eTs) / 60));
            $s['total_duration_minutes'] = $dur;
            if ($s['status'] === 'VALIDATION_PENDING' && $dur >= $adminGraceMinutes) {
                $s['status'] = 'CHARGING';
                $calc = \App\Services\TariffCalculator::calculate($s);
                $s['net_amount'] = $calc['net_amount'];
            } elseif ($s['status'] === 'CHARGING') {
                $calc = \App\Services\TariffCalculator::calculate($s);
                $s['net_amount'] = $calc['net_amount'];
            }
        }

        $license = LicenseManager::getStatus();
        $currency = CurrencyHelper::getConfig();

        $this->success([
            'metrics' => [
                'inside_count'             => $inside,
                'validation_pending_count' => $pending,
                'validated_count'          => $validated,
                'charging_count'           => $charging,
                'today_entries'            => $todayEntries,
                'today_exits'              => $todayExits,
                'today_revenue'            => $todayRevenue,
                'formatted_today_revenue'  => CurrencyHelper::formatWithSymbol($todayRevenue),
                'currency'                 => $currency
            ],
            'recent_events'   => $recentEvents,
            'active_sessions' => $activeSessions,
            'gates'           => $gates,
            'license'         => $license,
            'current_time'    => TimezoneHelper::now()
        ]);
    }
}
