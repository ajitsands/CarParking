<?php
spl_autoload_register(function (string $class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/../app/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) require $file;
});

// Polyfills
if (!function_exists('str_contains')) {
    function str_contains(string $h, string $n): bool { return $n === '' || strpos($h, $n) !== false; }
}

\App\Helpers\TimezoneHelper::init();

// Test session: 5 hours (300 mins) free validation, parked for 13 hours 11 mins (791 mins)
$session = [
    'id' => 6002,
    'status' => 'VALIDATED',
    'validation_method' => 'reception',
    'grace_period_minutes' => 300,
    'entry_time' => date('Y-m-d H:i:s', time() - (13 * 3600 + 11 * 60)),
    'plate_number' => '123456'
];

$res = \App\Services\TariffCalculator::calculate($session);
echo "=== TEST OVERSTAY FOR VALIDATED SESSION (5 hrs free, 13h 11m parked) ===\n";
echo "Total Minutes: {$res['total_minutes']} mins\n";
echo "Grace / Free Minutes: {$res['grace_minutes']} mins\n";
echo "Chargeable Minutes: {$res['chargeable_minutes']} mins\n";
echo "Net Amount: {$res['formatted_net']}\n";
echo "Is Free: " . ($res['is_free'] ? 'YES' : 'NO') . "\n";
echo "Reason: {$res['reason']}\n";

$exitDecision = \App\Services\DecisionEngine::evaluateExit($session);
echo "\n=== EXIT EVALUATION ===\n";
echo "Action: {$exitDecision['action']}\n";
echo "Decision: {$exitDecision['decision']}\n";
echo "Barrier Open: " . ($exitDecision['barrier_open'] ? 'YES' : 'NO') . "\n";
echo "Amount Due: {$exitDecision['amount_due']}\n";
echo "Message: {$exitDecision['message']}\n";
