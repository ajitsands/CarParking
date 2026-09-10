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

        $appConfig = require __DIR__ . '/../../config/app.php';

        // Fetch Server Configuration
        $serverConfig = $db->query("SELECT * FROM server_configs ORDER BY id ASC LIMIT 1")->fetch() ?: [];
        $detectedLanIp = gethostbyname(gethostname()) ?: '192.168.1.100';
        if ($detectedLanIp === '127.0.0.1' || empty($detectedLanIp)) {
            $detectedLanIp = $_SERVER['SERVER_ADDR'] ?? '192.168.1.100';
        }
        $serverPort = (int)($_SERVER['SERVER_PORT'] ?? 8000);
        if ($serverPort === 0) $serverPort = 8000;

        $localBase = !empty($settings['anpr_lan_ip']) 
            ? "http://" . $settings['anpr_lan_ip'] . ":" . ($settings['anpr_lan_port'] ?? $serverPort)
            : "http://{$detectedLanIp}:{$serverPort}";

        $prodBase = !empty($serverConfig['production_server_url']) 
            ? rtrim($serverConfig['production_server_url'], '/') 
            : 'https://parking.sandslab.com';

        $networkInfo = [
            'detected_lan_ip'       => $detectedLanIp,
            'server_port'           => $serverPort,
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
                mkdir($uploadDir, 0755, true);
            }

            $filename = 'hospital_logo_' . time() . '.' . $ext;
            file_put_contents($uploadDir . '/' . $filename, $decoded);
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
}
