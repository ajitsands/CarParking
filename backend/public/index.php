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

// Debug Incoming Request Logger for Camera Diagnostic
$logDir = __DIR__ . '/../storage/logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0777, true);
}
$incomingLog = sprintf(
    "[%s] %s %s from %s | Body: %s\n",
    date('Y-m-d H:i:s'),
    $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
    $_SERVER['REQUEST_URI'] ?? 'UNKNOWN',
    $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN',
    substr(file_get_contents('php://input'), 0, 500)
);
@file_put_contents($logDir . '/anpr_incoming.log', $incomingLog, FILE_APPEND);


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

// Serve uploaded assets (ANPR snapshots, logos, plates)
if (str_starts_with($uri, '/storage/uploads/')) {
    $filePath = realpath(__DIR__ . '/../' . ltrim($uri, '/'));
    $allowedDir = realpath(__DIR__ . '/../storage/uploads');
    if ($filePath && $allowedDir && str_starts_with($filePath, $allowedDir) && file_exists($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimes = [
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'gif'  => 'image/gif',
            'webp' => 'image/webp',
            'svg'  => 'image/svg+xml'
        ];
        header('Content-Type: ' . ($mimes[$ext] ?? 'application/octet-stream'));
        header('Content-Length: ' . (string)filesize($filePath));
        header('Access-Control-Allow-Origin: *');
        header('Cache-Control: public, max-age=86400');
        readfile($filePath);
        exit;
    }
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
$router->post('/api/v1/webhook', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/webhook', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/anpr', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/capture', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/traffic', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/Events', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/events', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/LAPI/V1.0/System/Event/Notification/ANPR', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/LAPI/V1.0/System/Event/Notification/Alarm', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);

// GET: friendly info page when someone opens the URL in a browser
$router->get('/api/v1/webhook/anpr', function() {
    header('Content-Type: application/json');
    echo json_encode([
        'success'     => true,
        'endpoint'    => 'ANPR Camera Webhook',
        'method'      => 'POST only',
        'format'      => 'application/json / XML / multipart',
        'description' => 'This endpoint receives HTTP POST requests from ANPR camera software (Dahua, Hikvision, Uniview, Hanwha). Configure your camera to POST plate events here.',
        'note'        => 'You are seeing this because you opened the URL in a browser (GET request). Your camera software must send HTTP POST requests to this URL.',
        'status'      => 'active'
    ], JSON_PRETTY_PRINT);
    exit;
});

// ── Uniview (UNV) uPark Protocol & Heartbeat Endpoints ─────────
$unvHandler = function() {
    while (ob_get_level()) {
        ob_end_clean();
    }
    $raw = file_get_contents('php://input');
    $rawJson = json_decode($raw, true) ?: [];
    $parkId = $rawJson['parkId'] ?? 'park1';
    $deviceId = $rawJson['deviceId'] ?? 'PKC2640@Z80-IR-P';
    $serialNum = $rawJson['serialNum'] ?? '210235C81T3258000018';
    $now = date('Y-m-d H:i:s');
    $ts = time();

    $payload = [
        'version'   => $rawJson['version'] ?? '1.0',
        'code'      => 0,
        'msg'       => 'success',
        'result'    => 0,
        'desc'      => 'success',
        'success'   => true,
        'parkId'    => $parkId,
        'deviceId'  => $deviceId,
        'serialNum' => $serialNum,
        'keepalive' => 30,
        'keepAlive' => 30,
        'heartbeat' => 30,
        'time'      => $now,
        'timestamp' => $ts,
        'params'    => [
            'result'     => 0,
            'desc'       => 'success',
            'keepalive'  => 30,
            'keepAlive'  => 30,
            'heartbeat'  => 30,
            'time'       => $now,
            'timestamp'  => $ts,
            'passType'   => 1,
            'gateControl'=> 1
        ],
        'data'      => (object)[
            'result'     => 0,
            'desc'       => 'success',
            'code'       => 0,
            'msg'        => 'success',
            'parkId'     => $parkId,
            'deviceId'   => $deviceId,
            'serialNum'  => $serialNum,
            'keepalive'  => 30,
            'keepAlive'  => 30,
            'heartbeat'  => 30,
            'time'       => $now,
            'timestamp'  => $ts,
            'passType'   => 1,
            'gateControl'=> 1
        ]
    ];
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    header('HTTP/1.1 200 OK');
    header('Content-Type: application/json; charset=UTF-8');
    header('Content-Length: ' . strlen($json));
    header('Connection: close');
    header('Access-Control-Allow-Origin: *');
    echo $json;
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    }
    exit;
};

$router->post('/api/upark/keepalive', $unvHandler);
$router->get('/api/upark/keepalive', $unvHandler);
$router->post('/api/upark/heartbeat', $unvHandler);
$router->get('/api/upark/heartbeat', $unvHandler);
$router->post('/api/upark/basicinfo', $unvHandler);
$router->get('/api/upark/basicinfo', $unvHandler);
$router->post('/api/upark/commonalarm', $unvHandler);
$router->post('/api/upark/transchannel', $unvHandler);

// UNV Capture & QuickCapture Endpoints (Route to AnprWebhookController)
$router->post('/api/upark/capture', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/api/upark/quickcapture', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/api/upark/record', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/api/upark/passrecord', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/api/upark/vehiclepass', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/api/upark/pass', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/api/upark/notifyresult/manualcapture/cor', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);

// ── VIID / GA/T 1400 Endpoints (Uniview Video&Image Database) ──
$viidHandler = function() {
    while (ob_get_level()) { ob_end_clean(); }
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true) ?: [];
    $deviceId = $json['RegisterObject']['DeviceID'] 
             ?? $json['KeepaliveObject']['DeviceID'] 
             ?? $json['UnRegisterObject']['DeviceID'] 
             ?? '12345678901236547896';
    $reqUrl = parse_url($_SERVER['REQUEST_URI'] ?? '/VIID/System/Register', PHP_URL_PATH);
    $now = date('YmdHis');

    $statusObj = [
        'Id' => $deviceId,
        'LocalTime' => $now,
        'RequestURL' => $reqUrl,
        'StatusCode' => 0,
        'StatusString' => 'OK'
    ];

    $payload = [
        'ResponseStatusObject' => $statusObj,
        'ResponseStatusListObject' => [
            'ResponseStatusObject' => [$statusObj]
        ]
    ];
    $respJson = json_encode($payload, JSON_UNESCAPED_UNICODE);
    header('HTTP/1.1 200 OK');
    header('Content-Type: application/json; charset=UTF-8');
    header('Content-Length: ' . strlen($respJson));
    header('Connection: close');
    header('Access-Control-Allow-Origin: *');
    echo $respJson;
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    }
    exit;
};

