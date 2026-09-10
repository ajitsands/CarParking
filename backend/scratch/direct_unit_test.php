<?php
require_once __DIR__ . '/../app/Core/Database.php';
require_once __DIR__ . '/../app/Helpers/TimezoneHelper.php';
require_once __DIR__ . '/../app/Services/BarrierRelayService.php';
require_once __DIR__ . '/../app/Services/TariffCalculator.php';
require_once __DIR__ . '/../app/Helpers/CurrencyHelper.php';
require_once __DIR__ . '/../app/Services/PrepaidPassService.php';

\App\Helpers\TimezoneHelper::init();

use App\Core\Database;
use App\Helpers\TimezoneHelper;
use App\Services\TariffCalculator;
use App\Services\BarrierRelayService;

$db = Database::getInstance();
$nowStr = TimezoneHelper::now();

// 1. Create an active session for BHR 55001
$sessionCode = 'TEST-' . date('Ymd') . '-55001';
$db->exec("DELETE FROM parking_sessions WHERE plate_number = 'BHR 55001'");
$stmt = $db->prepare("INSERT INTO parking_sessions (session_code, plate_number, entry_time, entry_gate_id, status, validation_deadline) VALUES (?, 'BHR 55001', ?, 'GATE-IN-01', 'VALIDATION_PENDING', ?)");
$entryTime = date('Y-m-d H:i:s', strtotime('-15 minutes', strtotime($nowStr)));
$deadline = date('Y-m-d H:i:s', strtotime('+15 minutes', strtotime($entryTime)));
$stmt->execute([$sessionCode, $entryTime, $deadline]);
$sessId = (int)$db->lastInsertId();

echo "Step 1: Created test active session ID: {$sessId} for BHR 55001\n";

// 2. Simulate what BarrierController does when Manual Override is executed on GATE-OUT-01 (EXIT)
$gateId = 'GATE-OUT-01';
$direction = 'EXIT';
$plate = 'BHR 55001';
$reason = 'Cash / Manual Payment Collected';

// Look for active session matching this plate (same code as BarrierController)
$cleanPlate = preg_replace('/[^A-Za-z0-9]/', '', $plate);
$stmtSess = $db->prepare("SELECT * FROM parking_sessions 
    WHERE (plate_number = ? OR REPLACE(plate_number, ' ', '') = ? OR REPLACE(plate_number, ' ', '') LIKE ?) 
    AND exit_time IS NULL 
    AND status NOT IN ('EXIT_COMPLETED', 'CANCELLED') 
    ORDER BY id DESC LIMIT 1");
$stmtSess->execute([$plate, $cleanPlate, "%{$cleanPlate}%"]);
$session = $stmtSess->fetch(PDO::FETCH_ASSOC);

if (!$session) {
    echo "FAILED: Active session not found for {$plate}\n";
    exit(1);
}

echo "Step 2: Found active session: {$session['session_code']} (Status: {$session['status']})\n";

// Execute checkout calculation
$entryTs = strtotime($session['entry_time']);
$exitTs = strtotime($nowStr);
$durationMin = max(1, (int)round(($exitTs - $entryTs) / 60));

$tariff = TariffCalculator::calculate($session, $nowStr);
$netAmount = (float)($tariff['net_amount'] ?? 0);

$stmtUpdate = $db->prepare("UPDATE parking_sessions SET 
    exit_time = ?, 
    exit_gate_id = ?, 
    status = 'EXIT_COMPLETED', 
    total_duration_minutes = ?, 
    charged_duration_minutes = ?, 
    total_amount = ?, 
    net_amount = ?, 
    paid_amount = ?, 
    payment_status = 'paid', 
    manual_review_reason = ? 
    WHERE id = ?");

$stmtUpdate->execute([
    $nowStr,
    $gateId,
    $durationMin,
    $tariff['chargeable_minutes'] ?? 0,
    $tariff['gross_amount'] ?? $netAmount,
    $netAmount,
    $netAmount,
    "Manual Override Exit: {$reason} (Operator: operator)",
    $session['id']
]);

// 3. Verify session in DB
$checkStmt = $db->prepare("SELECT id, session_code, plate_number, entry_time, exit_time, status, total_duration_minutes FROM parking_sessions WHERE id = ?");
$checkStmt->execute([$session['id']]);
$finalSess = $checkStmt->fetch(PDO::FETCH_ASSOC);

echo "Step 3: Verification in DB:\n" . json_encode($finalSess, JSON_PRETTY_PRINT) . "\n";

if ($finalSess['status'] === 'EXIT_COMPLETED' && !empty($finalSess['exit_time'])) {
    echo "SUCCESS: Vehicle session properly closed and marked EXIT_COMPLETED!\n";
} else {
    echo "FAILED: Session was not closed.\n";
}
