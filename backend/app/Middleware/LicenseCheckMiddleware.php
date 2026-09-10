<?php
namespace App\Middleware;

use App\Services\LicenseManager;
use App\Helpers\Response;

class LicenseCheckMiddleware {
    public function handle(): bool {
        $user = $GLOBALS['current_user'] ?? null;
        // Superadmin always has access to manage and renew the license
        if ($user && $user['role'] === 'superadmin') {
            return true;
        }

        $lic = LicenseManager::getStatus();
        if (!$lic['is_valid']) {
            Response::json([
                'success' => false,
                'error'   => 'Software License Expired: Please contact the Super Administrator to extend license duration.',
                'code'    => 'LICENSE_EXPIRED',
                'license' => $lic
            ], 403);
            return false;
        }

        return true;
    }
}