$viidTimeHandler = function() {
    while (ob_get_level()) { ob_end_clean(); }
    $now = date('YmdHis');
    $payload = [
        'SystemTimeObject' => [
            'VIIDServerID' => '12345678901236547896',
            'TimeMode'     => '0',
            'LocalTime'    => $now,
            'TimeZone'     => 'GMT+03'
        ],
        'ResponseStatusObject' => [
            'Id' => '12345678901236547896',
            'LocalTime' => $now,
            'RequestURL' => '/VIID/System/Time',
            'StatusCode' => 0,
            'StatusString' => 'OK'
        ]
    ];
    $respJson = json_encode($payload, JSON_UNESCAPED_UNICODE);
    header('HTTP/1.1 200 OK');
    header('Content-Type: application/json; charset=UTF-8');
    header('Content-Length: ' . strlen($respJson));
    header('Connection: close');
    header('Access-Control-Allow-Origin: *');
    echo $respJson;
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    }
    exit;
};

$router->post('/VIID/System/Register', $viidHandler);
$router->get('/VIID/System/Register', $viidHandler);
$router->post('/VIID/System/Keepalive', $viidHandler);
$router->get('/VIID/System/Keepalive', $viidHandler);
$router->post('/VIID/System/UnRegister', $viidHandler);
$router->get('/VIID/System/Time', $viidTimeHandler);
$router->post('/VIID/System/Time', $viidTimeHandler);

// VIID Vehicle & Notification Push Endpoints
$router->post('/VIID/MotorVehicles', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->put('/VIID/MotorVehicles', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/VIID/Subscribe/Notifications', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/VIID/Faces', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/VIID/NonMotorVehicles', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);
$router->post('/VIID/Persons', [AnprWebhookController::class, 'handle'], [LicenseCheckMiddleware::class]);

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
