<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Services\TariffCalculator;
use App\Services\BarrierRelayService;
use App\Helpers\CurrencyHelper;

class PaymentController extends Controller {
    public function calculate(): void {
        $params = $this->getQueryParams();
        $sessionId = (int)($params['session_id'] ?? 0);
        $plate = strtoupper(trim($params['plate_number'] ?? ''));

        $db = Database::getInstance();

        if ($sessionId > 0) {
            $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE id = ? LIMIT 1");
            $stmt->execute([$sessionId]);
        } elseif ($plate) {
            $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE plate_number = ? AND exit_time IS NULL ORDER BY id DESC LIMIT 1");
            $stmt->execute([$plate]);
        } else {
            $this->error('Session ID or plate number required', 400);
            return;
        }

        $session = $stmt->fetch();
        if (!$session) {
            $this->error('Active session not found', 404);
            return;
        }

        $tariff = TariffCalculator::calculate($session);

        $this->success([
            'session'          => $session,
            'tariff'           => $tariff,
            'qr_payment_data'  => [
                'merchant'       => 'KIMSHEALTH Medical Center',
                'session_code'   => $session['session_code'],
                'plate_number'   => $session['plate_number'],
                'amount'         => $tariff['net_amount'],
                'currency'       => $tariff['currency'],
                'qr_string'      => "BENEFITPAY://PAY?M=KIMSHEALTH&S={$session['session_code']}&A={$tariff['net_amount']}&C={$tariff['currency']}"
            ]
        ]);
    }

    public function processPayment(): void {
        $currentUser = $this->getCurrentUser();
        $input = $this->getJsonInput();

        $sessionId = (int)($input['session_id'] ?? 0);
        $paymentMethod = $input['payment_method'] ?? 'cash';
        $gateId = $input['gate_id'] ?? 'GATE-OUT-01';

        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE id = ? LIMIT 1");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch();

        if (!$session) {
            $this->error('Session not found', 404);
            return;
        }

        $tariff = TariffCalculator::calculate($session);
        $amount = $tariff['net_amount'];
        $currency = $tariff['currency'];

        $txCode = 'TXN-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
        $userId = $currentUser ? (int)$currentUser['id'] : null;

        // Record payment
        $stmtPay = $db->prepare("INSERT INTO payments (session_id, transaction_code, amount, currency, payment_method, gateway_status, collected_by_user_id) VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)");
        $stmtPay->execute([$sessionId, $txCode, $amount, $currency, $paymentMethod, $userId]);
        $paymentId = (int)$db->lastInsertId();

        // Open Exit Boom Barrier automatically upon confirmed payment
        $barrierResult = BarrierRelayService::openBarrier($gateId, 'EXIT', $session['plate_number'], 'payment_success', $userId, "Paid {$currency} {$amount} via {$paymentMethod}");

        // Mark session PAID and EXIT_COMPLETED
        $db->prepare("UPDATE parking_sessions SET 
            status = 'EXIT_COMPLETED', 
            exit_time = NOW(), 
            exit_gate_id = ?, 
            total_duration_minutes = ?, 
            charged_duration_minutes = ?, 
            total_amount = ?, 
            paid_amount = ?, 
            payment_status = 'paid' 
            WHERE id = ?")->execute([
            $gateId,
            $tariff['total_minutes'],
            $tariff['chargeable_minutes'],
            $amount,
            $amount,
            $sessionId
        ]);

        $this->success([
            'payment_id'       => $paymentId,
            'transaction_code' => $txCode,
            'amount'           => $amount,
            'currency'         => $currency,
            'formatted_amount' => $tariff['formatted_net'],
            'payment_method'   => $paymentMethod,
            'barrier_opened'   => true,
            'relay_result'     => $barrierResult,
            'receipt'          => [
                'hospital'       => 'KIMSHEALTH Medical Center',
                'session_code'   => $session['session_code'],
                'plate_number'   => $session['plate_number'],
                'entry_time'     => $session['entry_time'],
                'exit_time'      => date('Y-m-d H:i:s'),
                'duration'       => $tariff['total_minutes'] . ' minutes',
                'amount_paid'    => $tariff['formatted_net'] . ' ' . $currency,
                'transaction_id' => $txCode,
                'date'           => date('Y-m-d H:i:s')
            ],
            'message'          => 'Payment confirmed! Boom barrier opened for exit.'
        ], 'Payment processed successfully');
    }
}
