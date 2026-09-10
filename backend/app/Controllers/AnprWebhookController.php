<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Services\DecisionEngine;
use App\Services\BarrierRelayService;
use App\Services\TariffCalculator;

class AnprWebhookController extends Controller {
    public function handle(): void {
        $raw = file_get_contents('php://input');
        $parsed = \App\Services\AnprPayloadParser::parse($raw, $_POST ?? [], $_FILES ?? []);

        $plate = $parsed['plate_number'];
        if (!$plate) {
            $this->error('License plate number could not be extracted from camera payload. Please verify camera manufacturer profile and field mapping in System Settings.', 400);
            return;
        }

        $gateId = $parsed['gate_id'];
        $cameraId = $parsed['camera_id'];
        $direction = $parsed['direction'];
        $confidence = $parsed['confidence'];
        $plateImage = $parsed['image_url'];
        $overviewImage = $parsed['image_url'];
        $clipUrl = $parsed['clip_url'];
        $timestamp = $parsed['timestamp'];

        $db = Database::getInstance();

        // 1. Log Raw ANPR Event
        $stmtEvent = $db->prepare("INSERT INTO anpr_events (camera_id, gate_id, direction, plate_number, confidence, plate_image_url, overview_image_url, clip_url, raw_payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmtEvent->execute([$cameraId, $gateId, $direction, $plate, $confidence, $plateImage, $overviewImage, $clipUrl, $raw]);
        $eventId = (int)$db->lastInsertId();

        // 2. ENTRY LANE WORKFLOW
        if ($direction === 'ENTRY') {
            $decision = DecisionEngine::evaluateEntry($plate, $gateId);

            // If Blacklisted -> Deny & keep barrier closed
            if ($decision['action'] === 'DENY') {
                $sessionCode = 'PARK-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
                $stmtSess = $db->prepare("INSERT INTO parking_sessions (session_code, plate_number, entry_time, entry_gate_id, entry_image_url, entry_confidence, status, validation_deadline, manual_review_reason) VALUES (?, ?, NOW(), ?, ?, ?, 'BLACKLISTED', NOW(), ?)");
                $stmtSess->execute([$sessionCode, $plate, $gateId, $overviewImage ?: $plateImage, $confidence, $decision['reason']]);
                $sessId = (int)$db->lastInsertId();

                $db->prepare("UPDATE anpr_events SET session_id = ?, status = 'manual_review' WHERE id = ?")->execute([$sessId, $eventId]);

                $this->success([
                    'barrier_open'    => false,
                    'action'          => 'DENIED',
                    'session_code'    => $sessionCode,
                    'status'          => 'BLACKLISTED',
                    'message'         => $decision['message'],
                    'alert'           => 'Security alert logged'
                ], 'Access denied for blacklisted vehicle', 403);
                return;
            }

            // Normal / Whitelist / Emergency Entry:
            // Send signal to Boom Barrier relay
            $barrierResult = BarrierRelayService::openBarrier($gateId, 'ENTRY', $plate, 'anpr_auto_entry');

            // Calculate validation deadline using system timezone
            $entryTime = \App\Helpers\TimezoneHelper::now();
            $graceMinutes = TariffCalculator::getAdminGraceMinutes();
            $deadline = date('Y-m-d H:i:s', strtotime("+{$graceMinutes} minutes", strtotime($entryTime)));

            $initialStatus = $decision['initial_state'] ?? 'VALIDATION_PENDING';
            $valMethod = $decision['validation_method'] ?? 'none';
            $valRef = $decision['validation_ref'] ?? null;

            $sessionCode = 'PARK-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));

            // Anti-Passback Protection: Auto-close any previous unclosed session for this plate
            \App\Services\AntiPassbackService::reconcileExistingActiveSessions($plate, $sessionCode, $entryTime);

            $stmtSess = $db->prepare("INSERT INTO parking_sessions (
                session_code, plate_number, entry_time, entry_gate_id, entry_image_url, entry_confidence,
                status, validation_deadline, validation_method, validation_ref, grace_period_minutes,
                validated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $validatedAt = ($initialStatus === 'VALIDATED') ? $entryTime : null;
            $stmtSess->execute([
                $sessionCode, $plate, $entryTime, $gateId, $overviewImage ?: $plateImage, $confidence,
                $initialStatus, $deadline, $valMethod, $valRef, $graceMinutes,
                $validatedAt
            ]);
            $sessionId = (int)$db->lastInsertId();

            $db->prepare("UPDATE anpr_events SET session_id = ? WHERE id = ?")->execute([$sessionId, $eventId]);

            $this->success([
                'barrier_open'      => true,
                'barrier_signal'    => 'SIGNAL_SENT_OPEN_BOOM_BARRIER',
                'relay_info'        => $barrierResult,
                'session_code'      => $sessionCode,
                'session_id'        => $sessionId,
                'plate_number'      => $plate,
                'status'            => $initialStatus,
                'grace_minutes'     => $graceMinutes,
                'validation_deadline'=> $deadline,
                'decision'          => $decision['decision'],
                'message'           => 'Vehicle registered on gate. Boom barrier opening signal sent.'
            ], 'ANPR Entry event processed successfully');
            return;
        }

        // 3. EXIT LANE WORKFLOW
        if ($direction === 'EXIT') {
            // Find active session for plate (space-agnostic and partial fallback)
            $cleanPlate = preg_replace('/[^A-Za-z0-9]/', '', $plate);
            $stmtActive = $db->prepare("SELECT * FROM parking_sessions 
                WHERE (plate_number = ? OR REPLACE(plate_number, ' ', '') = ? OR REPLACE(plate_number, ' ', '') LIKE ?) 
                AND exit_time IS NULL 
                AND status NOT IN ('EXIT_COMPLETED', 'CANCELLED') 
                ORDER BY id DESC LIMIT 1");
            $stmtActive->execute([$plate, $cleanPlate, "%{$cleanPlate}%"]);
            $session = $stmtActive->fetch();

            if (!$session) {
                // Session not found -> send to manual review (Never guess!)
                $exitTime = \App\Helpers\TimezoneHelper::now();
                $sessionCode = 'EXP-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
                $stmtSess = $db->prepare("INSERT INTO parking_sessions (session_code, plate_number, entry_time, exit_time, exit_gate_id, exit_image_url, status, validation_deadline, manual_review_reason) VALUES (?, ?, ?, ?, ?, ?, 'MANUAL_REVIEW', ?, 'Exit detected without corresponding entry session')");
                $stmtSess->execute([$sessionCode, $plate, $exitTime, $exitTime, $gateId, $overviewImage ?: $plateImage, $exitTime]);
                $sessionId = (int)$db->lastInsertId();

                $db->prepare("UPDATE anpr_events SET session_id = ?, status = 'manual_review' WHERE id = ?")->execute([$sessionId, $eventId]);

                $this->success([
                    'barrier_open' => false,
                    'action'       => 'MANUAL_REVIEW_REQUIRED',
                    'session_code' => $sessionCode,
                    'message'      => 'No active entry session found for vehicle. Operator manual verification required.'
                ], 'Exit requires manual operator review', 200);
                return;
            }

            $db->prepare("UPDATE anpr_events SET session_id = ? WHERE id = ?")->execute([$session['id'], $eventId]);

            $exitDecision = DecisionEngine::evaluateExit($session);

            if ($exitDecision['barrier_open']) {
                // Free / Validated / Whitelist / Paid exit -> open barrier!
                $barrierResult = BarrierRelayService::openBarrier($gateId, 'EXIT', $plate, 'anpr_auto_exit');

                // Mark session completed with real duration
                $exitTime = \App\Helpers\TimezoneHelper::now();
                $durMin = max(1, (int)round((strtotime($exitTime) - strtotime($session['entry_time'])) / 60));
                $db->prepare("UPDATE parking_sessions SET exit_time = ?, exit_gate_id = ?, exit_image_url = ?, status = 'EXIT_COMPLETED', total_duration_minutes = ? WHERE id = ?")
                   ->execute([$exitTime, $gateId, $overviewImage ?: $plateImage, $durMin, $session['id']]);

                $this->success([
                    'barrier_open'   => true,
                    'barrier_signal' => 'SIGNAL_SENT_OPEN_BOOM_BARRIER',
                    'relay_info'     => $barrierResult,
                    'session_code'   => $session['session_code'],
                    'status'         => 'EXIT_COMPLETED',
                    'amount_due'     => 0.000,
                    'message'        => $exitDecision['message']
                ], 'Exit authorized. Boom barrier opened.');
                return;
            }

            // Chargeable / Payment Required
            $tariff = $exitDecision['tariff_data'];
            $db->prepare("UPDATE parking_sessions SET 
                exit_gate_id = ?, 
                exit_image_url = ?, 
                status = 'CHARGING', 
                total_duration_minutes = ?,
                charged_duration_minutes = ?,
                total_amount = ?,
                net_amount = ?
                WHERE id = ?")->execute([
                $gateId,
                $overviewImage ?: $plateImage,
                $tariff['total_minutes'],
                $tariff['chargeable_minutes'],
                $tariff['gross_amount'],
                $tariff['net_amount'],
                $session['id']
            ]);

            $this->success([
                'barrier_open'      => false,
                'action'            => 'PAYMENT_PENDING',
                'session_id'        => $session['id'],
                'session_code'      => $session['session_code'],
                'plate_number'      => $plate,
                'total_duration'    => $tariff['total_minutes'] . ' mins',
                'chargeable_minutes'=> $tariff['chargeable_minutes'] . ' mins',
                'amount_due'        => $tariff['net_amount'],
                'currency'          => $tariff['currency'],
                'formatted_amount'  => $tariff['formatted_net'],
                'message'           => $exitDecision['message']
            ], 'Payment required before barrier opening');
            return;
        }

        $this->error('Unknown lane direction', 400);
    }

    private function storeImageIfBase64(string $input, string $folder, string $plate): string {
        if (!$input) return '';
        if (str_starts_with($input, 'http://') || str_starts_with($input, 'https://') || str_starts_with($input, '/')) {
            return $input;
        }

        if (preg_match('/^data:image\/(\w+);base64,/', $input, $matches)) {
            $ext = $matches[1];
            $data = base64_decode(substr($input, strpos($input, ',') + 1));
        } else {
            $ext = 'jpg';
            $data = base64_decode($input);
        }

        if (!$data) return '';

        $dir = __DIR__ . '/../../storage/uploads/' . $folder;
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $cleanPlate = preg_replace('/[^A-Za-z0-9]/', '_', $plate);
        $filename = $cleanPlate . '_' . time() . '.' . $ext;
        file_put_contents($dir . '/' . $filename, $data);

        return '/storage/uploads/' . $folder . '/' . $filename;
    }
}
