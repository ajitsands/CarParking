<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;

class VisitorValidationController extends Controller {

    /**
     * POST /api/v1/validation/qr
     * Validates parking session by scanned appointment QR code.
     * Supports raw tokens, KIMSHEALTH:// URI schemes, and JSON payloads.
     */
    public function validateByQr(): void {
        $input = $this->getJsonInput();
        $rawToken = trim($input['qr_token'] ?? $input['token'] ?? '');
        $plate = strtoupper(trim($input['plate_number'] ?? ''));
        $sessionId = (int)($input['session_id'] ?? 0);

        if (!$rawToken) {
            $this->error('QR token is required for validation', 400);
            return;
        }

        // Parse token if it's formatted as a URL/URI scheme (e.g. KIMSHEALTH://VAL?TOKEN=... or http://...)
        $token = $rawToken;
        $extractedMrn = '';
        $extractedCode = '';

        if (str_contains($rawToken, 'TOKEN=') || str_contains($rawToken, 'token=')) {
            $queryString = parse_url($rawToken, PHP_URL_QUERY) ?: $rawToken;
            parse_str($queryString, $parsedParams);
            if (!empty($parsedParams['TOKEN'])) $token = trim($parsedParams['TOKEN']);
            if (!empty($parsedParams['token'])) $token = trim($parsedParams['token']);
            if (!empty($parsedParams['MRN'])) $extractedMrn = trim($parsedParams['MRN']);
            if (!empty($parsedParams['CODE'])) $extractedCode = trim($parsedParams['CODE']);
        }

        $db = Database::getInstance();

        // 1. Verify Appointment in database
        $stmtAppt = $db->prepare("SELECT * FROM his_appointments WHERE qr_token = ? OR appointment_code = ? LIMIT 1");
        $stmtAppt->execute([$token, $extractedCode ?: $token]);
        $appointment = $stmtAppt->fetch();

        $mrn = $appointment['patient_mrn'] ?? ($extractedMrn ?: ('MRN-' . substr(abs(crc32($token)), 0, 6)));
        $patientName = $appointment['patient_name'] ?? 'Hospital Patient / Visitor';
        $registeredPlate = $appointment['registered_plate_number'] ?? $plate;

        // 2. Find matching active parking session
        $targetPlate = $plate ?: $registeredPlate;
        $session = null;

        if ($sessionId > 0) {
            $stmtSess = $db->prepare("SELECT * FROM parking_sessions WHERE id = ? AND exit_time IS NULL LIMIT 1");
            $stmtSess->execute([$sessionId]);
            $session = $stmtSess->fetch();
        }

        if (!$session && $targetPlate) {
            $cleanPlate = preg_replace('/[^A-Za-z0-9]/', '', $targetPlate);
            $stmtSess = $db->prepare("SELECT * FROM parking_sessions WHERE (plate_number = ? OR REPLACE(plate_number, ' ', '') = ?) AND exit_time IS NULL AND status NOT IN ('EXIT_COMPLETED', 'CANCELLED') ORDER BY id DESC LIMIT 1");
            $stmtSess->execute([$targetPlate, $cleanPlate]);
            $session = $stmtSess->fetch();
        }

        if (!$session && $mrn) {
            // Check if there is a session with any plate belonging to this MRN
            $stmtSess = $db->prepare("SELECT * FROM parking_sessions WHERE (plate_number = ? OR validation_ref = ?) AND exit_time IS NULL ORDER BY id DESC LIMIT 1");
            $stmtSess->execute([$registeredPlate, $mrn]);
            $session = $stmtSess->fetch();
        }

        if (!$session) {
            // Find latest active session requiring validation
            $stmtSess = $db->query("SELECT * FROM parking_sessions WHERE exit_time IS NULL AND status IN ('VALIDATION_PENDING', 'CHARGING') ORDER BY id DESC LIMIT 1");
            $session = $stmtSess->fetch();
        }

        if (!$session) {
            $this->error('No active parking session found requiring validation in the parking area', 404);
            return;
        }

        // 3. Mark session VALIDATED
        $currentUser = $this->getCurrentUser();
        $userId = $currentUser ? (int)$currentUser['id'] : null;

        $db->prepare("UPDATE parking_sessions SET status = 'VALIDATED', validation_method = 'appointment_qr', validation_ref = ?, validated_by = ?, validated_at = NOW() WHERE id = ?")
           ->execute([$token, $userId, $session['id']]);

        // Insert record in visitor_validations
        $stmtVal = $db->prepare("INSERT INTO visitor_validations (session_id, patient_mrn, appointment_id, visitor_name, qr_token, validation_type, validated_by_user_id, free_minutes_granted, notes) VALUES (?, ?, ?, ?, ?, 'appointment_qr', ?, 180, ?)");
        $stmtVal->execute([
            $session['id'],
            $mrn,
            $appointment['appointment_code'] ?? ($extractedCode ?: 'APT-QR-DIRECT'),
            $patientName,
            $token,
            $userId,
            'Validated via Appointment QR Code'
        ]);

        if ($appointment) {
            $db->prepare("UPDATE his_appointments SET is_validated = 1, status = 'checked_in', validated_session_id = ? WHERE id = ?")
               ->execute([$session['id'], $appointment['id']]);
        }

        $this->success([
            'session_code' => $session['session_code'],
            'plate_number' => $session['plate_number'],
            'status'       => 'VALIDATED',
            'patient_name' => $patientName,
            'patient_mrn'  => $mrn,
            'appointment_code' => $appointment['appointment_code'] ?? ($extractedCode ?: 'APT-QR-DIRECT'),
            'message'      => "Appointment QR verified! Vehicle {$session['plate_number']} (Session: {$session['session_code']}) is now authorized for 3 hours of free parking."
        ], 'Validation successful via QR Code');
    }

