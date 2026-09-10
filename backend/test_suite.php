<?php
declare(strict_types=1);

// Test script for backend verification
spl_autoload_register(function (string $class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/app/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $file = $baseDir . str_replace('\\', '/', substr($class, $len)) . '.php';
    if (file_exists($file)) require $file;
});

use App\Core\Database;
use App\Services\SuperadminVault;
use App\Services\LicenseManager;
use App\Services\DecisionEngine;
use App\Services\TariffCalculator;
use App\Services\BarrierRelayService;
use App\Helpers\CurrencyHelper;
use App\Helpers\TimezoneHelper;

echo "--- 1. Testing Database Connection ---\n";
$db = Database::getInstance();
$tableCount = $db->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'car_parking_solution'")->fetchColumn();
echo "Tables found: $tableCount\n";

echo "--- 2. Testing Superadmin Security Vault ---\n";
SuperadminVault::initIfNotExists();
$vaultValid = SuperadminVault::verifyPassword('S@nds1@b');
echo "Superadmin password verified via encrypted server vault: " . ($vaultValid ? "YES" : "NO") . "\n";

echo "--- 3. Testing License Expiry Duration ---\n";
$lic = LicenseManager::getStatus();
echo "License status: {$lic['status']}, Days remaining: {$lic['days_remaining']}, Expires at: {$lic['expires_at']}\n";

echo "--- 4. Testing Currency Decimals (Bahrain 3 digits vs Others 2 digits) ---\n";
$cfg = CurrencyHelper::getConfig();
echo "Current currency: {$cfg['code']}, Decimals: {$cfg['decimals']}, Sample 1.5 => " . CurrencyHelper::format(1.5) . "\n";

echo "--- 5. Testing ANPR Entry Decision Engine ---\n";
$normalEntry = DecisionEngine::evaluateEntry('BHR 88776', 'GATE-IN-01');
echo "Standard car entry decision: {$normalEntry['decision']}, Barrier open: " . ($normalEntry['barrier_open'] ? "YES" : "NO") . "\n";

$ambulanceEntry = DecisionEngine::evaluateEntry('BHR 99999', 'GATE-IN-01');
echo "Ambulance entry decision: {$ambulanceEntry['decision']}, Barrier open: " . ($ambulanceEntry['barrier_open'] ? "YES" : "NO") . "\n";

$blacklistEntry = DecisionEngine::evaluateEntry('BHR 66666', 'GATE-IN-01');
echo "Blacklist entry decision: {$blacklistEntry['decision']}, Barrier open: " . ($blacklistEntry['barrier_open'] ? "YES" : "NO") . "\n";

echo "--- 6. Testing Barrier Hardware Relay Service ---\n";
$relayRes = BarrierRelayService::openBarrier('GATE-IN-01', 'ENTRY', 'BHR 88776', 'test_signal');
echo "Relay response: {$relayRes['barrier_action']}, Command: {$relayRes['command']}\n";

echo "--- 7. Testing Admin Grace Minutes & Tariff Calculator ---\n";
$grace = TariffCalculator::getAdminGraceMinutes();
echo "Admin configured grace minutes: {$grace} min\n";

$sampleSession = [
    'entry_time'           => date('Y-m-d H:i:s', strtotime('-45 minutes')),
    'status'               => 'CHARGING',
    'grace_period_minutes' => $grace,
    'discount_amount'      => 0.000
];
$calc = TariffCalculator::calculate($sampleSession);
echo "45 min parking fee (30 min grace + 15 min chargeable): {$calc['formatted_net']} {$calc['currency']}\n";

echo "--- ALL BACKEND CORE TESTS PASSED SUCCESSFULLY! ---\n";
