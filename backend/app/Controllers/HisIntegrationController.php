<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Services\BarrierRelayService;
use App\Services\TariffCalculator;
use App\Services\QrCodeService;
use App\Helpers\TimezoneHelper;
use App\Helpers\CurrencyHelper;

class HisIntegrationController extends Controller {

    /**
     * POST /api/v1/his/appointments/sync
     * Receives online booking details from HIMS, generates a unique QR code,
     * and returns the printable QR image (Base64 PNG & SVG) and data strings to HIMS.
     */
    public function syncAppointment(): void {
        TimezoneHelper::init();
        $input = $this->getJsonInput();

        $mrn = trim($input['patient_mrn'] ?? '');
        $patientName = trim($input['patient_name'] ?? '');
        $phone = trim($input['patient_phone'] ?? '');
        $doctor = trim($input['doctor_name'] ?? '');
        $dept = trim($input['department'] ?? '');
        $datetime = $input['appointment_datetime'] ?? TimezoneHelper::now();
        $plate = strtoupper(trim($input['registered_plate_number'] ?? $input['plate_number'] ?? ''));
        $freeHours = (int)($input['free_hours'] ?? 3);

        if (!$mrn || !$patientName) {
            $this->error('patient_mrn and patient_name are required for HIMS synchronization', 400);
            return;
        }

        $db = Database::getInstance();

        // Determine QR token prefix: 1) Request override, 2) System Settings, 3) Default (QR-KIMS)
        $requestPrefix = trim($input['token_prefix'] ?? $input['prefix'] ?? '');
        if ($requestPrefix) {
            $prefix = rtrim(strtoupper($requestPrefix), '-');
        } else {
            $stmtPrefix = $db->query("SELECT setting_value FROM system_settings WHERE setting_key = 'qr_token_prefix' LIMIT 1");
            $customPrefix = trim($stmtPrefix ? ($stmtPrefix->fetchColumn() ?: '') : '');
            $prefix = $customPrefix ? rtrim(strtoupper($customPrefix), '-') : 'QR-KIMS';
        }

        $code = 'APT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));
        $cleanMrn = preg_replace('/[^A-Za-z0-9]/', '', $mrn);
        $qrToken = $prefix . '-' . ($cleanMrn ?: 'PATIENT') . '-' . time() . '-' . rand(100, 999);

        // Check if appointment already exists for this MRN today with same time
        $stmtExist = $db->prepare("SELECT * FROM his_appointments WHERE patient_mrn = ? AND DATE(appointment_datetime) = DATE(?) LIMIT 1");
        $stmtExist->execute([$mrn, $datetime]);
        $existing = $stmtExist->fetch();

        if ($existing) {
            // Update existing appointment
            $stmtUp = $db->prepare("UPDATE his_appointments SET 
                patient_name = ?, patient_phone = ?, doctor_name = ?, department = ?, 
                registered_plate_number = ?, qr_token = ? WHERE id = ?");
            $stmtUp->execute([$patientName, $phone, $doctor, $dept, $plate, $qrToken, $existing['id']]);
            $id = (int)$existing['id'];
            $code = $existing['appointment_code'];
        } else {
            // Insert new appointment
            $stmt = $db->prepare("INSERT INTO his_appointments (
                appointment_code, patient_mrn, patient_name, patient_phone, doctor_name, department, 
                appointment_datetime, registered_plate_number, qr_token, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')");

            $stmt->execute([$code, $mrn, $patientName, $phone, $doctor, $dept, $datetime, $plate, $qrToken]);
            $id = (int)$db->lastInsertId();
        }

        // Generate high-resolution QR package
        $qrPackage = QrCodeService::generateQrPackage($qrToken, $patientName, $mrn, $code, $plate);

        $this->success([
            'appointment_id'        => $id,
            'appointment_code'      => $code,
            'patient_name'          => $patientName,
            'patient_mrn'           => $mrn,
            'patient_phone'         => $phone,
            'doctor_name'           => $doctor,
            'department'            => $dept,
            'appointment_datetime'  => $datetime,
            'registered_plate'      => $plate,
            'qr_token'              => $qrToken,
            'qr_data_string'        => $qrPackage['qr_data_string'],
            'qr_png_base64'         => $qrPackage['qr_png_base64'],
            'qr_svg_data_uri'       => $qrPackage['qr_svg_data_uri'],
            'printable_slip_html'   => $qrPackage['printable_slip_html'],
            'free_hours_granted'    => $freeHours,
            'free_minutes_granted'  => $freeHours * 60,
            'sync_status'           => 'SYNCHRONIZED',
            'created_at'            => TimezoneHelper::now()
        ], 'HIMS appointment received and Parking QR code generated successfully');
    }

    /**
     * GET /api/v1/his/parking-status
     * Returns real-time hospital parking availability (total capacity, occupied, available, floor breakdown)
     * OR specific vehicle parking session if plate_number / mrn is supplied.
     */
    public function checkStatus(): void {
        TimezoneHelper::init();
        $params = $this->getQueryParams();
        $plate = strtoupper(trim($params['plate_number'] ?? $params['plate'] ?? ''));
        $mrn = trim($params['patient_mrn'] ?? $params['mrn'] ?? '');

        $db = Database::getInstance();

        // ── Case 1: Specific Vehicle or Patient Query ──
        if ($plate || $mrn) {
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
                $this->success([
                    'inside'  => false,
                    'query'   => $plate ?: $mrn,
                    'message' => 'Vehicle is not currently in the parking area'
                ]);
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
                'is_validated'  => in_array($session['status'], ['VALIDATED', 'VALIDATED_FREE']),
                'amount_due'    => $tariff['net_amount'],
                'currency'      => $tariff['currency'],
                'formatted_due' => $tariff['formatted_net']
            ]);
            return;
        }

        // ── Case 2: Overall Hospital Parking Availability ──
        // Read configured total capacity and floor configuration
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

        // Current real-time occupied count
        $occupied = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NULL AND status NOT IN ('EXIT_COMPLETED', 'CANCELLED')")->fetchColumn();
        $pending = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NULL AND status = 'VALIDATION_PENDING'")->fetchColumn();
        $validated = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NULL AND status IN ('VALIDATED', 'VALIDATED_FREE')")->fetchColumn();
        $charging = (int)$db->query("SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NULL AND status IN ('CHARGING', 'PAYMENT_PENDING')")->fetchColumn();

        $availableSlots = max(0, $totalCapacity - $occupied);
        $occupancyRate = round(($occupied / $totalCapacity) * 100, 1);

        $parkingState = 'AVAILABLE';
        if ($availableSlots === 0) {
            $parkingState = 'FULL';
        } elseif ($occupancyRate >= 85.0) {
            $parkingState = 'NEAR_CAPACITY';
        }

        // Distribute occupied count proportionally across configured floors
        $floorBreakdown = [];
        $allocatedOccupied = 0;
        $numFloors = count($configuredFloors);

        foreach ($configuredFloors as $idx => $floor) {
            $fCap = (int)($floor['capacity'] ?? 0);
            $ratio = $totalCapacity > 0 ? ($fCap / $totalCapacity) : (1 / max(1, $numFloors));
            $fOcc = ($idx === $numFloors - 1) ? max(0, $occupied - $allocatedOccupied) : (int)round($occupied * $ratio);
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

        $this->success([
            'parking_status'          => $parkingState,
            'total_capacity'          => $totalCapacity,
            'currently_occupied'      => $occupied,
            'available_slots'         => $availableSlots,
            'occupancy_rate_percent'  => $occupancyRate,
            'breakdown'               => [
                'validation_pending'  => $pending,
                'validated_free'      => $validated,
                'charging_active'     => $charging
            ],
            'floor_breakdown'         => $floorBreakdown,
            'last_updated'            => TimezoneHelper::now()
        ], 'Hospital Parking Status retrieved successfully');
    }

    /**
     * POST /api/v1/his/validate-visitor
     * Validates an active patient parking session directly upon consultation completion in HIMS.
     */
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

        // Mark appointment validated
        if ($mrn || $code) {
            $db->prepare("UPDATE his_appointments SET is_validated = 1, status = 'completed', validated_session_id = ? WHERE patient_mrn = ? OR appointment_code = ?")
               ->execute([$session['id'], $mrn, $code]);
        }

        $this->success([
            'session_code' => $session['session_code'],
            'plate_number' => $session['plate_number'],
            'status'       => 'VALIDATED',
            'message'      => "Parking session {$session['session_code']} for vehicle {$session['plate_number']} validated successfully via HIMS consultation checkout."
        ]);
    }

    /**
     * POST /api/v1/his/emergency-access
     * Opens barrier with highest emergency priority for incoming ambulances or code red calls.
     */
    public function emergencyAccess(): void {
        $input = $this->getJsonInput();
        $plate = strtoupper(trim($input['plate_number'] ?? 'EMERGENCY_AMBULANCE'));
        $gateId = trim($input['gate_id'] ?? 'GATE-IN-01');
        $reason = trim($input['reason'] ?? 'HIMS Emergency Code Red / Ambulance incoming');

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
