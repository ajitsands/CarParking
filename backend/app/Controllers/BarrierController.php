<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Services\BarrierRelayService;
use App\Services\TariffCalculator;
use App\Helpers\TimezoneHelper;

class BarrierController extends Controller {
    public function manualOverride(): void {
        $currentUser = $this->getCurrentUser();
        $input = $this->getJsonInput();

        $gateId = trim($input['gate_id'] ?? 'GATE-IN-01');
        $direction = strtoupper(trim($input['direction'] ?? 'ENTRY'));
        $plate = strtoupper(trim($input['plate_number'] ?? 'MANUAL_OVERRIDE'));
        $reason = trim($input['reason'] ?? '');

        if (!$reason) {
            $this->error('Security Protocol: A valid reason is mandatory for manual barrier override', 400);
            return;
        }

        $userId = $currentUser ? (int)$currentUser['id'] : null;
        $res = BarrierRelayService::openBarrier($gateId, $direction, $plate, 'manual_override', $userId, $reason);

        $db = Database::getInstance();
        $nowStr = TimezoneHelper::now();

        // 1. Audit log
        $db->prepare("INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details) VALUES (?, ?, 'MANUAL_BARRIER_OVERRIDE', 'gates_and_cameras', ?, ?)")
           ->execute([$userId, $currentUser['username'] ?? 'operator', $gateId, "Override Reason: {$reason} | Direction: {$direction} | Plate: {$plate}"]);

        // 2. If this is an EXIT gate override, close the active vehicle session!
        $sessionUpdated = false;
        $closedSession = null;

        if ($direction === 'EXIT' || str_contains($gateId, 'OUT')) {
            $session = null;

            if ($plate && $plate !== 'MANUAL_OVERRIDE') {
                $cleanPlate = preg_replace('/[^A-Za-z0-9]/', '', $plate);
                // Look for active session matching this plate
                $stmtSess = $db->prepare("SELECT * FROM parking_sessions 
                    WHERE (plate_number = ? OR REPLACE(plate_number, ' ', '') = ? OR REPLACE(plate_number, ' ', '') LIKE ?) 
                    AND exit_time IS NULL 
                    AND status NOT IN ('EXIT_COMPLETED', 'CANCELLED') 
                    ORDER BY id DESC LIMIT 1");
                $stmtSess->execute([$plate, $cleanPlate, "%{$cleanPlate}%"]);
                $session = $stmtSess->fetch();
            }

            // Fallback: If no plate provided or not matched, check if an explicit session_id was passed
            if (!$session && !empty($input['session_id'])) {
                $stmtById = $db->prepare("SELECT * FROM parking_sessions WHERE id = ? AND exit_time IS NULL LIMIT 1");
                $stmtById->execute([(int)$input['session_id']]);
                $session = $stmtById->fetch();
            }

            if ($session) {
                $entryTs = strtotime($session['entry_time']);
                $exitTs = strtotime($nowStr);
                $durationMin = max(1, (int)round(($exitTs - $entryTs) / 60));

                $tariff = TariffCalculator::calculate($session, $nowStr);
                $netAmount = (float)($tariff['net_amount'] ?? 0);

                $paymentStatus = $session['payment_status'] ?? 'pending';
                $paidAmount = (float)($session['paid_amount'] ?? 0);

                // If override reason states Cash or Payment collected, mark payment paid
                if (stripos($reason, 'cash') !== false || stripos($reason, 'payment') !== false) {
                    $paymentStatus = 'paid';
                    $paidAmount = $netAmount;

                    // Insert payment record
                    $txCode = 'CASH-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
                    $stmtPay = $db->prepare("INSERT INTO payments (session_id, transaction_code, amount, currency, payment_method, gateway_status, collected_by_user_id) VALUES (?, ?, ?, 'BHD', 'cash', 'COMPLETED', ?)");
                    $stmtPay->execute([$session['id'], $txCode, $netAmount, $userId]);
                }

                $stmtUpdate = $db->prepare("UPDATE parking_sessions SET 
                    exit_time = ?, 
                    exit_gate_id = ?, 
                    status = 'EXIT_COMPLETED', 
                    total_duration_minutes = ?, 
                    charged_duration_minutes = ?, 
                    total_amount = ?, 
                    net_amount = ?, 
                    paid_amount = ?, 
                    payment_status = ?, 
                    manual_review_reason = ? 
                    WHERE id = ?");
                
                $stmtUpdate->execute([
                    $nowStr,
                    $gateId,
                    $durationMin,
                    $tariff['chargeable_minutes'] ?? 0,
                    $tariff['gross_amount'] ?? $netAmount,
                    $netAmount,
                    $paidAmount,
                    $paymentStatus,
                    "Manual Override Exit: {$reason} (Operator: " . ($currentUser['username'] ?? 'operator') . ")",
                    $session['id']
                ]);

                $sessionUpdated = true;
                $closedSession = [
                    'session_id'   => $session['id'],
                    'session_code' => $session['session_code'],
                    'plate_number' => $session['plate_number'],
                    'duration'     => "{$durationMin} mins",
                    'status'       => 'EXIT_COMPLETED'
                ];
            }
        }

        $this->success([
            'barrier_open'    => true,
            'gate_id'         => $gateId,
            'direction'       => $direction,
            'reason'          => $reason,
            'operator'        => $currentUser['full_name'] ?? 'Operator',
            'relay'           => $res,
            'session_updated' => $sessionUpdated,
            'closed_session'  => $closedSession
        ], "Manual barrier override pulse executed for {$gateId}. " . ($sessionUpdated ? "Parking session for vehicle {$closedSession['plate_number']} completed." : ""));
    }

    public function getLogs(): void {
        $db = Database::getInstance();
        $stmt = $db->query("SELECT b.*, u.full_name as operator_name 
            FROM barrier_logs b 
            LEFT JOIN users u ON b.operator_id = u.id 
            ORDER BY b.id DESC LIMIT 100");
        $logs = $stmt->fetchAll();

        $this->success(['logs' => $logs]);
    }
}
