<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Services\TariffCalculator;
use App\Helpers\TimezoneHelper;
use DateTime;

class ParkingSessionController extends Controller {
    public function index(): void {
        $db = Database::getInstance();
        $params = $this->getQueryParams();

        $status = $params['status'] ?? '';
        $search = trim($params['search'] ?? '');
        $limit = min(200, max(10, (int)($params['limit'] ?? 50)));
        $page = max(1, (int)($params['page'] ?? 1));
        $offset = ($page - 1) * $limit;

        $where = ["1=1"];
        $bindings = [];

        if ($status) {
            $where[] = "status = ?";
            $bindings[] = $status;
        }

        if ($search) {
            $where[] = "(plate_number LIKE ? OR session_code LIKE ?)";
            $bindings[] = "%{$search}%";
            $bindings[] = "%{$search}%";
        }

        $sqlWhere = implode(' AND ', $where);

        // Count total
        $stmtCount = $db->prepare("SELECT COUNT(*) FROM parking_sessions WHERE {$sqlWhere}");
        $stmtCount->execute($bindings);
        $total = (int)$stmtCount->fetchColumn();

        // Fetch records
        $sql = "SELECT * FROM parking_sessions WHERE {$sqlWhere} ORDER BY id DESC LIMIT {$limit} OFFSET {$offset}";
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $sessions = $stmt->fetchAll();

        // Dynamically compute current duration and tariff for active sessions
        \App\Helpers\TimezoneHelper::init();
        $adminGraceMinutes = TariffCalculator::getAdminGraceMinutes();
        $nowStr = \App\Helpers\TimezoneHelper::now();
        $nowTs = strtotime($nowStr);

        foreach ($sessions as &$sess) {
            $entryTs = strtotime($sess['entry_time']);
            $exitTs = !empty($sess['exit_time']) ? strtotime($sess['exit_time']) : $nowTs;

            if ($exitTs < $entryTs) {
                $exitTs = $entryTs;
            }

            $elapsedMinutes = max(0, (int)round(($exitTs - $entryTs) / 60));
            $sess['total_duration_minutes'] = $elapsedMinutes;

            // If session is still active (no exit time)
            if (empty($sess['exit_time'])) {
                // If VALIDATION_PENDING: check if duration has exceeded admin grace minutes OR deadline passed
                if ($sess['status'] === 'VALIDATION_PENDING') {
                    $deadlineTs = !empty($sess['validation_deadline']) ? strtotime($sess['validation_deadline']) : ($entryTs + ($adminGraceMinutes * 60));
                    if ($elapsedMinutes >= $adminGraceMinutes || $nowTs >= $deadlineTs) {
                        // Grace period expired without validation -> flip to CHARGING!
                        $sess['status'] = 'CHARGING';
                        $calc = TariffCalculator::calculate($sess);
                        $sess['total_duration_minutes'] = $calc['total_minutes'];
                        $sess['charged_duration_minutes'] = $calc['chargeable_minutes'];
                        $sess['net_amount'] = $calc['net_amount'];
                        $sess['formatted_amount'] = $calc['formatted_net'];

                        $db->prepare("UPDATE parking_sessions SET status = 'CHARGING', total_duration_minutes = ?, charged_duration_minutes = ?, net_amount = ? WHERE id = ?")
                           ->execute([$calc['total_minutes'], $calc['chargeable_minutes'], $calc['net_amount'], $sess['id']]);
                    } else {
                        // Still within free validation grace period
                        $sess['charged_duration_minutes'] = 0;
                        $sess['net_amount'] = 0.000;
                    }
                } elseif ($sess['status'] === 'CHARGING') {
                    $calc = TariffCalculator::calculate($sess);
                    $sess['total_duration_minutes'] = $calc['total_minutes'];
                    $sess['charged_duration_minutes'] = $calc['chargeable_minutes'];
                    $sess['net_amount'] = $calc['net_amount'];
                    $sess['formatted_amount'] = $calc['formatted_net'];

                    // Update DB with latest minutes & fee
                    $db->prepare("UPDATE parking_sessions SET total_duration_minutes = ?, charged_duration_minutes = ?, net_amount = ? WHERE id = ?")
                       ->execute([$calc['total_minutes'], $calc['chargeable_minutes'], $calc['net_amount'], $sess['id']]);
                } elseif ($sess['status'] === 'VALIDATED') {
                    // Validated patient / visitor: Duration is tracked, but fee is waived 0.000
                    $sess['charged_duration_minutes'] = 0;
                    $sess['net_amount'] = 0.000;
                }
            } else {
                // Completed session with exit time
                $sess['total_duration_minutes'] = max(1, (int)round(($exitTs - $entryTs) / 60));
            }
        }

        $this->success([
            'sessions' => $sessions,
            'total'    => $total,
            'page'     => $page,
            'limit'    => $limit
        ]);
    }

