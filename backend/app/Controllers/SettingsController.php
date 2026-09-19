<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Helpers\CurrencyHelper;
use App\Helpers\TimezoneHelper;

class SettingsController extends Controller {
    public function getSettings(): void {
        $db = Database::getInstance();
        $stmt = $db->query("SELECT setting_key, setting_value, category FROM system_settings");
        $rows = $stmt->fetchAll();

        $settings = [];
        foreach ($rows as $r) {
            $settings[$r['setting_key']] = $r['setting_value'];
        }
        if (!isset($settings['show_powered_by'])) {
            $settings['show_powered_by'] = '1';
        }
        if (!isset($settings['port_backend_api']) || empty($settings['port_backend_api'])) {
            $settings['port_backend_api'] = '8081';
        }
        if (!isset($settings['port_frontend_ui']) || empty($settings['port_frontend_ui'])) {
            $settings['port_frontend_ui'] = '5173';
        }
        if (!isset($settings['port_stream_gateway']) || empty($settings['port_stream_gateway'])) {
            $settings['port_stream_gateway'] = '8889';
        }

        $appConfig = require __DIR__ . '/../../config/app.php';

        // Fetch Server Configuration
        $serverConfig = $db->query("SELECT * FROM server_configs ORDER BY id ASC LIMIT 1")->fetch() ?: [];
        $detectedLanIp = gethostbyname(gethostname()) ?: '192.168.1.100';
        if ($detectedLanIp === '127.0.0.1' || empty($detectedLanIp)) {
            $detectedLanIp = $_SERVER['SERVER_ADDR'] ?? '192.168.1.100';
        }
        $serverPort = (int)($_SERVER['SERVER_PORT'] ?? ($settings['port_backend_api'] ?? 8081));
        if ($serverPort === 0) $serverPort = (int)($settings['port_backend_api'] ?? 8081);

        $localBase = !empty($settings['anpr_lan_ip']) 
            ? "http://" . $settings['anpr_lan_ip'] . ":" . ($settings['anpr_lan_port'] ?? $serverPort)
            : "http://{$detectedLanIp}:{$serverPort}";

        $prodBase = !empty($serverConfig['production_server_url']) 
            ? rtrim($serverConfig['production_server_url'], '/') 
            : 'https://parking.sandslab.com';

        $networkInfo = [
            'detected_lan_ip'       => $detectedLanIp,
            'server_port'           => $serverPort,
            'port_backend_api'      => (int)$settings['port_backend_api'],
            'port_frontend_ui'      => (int)$settings['port_frontend_ui'],
            'port_stream_gateway'   => (int)$settings['port_stream_gateway'],
            'local_webhook_url'     => $localBase . '/api/v1/webhook/anpr',
            'localhost_webhook_url' => "http://127.0.0.1:{$serverPort}/api/v1/webhook/anpr",
            'server_webhook_url'    => $prodBase . '/api/v1/webhook/anpr',
            'production_server_url' => $prodBase,
            'active_environment'    => $serverConfig['environment'] ?? 'local'
        ];

        $this->success([
            'settings'            => $settings,
            'network_info'        => $networkInfo,
            'server_config'       => $serverConfig,
            'anpr_mapping'        => \App\Services\AnprPayloadParser::getMappingConfig(),
            'anpr_presets'        => \App\Services\AnprPayloadParser::PRESETS,
            'timezones'           => $appConfig['timezones'],
            'supported_currencies'=> $appConfig['currencies'],
            'current_currency'    => CurrencyHelper::getConfig(),
            'current_timezone'    => TimezoneHelper::getTimezone(),
            'current_time'        => TimezoneHelper::now()
        ]);
    }

    public function updateSettings(): void {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || !in_array($currentUser['role'], ['superadmin', 'admin'])) {
            $this->error('Forbidden: Administrator access required', 403);
            return;
        }

        $input = $this->getJsonInput();
        $db = Database::getInstance();

        // Check if currency code changed -> enforce Bahrain 3 decimals vs others 2
        if (isset($input['currency_code'])) {
            $code = strtoupper(trim($input['currency_code']));
            $input['currency_code'] = $code;
            if ($code === 'BHD' || $code === 'KWD' || $code === 'OMR') {
                $input['currency_decimals'] = '3';
                if ($code === 'BHD') $input['currency_symbol'] = 'BD';
            } else {
                $input['currency_decimals'] = '2';
                if ($code === 'AED') $input['currency_symbol'] = 'AED';
                if ($code === 'SAR') $input['currency_symbol'] = 'SAR';
                if ($code === 'INR') $input['currency_symbol'] = '₹';
            }
        }

