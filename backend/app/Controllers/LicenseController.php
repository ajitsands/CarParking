<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Services\LicenseManager;

class LicenseController extends Controller {
    public function getStatus(): void {
        $status = LicenseManager::getStatus();
        $this->success(['license' => $status]);
    }

    public function updateDuration(): void {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'superadmin') {
            $this->error('Forbidden: Only Superadmin can modify software expiry duration', 403);
            return;
        }

        $input = $this->getJsonInput();
        $days = (int)($input['days'] ?? 0);

        if ($days <= 0) {
            $this->error('Please specify a positive number of days to add', 400);
            return;
        }

        $updated = LicenseManager::updateDuration($days, (int)$currentUser['id']);
        $this->success(['license' => $updated], "Successfully extended software duration by {$days} days");
    }

    public function setExactExpiry(): void {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'superadmin') {
            $this->error('Forbidden: Only Superadmin can modify software expiry duration', 403);
            return;
        }

        $input = $this->getJsonInput();
        $date = $input['expires_at'] ?? '';

        if (!$date || !strtotime($date)) {
            $this->error('Valid expiry date (YYYY-MM-DD) required', 400);
            return;
        }

        $updated = LicenseManager::setExactExpiry($date, (int)$currentUser['id']);
        $this->success(['license' => $updated], "Software expiry date successfully set to {$date}");
    }
}
