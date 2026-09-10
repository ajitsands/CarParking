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

// ── Superadmin License & Duration Management ───────────────────
$router->get('/api/v1/license/status', [LicenseController::class, 'getStatus']);
$router->post('/api/v1/license/extend', [LicenseController::class, 'updateDuration'], [AuthMiddleware::class, RoleMiddleware::superadminOnly()]);
$router->post('/api/v1/license/set-expiry', [LicenseController::class, 'setExactExpiry'], [AuthMiddleware::class, RoleMiddleware::superadminOnly()]);

// ── Settings (Admin / Superadmin) ──────────────────────────────
$router->get('/api/v1/settings', [SettingsController::class, 'getSettings']);
$router->post('/api/v1/settings', [SettingsController::class, 'updateSettings'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->post('/api/v1/settings/logo', [SettingsController::class, 'uploadLogo'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->post('/api/v1/settings/test-anpr-mapping', [SettingsController::class, 'testAnprMapping'], [AuthMiddleware::class]);

// ── Users (RBAC) ───────────────────────────────────────────────
$router->get('/api/v1/users', [UserController::class, 'index'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->post('/api/v1/users', [UserController::class, 'store'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->put('/api/v1/users/{id}', [UserController::class, 'update'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);
$router->delete('/api/v1/users/{id}', [UserController::class, 'delete'], [AuthMiddleware::class, RoleMiddleware::adminOrSuperadmin()]);

// ── ANPR Camera Webhook ────────────────────────────────────────
$router->post('/api/v1/webhook/anpr', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);

// ── Parking Sessions ───────────────────────────────────────────
$router->get('/api/v1/sessions', [ParkingSessionController::class, 'index'], [AuthMiddleware::class]);
$router->get('/api/v1/sessions/{id}', [ParkingSessionController::class, 'show'], [AuthMiddleware::class]);
$router->post('/api/v1/sessions/{id}/complete-exit', [ParkingSessionController::class, 'completeExit'], [AuthMiddleware::class]);
$router->post('/api/v1/sessions/{id}/manual-review', [ParkingSessionController::class, 'resolveManualReview'], [AuthMiddleware::class]);

// ── Visitor Validation ─────────────────────────────────────────
$router->post('/api/v1/validation/qr', [VisitorValidationController::class, 'validateByQr'], [AuthMiddleware::class]);
$router->post('/api/v1/validation/reception', [VisitorValidationController::class, 'validateByReception'], [AuthMiddleware::class]);
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

// Dispatch Request
$router->dispatch();
