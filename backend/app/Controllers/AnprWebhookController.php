<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Services\DecisionEngine;
use App\Services\BarrierRelayService;
use App\Services\TariffCalculator;
use App\Helpers\TimezoneHelper;

class AnprWebhookController extends Controller {
    public function handle(): void {
        TimezoneHelper::init();
        $raw = file_get_contents('php://input');
        $rawJson = json_decode($raw, true) ?: [];

        $parsed = \App\Services\AnprPayloadParser::parse($raw, $_POST ?? [], $_FILES ?? []);
        $plate = $parsed['plate_number'];

        // 0. Camera Keepalive / Handshake / Heartbeat (e.g. UNV uPark, Dahua, Hikvision) if no plate present
        if (!$plate) {
            $this->sendUnvResponse($rawJson);
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
        $payloadToLog = $raw ?: ($parsed['raw_payload'] ?? json_encode(array_merge($_POST, ['FILES' => array_keys($_FILES)])));

        $db = Database::getInstance();

        // 1. Log Raw ANPR Event
        $stmtEvent = $db->prepare("INSERT INTO anpr_events (camera_id, gate_id, direction, plate_number, confidence, plate_image_url, overview_image_url, clip_url, raw_payload, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmtEvent->execute([$cameraId, $gateId, $direction, $plate, $confidence, $plateImage, $overviewImage, $clipUrl, $payloadToLog]);
        $eventId = (int)$db->lastInsertId();

        // 2. ENTRY LANE WORKFLOW
        if ($direction === 'ENTRY') {
            $cleanPlate = preg_replace('/[^A-Za-z0-9]/', '', $plate);

            // Debounce / Duplicate Protection: Check if this vehicle entered in the last 30 seconds
            $stmtRecent = $db->prepare("SELECT * FROM parking_sessions 
                WHERE (plate_number = ? OR REPLACE(plate_number, ' ', '') = ?)
                AND entry_gate_id = ?
                AND entry_time >= DATE_SUB(NOW(), INTERVAL 30 SECOND)
                AND status NOT IN ('EXIT_COMPLETED', 'CANCELLED')
                ORDER BY id DESC LIMIT 1");
            $stmtRecent->execute([$plate, $cleanPlate, $gateId]);
            $recentSession = $stmtRecent->fetch();

            if ($recentSession) {
                // Link raw event to existing session without generating a duplicate row
                $db->prepare("UPDATE anpr_events SET session_id = ? WHERE id = ?")->execute([$recentSession['id'], $eventId]);

                $this->respondCameraSuccess([
                    'barrier_open'       => true,
                    'barrier_signal'     => 'SIGNAL_ALREADY_SENT',
                    'session_code'       => $recentSession['session_code'],
                    'session_id'         => $recentSession['id'],
                    'plate_number'       => $plate,
                    'status'             => $recentSession['status'],
                    'is_duplicate'       => true,
                    'message'            => "Vehicle {$plate} is already registered inside (#{$recentSession['session_code']}). Duplicate trigger suppressed."
                ], 'ANPR Entry already active (duplicate trigger suppressed)');
                return;
            }

            $decision = DecisionEngine::evaluateEntry($plate, $gateId);

            // If Blacklisted -> Deny & keep barrier closed (No parking session created)
            if ($decision['action'] === 'DENY') {
                $db->prepare("UPDATE anpr_events SET status = 'denied' WHERE id = ?")->execute([$eventId]);

                // Record Security Audit Log
                try {
                    $stmtAudit = $db->prepare("INSERT INTO audit_logs (user_id, username, action, plate_number, start_time, end_time, duration_minutes, entity_type, entity_id, details, ip_address) VALUES (NULL, 'System Security', 'BLACKLIST_ACCESS_DENIED', ?, NOW(), NOW(), 0, 'anpr_events', ?, ?, ?)");
                    $clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                    $auditDetails = "Access denied for blacklisted vehicle | Gate: {$gateId} | Camera: {$cameraId} | Reason: {$decision['reason']}";
                    $stmtAudit->execute([$plate, $eventId, $auditDetails, $clientIp]);
                } catch (\Throwable $e) {}

                $this->respondCameraSuccess([
                    'barrier_open'    => false,
                    'action'          => 'DENIED',
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
            $entryTime = TimezoneHelper::now();
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

            $this->respondCameraSuccess([
                'barrier_open'      => true,
                'barrier_signal'    => 'SIGNAL_SENT_OPEN_BOOM_BARRIER',
                'relay_info'        => $barrierResult,
                'session_code'      => $sessionCode,
                'session_id'        => $sessionId,
                'plate_number'      => $plate,
                'status'            => $initialStatus,
                'grace_minutes'     => $graceMinutes,
                'validation_deadline'=> $deadline,
                'decision'          => $decision['decision'] ?? 'AUTHORIZED',
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
                $exitTime = TimezoneHelper::now();
                $sessionCode = 'EXP-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
                $stmtSess = $db->prepare("INSERT INTO parking_sessions (session_code, plate_number, entry_time, exit_time, exit_gate_id, exit_image_url, status, validation_deadline, manual_review_reason) VALUES (?, ?, ?, ?, ?, ?, 'MANUAL_REVIEW', ?, 'Exit detected without corresponding entry session')");
                $stmtSess->execute([$sessionCode, $plate, $exitTime, $exitTime, $gateId, $overviewImage ?: $plateImage, $exitTime]);
                $sessionId = (int)$db->lastInsertId();

                $db->prepare("UPDATE anpr_events SET session_id = ?, status = 'manual_review' WHERE id = ?")->execute([$sessionId, $eventId]);

                $this->respondCameraSuccess([
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
                $exitTime = TimezoneHelper::now();
                $durMin = max(1, (int)round((strtotime($exitTime) - strtotime($session['entry_time'])) / 60));
                $db->prepare("UPDATE parking_sessions SET exit_time = ?, exit_gate_id = ?, exit_image_url = ?, status = 'EXIT_COMPLETED', total_duration_minutes = ? WHERE id = ?")
                   ->execute([$exitTime, $gateId, $overviewImage ?: $plateImage, $durMin, $session['id']]);

                $this->respondCameraSuccess([
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

            $this->respondCameraSuccess([
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

    private function respondCameraSuccess(array $data = [], string $message = 'Success', int $statusCode = 200): void {
        while (ob_get_level()) {
            ob_end_clean();
        }
        $raw = file_get_contents('php://input');
        $rawJson = json_decode($raw, true) ?: [];
        $parkId = $rawJson['parkId'] ?? 'park1';
        $deviceId = $rawJson['deviceId'] ?? 'PKC2640@Z80-IR-P';
        $serialNum = $rawJson['serialNum'] ?? '210235C81T3258000018';
        $now = date('Y-m-d H:i:s');
        $ts = time();

        $viidDeviceId = $rawJson['RegisterObject']['DeviceID'] 
                     ?? $rawJson['KeepaliveObject']['DeviceID'] 
                     ?? $rawJson['MotorVehicleListObject']['MotorVehicleObject'][0]['DeviceID']
                     ?? $rawJson['MotorVehicleListObject']['MotorVehicleObject']['DeviceID']
                     ?? $deviceId;

        $viidStatusObj = [
            'Id' => $viidDeviceId,
            'LocalTime' => date('YmdHis'),
            'RequestURL' => parse_url($_SERVER['REQUEST_URI'] ?? '/VIID/MotorVehicles', PHP_URL_PATH),
            'StatusCode' => 0,
            'StatusString' => 'OK'
        ];

        $payload = [
            'version'   => $rawJson['version'] ?? '1.0',
            'code'      => 0,
            'msg'       => 'success',
            'result'    => 0,
            'desc'      => 'success',
            'success'   => true,
            'message'   => $message,
            'parkId'    => $parkId,
            'deviceId'  => $deviceId,
            'serialNum' => $serialNum,
            'ResponseStatusObject' => $viidStatusObj,
            'ResponseStatusListObject' => [
                'ResponseStatusObject' => [$viidStatusObj]
            ],
            'params'    => [
                'result'      => 0,
                'desc'        => 'success',
                'gateControl' => ($data['barrier_open'] ?? true) ? 1 : 0,
                'passType'    => 1,
                'time'        => $now,
                'timestamp'   => $ts
            ],
            'data'      => $data
        ];

        $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
        header('HTTP/1.1 ' . ($statusCode === 200 ? '200 OK' : $statusCode));
        header('Content-Type: application/json; charset=UTF-8');
        header('Content-Length: ' . strlen($json));
        header('Connection: close');
        header('Access-Control-Allow-Origin: *');
        echo $json;
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }
        exit;
    }

    private function sendUnvResponse(array $extraData = []): void {
        while (ob_get_level()) {
            ob_end_clean();
        }
        $now = date('Y-m-d H:i:s');
        $ts = time();
        $parkId = $extraData['parkId'] ?? 'park1';
        $deviceId = $extraData['deviceId'] ?? 'PKC2640@Z80-IR-P';
        $serialNum = $extraData['serialNum'] ?? '210235C81T3258000018';

        $viidDeviceId = $extraData['RegisterObject']['DeviceID'] 
                     ?? $extraData['KeepaliveObject']['DeviceID'] 
                     ?? $deviceId;

        $viidStatusObj = [
            'Id' => $viidDeviceId,
            'LocalTime' => date('YmdHis'),
            'RequestURL' => parse_url($_SERVER['REQUEST_URI'] ?? '/VIID/System/Register', PHP_URL_PATH),
            'StatusCode' => 0,
            'StatusString' => 'OK'
        ];

        $payload = [
            'version'   => $extraData['version'] ?? '1.0',
            'code'      => 0,
            'msg'       => 'success',
            'result'    => 0,
            'desc'      => 'success',
            'success'   => true,
            'parkId'    => $parkId,
            'deviceId'  => $deviceId,
            'serialNum' => $serialNum,
            'keepalive' => 30,
            'keepAlive' => 30,
            'heartbeat' => 30,
            'time'      => $now,
            'timestamp' => $ts,
            'ResponseStatusObject' => $viidStatusObj,
            'ResponseStatusListObject' => [
                'ResponseStatusObject' => [$viidStatusObj]
            ],
            'params'    => [
                'result'     => 0,
                'desc'       => 'success',
                'keepalive'  => 30,
                'keepAlive'  => 30,
                'heartbeat'  => 30,
                'time'       => $now,
                'timestamp'  => $ts,
                'passType'   => 1,
                'gateControl'=> 1
            ],
            'data'      => (object)[
                'result'     => 0,
                'desc'       => 'success',
                'code'       => 0,
                'msg'        => 'success',
                'parkId'     => $parkId,
                'deviceId'   => $deviceId,
                'serialNum'  => $serialNum,
                'keepalive'  => 30,
                'keepAlive'  => 30,
                'heartbeat'  => 30,
                'time'       => $now,
                'timestamp'  => $ts,
                'passType'   => 1,
                'gateControl'=> 1
            ]
        ];
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE);

        header('HTTP/1.1 200 OK');
        header('Content-Type: application/json; charset=UTF-8');
        header('Content-Length: ' . strlen($json));
        header('Connection: close');
        header('Access-Control-Allow-Origin: *');
        echo $json;
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }
        exit;
    }
}

