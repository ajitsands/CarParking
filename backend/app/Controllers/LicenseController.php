<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Services\LicenseManager;
use Throwable;

class LicenseController extends Controller {
    public function getStatus(): void {
        $status = LicenseManager::getStatus();
        $this->success(['license' => $status]);
    }

    public function activate(): void {
        $input = $this->getJsonInput();
        $licenseKey = trim($input['license_key'] ?? '');
        $domain = trim($input['domain_name'] ?? '');
        $ip = trim($input['ip_address'] ?? '');

        if (empty($licenseKey)) {
            $this->error('Please enter a valid License Key', 400);
            return;
        }

        $user = $this->getCurrentUser();
        $userId = $user ? (int)$user['id'] : null;

        try {
            $result = LicenseManager::activate($licenseKey, $domain ?: null, $ip ?: null, $userId);
            $this->success(['license' => $result], $result['message']);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    public function deactivate(): void {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'superadmin') {
            $this->error('Forbidden: Only Superadmin can deactivate license', 403);
            return;
        }

        $result = LicenseManager::deactivate((int)$currentUser['id']);
        $this->success(['license' => $result], 'License deactivated successfully');
    }
}
