<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;

class VehicleAccessController extends Controller {
    public function index(): void {
        $db = Database::getInstance();
        $params = $this->getQueryParams();
        $status = $params['access_status'] ?? '';

        if ($status) {
            $stmt = $db->prepare("SELECT * FROM vehicles WHERE access_status = ? ORDER BY id DESC");
            $stmt->execute([$status]);
        } else {
            $stmt = $db->query("SELECT * FROM vehicles ORDER BY id DESC");
        }

        $vehicles = $stmt->fetchAll();
        $this->success(['vehicles' => $vehicles]);
    }

    public function store(): void {
        $input = $this->getJsonInput();
        $plate = strtoupper(trim($input['plate_number'] ?? ''));
        $status = $input['access_status'] ?? 'whitelisted'; // whitelisted, blacklisted, standard
        $category = $input['category'] ?? 'general';
        $owner = trim($input['owner_name'] ?? '');
        $phone = trim($input['owner_phone'] ?? '');
        $dept = trim($input['owner_department'] ?? '');
        $reason = trim($input['block_reason'] ?? '');
        $validFrom = $input['valid_from'] ?? null;
        $validTo = $input['valid_to'] ?? null;
        $notes = trim($input['notes'] ?? '');

        if (!$plate) {
            $this->error('Plate number is required', 400);
            return;
        }

        if ($status === 'blacklisted' && !$reason) {
            $this->error('A security block reason is mandatory for blacklisting a vehicle', 400);
            return;
        }

        $db = Database::getInstance();
        $stmt = $db->prepare("INSERT INTO vehicles (plate_number, access_status, category, owner_name, owner_phone, owner_department, block_reason, valid_from, valid_to, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            access_status = VALUES(access_status), 
            category = VALUES(category), 
            owner_name = VALUES(owner_name), 
            owner_phone = VALUES(owner_phone), 
            owner_department = VALUES(owner_department), 
            block_reason = VALUES(block_reason), 
            valid_from = VALUES(valid_from), 
            valid_to = VALUES(valid_to), 
            notes = VALUES(notes)");

        $stmt->execute([$plate, $status, $category, $owner, $phone, $dept, $reason, $validFrom, $validTo, $notes]);
        $id = (int)$db->lastInsertId();

        $this->success(['vehicle_id' => $id, 'plate_number' => $plate, 'status' => $status], 'Vehicle access profile saved');
    }

    public function delete(int $id): void {
        $db = Database::getInstance();
        $db->prepare("DELETE FROM vehicles WHERE id = ?")->execute([$id]);
        $this->success([], 'Vehicle record deleted');
    }
}