        // Grace period minutes (Admin configurable: 10, 30, 45, etc.)
        if (isset($input['default_grace_minutes'])) {
            $input['default_grace_minutes'] = (string)max(1, (int)$input['default_grace_minutes']);
        }

        // Auto-calculate and synchronize parking_total_capacity from floor slots breakdown
        if (isset($input['parking_floor_slots_json'])) {
            $rawFloors = is_array($input['parking_floor_slots_json']) 
                ? $input['parking_floor_slots_json'] 
                : json_decode((string)$input['parking_floor_slots_json'], true);
            if (is_array($rawFloors) && !empty($rawFloors)) {
                $floorsSum = 0;
                foreach ($rawFloors as $fl) {
                    $floorsSum += (int)($fl['capacity'] ?? 0);
                }
                if ($floorsSum > 0) {
                    $input['parking_total_capacity'] = (string)$floorsSum;
                }
            }
        }

        $stmt = $db->prepare("INSERT INTO system_settings (setting_key, setting_value, category) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");

        foreach ($input as $key => $val) {
            if (is_array($val)) {
                $val = json_encode($val);
            }
            $stmt->execute([$key, (string)$val, 'general']);
        }

        $this->success([], 'System settings updated successfully');
    }

    public function uploadLogo(): void {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || !in_array($currentUser['role'], ['superadmin', 'admin'])) {
            $this->error('Forbidden: Administrator access required', 403);
            return;
        }

        $input = $this->getJsonInput();
        $base64Image = $input['image'] ?? '';

        if (!$base64Image) {
            $this->error('Image payload is required', 400);
            return;
        }

        if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $type)) {
            $data = substr($base64Image, strpos($base64Image, ',') + 1);
            $ext = strtolower($type[1]);
            $decoded = base64_decode($data);

            if (!$decoded) {
                $this->error('Invalid base64 image data', 400);
                return;
            }

            $uploadDir = __DIR__ . '/../../storage/uploads/logo';
            if (!is_dir($uploadDir)) {
                @mkdir($uploadDir, 0777, true);
            }

            $rootUploadDir = __DIR__ . '/../../../storage/uploads/logo';
            if (!is_dir($rootUploadDir)) {
                @mkdir($rootUploadDir, 0777, true);
            }

            $filename = 'hospital_logo_' . time() . '.' . $ext;
            @file_put_contents($uploadDir . '/' . $filename, $decoded);
            if (is_dir($rootUploadDir)) {
                @file_put_contents($rootUploadDir . '/' . $filename, $decoded);
            }
            $logoUrl = '/storage/uploads/logo/' . $filename;

            // Save in settings
            $db = Database::getInstance();
            $db->prepare("INSERT INTO system_settings (setting_key, setting_value, category) VALUES ('company_logo', ?, 'branding') ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)")->execute([$logoUrl]);

            $this->success(['logo_url' => $logoUrl], 'Logo uploaded successfully');
            return;
        }

        $this->error('Invalid image data URL format', 400);
    }

    /**
     * Test camera field mapping against sample vendor JSON
     */
    public function testAnprMapping(): void {
        $input = $this->getJsonInput();
        $samplePayload = $input['sample_payload'] ?? [];
        if (is_string($samplePayload)) {
            $decoded = json_decode($samplePayload, true);
            if (is_array($decoded)) {
                $samplePayload = $decoded;
            }
        }
        $customMapping = $input['mapping'] ?? [];

        $result = \App\Services\AnprPayloadParser::testMapping((array)$samplePayload, (array)$customMapping);
        $this->success($result);
    }

    /**
     * Download customized batch launcher files (START_PARKING_SYSTEM.bat or STOP_PARKING_SYSTEM.bat)
     */
    public function downloadLauncher(): void {
        $type = strtolower($_GET['type'] ?? 'start');
        $db = Database::getInstance();
        $stmt = $db->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('port_backend_api', 'port_frontend_ui', 'port_stream_gateway')");
        $settings = [];
        while ($row = $stmt->fetch()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }

        $backendPort = !empty($settings['port_backend_api']) ? (int)$settings['port_backend_api'] : 8081;
        $frontendPort = !empty($settings['port_frontend_ui']) ? (int)$settings['port_frontend_ui'] : 5173;
        $streamPort = !empty($settings['port_stream_gateway']) ? (int)$settings['port_stream_gateway'] : 8889;

        if ($type === 'stop') {
            $filename = 'STOP_PARKING_SYSTEM.bat';
            $content = "@echo off\r\n"
                . "title SaNDS Lab Parking Solution - Stop Services\r\n"
                . "color 0C\r\n"
                . "cls\r\n\r\n"
                . "echo ===============================================================================\r\n"
                . "echo                SaNDS Lab Smart Parking Management System\r\n"
                . "echo                       Stop All Running Services\r\n"
                . "echo ===============================================================================\r\n"
                . "echo.\r\n"
                . "echo [*] Terminating all parking services (PHP {$backendPort}, Frontend {$frontendPort}, Stream Bridge {$streamPort})...\r\n"
                . "powershell -NoProfile -Command \"Get-NetTCPConnection -LocalPort {$backendPort},{$frontendPort},{$streamPort} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id \$_ -Force -ErrorAction SilentlyContinue }\" >nul 2>&1\r\n\r\n"
                . "echo [+] All background services have been stopped.\r\n"
                . "echo.\r\n"
                . "echo ===============================================================================\r\n"
                . "echo                           ALL SERVICES STOPPED\r\n"
                . "echo ===============================================================================\r\n"
                . "echo.\r\n"
                . "pause\r\n";
        } else {
            $filename = 'START_PARKING_SYSTEM.bat';
            $content = "@echo off\r\n"
                . "title SaNDS Lab Smart Parking Management System - Central Controller\r\n"
                . "color 0B\r\n"
                . "cls\r\n\r\n"
                . ":: Change directory to this script's folder\r\n"
                . "cd /d \"%~dp0\"\r\n\r\n"
                . "echo ===============================================================================\r\n"
                . "echo                SaNDS Lab Smart Parking Management System\r\n"
                . "echo                       Unified System Controller\r\n"
                . "echo ===============================================================================\r\n"
                . "echo.\r\n\r\n"
                . ":: 1. Detect Local Network IP Address\r\n"
                . "echo [*] Detecting Local Network IPv4 Address...\r\n"
                . "set \"LOCAL_IP=\"\r\n"
                . "for /f \"tokens=2 delims=:\" %%a in ('ipconfig ^| findstr /i \"IPv4\"') do (\r\n"
                . "    if not defined LOCAL_IP set \"LOCAL_IP=%%a\"\r\n"
                . ")\r\n"
                . "if defined LOCAL_IP set \"LOCAL_IP=%LOCAL_IP: =%\"\r\n"
                . "if \"%LOCAL_IP%\"==\"\" set LOCAL_IP=127.0.0.1\r\n\r\n"
                . "echo [+] Detected Server IP: %LOCAL_IP%\r\n"
                . "echo.\r\n\r\n"
                . ":: 2. Terminate any previous instances on ports {$backendPort}, {$frontendPort}, and {$streamPort}\r\n"
                . "echo [*] Checking and freeing ports {$backendPort}, {$frontendPort}, and {$streamPort}...\r\n"
                . "powershell -NoProfile -Command \"Get-NetTCPConnection -LocalPort {$backendPort},{$frontendPort},{$streamPort} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id \$_ -Force -ErrorAction SilentlyContinue }\" >nul 2>&1\r\n\r\n"
                . ":: 3. Check MySQL Database Service\r\n"
                . "echo [*] Checking MySQL Database Service...\r\n"
                . "sc query MySQL80 >nul 2>&1\r\n"
                . "if %ERRORLEVEL% EQU 0 net start MySQL80 >nul 2>&1\r\n"
                . "sc query MySQL >nul 2>&1\r\n"
                . "if %ERRORLEVEL% EQU 0 net start MySQL >nul 2>&1\r\n"
                . "echo [+] MySQL check complete.\r\n"
                . "echo.\r\n\r\n"
                . ":: 4. Start Live RTSP Video Stream Bridge in Background (Hidden)\r\n"
                . "echo [*] Starting Live RTSP Stream Gateway (Port {$streamPort})...\r\n"
                . "if exist \"tools\\mediamtx\\mediamtx.exe\" powershell -NoProfile -Command \"Start-Process tools\\mediamtx\\mediamtx.exe -ArgumentList 'mediamtx.yml' -WorkingDirectory tools\\mediamtx -WindowStyle Hidden\" >nul 2>&1\r\n"
                . "if exist \"tools\\mediamtx\\mediamtx.exe\" echo [+] Stream Bridge running (Hidden Background).\r\n"
                . "if not exist \"tools\\mediamtx\\mediamtx.exe\" echo [i] Stream Gateway tool not installed (optional).\r\n\r\n"
                . ":: 5. Start PHP Backend Server in Background (Hidden)\r\n"
                . "echo [*] Starting PHP Backend API Server (Port {$backendPort})...\r\n"
                . "powershell -NoProfile -Command \"Start-Process php -ArgumentList '-S 0.0.0.0:{$backendPort} backend/public/index.php' -WindowStyle Hidden\" >nul 2>&1\r\n"
                . "echo [+] PHP Backend running on port {$backendPort} (Hidden Background).\r\n\r\n"
                . ":: 6. Start Frontend Web Server in Background (Hidden)\r\n"
                . "echo [*] Starting Frontend Web Portal (Port {$frontendPort})...\r\n"
                . "powershell -NoProfile -Command \"Start-Process cmd.exe -ArgumentList '/c npm run dev -- --host 0.0.0.0 --port {$frontendPort}' -WorkingDirectory frontend -WindowStyle Hidden\" >nul 2>&1\r\n"
                . "echo [+] Frontend Portal running on port {$frontendPort} (Hidden Background).\r\n\r\n"
                . ":: Wait 3 seconds for services to initialize\r\n"
                . "ping -n 4 127.0.0.1 >nul\r\n\r\n"
                . ":: 7. Launch Default Browser to Dashboard\r\n"
                . "start http://localhost:{$frontendPort}\r\n\r\n"
                . ":MENU\r\n"
                . "cls\r\n"
                . "echo ===============================================================================\r\n"
                . "echo                SaNDS Lab Smart Parking Management System\r\n"
                . "echo                   ONLINE AND RUNNING (SINGLE CONSOLE)\r\n"
                . "echo ===============================================================================\r\n"
                . "echo.\r\n"
                . "echo  [+] PHP Backend API:       http://localhost:{$backendPort}  ^|  http://%LOCAL_IP%:{$backendPort}\r\n"
                . "echo  [+] Web Dashboard UI:      http://localhost:{$frontendPort}  ^|  http://%LOCAL_IP%:{$frontendPort}\r\n"
                . "echo  [+] Display Board App:     http://%LOCAL_IP%:{$backendPort}\r\n"
                . "echo.\r\n"
                . "echo -------------------------------------------------------------------------------\r\n"
                . "echo  ANPR CAMERA CONFIGURATION (Supports 1, 2, 4, or any number of cameras):\r\n"
                . "echo  - Set all LPR Cameras (UNV / Dahua / Hikvision) Server IP to: %LOCAL_IP%\r\n"
                . "echo  - Set Server Port to: {$backendPort}\r\n"
                . "echo  - Webhook URL / Push Path: /VIID/MotorVehicles or /api/v1/webhook/anpr\r\n"
                . "echo -------------------------------------------------------------------------------\r\n"
                . "echo.\r\n"
                . "echo  [1] Open Dashboard in Browser (http://localhost:{$frontendPort})\r\n"
                . "echo  [2] Open Display Board in Browser (http://localhost:{$frontendPort}/display)\r\n"
                . "echo  [3] Open Camera Diagnostic Logs (anpr_incoming.log)\r\n"
                . "echo  [4] Restart All Services\r\n"
                . "echo  [Q] Stop All Services and Exit\r\n"
                . "echo.\r\n"
                . "echo ===============================================================================\r\n"
                . "set /p OPT=\"Enter your choice (1-4 or Q to stop): \"\r\n\r\n"
                . "if /i \"%OPT%\"==\"1\" (\r\n"
                . "    start http://localhost:{$frontendPort}\r\n"
                . "    goto MENU\r\n"
                . ")\r\n"
                . "if /i \"%OPT%\"==\"2\" (\r\n"
                . "    start http://localhost:{$frontendPort}/display\r\n"
                . "    goto MENU\r\n"
                . ")\r\n"
                . "if /i \"%OPT%\"==\"3\" (\r\n"
                . "    if exist \"backend\\storage\\logs\\anpr_incoming.log\" (\r\n"
                . "        start notepad \"backend\\storage\\logs\\anpr_incoming.log\"\r\n"
                . "    ) else (\r\n"
                . "        echo Log file not created yet.\r\n"
                . "        pause\r\n"
                . "    )\r\n"
                . "    goto MENU\r\n"
                . ")\r\n"
                . "if /i \"%OPT%\"==\"4\" (\r\n"
                . "    echo [*] Restarting all services...\r\n"
                . "    call \"%~dp0STOP_PARKING_SYSTEM.bat\"\r\n"
                . "    goto :EOF\r\n"
                . ")\r\n"
                . "if /i \"%OPT%\"==\"Q\" (\r\n"
                . "    echo [*] Stopping all services...\r\n"
                . "    powershell -NoProfile -Command \"Get-NetTCPConnection -LocalPort {$backendPort},{$frontendPort},{$streamPort} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id \$_ -Force -ErrorAction SilentlyContinue }\" >nul 2>&1\r\n"
                . "    echo [+] All background services stopped successfully.\r\n"
                . "    timeout /t 2 >nul\r\n"
                . "    exit\r\n"
                . ")\r\n\r\n"
                . "goto MENU\r\n";
        }

        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . strlen($content));
        echo $content;
        exit;
    }
}

