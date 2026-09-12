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
        $validated = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NULL AND status IN ('VALIDATED', 'VALIDATED_FREE')")->fetchColumn();

        // 4. Charging
        $charging = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NULL AND status IN ('CHARGING', 'PAYMENT_PENDING')")->fetchColumn();

        // 5. Today entries & exits
        $todayEntries = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE DATE(entry_time) = CURDATE()")->fetchColumn();
        $todayExits = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE DATE(exit_time) = CURDATE()")->fetchColumn();

        // 6. Today Revenue
        $todayRevenue = (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE DATE(paid_at) = CURDATE()")->fetchColumn();

        // 7. Configured Total Capacity & Floor Slots
        $stmtSet = $db->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('parking_total_capacity', 'parking_floor_slots_json')");
        $settingsRows = $stmtSet->fetchAll();
        $settingsMap = [];
        foreach ($settingsRows as $row) {
            $settingsMap[$row['setting_key']] = $row['setting_value'];
        }

        $totalCapacity = (int)($settingsMap['parking_total_capacity'] ?? 500);
        if ($totalCapacity <= 0) $totalCapacity = 500;

        $rawFloorsJson = $settingsMap['parking_floor_slots_json'] ?? '';
        $configuredFloors = json_decode($rawFloorsJson, true);
        if (!is_array($configuredFloors) || empty($configuredFloors)) {
            $configuredFloors = [
                ['id' => 'GF', 'name' => 'Ground Floor', 'capacity' => (int)round($totalCapacity * 0.25)],
                ['id' => 'B1', 'name' => 'Basement 1 (Patient & Visitor)', 'capacity' => (int)round($totalCapacity * 0.40)],
                ['id' => 'B2', 'name' => 'Basement 2 (Doctors & Staff)', 'capacity' => (int)round($totalCapacity * 0.35)]
            ];
        }

        $availableSlots = max(0, $totalCapacity - $inside);
        $occupancyRate = round(($inside / $totalCapacity) * 100, 1);

        $parkingState = 'AVAILABLE';
        if ($availableSlots === 0) {
            $parkingState = 'FULL';
        } elseif ($occupancyRate >= 85.0) {
            $parkingState = 'NEAR_CAPACITY';
        }

        // Floor breakdown
        $floorBreakdown = [];
        $allocatedOccupied = 0;
        $numFloors = count($configuredFloors);

        foreach ($configuredFloors as $idx => $floor) {
            $fCap = (int)($floor['capacity'] ?? 0);
            $ratio = $totalCapacity > 0 ? ($fCap / $totalCapacity) : (1 / max(1, $numFloors));
            $fOcc = ($idx === $numFloors - 1) ? max(0, $inside - $allocatedOccupied) : (int)round($inside * $ratio);
            $allocatedOccupied += $fOcc;
            $fAvail = max(0, $fCap - $fOcc);

            $floorBreakdown[] = [
                'floor_id'        => $floor['id'] ?? ('FL-' . ($idx + 1)),
                'floor_name'      => $floor['name'] ?? ('Floor ' . ($idx + 1)),
                'total_capacity'  => $fCap,
                'occupied_slots'  => $fOcc,
                'available_slots' => $fAvail,
                'occupancy_rate'  => $fCap > 0 ? round(($fOcc / $fCap) * 100, 1) : 0,
                'status'          => $fAvail === 0 ? 'FULL' : ($fOcc / max(1, $fCap) >= 0.85 ? 'NEAR_CAPACITY' : 'AVAILABLE')
            ];
        }

        // 8. Recent ANPR events (latest 8)
        $stmtEvents = $db->query("SELECT * FROM anpr_events ORDER BY id DESC LIMIT 8");
        $recentEvents = $stmtEvents->fetchAll();

        // 9. Active sessions (latest 10)
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

        // Gates list
        try {
            $gates = $db->query("SELECT * FROM gates_and_cameras ORDER BY gate_code ASC")->fetchAll() ?: [];
        } catch (\Throwable $e) {
            $gates = [];
        }

        $license = LicenseManager::getStatus();
        $currency = CurrencyHelper::getConfig();

        $this->success([
            'metrics' => [
                'total_parking_capacity'   => $totalCapacity,
                'inside_count'             => $inside,
                'available_parking_slots'  => $availableSlots,
                'occupancy_rate_percent'   => $occupancyRate,
                'parking_status'           => $parkingState,
                'validation_pending_count' => $pending,
                'validated_count'          => $validated,
                'charging_count'           => $charging,
                'today_entries'            => $todayEntries,
                'today_exits'              => $todayExits,
                'today_revenue'            => $todayRevenue,
                'formatted_today_revenue'  => CurrencyHelper::formatWithSymbol($todayRevenue),
                'currency'                 => $currency
            ],
            'floor_breakdown' => $floorBreakdown,
            'recent_events'   => $recentEvents,
            'active_sessions' => $activeSessions,
            'gates'           => $gates,
            'license'         => $license,
            'current_time'    => TimezoneHelper::now()
        ]);
    }
}
