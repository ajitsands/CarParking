<?php
// Smart Hospital Parking Management & Visitor Validation System
// Front Controller & REST API Entrypoint

declare(strict_types=1);

if (php_sapi_name() === 'cli-server') {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if ($path !== '/' && file_exists(__DIR__ . $path)) {
        return false;
    }
}

// Polyfills for PHP 7.4 compatibility
if (!function_exists('str_contains')) {
    function str_contains(string $haystack, string $needle): bool {
        return $needle === '' || strpos($haystack, $needle) !== false;
    }
}
if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool {
        return strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with(string $haystack, string $needle): bool {
        return $needle === '' || substr($haystack, -strlen($needle)) === $needle;
    }
}

// Error Reporting
error_reporting(E_ALL);
ini_set('display_errors', '0');

// Autoloader for App\ namespace
spl_autoload_register(function (string $class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/../app/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

\App\Helpers\TimezoneHelper::init();

use App\Core\Router;
use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;
use App\Middleware\LicenseCheckMiddleware;

use App\Controllers\AuthController;
use App\Controllers\ServerConfigController;
use App\Controllers\LicenseController;
use App\Controllers\SettingsController;
use App\Controllers\UserController;
use App\Controllers\AnprWebhookController;
use App\Controllers\ParkingSessionController;
use App\Controllers\VisitorValidationController;
use App\Controllers\PaymentController;
use App\Controllers\BarrierController;
use App\Controllers\VehicleAccessController;
use App\Controllers\DashboardController;
use App\Controllers\ReportsController;
use App\Controllers\HisIntegrationController;
use App\Controllers\PrepaidController;
use App\Controllers\GateController;
use App\Controllers\DisplayController;

// Handle static files if using PHP built-in server
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// Global Exception Handler
set_exception_handler(function (\Throwable $e) {
    Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
        'file'    => basename($e->getFile()),
        'line'    => $e->getLine()
    ], 500);
});

// Setup Router
$router = new Router();

