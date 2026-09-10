<?php
namespace App\Services;

use App\Core\Database;
use DateTime;

class DecisionEngine {
    public static function evaluateEntry(string $plateNumber, string $gateId = 'GATE-IN-01'): array {
        $db = Database::getInstance();
        $plate = strtoupper(trim($plateNumber));

        // 1. Check Blacklist
        $stmt = $db->prepare("SELECT * FROM vehicles WHERE plate_number = ? AND access_status = 'blacklisted' LIMIT 1");
        $stmt->execute([$plate]);
        $blacklisted = $stmt->fetch();

        if ($blacklisted) {
            return [
                'action'       => 'DENY',
                'decision'     => 'BLACKLISTED',
                'barrier_open' => false,
                'message'      => 'ACCESS DENIED: Vehicle is blacklisted. Contact security.',
                'reason'       => $blacklisted['block_reason'] ?: 'Security restriction',
                'vehicle'      => $blacklisted
            ];
        }

        // 2. Check Whitelist (Staff, Doctors, Vendors, Hospital Vehicles)
        $stmt = $db->prepare("SELECT * FROM vehicles WHERE plate_number = ? AND access_status = 'whitelisted' LIMIT 1");
        $stmt->execute([$plate]);
        $whitelisted = $stmt->fetch();

        if ($whitelisted) {
            $isExpired = false;
            if (!empty($whitelisted['valid_to']) && new DateTime($whitelisted['valid_to']) < new DateTime()) {
                $isExpired = true;
            }

            if (!$isExpired) {
                $category = $whitelisted['category'];
                $isEmergency = ($category === 'emergency');
                return [
                    'action'       => 'ALLOW',
                    'decision'     => $isEmergency ? 'EMERGENCY_PRIORITY' : 'WHITELISTED',
                    'barrier_open' => true,
                    'message'      => $isEmergency ? 'EMERGENCY VEHICLE: Immediate priority entry' : 'WHITELISTED VEHICLE: Automatic authorized entry',
                    'vehicle'      => $whitelisted,
                    'initial_state'=> 'VALIDATED', // Whitelist vehicles are pre-validated / free
                    'validation_method' => $isEmergency ? 'emergency' : 'whitelisted'
                ];
            }
        }

        // 2b. Check active Prepaid Parking Pass (Day, Week, Month)
        $prepaidPass = \App\Services\PrepaidPassService::getActivePassForPlate($plate);
        if ($prepaidPass) {
            return [
                'action'            => 'ALLOW',
                'decision'          => 'PREPAID_PASS_ENTRY',
                'barrier_open'      => true,
                'message'           => "PREPAID VEHICLE: Authorized pass ({$prepaidPass['pass_code']}) valid until " . substr($prepaidPass['expiry_date'], 0, 10),
                'pass'              => $prepaidPass,
                'initial_state'     => 'VALIDATED',
                'validation_method' => 'whitelisted',
                'validation_ref'    => $prepaidPass['pass_code']
            ];
        }

        // 3. Check Auto-Match Appointment (Method C)
        $stmt = $db->prepare("SELECT * FROM his_appointments WHERE registered_plate_number = ? AND DATE(appointment_datetime) = CURDATE() AND status != 'cancelled' LIMIT 1");
        $stmt->execute([$plate]);
        $appointment = $stmt->fetch();

        if ($appointment) {
            return [
                'action'            => 'ALLOW',
                'decision'          => 'AUTO_MATCHED_APPOINTMENT',
                'barrier_open'      => true,
                'message'           => 'PATIENT VEHICLE: Auto-matched with active hospital appointment',
                'appointment'       => $appointment,
                'initial_state'     => 'VALIDATED',
                'validation_method' => 'auto_appointment',
                'validation_ref'    => $appointment['appointment_code']
            ];
        }

        // 4. Standard Visitor Entry
        // Default entry is allowed to prevent queues; validation occurs inside hospital within grace period
        return [
            'action'            => 'ALLOW',
            'decision'          => 'STANDARD_ENTRY',
            'barrier_open'      => true,
            'message'           => 'ENTRY ALLOWED: Please validate parking at hospital reception or via appointment QR',
            'initial_state'     => 'VALIDATION_PENDING',
            'validation_method' => 'none'
        ];
    }

    public static function evaluateExit(array $session): array {
        $status = $session['status'];
        $plate = $session['plate_number'];

        if ($status === 'VALIDATED' || $status === 'VALIDATED_FREE') {
            return [
                'action'       => 'ALLOW_EXIT',
                'decision'     => 'VALIDATED_FREE',
                'barrier_open' => true,
                'amount_due'   => 0.000,
                'message'      => 'Visit Validated: Free Parking. Have a safe journey!'
            ];
        }

        if ($status === 'PAID') {
            return [
                'action'       => 'ALLOW_EXIT',
                'decision'     => 'PAYMENT_CONFIRMED',
                'barrier_open' => true,
                'amount_due'   => 0.000,
                'message'      => 'Payment Confirmed: Thank you. Barrier opening.'
            ];
        }

        // Check if vehicle is Whitelisted
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM vehicles WHERE plate_number = ? AND access_status = 'whitelisted' LIMIT 1");
        $stmt->execute([$plate]);
        if ($stmt->fetch()) {
            return [
                'action'       => 'ALLOW_EXIT',
                'decision'     => 'WHITELIST_EXIT',
                'barrier_open' => true,
                'amount_due'   => 0.000,
                'message'      => 'Whitelisted Vehicle: Authorized exit.'
            ];
        }

        // Check if vehicle has an active Prepaid Pass
        $prepaidPass = \App\Services\PrepaidPassService::getActivePassForPlate($plate);
        if ($prepaidPass) {
            return [
                'action'       => 'ALLOW_EXIT',
                'decision'     => 'PREPAID_PASS_EXIT',
                'barrier_open' => true,
                'amount_due'   => 0.000,
                'message'      => "Prepaid Pass ({$prepaidPass['pass_code']}): Have a safe journey!"
            ];
        }

        // Calculate latest tariff
        $calc = TariffCalculator::calculate($session);
        if ($calc['net_amount'] <= 0.000) {
            return [
                'action'       => 'ALLOW_EXIT',
                'decision'     => 'WITHIN_GRACE_PERIOD',
                'barrier_open' => true,
                'amount_due'   => 0.000,
                'message'      => 'Exiting within free grace period. No payment required.'
            ];
        }

        // Requires payment
        return [
            'action'       => 'PAYMENT_REQUIRED',
            'decision'     => 'CHARGING',
            'barrier_open' => false,
            'amount_due'   => $calc['net_amount'],
            'tariff_data'  => $calc,
            'message'      => 'Payment required before exit. Please scan QR on display or pay cashier.'
        ];
    }
}
