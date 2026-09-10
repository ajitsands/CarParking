<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Services\BarrierRelayService;
use App\Services\TariffCalculator;

class HisIntegrationController extends Controller {
    public function syncAppointment(): void {
        $input = $this->getJsonInput();

        $mrn = trim($input['patient_mrn'] ?? '');
        $patientName = trim($input['patient_name'] ?? '');
        $phone = trim($input['patient_phone'] ?? '');
        $doctor = trim($input['doctor_name'] ?? '');
        $dept = trim($input['department'] ?? '');
        $datetime = $input['appointment_datetime'] ?? date('Y-m-d H:i:s');
        $plate = strtoupper(trim($input['registered_plate_number'] ?? $input['plate_number'] ?? ''));

        if (!$mrn || !$patientName) {
            $this->error('patient_mrn and patient_name are required for HIS synchronization', 400);
            return;
        }

        $code = 'APT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));
        $qrToken = 'QR-KIMS-' . preg_replace('/[^A-Za-z0-9]/', '', $mrn) . '-' . time();

        $db = Database::getInstance();
        $stmt = $db->prepare("INSERT INTO his_appointments (
            appointment_code, patient_mrn, patient_name, patient_phone, doctor_name, department, 
            appointment_datetime, registered_plate_number, qr_token, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')");

        $stmt->execute([$code, $mrn, $patientName, $phone, $doctor, $dept, $datetime, $plate, $qrToken]);
        $id = (int)$db->lastInsertId();

        $this->success([
            'appointment_id'   => $id,
            'appointment_code' => $code,
            'qr_token'         => $qrToken,
            'qr_data_string'   => "KIMSHEALTH://VAL?TOKEN={$qrToken}&MRN={$mrn}&CODE={$code}",
            'patient_name'     => $patientName,
            'registered_plate' => $plate,
            'sync_status'      => 'SYNCHRONIZED'
        ], 'HIS appointment successfully synchronized');
    }

    public function validateVisitor(): void {
        $input = $this->getJsonInput();
        $mrn = trim($input['patient_mrn'] ?? '');
        $plate = strtoupper(trim($input['plate_number'] ?? ''));
        $code = trim($input['appointment_code'] ?? '');

        if (!$mrn && !$plate && !$code) {
            $this->error('Provide patient_mrn, plate_number, or appointment_code', 400);
            return;
        }

        $db = Database::getInstance();

        // Match session
        $session = null;
        if ($plate) {
            $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE plate_number = ? AND exit_time IS NULL ORDER BY id DESC LIMIT 1");
            $stmt->execute([$plate]);
            $session = $stmt->fetch();
        }

        if (!$session && $mrn) {
            $stmtAppt = $db->prepare("SELECT registered_plate_number FROM his_appointments WHERE patient_mrn = ? ORDER BY id DESC LIMIT 1");
            $stmtAppt->execute([$mrn]);
            $regPlate = $stmtAppt->fetchColumn();
            if ($regPlate) {
                $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE plate_number = ? AND exit_time IS NULL ORDER BY id DESC LIMIT 1");
                $stmt->execute([$regPlate]);
                $session = $stmt->fetch();
            }
        }

        if (!$session) {
            $this->error('No active parking session found for the provided patient/vehicle', 404);
            return;
        }

        $db->prepare("UPDATE parking_sessions SET status = 'VALIDATED', validation_method = 'auto_appointment', validation_ref = ?, validated_at = NOW() WHERE id = ?")
           ->execute([$code ?: $mrn, $session['id']]);

        $this->success([
            'session_code' => $session['session_code'],
            'plate_number' => $session['plate_number'],
            'status'       => 'VALIDATED',
            'message'      => 'Parking validated successfully via HIS consultation check-out'
        ]);
    }

    public function checkStatus(): void {
        $params = $this->getQueryParams();
        $plate = strtoupper(trim($params['plate_number'] ?? $params['plate'] ?? ''));

        if (!$plate) {
            $this->error('plate_number query parameter required', 400);
            return;
        }

        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE plate_number = ? AND exit_time IS NULL ORDER BY id DESC LIMIT 1");
        $stmt->execute([$plate]);
        $session = $stmt->fetch();

        if (!$session) {
            $this->success(['inside' => false, 'message' => 'Vehicle is not currently in the parking area']);
            return;
        }

        $tariff = TariffCalculator::calculate($session);

        $this->success([
            'inside'        => true,
            'session_code'  => $session['session_code'],
            'plate_number'  => $session['plate_number'],
            'entry_time'    => $session['entry_time'],
            'status'        => $session['status'],
            'total_minutes' => $tariff['total_minutes'],
            'is_validated'  => ($session['status'] === 'VALIDATED'),
            'amount_due'    => $tariff['net_amount'],
            'currency'      => $tariff['currency'],
            'formatted_due' => $tariff['formatted_net']
        ]);
    }

    public function emergencyAccess(): void {
        $input = $this->getJsonInput();
        $plate = strtoupper(trim($input['plate_number'] ?? 'EMERGENCY_AMBULANCE'));
        $gateId = trim($input['gate_id'] ?? 'GATE-IN-01');
        $reason = trim($input['reason'] ?? 'HIS Emergency Code Red / Ambulance incoming');

        $res = BarrierRelayService::openBarrier($gateId, 'ENTRY', $plate, 'emergency_priority', null, $reason);

        $this->success([
            'gate_id'        => $gateId,
            'plate_number'   => $plate,
            'barrier_opened' => true,
            'relay'          => $res,
            'priority'       => 'EMERGENCY_PRIORITY'
        ], 'Emergency priority gate clearance executed');
    }
}
