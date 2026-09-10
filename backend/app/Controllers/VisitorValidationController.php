<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;

class VisitorValidationController extends Controller {
    public function validateByQr(): void {
        $input = $this->getJsonInput();
        $token = trim($input['qr_token'] ?? $input['token'] ?? '');
        $plate = strtoupper(trim($input['plate_number'] ?? ''));

        if (!$token) {
            $this->error('QR token is required for validation', 400);
            return;
        }

        $db = Database::getInstance();

        // 1. Verify Appointment QR Token
        $stmtAppt = $db->prepare("SELECT * FROM his_appointments WHERE qr_token = ? LIMIT 1");
        $stmtAppt->execute([$token]);
        $appointment = $stmtAppt->fetch();

        // If not found in seed appointments, treat as general verified hospital QR token
        $mrn = $appointment['patient_mrn'] ?? 'MRN-' . substr(abs(crc32($token)), 0, 6);
        $patientName = $appointment['patient_name'] ?? 'Hospital Visitor';
        $registeredPlate = $appointment['registered_plate_number'] ?? $plate;

        // 2. Find matching active parking session
        $targetPlate = $plate ?: $registeredPlate;
        $session = null;

        if ($targetPlate) {
            $stmtSess = $db->prepare("SELECT * FROM parking_sessions WHERE plate_number = ? AND exit_time IS NULL AND status IN ('VALIDATION_PENDING', 'CHARGING') ORDER BY id DESC LIMIT 1");
            $stmtSess->execute([$targetPlate]);
            $session = $stmtSess->fetch();
        }

        if (!$session) {
            // Find latest active session without validation
            $stmtSess = $db->query("SELECT * FROM parking_sessions WHERE exit_time IS NULL AND status IN ('VALIDATION_PENDING', 'CHARGING') ORDER BY id DESC LIMIT 1");
            $session = $stmtSess->fetch();
        }

        if (!$session) {
            $this->error('No active parking session found requiring validation', 404);
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
            $appointment['appointment_code'] ?? 'APT-QR-DIRECT',
            $patientName,
            $token,
            $userId,
            'Validated via Method A (Appointment QR Code)'
        ]);

        if ($appointment) {
            $db->prepare("UPDATE his_appointments SET is_validated = 1, validated_session_id = ? WHERE id = ?")->execute([$session['id'], $appointment['id']]);
        }

        $this->success([
            'session_code' => $session['session_code'],
            'plate_number' => $session['plate_number'],
            'status'       => 'VALIDATED',
            'patient_name' => $patientName,
            'patient_mrn'  => $mrn,
            'message'      => "Visit successfully validated! Vehicle {$session['plate_number']} is now authorized for free parking."
        ], 'Validation successful via QR Code');
    }

    public function validateByReception(): void {
        $currentUser = $this->getCurrentUser();
        $input = $this->getJsonInput();

        $plate = strtoupper(trim($input['plate_number'] ?? ''));
        $sessionId = (int)($input['session_id'] ?? 0);
        $patientMrn = trim($input['patient_mrn'] ?? '');
        $visitorName = trim($input['visitor_name'] ?? 'Hospital Patient/Visitor');
        $notes = trim($input['notes'] ?? 'Validated at Reception Counter');

        $db = Database::getInstance();

        if ($sessionId > 0) {
            $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE id = ? LIMIT 1");
            $stmt->execute([$sessionId]);
            $session = $stmt->fetch();
        } elseif ($plate) {
            $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE plate_number = ? AND exit_time IS NULL AND status IN ('VALIDATION_PENDING', 'CHARGING') ORDER BY id DESC LIMIT 1");
            $stmt->execute([$plate]);
            $session = $stmt->fetch();
        } else {
            $this->error('Plate number or session ID required for reception validation', 400);
            return;
        }

        if (!$session) {
            $this->error('No active parking session found for validation', 404);
            return;
        }

        $userId = $currentUser ? (int)$currentUser['id'] : null;

        $db->prepare("UPDATE parking_sessions SET status = 'VALIDATED', validation_method = 'reception', validation_ref = ?, validated_by = ?, validated_at = NOW() WHERE id = ?")
           ->execute([$patientMrn ?: 'RECEPTION-VALIDATION', $userId, $session['id']]);

        $stmtVal = $db->prepare("INSERT INTO visitor_validations (session_id, patient_mrn, visitor_name, validation_type, validated_by_user_id, free_minutes_granted, notes) VALUES (?, ?, ?, 'reception_manual', ?, 180, ?)");
        $stmtVal->execute([
            $session['id'],
            $patientMrn,
            $visitorName,
            $userId,
            $notes
        ]);

        $this->success([
            'session_code' => $session['session_code'],
            'plate_number' => $session['plate_number'],
            'status'       => 'VALIDATED',
            'message'      => "Session {$session['session_code']} ({$session['plate_number']}) validated successfully by Reception."
        ], 'Reception validation complete');
    }

    public function searchAppointments(): void {
        $db = Database::getInstance();
        $q = trim($this->getQueryParams()['q'] ?? '');

        if ($q) {
            $stmt = $db->prepare("SELECT * FROM his_appointments WHERE (patient_name LIKE ? OR patient_mrn LIKE ? OR registered_plate_number LIKE ?) ORDER BY id DESC LIMIT 20");
            $stmt->execute(["%{$q}%", "%{$q}%", "%{$q}%"]);
        } else {
            $stmt = $db->query("SELECT * FROM his_appointments ORDER BY id DESC LIMIT 20");
        }

        $appointments = $stmt->fetchAll();
        $this->success(['appointments' => $appointments]);
    }
}
