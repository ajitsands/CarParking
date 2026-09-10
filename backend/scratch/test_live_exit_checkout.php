<?php
require_once __DIR__ . '/../../backend/app/Core/Database.php';
require_once __DIR__ . '/../../backend/app/Helpers/TimezoneHelper.php';
\App\Helpers\TimezoneHelper::init();

use App\Core\Database;

// 1. Send ANPR Entry for BHR 55001
$entryPayload = json_encode([
    'plate_number' => 'BHR 55001',
    'direction'    => 'ENTRY',
    'gate_id'      => 'GATE-IN-01',
    'camera_id'    => 'ANPR-CAM-01',
    'confidence'   => 99.5,
    'timestamp'    => date('Y-m-d H:i:s')
]);

$ch = curl_init('http://127.0.0.1:8000/api/v1/webhook/anpr');
curl_setopt($ch, CURLOPT_POSTFIELDS, $entryPayload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$entryRes = curl_exec($ch);
curl_close($ch);

$entryData = json_decode($entryRes, true);
echo "ENTRY RESULT:\n" . json_encode($entryData, JSON_PRETTY_PRINT) . "\n\n";

$sessionId = $entryData['data']['session_id'] ?? null;
if (!$sessionId) {
    echo "ERROR: No session_id returned from entry\n";
    exit(1);
}

// 2. Test manual override / exit checkout for BHR 55001
// Login as operator or admin to get JWT token
$chAuth = curl_init('http://127.0.0.1:8000/api/v1/auth/login');
curl_setopt($chAuth, CURLOPT_POSTFIELDS, json_encode(['username' => 'operator', 'password' => 'User@12345']));
curl_setopt($chAuth, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($chAuth, CURLOPT_RETURNTRANSFER, true);
$authRes = curl_exec($chAuth);
curl_close($chAuth);

$authData = json_decode($authRes, true);
$token = $authData['data']['token'] ?? null;
echo "AUTH TOKEN: " . ($token ? 'OBTAINED' : 'FAILED') . "\n\n";

// 3. Test POST /api/v1/barrier/manual-override with EXIT gate and plate BHR 55001
$overridePayload = json_encode([
    'gate_id'      => 'GATE-OUT-01',
    'direction'    => 'EXIT',
    'plate_number' => 'BHR 55001',
    'session_id'   => $sessionId,
    'reason'       => 'Cash / Manual Payment Collected'
]);

$chOverride = curl_init('http://127.0.0.1:8000/api/v1/barrier/manual-override');
curl_setopt($chOverride, CURLOPT_POSTFIELDS, $overridePayload);
curl_setopt($chOverride, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    "Authorization: Bearer {$token}"
]);
curl_setopt($chOverride, CURLOPT_RETURNTRANSFER, true);
$overrideRes = curl_exec($chOverride);
curl_close($chOverride);

echo "OVERRIDE RESULT:\n" . $overrideRes . "\n\n";

// 4. Check DB status of session
$db = Database::getInstance();
$stmt = $db->prepare("SELECT id, session_code, plate_number, entry_time, exit_time, status, total_duration_minutes, manual_review_reason FROM parking_sessions WHERE id = ?");
$stmt->execute([$sessionId]);
$updatedSess = $stmt->fetch(PDO::FETCH_ASSOC);

echo "FINAL SESSION IN DATABASE:\n" . json_encode($updatedSess, JSON_PRETTY_PRINT) . "\n";