    public function validateByReception(): void {
        $currentUser = $this->getCurrentUser();
        $input = $this->getJsonInput();

        $plate = strtoupper(trim($input['plate_number'] ?? ''));
        $sessionId = (int)($input['session_id'] ?? 0);
        $patientMrn = trim($input['patient_mrn'] ?? '');
        $visitorName = trim($input['visitor_name'] ?? 'Hospital Patient');
        $notes = trim($input['notes'] ?? 'Validated at Reception Counter');

        $db = Database::getInstance();
        $cleanPlate = preg_replace('/[^A-Za-z0-9]/', '', $plate);

        $session = null;
        if ($sessionId > 0) {
            $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE id = ? LIMIT 1");
            $stmt->execute([$sessionId]);
            $session = $stmt->fetch();
        } elseif ($plate) {
            $stmt = $db->prepare("SELECT * FROM parking_sessions 
                WHERE (plate_number = ? OR REPLACE(plate_number, ' ', '') = ? OR REPLACE(plate_number, ' ', '') LIKE ?) 
                AND exit_time IS NULL 
                AND status NOT IN ('EXIT_COMPLETED', 'CANCELLED') 
                ORDER BY id DESC LIMIT 1");
            $stmt->execute([$plate, $cleanPlate, "%{$cleanPlate}%"]);
            $session = $stmt->fetch();
        } else {
            $this->error('Plate number or session ID required for reception validation', 400);
            return;
        }

        $userId = $currentUser ? (int)$currentUser['id'] : null;

        // If an active session is currently inside the parking area -> validate it immediately!
        if ($session) {
            $db->prepare("UPDATE parking_sessions SET status = 'VALIDATED', validation_method = 'reception', validation_ref = ?, validated_by = ?, validated_at = NOW() WHERE id = ?")
               ->execute([$patientMrn ?: 'RECEPTION-VALIDATION', $userId, $session['id']]);

            $stmtVal = $db->prepare("INSERT INTO visitor_validations (session_id, patient_mrn, visitor_name, validation_type, validated_by_user_id, free_minutes_granted, notes) VALUES (?, ?, ?, 'reception_manual', ?, 180, ?)");
            $stmtVal->execute([
                $session['id'],
                $patientMrn ?: 'MRN-RECEPTION',
                $visitorName,
                $userId,
                $notes
            ]);

            $this->success([
                'type'         => 'ACTIVE_SESSION_VALIDATED',
                'session_code' => $session['session_code'],
                'plate_number' => $session['plate_number'],
                'status'       => 'VALIDATED',
                'message'      => "Active parking session {$session['session_code']} ({$session['plate_number']}) validated successfully! 3 hours free parking granted."
            ], 'Reception validation complete');
            return;
        }

        // If NO active entry session exists yet -> Pre-register patient & generate validation QR token!
        $mrn = $patientMrn ?: ('MRN-' . strtoupper(substr(uniqid(), -5)));
        $code = 'APT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
        $cleanSuffix = $cleanPlate ?: strtoupper(substr(uniqid(), -4));
        $token = "QR-KIMS-{$mrn}-{$cleanSuffix}-" . strtoupper(substr(md5($code . time()), 0, 4));
        $now = \App\Helpers\TimezoneHelper::now();

        $stmtAppt = $db->prepare("INSERT INTO his_appointments (
            appointment_code, patient_mrn, patient_name, doctor_name, department,
            appointment_datetime, registered_plate_number, qr_token, status, is_validated
        ) VALUES (?, ?, ?, 'OPD / General Consultation', 'Hospital Outpatient', ?, ?, ?, 'scheduled', 0)");
        $stmtAppt->execute([
            $code, $mrn, $visitorName, $now, $plate, $token
        ]);

        $this->success([
            'type'             => 'TOKEN_GENERATED',
            'appointment_code' => $code,
            'patient_name'     => $visitorName,
            'patient_mrn'      => $mrn,
            'plate_number'     => $plate,
            'qr_token'         => $token,
            'message'          => "Patient validation token created for {$visitorName} (Plate: {$plate}). When this vehicle enters, it will automatically receive Free Validated Parking."
        ], 'Patient validation token created successfully');
    }

    public function createToken(): void {
        $input = $this->getJsonInput();
        $plate = strtoupper(trim($input['plate_number'] ?? ''));
        $patientMrn = trim($input['patient_mrn'] ?? '');
        $visitorName = trim($input['patient_name'] ?? $input['visitor_name'] ?? 'Hospital Patient');
        $doctorName = trim($input['doctor_name'] ?? 'General Consultation / OPD');
        $department = trim($input['department'] ?? 'Outpatient Clinic');

        if (!$plate && !$patientMrn) {
            $this->error('Vehicle plate number or patient MRN is required', 400);
            return;
        }

        $db = Database::getInstance();
        $cleanPlate = preg_replace('/[^A-Za-z0-9]/', '', $plate);
        $mrn = $patientMrn ?: ('MRN-' . strtoupper(substr(uniqid(), -5)));
        $code = 'APT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
        $cleanSuffix = $cleanPlate ?: strtoupper(substr(uniqid(), -4));
        $token = "QR-KIMS-{$mrn}-{$cleanSuffix}-" . strtoupper(substr(md5($code . time()), 0, 4));
        $now = \App\Helpers\TimezoneHelper::now();

        $stmtAppt = $db->prepare("INSERT INTO his_appointments (
            appointment_code, patient_mrn, patient_name, doctor_name, department,
            appointment_datetime, registered_plate_number, qr_token, status, is_validated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 0)");
        $stmtAppt->execute([
            $code, $mrn, $visitorName, $doctorName, $department, $now, $plate, $token
        ]);

        $this->success([
            'appointment_code' => $code,
            'patient_name'     => $visitorName,
            'patient_mrn'      => $mrn,
            'plate_number'     => $plate,
            'qr_token'         => $token,
            'message'          => "Token generated for {$visitorName} ({$plate}). Validated access registered."
        ], 'Token created successfully');
    }

    public function searchAppointments(): void {
        $db = Database::getInstance();
        $q = trim($this->getQueryParams()['q'] ?? '');

        if ($q) {
            $stmt = $db->prepare("SELECT * FROM his_appointments WHERE (patient_name LIKE ? OR patient_mrn LIKE ? OR registered_plate_number LIKE ? OR appointment_code LIKE ?) ORDER BY id DESC LIMIT 50");
            $stmt->execute(["%{$q}%", "%{$q}%", "%{$q}%", "%{$q}%"]);
        } else {
            $stmt = $db->query("SELECT * FROM his_appointments ORDER BY id DESC LIMIT 50");
        }

        $appointments = $stmt->fetchAll();
        $this->success(['appointments' => $appointments]);
    }

    /**
     * GET /api/v1/validation/candidates
     * Returns parked vehicles currently inside the lot awaiting validation,
     * with ANPR snapshot photos, plate numbers, gate, and arrival elapsed time.
     * Supports:
     * - ?q= (partial plate search or clean plate)
     * - ?time_filter= (5min, 10min, 20min, 30min, 1hr, 2hr, 3hr_plus, all)
     */
    public function getActiveCandidates(): void {
        $db = Database::getInstance();
        $params = $this->getQueryParams();
        $q = trim($params['q'] ?? '');
        $timeFilter = trim($params['time_filter'] ?? 'all');

        $where = ["s.exit_time IS NULL", "s.status NOT IN ('EXIT_COMPLETED', 'CANCELLED')"];
        $bindings = [];

        if ($q !== '') {
            $cleanQ = preg_replace('/[^A-Za-z0-9]/', '', $q);
            $where[] = "(s.plate_number LIKE ? OR REPLACE(s.plate_number, ' ', '') LIKE ?)";
            $bindings[] = "%{$q}%";
            $bindings[] = "%{$cleanQ}%";
        }

        if ($timeFilter === '5min') {
            $where[] = "s.entry_time >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)";
        } elseif ($timeFilter === '10min') {
            $where[] = "s.entry_time >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)";
        } elseif ($timeFilter === '20min') {
            $where[] = "s.entry_time >= DATE_SUB(NOW(), INTERVAL 20 MINUTE)";
        } elseif ($timeFilter === '30min') {
            $where[] = "s.entry_time >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)";
        } elseif ($timeFilter === '1hr') {
            $where[] = "s.entry_time >= DATE_SUB(NOW(), INTERVAL 1 HOUR)";
        } elseif ($timeFilter === '2hr') {
            $where[] = "s.entry_time >= DATE_SUB(NOW(), INTERVAL 2 HOUR)";
        } elseif ($timeFilter === '3hr_plus') {
            $where[] = "s.entry_time < DATE_SUB(NOW(), INTERVAL 3 HOUR)";
        }

        $sql = "SELECT s.*, v.vehicle_type, v.owner_name, v.category
                FROM parking_sessions s
                LEFT JOIN vehicles v ON s.plate_number = v.plate_number
                WHERE " . implode(' AND ', $where) . "
                ORDER BY s.entry_time DESC
                LIMIT 60";

        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $sessions = $stmt->fetchAll();

        $candidates = array_map(function($sess) {
            $entryTs = strtotime($sess['entry_time']);
            $nowTs = time();
            $elapsedMins = max(0, round(($nowTs - $entryTs) / 60));

            $durationFormatted = $elapsedMins < 60 
                ? "{$elapsedMins} mins ago" 
                : floor($elapsedMins / 60) . "h " . ($elapsedMins % 60) . "m ago";

            return [
                'id'                 => (int)$sess['id'],
                'session_code'       => $sess['session_code'],
                'plate_number'       => $sess['plate_number'],
                'entry_time'         => $sess['entry_time'],
                'entry_time_display' => date('h:i A', $entryTs),
                'elapsed_minutes'    => $elapsedMins,
                'duration_formatted' => $durationFormatted,
                'entry_image_url'    => $sess['entry_image_url'] ?: null,
                'entry_gate_id'      => $sess['entry_gate_id'] ?: 'GATE-IN-01',
                'status'             => $sess['status'],
                'validation_status'  => $sess['status'] === 'VALIDATED' ? 'VALIDATED' : 'PENDING',
                'vehicle_type'       => $sess['vehicle_type'] ?: 'Car',
                'owner_name'         => $sess['owner_name'] ?: null,
                'category'           => $sess['category'] ?: 'general'
            ];
        }, $sessions);

        $this->success([
            'candidates' => $candidates,
            'total'      => count($candidates),
            'time_filter'=> $timeFilter
        ]);
    }
}