    public function show(int $id): void {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $session = $stmt->fetch();

        if (!$session) {
            $this->error('Session not found', 404);
            return;
        }

        // Live calculation
        $tariff = TariffCalculator::calculate($session);

        // Fetch ANPR events
        $stmtEvents = $db->prepare("SELECT * FROM anpr_events WHERE session_id = ? ORDER BY id ASC");
        $stmtEvents->execute([$id]);
        $anprEvents = $stmtEvents->fetchAll();

        // Fetch Validation
        $stmtVal = $db->prepare("SELECT * FROM visitor_validations WHERE session_id = ? ORDER BY id DESC LIMIT 1");
        $stmtVal->execute([$id]);
        $validation = $stmtVal->fetch();

        // Fetch Payments
        $stmtPay = $db->prepare("SELECT * FROM payments WHERE session_id = ? ORDER BY id ASC");
        $stmtPay->execute([$id]);
        $payments = $stmtPay->fetchAll();

        $this->success([
            'session'    => $session,
            'tariff'     => $tariff,
            'events'     => $anprEvents,
            'validation' => $validation,
            'payments'   => $payments
        ]);
    }

    public function resolveManualReview(int $id): void {
        $input = $this->getJsonInput();
        $action = $input['action'] ?? 'validate'; // validate, waive, charge, complete
        $reason = trim($input['reason'] ?? 'Manual review resolved by operator');

        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $session = $stmt->fetch();

        if (!$session) {
            $this->error('Session not found', 404);
            return;
        }

        if ($action === 'validate') {
            $db->prepare("UPDATE parking_sessions SET status = 'VALIDATED', validation_method = 'manual_waived', manual_review_reason = ?, validated_at = NOW() WHERE id = ?")
               ->execute([$reason, $id]);
        } elseif ($action === 'complete_exit') {
            $db->prepare("UPDATE parking_sessions SET status = 'EXIT_COMPLETED', exit_time = NOW(), manual_review_reason = ? WHERE id = ?")
               ->execute([$reason, $id]);
        }

        $this->success([], "Manual review resolved: {$action}");
    }

    public function completeExit(int $id): void {
        $currentUser = $this->getCurrentUser();
        $input = $this->getJsonInput();

        $gateId = $input['gate_id'] ?? 'GATE-OUT-01';
        $reason = trim($input['reason'] ?? 'Manual exit authorized by operator');
        $isCashPayment = !empty($input['cash_payment']);

        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $session = $stmt->fetch();

        if (!$session) {
            $this->error('Parking session not found', 404);
            return;
        }

        if (!empty($session['exit_time']) && $session['status'] === 'EXIT_COMPLETED') {
            $this->error('Vehicle session has already completed exit', 400);
            return;
        }

        $nowStr = TimezoneHelper::now();
        $entryTs = strtotime($session['entry_time']);
        $exitTs = strtotime($nowStr);
        $durationMin = max(1, (int)round(($exitTs - $entryTs) / 60));

        $tariff = TariffCalculator::calculate($session, $nowStr);
        $netAmount = (float)($tariff['net_amount'] ?? 0);
        $userId = $currentUser ? (int)$currentUser['id'] : null;

        $paymentStatus = $session['payment_status'] ?? 'pending';
        $paidAmount = (float)($session['paid_amount'] ?? 0);

        if ($isCashPayment || $netAmount <= 0.000 || stripos($reason, 'cash') !== false) {
            $paymentStatus = 'paid';
            $paidAmount = $netAmount;
            if ($netAmount > 0) {
                $txCode = 'CASH-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
                $db->prepare("INSERT INTO payments (session_id, transaction_code, amount, currency, payment_method, gateway_status, collected_by_user_id) VALUES (?, ?, ?, 'BHD', 'cash', 'COMPLETED', ?)")
                   ->execute([$id, $txCode, $netAmount, $userId]);
            }
        }

        // Send hardware relay pulse to open exit boom barrier
        $barrierResult = \App\Services\BarrierRelayService::openBarrier($gateId, 'EXIT', $session['plate_number'], 'manual_exit_checkout', $userId, $reason);

        // Update session to EXIT_COMPLETED
        $db->prepare("UPDATE parking_sessions SET 
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
            WHERE id = ?")
           ->execute([
            $nowStr,
            $gateId,
            $durationMin,
            $tariff['chargeable_minutes'] ?? 0,
            $tariff['gross_amount'] ?? $netAmount,
            $netAmount,
            $paidAmount,
            $paymentStatus,
            "Exit checkout: {$reason} (by " . ($currentUser['username'] ?? 'operator') . ")",
            $id
        ]);

        $this->success([
            'session_id'     => $id,
            'session_code'   => $session['session_code'],
            'plate_number'   => $session['plate_number'],
            'status'         => 'EXIT_COMPLETED',
            'duration'       => "{$durationMin} mins",
            'barrier_open'   => true,
            'relay'          => $barrierResult
        ], "Vehicle {$session['plate_number']} exit completed successfully. Boom barrier opening signal sent.");
    }
}
