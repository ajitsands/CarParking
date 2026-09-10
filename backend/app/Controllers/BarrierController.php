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

        // 2a. If this is an EXIT gate override, close the active vehicle session!
        $sessionUpdated = false;
        $closedSession = null;
        $createdSession = null;

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

        } elseif ($direction === 'ENTRY' || str_contains($gateId, 'IN')) {
            // 2b. ENTRY gate override: Create a parking session so the vehicle
            //     appears on the Dashboard and in active sessions immediately.
            if ($plate && $plate !== 'MANUAL_OVERRIDE') {
                // Generate session code
                $sessCode = 'MAN-' . strtoupper(substr(md5($plate . $nowStr), 0, 8));

                // Anti-Passback Protection: Auto-close any previous unclosed session for this plate
                \App\Services\AntiPassbackService::reconcileExistingActiveSessions($plate, $sessCode, $nowStr);

                    // Default to VALIDATION_PENDING (standard flow)
                    $initialStatus = 'VALIDATION_PENDING';
                    $graceMinutes = TariffCalculator::getAdminGraceMinutes();
                    $validationDeadline = date('Y-m-d H:i:s', strtotime($nowStr) + ($graceMinutes * 60));

                    $stmtIns = $db->prepare("INSERT INTO parking_sessions 
                        (session_code, plate_number, entry_time, entry_gate_id, status, 
                         validation_deadline, grace_period_minutes, manual_review_reason) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmtIns->execute([
                        $sessCode,
                        $plate,
                        $nowStr,
                        $gateId,
                        $initialStatus,
                        $validationDeadline,
                        $graceMinutes,
                        "Manual Entry Override: {$reason} (Operator: " . ($currentUser['username'] ?? 'operator') . ")"
                    ]);
                    $newSessionId = (int)$db->lastInsertId();

                    // Log an ANPR event for the manual entry
                    $db->prepare("INSERT INTO anpr_events 
                        (session_id, camera_id, gate_id, direction, plate_number, confidence, raw_payload) 
                        VALUES (?, 'MANUAL-CAM', ?, 'ENTRY', ?, 100, ?)")
                       ->execute([
                           $newSessionId, $gateId, $plate,
                           json_encode(['reason' => $reason, 'operator' => $currentUser['username'] ?? 'operator', 'type' => 'manual_override'])
                       ]);

                    $createdSession = [
                        'session_id'   => $newSessionId,
                        'session_code' => $sessCode,
                        'plate_number' => $plate,
                        'status'       => $initialStatus
                    ];
                }
            }
        }



        $msg = "Manual barrier override pulse executed for {$gateId}.";
        if ($sessionUpdated) {
            $msg .= " Parking session for vehicle {$closedSession['plate_number']} completed.";
        } elseif ($createdSession) {
            $msg .= " Parking session created for vehicle {$createdSession['plate_number']} (Code: {$createdSession['session_code']}).";
        }

        $this->success([
            'barrier_open'    => true,
            'gate_id'         => $gateId,
            'direction'       => $direction,
            'reason'          => $reason,
            'operator'        => $currentUser['full_name'] ?? 'Operator',
            'relay'           => $res,
            'session_updated' => $sessionUpdated,
            'closed_session'  => $closedSession,
            'created_session' => $createdSession
        ], $msg);
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