// ── Auth Routes ────────────────────────────────────────────────
$router->post('/api/v1/auth/login', [AuthController::class, 'login']);
$router->get('/api/v1/auth/me', [AuthController::class, 'me'], [AuthMiddleware::class]);
$router->post('/api/v1/auth/change-password', [AuthController::class, 'changePassword'], [AuthMiddleware::class]);
$router->post('/api/v1/auth/reset-password', [AuthController::class, 'resetUserPassword'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);

// ── Superadmin Server & DB Configuration ──────────────────────
$router->get('/api/v1/superadmin/server-config', [ServerConfigController::class, 'getConfig'], [AuthMiddleware::class, RoleMiddleware::superadminOnly()]);
$router->post('/api/v1/superadmin/server-config', [ServerConfigController::class, 'updateConfig'], [AuthMiddleware::class, RoleMiddleware::superadminOnly()]);

// ── License Management (SaNDS Lab Licensing System) ────────────
$router->get('/api/v1/license/status', [LicenseController::class, 'getStatus']);
$router->post('/api/v1/license/activate', [LicenseController::class, 'activate']);
$router->post('/api/v1/license/deactivate', [LicenseController::class, 'deactivate'], [AuthMiddleware::class, RoleMiddleware::superadminOnly()]);

// ── Settings (Admin / Superadmin) ──────────────────────────────
$router->get('/api/v1/settings', [SettingsController::class, 'getSettings']);
$router->post('/api/v1/settings', [SettingsController::class, 'updateSettings'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->post('/api/v1/settings/logo', [SettingsController::class, 'uploadLogo'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->post('/api/v1/settings/test-anpr-mapping', [SettingsController::class, 'testAnprMapping'], [AuthMiddleware::class]);

// ── Gates & ANPR Cameras (Multi-Gate Management) ───────────────
$router->get('/api/v1/gates', [GateController::class, 'index'], [AuthMiddleware::class]);
$router->post('/api/v1/gates', [GateController::class, 'store'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->put('/api/v1/gates/{id}', [GateController::class, 'update'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->delete('/api/v1/gates/{id}', [GateController::class, 'delete'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->post('/api/v1/gates/{id}/test-pulse', [GateController::class, 'testPulse'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->post('/api/v1/gates/{id}/test-camera', [GateController::class, 'testCameraPing'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);

// ── Users (RBAC) ───────────────────────────────────────────────
$router->get('/api/v1/users', [UserController::class, 'index'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->post('/api/v1/users', [UserController::class, 'store'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->put('/api/v1/users/{id}', [UserController::class, 'update'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->delete('/api/v1/users/{id}', [UserController::class, 'delete'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);

// ── ANPR Camera Webhook ────────────────────────────────────────
// POST: actual webhook endpoint for camera software to push plate events
$router->post('/api/v1/webhook/anpr', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
// GET: friendly info page when someone opens the URL in a browser
$router->get('/api/v1/webhook/anpr', function() {
    header('Content-Type: application/json');
    echo json_encode([
        'success'     => true,
        'endpoint'    => 'ANPR Camera Webhook',
        'method'      => 'POST only',
        'format'      => 'application/json',
        'description' => 'This endpoint receives HTTP POST requests from ANPR camera software (Dahua, Hikvision, Uniview, Hanwha). Configure your camera to POST plate events here.',
        'note'        => 'You are seeing this because you opened the URL in a browser (GET request). Your camera software must send HTTP POST requests to this URL.',
        'status'      => 'active'
    ], JSON_PRETTY_PRINT);
    exit;
});

// ── Parking Sessions ───────────────────────────────────────────
$router->get('/api/v1/sessions', [ParkingSessionController::class, 'index'], [AuthMiddleware::class]);
$router->get('/api/v1/sessions/{id}', [ParkingSessionController::class, 'show'], [AuthMiddleware::class]);
$router->post('/api/v1/sessions/{id}/complete-exit', [ParkingSessionController::class, 'completeExit'], [AuthMiddleware::class]);
$router->post('/api/v1/sessions/{id}/manual-review', [ParkingSessionController::class, 'resolveManualReview'], [AuthMiddleware::class]);

// ── Visitor Validation ─────────────────────────────────────────
$router->get('/api/v1/validation/candidates', [VisitorValidationController::class, 'getActiveCandidates'], [AuthMiddleware::class]);
$router->post('/api/v1/validation/qr', [VisitorValidationController::class, 'validateByQr'], [AuthMiddleware::class]);
$router->post('/api/v1/validation/reception', [VisitorValidationController::class, 'validateByReception'], [AuthMiddleware::class]);
$router->post('/api/v1/validation/token', [VisitorValidationController::class, 'createToken'], [AuthMiddleware::class]);
$router->get('/api/v1/validation/appointments', [VisitorValidationController::class, 'searchAppointments'], [AuthMiddleware::class]);

// ── Payment Processing ─────────────────────────────────────────
$router->get('/api/v1/payment/calculate', [PaymentController::class, 'calculate'], [AuthMiddleware::class]);
$router->post('/api/v1/payment/process', [PaymentController::class, 'processPayment'], [AuthMiddleware::class]);

// ── Boom Barrier Control & Manual Override ─────────────────────
$router->post('/api/v1/barrier/manual-override', [BarrierController::class, 'manualOverride'], [AuthMiddleware::class]);
$router->get('/api/v1/barrier/logs', [BarrierController::class, 'getLogs'], [AuthMiddleware::class]);

// ── Vehicle Access (Whitelist / Blacklist) ─────────────────────
$router->get('/api/v1/vehicles', [VehicleAccessController::class, 'index'], [AuthMiddleware::class]);
$router->post('/api/v1/vehicles', [VehicleAccessController::class, 'store'], [AuthMiddleware::class]);
$router->delete('/api/v1/vehicles/{id}', [VehicleAccessController::class, 'delete'], [AuthMiddleware::class]);

// ── Dashboard Metrics & Reports ────────────────────────────────
$router->get('/api/v1/dashboard/metrics', [DashboardController::class, 'getMetrics'], [AuthMiddleware::class]);
$router->get('/api/v1/reports/summary', [ReportsController::class, 'getSummary'], [AuthMiddleware::class]);

// ── HIS & 3rd Party Integration APIs ───────────────────────────
$router->post('/api/v1/his/appointments/sync', [HisIntegrationController::class, 'syncAppointment']);
$router->post('/api/v1/his/validate-visitor', [HisIntegrationController::class, 'validateVisitor']);
$router->get('/api/v1/his/parking-status', [HisIntegrationController::class, 'checkStatus']);
$router->post('/api/v1/his/emergency-access', [HisIntegrationController::class, 'emergencyAccess']);

// ── Prepaid Parking & Vehicle Ledger ───────────────────────────
$router->get('/api/v1/prepaid/passes', [PrepaidController::class, 'getPasses'], [AuthMiddleware::class]);
$router->post('/api/v1/prepaid/calculate', [PrepaidController::class, 'calculate'], [AuthMiddleware::class]);
$router->post('/api/v1/prepaid/passes', [PrepaidController::class, 'store'], [AuthMiddleware::class]);
$router->post('/api/v1/prepaid/passes/{id}/renew', [PrepaidController::class, 'renew'], [AuthMiddleware::class]);
$router->get('/api/v1/prepaid/stats', [PrepaidController::class, 'getStats'], [AuthMiddleware::class]);
$router->get('/api/v1/prepaid/ledger', [PrepaidController::class, 'getLedger'], [AuthMiddleware::class]);
$router->get('/api/v1/prepaid/vehicle/{plate}/history', [PrepaidController::class, 'getVehicleHistory'], [AuthMiddleware::class]);

// ── Kiosk Display Board (Exit Gate Android App) ────────────
// GET: Public — Android display board polls this every 2s
$router->get('/api/v1/kiosk/status', [DisplayController::class, 'getStatus']);
// POST: Public — Driver's phone confirms QR payment (no auth, token-secured)
$router->post('/api/v1/kiosk/pay-qr', [DisplayController::class, 'payByQr']);
// GET: Public redirect from QR scan (driver phone opens URL in browser)
$router->get('/api/v1/kiosk/pay-qr', [DisplayController::class, 'payByQr']);
// POST: Auth-protected — Simulate ANPR approach at exit gate for demo/testing
$router->post('/api/v1/kiosk/simulate-approach', [DisplayController::class, 'simulateApproach'], [AuthMiddleware::class]);

// Dispatch Request
$router->dispatch();
