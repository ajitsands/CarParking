<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Services\DecisionEngine;
use App\Services\TariffCalculator;
use App\Services\BarrierRelayService;
use App\Helpers\TimezoneHelper;
use App\Helpers\CurrencyHelper;

/**
 * DisplayController — Kiosk Display Board API
 *
 * Powers the Android exit-gate display board app.
 * Endpoints:
 *   GET  /api/v1/kiosk/status          — Poll current vehicle state at a gate (public, no auth)
 *   POST /api/v1/kiosk/pay-qr          — Confirm QR payment and trigger barrier (public, token-secured)
 *   POST /api/v1/kiosk/simulate-approach — Simulate ANPR approach for demo/testing (auth required)
 */
class DisplayController extends Controller {

    // Secret used to sign kiosk QR tokens — change in production
    private const QR_SECRET = 'KIOSK_QR_SECRET_2026';

    // ──────────────────────────────────────────────────────────
    // GET /api/v1/kiosk/status?gate_id=GATE-OUT-01
    // Returns the current vehicle state at the exit gate.
    // Polls every 2–3 seconds from the Android display app.
    // ──────────────────────────────────────────────────────────
    public function getStatus(): void {
        TimezoneHelper::init();
        $db = Database::getInstance();

        $gateId    = trim($_GET['gate_id'] ?? 'GATE-OUT-01');
        $serverUrl = trim($_GET['server_url'] ?? '');   // passed by the app so QR URL is correct

        // Derive the base URL for QR code generation
        $baseUrl = $serverUrl ?: $this->resolveBaseUrl();

        // ── Find active or recently exited session at this gate ──
        $fiveMinAgo = date('Y-m-d H:i:s', strtotime('-5 minutes', strtotime(TimezoneHelper::now())));
        $tenSecAgo  = date('Y-m-d H:i:s', strtotime('-10 seconds', strtotime(TimezoneHelper::now())));

        // 1. Look for active CHARGING or pending-payment session currently waiting at this gate
        $stmt = $db->prepare("
            SELECT ps.*
            FROM parking_sessions ps
            WHERE ps.exit_gate_id = ?
              AND ps.status IN ('CHARGING', 'VALIDATION_PENDING')
              AND ps.exit_time IS NULL
              AND ps.updated_at >= ?
            ORDER BY ps.id DESC
            LIMIT 1
        ");
        $stmt->execute([$gateId, $fiveMinAgo]);
        $session = $stmt->fetch();

        // 2. If no active charging session, look for a recently paid/completed exit session
        //    (Keep "GATE OPEN / PAYMENT CONFIRMED" on screen for only 10s after exit, then return to IDLE)
        if (!$session) {
            $stmt2 = $db->prepare("
                SELECT ps.*
                FROM parking_sessions ps
                WHERE ps.exit_gate_id = ?
                  AND ps.status IN ('EXIT_COMPLETED', 'VALIDATED', 'VALIDATED_FREE', 'PAID')
                  AND (
                      (ps.exit_time IS NOT NULL AND ps.exit_time >= ?)
                      OR (ps.updated_at >= ?)
                  )
                ORDER BY ps.id DESC
                LIMIT 1
            ");
            $stmt2->execute([$gateId, $tenSecAgo, $tenSecAgo]);
            $session = $stmt2->fetch();
        }

        // 3. Fallback: Check recent ANPR EXIT events at this gate within last 10 seconds
        if (!$session) {
            $stmtAnpr = $db->prepare("
                SELECT ae.plate_number, ae.session_id, ae.received_at
                FROM anpr_events ae
                WHERE ae.gate_id = ?
                  AND ae.direction = 'EXIT'
                  AND ae.received_at >= ?
                ORDER BY ae.id DESC
                LIMIT 1
            ");
            $stmtAnpr->execute([$gateId, $tenSecAgo]);
            $anprEvent = $stmtAnpr->fetch();

            if ($anprEvent && $anprEvent['session_id']) {
                $stmtSess = $db->prepare("SELECT * FROM parking_sessions WHERE id = ? LIMIT 1");
                $stmtSess->execute([$anprEvent['session_id']]);
                $candidate = $stmtSess->fetch();
                if ($candidate && (empty($candidate['exit_time']) || $candidate['exit_time'] >= $tenSecAgo)) {
                    $session = $candidate;
                }
            }
        }

        // ── No vehicle at gate ──
        if (!$session) {
            $this->success([
                'has_vehicle'   => false,
                'gate_id'       => $gateId,
                'display_state' => 'IDLE',
                'message'       => 'No vehicle detected at exit gate'
            ]);
            return;
        }

        $nowStr = TimezoneHelper::now();
        $nowTs  = strtotime($nowStr);

        // ── Compute real-time tariff ──
        $tariff = TariffCalculator::calculate($session, empty($session['exit_time']) ? $nowStr : $session['exit_time']);

        // ── Determine display state ──
        $displayState = 'IDLE';
        $isFree       = false;
        $amountDue    = (float)($tariff['net_amount'] ?? 0.000);
        $qrPayload    = null;
        $barrierState = 'closed';

        $status = $session['status'] ?? '';

        if (in_array($status, ['VALIDATED', 'VALIDATED_FREE', 'EXIT_COMPLETED']) || $tariff['is_free'] ?? false) {
            $displayState = 'FREE_EXIT';
            $isFree       = true;
            $amountDue    = 0.000;
            $barrierState = 'open';
        } elseif ($status === 'PAID' || ($session['payment_status'] ?? '') === 'paid') {
            $displayState = 'FREE_EXIT';
            $isFree       = false; // paid, not free — show paid screen
            $amountDue    = 0.000;
            $barrierState = 'open';
        } elseif ($status === 'CHARGING' || $amountDue > 0) {
            $displayState = 'PAYMENT_REQUIRED';
            $isFree       = false;
            $barrierState = 'closed';

            // Generate signed QR token: base64(session_id:timestamp:hmac)
            $token = $this->generateQrToken((int)$session['id']);
            $qrPayload = $baseUrl . '/api/v1/kiosk/pay-qr?token=' . urlencode($token);
        } elseif ($status === 'VALIDATION_PENDING') {
            // Still within grace period
            $displayState = 'FREE_EXIT';
            $isFree       = true;
            $amountDue    = 0.000;
            $barrierState = 'open';
        }

        // ── Duration calculation ──
        $entryTs     = strtotime($session['entry_time']);
        $exitTs      = !empty($session['exit_time']) ? strtotime($session['exit_time']) : $nowTs;
        $durationMin = max(0, (int)round(($exitTs - $entryTs) / 60));

        $currencyConfig = CurrencyHelper::getConfig();

        $this->success([
            'has_vehicle'       => true,
            'gate_id'           => $gateId,
            'display_state'     => $displayState,
            'session_id'        => (int)$session['id'],
            'session_code'      => $session['session_code'],
            'plate_number'      => $session['plate_number'],
            'entry_time'        => $session['entry_time'],
            'exit_time'         => !empty($session['exit_time']) ? $session['exit_time'] : $nowStr,
            'duration_minutes'  => $durationMin,
            'is_free'           => $isFree,
            'amount_due'        => $amountDue,
            'formatted_amount'  => CurrencyHelper::format($amountDue),
            'currency_code'     => $currencyConfig['code'] ?? 'BHD',
            'currency_symbol'   => $currencyConfig['symbol'] ?? 'BD',
            'payment_status'    => $session['payment_status'] ?? 'pending',
            'status'            => $status,
            'qr_payload'        => $qrPayload,
            'barrier_state'     => $barrierState,
            'tariff_reason'     => $tariff['reason'] ?? '',
            'server_time'       => $nowStr,
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // POST /api/v1/kiosk/pay-qr
    // Public endpoint: driver scans QR, phone confirms payment.
    // Body: { "token": "...", "payment_method": "qr_benefitpay" }
    // ──────────────────────────────────────────────────────────
    public function payByQr(): void {
        TimezoneHelper::init();
        $db = Database::getInstance();

        // Accept from query string (GET redirect from QR scan) or JSON body
        $token = $_GET['token'] ?? null;
        if (!$token) {
            $input = $this->getJsonInput();
            $token = $input['token'] ?? null;
        }

        if (!$token) {
            $this->error('Payment token is required', 400);
            return;
        }

        // Verify and decode token
        $sessionId = $this->verifyQrToken($token);
        if (!$sessionId) {
            $this->error('Invalid or expired payment token. Please request a new QR at the gate.', 403);
            return;
        }

        // Load session
        $stmt = $db->prepare("SELECT * FROM parking_sessions WHERE id = ? LIMIT 1");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch();

        if (!$session) {
            $this->error('Parking session not found', 404);
            return;
        }

        // Check if already paid
        if (in_array($session['payment_status'], ['paid', 'PAID'])) {
            $this->success([
                'already_paid'  => true,
                'gate_opened'   => true,
                'plate_number'  => $session['plate_number'],
                'message'       => 'Payment already confirmed. Gate is open — please proceed.'
            ], 'Already paid');
            return;
        }

        $nowStr    = TimezoneHelper::now();
        $tariff    = TariffCalculator::calculate($session, $nowStr);
        $netAmount = (float)($tariff['net_amount'] ?? 0.000);

        $paymentMethod = 'qr_benefitpay'; // Future: will come from BenefitPay gateway callback

        // Generate payment transaction
        $txCode = 'QR-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
        $db->prepare("INSERT INTO payments (session_id, transaction_code, amount, currency, payment_method, gateway_status, collected_by_user_id)
                      VALUES (?, ?, ?, ?, ?, 'COMPLETED', NULL)")
           ->execute([$sessionId, $txCode, $netAmount, 'BHD', $paymentMethod]);

        // Update session to PAID, set exit time
        $entryTs     = strtotime($session['entry_time']);
        $exitTs      = strtotime($nowStr);
        $durationMin = max(1, (int)round(($exitTs - $entryTs) / 60));

        $db->prepare("UPDATE parking_sessions SET
            status = 'PAID',
            payment_status = 'paid',
            paid_amount = ?,
            exit_time = ?,
            exit_gate_id = ?,
            total_duration_minutes = ?,
            charged_duration_minutes = ?,
            total_amount = ?,
            net_amount = ?
            WHERE id = ?")
           ->execute([
            $netAmount,
            $nowStr,
            $session['exit_gate_id'] ?: 'GATE-OUT-01',
            $durationMin,
            $tariff['chargeable_minutes'] ?? 0,
            $tariff['gross_amount'] ?? $netAmount,
            $netAmount,
            $sessionId
        ]);

        // Trigger barrier open
        $barrierResult = BarrierRelayService::openBarrier(
            $session['exit_gate_id'] ?: 'GATE-OUT-01',
            'EXIT',
            $session['plate_number'],
            'qr_payment_kiosk'
        );

        // Audit log
        $db->prepare("INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
                      VALUES (NULL, 'kiosk_qr', 'QR_PAYMENT_CONFIRMED', 'parking_sessions', ?, ?)")
           ->execute([$sessionId, "QR Payment: {$txCode} | Amount: {$netAmount} | Plate: {$session['plate_number']}"]);

        // Return a full-page HTML response so driver's phone shows a success message
        $plate     = htmlspecialchars($session['plate_number']);
        $amount    = CurrencyHelper::format($netAmount);
        $this->sendPaymentSuccessPage($plate, $amount, $txCode);
    }

    // ──────────────────────────────────────────────────────────
    // POST /api/v1/kiosk/simulate-approach  (Auth required)
    // Simulates a vehicle approaching the exit gate for demo.
    // Body: { "gate_id": "GATE-OUT-01", "plate_number": "BHR 12345" }
    // ──────────────────────────────────────────────────────────
    public function simulateApproach(): void {
        TimezoneHelper::init();
        $input  = $this->getJsonInput();
        $gateId = trim($input['gate_id'] ?? 'GATE-OUT-01');
        $plate  = strtoupper(trim($input['plate_number'] ?? ''));

        if (!$plate) {
            $this->error('plate_number is required for simulation', 400);
            return;
        }

        // Internally call the ANPR webhook handler with a synthetic EXIT event
        $syntheticPayload = json_encode([
            'plate_number' => $plate,
            'gate_id'      => $gateId,
            'camera_id'    => 'KIOSK-SIM-CAM',
            'direction'    => 'EXIT',
            'confidence'   => 99,
            'timestamp'    => TimezoneHelper::now(),
        ]);

        // Store as raw string, then process via the webhook handler directly
        $db = Database::getInstance();
        $parsed = [
            'plate_number' => $plate,
            'gate_id'      => $gateId,
            'camera_id'    => 'KIOSK-SIM-CAM',
            'direction'    => 'EXIT',
            'confidence'   => 99,
            'image_url'    => '',
            'clip_url'     => '',
            'timestamp'    => TimezoneHelper::now(),
        ];

        // Log raw ANPR event
        $db->prepare("INSERT INTO anpr_events (camera_id, gate_id, direction, plate_number, confidence, raw_payload) VALUES (?, ?, ?, ?, ?, ?)")
           ->execute([$parsed['camera_id'], $gateId, 'EXIT', $plate, 99, $syntheticPayload]);
        $eventId = (int)$db->lastInsertId();

        // Find active session
        $cleanPlate = preg_replace('/[^A-Za-z0-9]/', '', $plate);
        $nowStr = TimezoneHelper::now();

        $stmtActive = $db->prepare("SELECT * FROM parking_sessions
            WHERE (plate_number = ? OR REPLACE(plate_number, ' ', '') = ? OR REPLACE(plate_number, ' ', '') LIKE ?)
            AND exit_time IS NULL
            AND status NOT IN ('EXIT_COMPLETED', 'CANCELLED')
            ORDER BY id DESC LIMIT 1");
        $stmtActive->execute([$plate, $cleanPlate, "%{$cleanPlate}%"]);
        $session = $stmtActive->fetch();

        if (!$session) {
            $this->error("No active parking session found for plate: {$plate}. Vehicle must enter first.", 404);
            return;
        }

        // Link ANPR event to session
        $db->prepare("UPDATE anpr_events SET session_id = ? WHERE id = ?")
           ->execute([$session['id'], $eventId]);

        // Evaluate exit decision
        $exitDecision = DecisionEngine::evaluateExit($session);
        $tariff       = TariffCalculator::calculate($session, $nowStr);

        // Update session with exit gate info
        $db->prepare("UPDATE parking_sessions SET
            exit_gate_id = ?,
            total_duration_minutes = ?,
            charged_duration_minutes = ?,
            total_amount = ?,
            net_amount = ?,
            status = ?
            WHERE id = ?")
           ->execute([
            $gateId,
            $tariff['total_minutes'],
            $tariff['chargeable_minutes'] ?? 0,
            $tariff['gross_amount'] ?? $tariff['net_amount'],
            $tariff['net_amount'],
            $exitDecision['barrier_open'] ? ($session['status'] === 'VALIDATED' ? 'VALIDATED' : 'CHARGING') : 'CHARGING',
            $session['id']
        ]);

        // If free exit (validated/whitelisted/grace), open barrier immediately and complete session
        if ($exitDecision['barrier_open']) {
            BarrierRelayService::openBarrier($gateId, 'EXIT', $plate, 'kiosk_sim_free_exit');
            $durationMin = max(1, (int)round((strtotime($nowStr) - strtotime($session['entry_time'])) / 60));
            $db->prepare("UPDATE parking_sessions SET exit_time = ?, status = 'EXIT_COMPLETED', total_duration_minutes = ? WHERE id = ?")
               ->execute([$nowStr, $durationMin, $session['id']]);
        }

        $this->success([
            'simulated'     => true,
            'gate_id'       => $gateId,
            'plate_number'  => $plate,
            'session_id'    => $session['id'],
            'display_state' => $exitDecision['barrier_open'] ? 'FREE_EXIT' : 'PAYMENT_REQUIRED',
            'is_free'       => $exitDecision['barrier_open'],
            'amount_due'    => $tariff['net_amount'],
            'decision'      => $exitDecision['decision'],
            'message'       => $exitDecision['message'],
        ], "Kiosk approach simulated for {$plate} at {$gateId}");
    }

    // ──────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────

    /** Generate a secure, time-limited QR token for a session */
    private function generateQrToken(int $sessionId): string {
        $ts   = time();
        $hmac = hash_hmac('sha256', "{$sessionId}:{$ts}", self::QR_SECRET);
        $data = "{$sessionId}:{$ts}:{$hmac}";
        return base64_encode($data);
    }

    /** Verify QR token — returns session_id or null if invalid/expired (30 min TTL) */
    private function verifyQrToken(string $token): ?int {
        try {
            $decoded = base64_decode($token, true);
            if (!$decoded) return null;

            $parts = explode(':', $decoded);
            if (count($parts) !== 3) return null;

            [$sessionId, $ts, $receivedHmac] = $parts;

            // Token expires in 30 minutes
            if ((time() - (int)$ts) > 1800) return null;

            $expectedHmac = hash_hmac('sha256', "{$sessionId}:{$ts}", self::QR_SECRET);
            if (!hash_equals($expectedHmac, $receivedHmac)) return null;

            return (int)$sessionId;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** Resolve the server's own public base URL for QR generation */
    private function resolveBaseUrl(): string {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host   = $_SERVER['HTTP_HOST'] ?? 'localhost:8080';
        return "{$scheme}://{$host}";
    }

    /** Send a mobile-friendly HTML success page when driver scans QR on their phone */
    private function sendPaymentSuccessPage(string $plate, string $amount, string $txCode): void {
        while (ob_get_level()) ob_end_clean();
        header('Content-Type: text/html; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        http_response_code(200);
        echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Payment Successful — Parking</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .card {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 24px;
    padding: 40px 32px;
    text-align: center;
    max-width: 380px;
    width: 100%;
    animation: fadeIn 0.5s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .icon { font-size: 72px; margin-bottom: 16px; }
  .title { color: #4ade80; font-size: 1.8rem; font-weight: 700; margin-bottom: 8px; }
  .subtitle { color: rgba(255,255,255,0.7); font-size: 1rem; margin-bottom: 28px; }
  .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.95rem; }
  .detail-row:last-of-type { border-bottom: none; }
  .detail-label { color: rgba(255,255,255,0.55); }
  .detail-value { font-weight: 600; }
  .amount-highlight { color: #4ade80; font-size: 1.4rem; }
  .footer-msg { margin-top: 28px; color: rgba(255,255,255,0.6); font-size: 0.85rem; line-height: 1.6; }
  .gate-msg { color: #fbbf24; font-size: 1rem; font-weight: 600; margin-top: 16px; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">✅</div>
  <div class="title">Payment Confirmed!</div>
  <div class="subtitle">Your parking fee has been paid successfully.</div>

  <div class="detail-row">
    <span class="detail-label">Vehicle</span>
    <span class="detail-value">{$plate}</span>
  </div>
  <div class="detail-row">
    <span class="detail-label">Amount Paid</span>
    <span class="detail-value amount-highlight">{$amount}</span>
  </div>
  <div class="detail-row">
    <span class="detail-label">Reference</span>
    <span class="detail-value" style="font-size:0.8rem; color: rgba(255,255,255,0.5)">{$txCode}</span>
  </div>

  <div class="gate-msg">🚦 Gate is now opening — Please proceed!</div>
  <div class="footer-msg">Thank you for using our parking system.<br>This page will close automatically.</div>
</div>
<script>setTimeout(() => window.close(), 8000);</script>
</body>
</html>
HTML;
        exit;
    }
}
