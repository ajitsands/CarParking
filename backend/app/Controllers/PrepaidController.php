<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Services\PrepaidPassService;
use App\Helpers\CurrencyHelper;
use App\Helpers\TimezoneHelper;
use Throwable;

class PrepaidController extends Controller {
    /**
     * List prepaid passes
     */
    public function getPasses(): void {
        $db = Database::getInstance();
        $params = $this->getQueryParams();
        $search = trim($params['search'] ?? '');
        $status = trim($params['status'] ?? '');
        $limit = min(200, max(10, (int)($params['limit'] ?? 50)));

        $where = ["1=1"];
        $bindings = [];

        if ($search) {
            $where[] = "(plate_number LIKE ? OR owner_name LIKE ? OR pass_code LIKE ?)";
            $bindings[] = "%{$search}%";
            $bindings[] = "%{$search}%";
            $bindings[] = "%{$search}%";
        }

        if ($status) {
            $where[] = "status = ?";
            $bindings[] = $status;
        }

        $sql = "SELECT * FROM prepaid_passes WHERE " . implode(' AND ', $where) . " ORDER BY id DESC LIMIT {$limit}";
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $passes = $stmt->fetchAll();

        // Calculate days remaining dynamically
        $now = time();
        foreach ($passes as &$p) {
            $expTs = strtotime($p['expiry_date']);
            $p['days_remaining'] = max(0, (int)ceil(($expTs - $now) / 86400));
            $p['is_expired'] = $expTs < $now;
            $p['formatted_amount'] = CurrencyHelper::format($p['total_amount']);
            if ($p['is_expired'] && $p['status'] === 'active') {
                $p['status'] = 'expired';
            }
        }

        $this->success([
            'passes' => $passes,
            'total'  => count($passes)
        ]);
    }

    /**
     * Preview calculation before purchasing pass
     */
    public function calculate(): void {
        $input = $this->getJsonInput();
        $type = $input['duration_type'] ?? 'month';
        $val = max(1, (int)($input['duration_value'] ?? 1));

        $calc = PrepaidPassService::calculateCost($type, $val);
        $this->success($calc);
    }

    /**
     * Issue a new prepaid parking pass
     */
    public function store(): void {
        $input = $this->getJsonInput();
        $currentUser = $this->getCurrentUser();
        $userName = $currentUser ? ($currentUser['full_name'] ?: $currentUser['username']) : 'Cashier';
        $userId = $currentUser ? (int)$currentUser['id'] : null;

        try {
            $result = PrepaidPassService::issuePass($input, $userId, $userName);
            $this->success($result, 'Prepaid parking pass issued successfully. Vehicle is now whitelisted.');
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Renew an existing prepaid pass
     */
    public function renew(int $id): void {
        $input = $this->getJsonInput();
        $units = max(1, (int)($input['duration_value'] ?? 1));
        $payMethod = $input['payment_method'] ?? 'cash';
        $payRef = $input['payment_reference'] ?? '';
        $currentUser = $this->getCurrentUser();
        $userName = $currentUser ? ($currentUser['full_name'] ?: $currentUser['username']) : 'Cashier';

        try {
            $result = PrepaidPassService::renewPass($id, $units, $payMethod, $payRef, $userName);
            $this->success($result, 'Pass successfully renewed.');
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Get KPI stats (today, this month, active counts)
     */
    public function getStats(): void {
        $params = $this->getQueryParams();
        $month = $params['month'] ?? null;
        $stats = PrepaidPassService::getStats($month);
        $rates = PrepaidPassService::getTariffRates();

        $this->success([
            'stats' => $stats,
            'rates' => $rates
        ]);
    }

    /**
     * Get financial and pass ledger
     */
    public function getLedger(): void {
        $db = Database::getInstance();
        $params = $this->getQueryParams();
        $search = trim($params['search'] ?? '');
        $month = trim($params['month'] ?? '');
        $method = trim($params['payment_method'] ?? '');
        $limit = min(300, max(10, (int)($params['limit'] ?? 100)));

        $where = ["1=1"];
        $bindings = [];

        if ($search) {
            $where[] = "(plate_number LIKE ? OR owner_name LIKE ? OR receipt_number LIKE ?)";
            $bindings[] = "%{$search}%";
            $bindings[] = "%{$search}%";
            $bindings[] = "%{$search}%";
        }

        if ($month) {
            $where[] = "DATE_FORMAT(created_at, '%Y-%m') = ?";
            $bindings[] = $month;
        }

        if ($method) {
            $where[] = "payment_method = ?";
            $bindings[] = $method;
        }

        $sql = "SELECT * FROM prepaid_ledger WHERE " . implode(' AND ', $where) . " ORDER BY id DESC LIMIT {$limit}";
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $ledger = $stmt->fetchAll();

        foreach ($ledger as &$item) {
            $item['formatted_amount'] = CurrencyHelper::format($item['amount']);
        }

        $this->success([
            'ledger' => $ledger,
            'total'  => count($ledger)
        ]);
    }

    /**
     * Vehicle-based ledger history
     */
    public function getVehicleHistory(string $plate): void {
        $db = Database::getInstance();
        $cleanPlate = strtoupper(trim($plate));

        // 1. Passes for this vehicle
        $stmtPass = $db->prepare("SELECT * FROM prepaid_passes WHERE plate_number = ? ORDER BY id DESC");
        $stmtPass->execute([$cleanPlate]);
        $passes = $stmtPass->fetchAll();

        // 2. Ledger transactions
        $stmtLedger = $db->prepare("SELECT * FROM prepaid_ledger WHERE plate_number = ? ORDER BY id DESC");
        $stmtLedger->execute([$cleanPlate]);
        $ledger = $stmtLedger->fetchAll();

        // 3. Parking sessions history
        $stmtSessions = $db->prepare("SELECT * FROM parking_sessions WHERE plate_number = ? ORDER BY id DESC LIMIT 20");
        $stmtSessions->execute([$cleanPlate]);
        $sessions = $stmtSessions->fetchAll();

        $totalPaid = 0.0;
        foreach ($ledger as &$l) {
            $l['formatted_amount'] = CurrencyHelper::format($l['amount']);
            $totalPaid += (float)$l['amount'];
        }

        $this->success([
            'plate_number' => $cleanPlate,
            'passes'       => $passes,
            'ledger'       => $ledger,
            'sessions'     => $sessions,
            'total_paid'   => $totalPaid,
            'formatted_total_paid' => CurrencyHelper::format($totalPaid)
        ]);
    }
}
