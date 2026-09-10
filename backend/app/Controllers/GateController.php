<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Services\BarrierRelayService;

class GateController extends Controller {
    public function index(): void {
        $db = Database::getInstance();
        $stmt = $db->query("SELECT * FROM gates_and_cameras ORDER BY gate_type ASC, gate_code ASC");
        $gates = $stmt->fetchAll();

        // Also fetch active lane metrics
        $metricsStmt = $db->query("
            SELECT 
                entry_gate_id, 
                COUNT(*) as active_entries 
            FROM parking_sessions 
            WHERE exit_time IS NULL 
            GROUP BY entry_gate_id
        ");
        $activeEntries = $metricsStmt->fetchAll(\PDO::FETCH_KEY_PAIR) ?: [];

        $this->success([
            'gates' => $gates,
            'active_entries' => $activeEntries
        ]);
    }

    public function store(): void {
        $input = $this->getJsonInput();

        $gateCode = strtoupper(trim($input['gate_code'] ?? ''));
        $gateName = trim($input['gate_name'] ?? '');
        $gateType = strtolower(trim($input['gate_type'] ?? 'entry'));
        $cameraName = trim($input['camera_name'] ?? 'ANPR Camera');
        $cameraIp = trim($input['camera_ip'] ?? '192.168.1.101');
        $cameraPort = (int)($input['camera_port'] ?? 80);
        $rtspUrl = trim($input['rtsp_url'] ?? '');
        $relayIp = trim($input['relay_ip'] ?? '192.168.1.201');
        $relayPort = (int)($input['relay_port'] ?? 8080);
        $relayCommand = trim($input['relay_command'] ?? 'OPEN_RELAY_1');
        $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;

        if (!$gateCode || !$gateName || !$cameraIp) {
            $this->error('Gate Code (e.g. GATE-IN-02), Gate Name, and Camera IP are required.', 400);
            return;
        }

        if (!in_array($gateType, ['entry', 'exit', 'bidirectional'])) {
            $gateType = 'entry';
        }

        $db = Database::getInstance();

        // Check if gate code already exists
        $stmtCheck = $db->prepare("SELECT id FROM gates_and_cameras WHERE gate_code = ?");
        $stmtCheck->execute([$gateCode]);
        if ($stmtCheck->fetch()) {
            $this->error("Gate code '{$gateCode}' already exists. Please choose a unique Gate Code.", 400);
            return;
        }

        $stmt = $db->prepare("INSERT INTO gates_and_cameras 
            (gate_code, gate_name, gate_type, camera_name, camera_ip, camera_port, rtsp_url, relay_ip, relay_port, relay_command, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $gateCode,
            $gateName,
            $gateType,
            $cameraName,
            $cameraIp,
            $cameraPort,
            $rtspUrl,
            $relayIp,
            $relayPort,
            $relayCommand,
            $isActive
        ]);

        $gateId = (int)$db->lastInsertId();

        // Audit log
        $currentUser = $this->getCurrentUser();
        $db->prepare("INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details) VALUES (?, ?, 'CREATE_GATE', 'gates_and_cameras', ?, ?)")
           ->execute([
               $currentUser ? $currentUser['id'] : null,
               $currentUser ? $currentUser['username'] : 'admin',
               $gateCode,
               "Created Gate {$gateCode} ({$gateName}) with Camera IP: {$cameraIp} and Relay IP: {$relayIp}:{$relayPort}"
           ]);

        $this->success(['id' => $gateId, 'gate_code' => $gateCode], 'Gate and Camera configured successfully.', 201);
    }

    public function update(int $id): void {
        $db = Database::getInstance();

        $stmt = $db->prepare("SELECT * FROM gates_and_cameras WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            $this->error('Gate configuration not found.', 404);
            return;
        }

        $input = $this->getJsonInput();

        $gateCode = strtoupper(trim($input['gate_code'] ?? $existing['gate_code']));
        $gateName = trim($input['gate_name'] ?? $existing['gate_name']);
        $gateType = strtolower(trim($input['gate_type'] ?? $existing['gate_type']));
        $cameraName = trim($input['camera_name'] ?? $existing['camera_name']);
        $cameraIp = trim($input['camera_ip'] ?? $existing['camera_ip']);
        $cameraPort = (int)($input['camera_port'] ?? $existing['camera_port']);
        $rtspUrl = trim($input['rtsp_url'] ?? $existing['rtsp_url']);
        $relayIp = trim($input['relay_ip'] ?? $existing['relay_ip']);
        $relayPort = (int)($input['relay_port'] ?? $existing['relay_port']);
        $relayCommand = trim($input['relay_command'] ?? $existing['relay_command']);
        $isActive = isset($input['is_active']) ? (int)$input['is_active'] : (int)$existing['is_active'];

        // Check if gate code is unique to other records
        $stmtCheck = $db->prepare("SELECT id FROM gates_and_cameras WHERE gate_code = ? AND id != ?");
        $stmtCheck->execute([$gateCode, $id]);
        if ($stmtCheck->fetch()) {
            $this->error("Gate code '{$gateCode}' is already used by another gate.", 400);
            return;
        }

        $stmtUpd = $db->prepare("UPDATE gates_and_cameras SET 
            gate_code = ?, 
            gate_name = ?, 
            gate_type = ?, 
            camera_name = ?, 
            camera_ip = ?, 
            camera_port = ?, 
            rtsp_url = ?, 
            relay_ip = ?, 
            relay_port = ?, 
            relay_command = ?, 
            is_active = ? 
            WHERE id = ?");
        $stmtUpd->execute([
            $gateCode,
            $gateName,
            $gateType,
            $cameraName,
            $cameraIp,
            $cameraPort,
            $rtspUrl,
            $relayIp,
            $relayPort,
            $relayCommand,
            $isActive,
            $id
        ]);

        // Audit log
        $currentUser = $this->getCurrentUser();
        $db->prepare("INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details) VALUES (?, ?, 'UPDATE_GATE', 'gates_and_cameras', ?, ?)")
           ->execute([
               $currentUser ? $currentUser['id'] : null,
               $currentUser ? $currentUser['username'] : 'admin',
               $gateCode,
               "Updated Gate {$gateCode} ({$gateName}). Camera IP: {$cameraIp}, Relay: {$relayIp}:{$relayPort}"
           ]);

        $this->success([], 'Gate configuration updated successfully.');
    }

    public function delete(int $id): void {
        $db = Database::getInstance();

        $stmt = $db->prepare("SELECT * FROM gates_and_cameras WHERE id = ?");
        $stmt->execute([$id]);
        $gate = $stmt->fetch();

        if (!$gate) {
            $this->error('Gate configuration not found.', 404);
            return;
        }

        // Prevent deletion if only 1 gate remains
        $totalGates = (int)$db->query("SELECT COUNT(*) FROM gates_and_cameras")->fetchColumn();
        if ($totalGates <= 1) {
            $this->error('Cannot delete the last remaining gate in the system.', 400);
            return;
        }

        $db->prepare("DELETE FROM gates_and_cameras WHERE id = ?")->execute([$id]);

        // Audit log
        $currentUser = $this->getCurrentUser();
        $db->prepare("INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details) VALUES (?, ?, 'DELETE_GATE', 'gates_and_cameras', ?, ?)")
           ->execute([
               $currentUser ? $currentUser['id'] : null,
               $currentUser ? $currentUser['username'] : 'admin',
               $gate['gate_code'],
               "Deleted Gate {$gate['gate_code']} ({$gate['gate_name']})"
           ]);

        $this->success([], "Gate '{$gate['gate_code']}' deleted successfully.");
    }

    public function testPulse(int $id): void {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM gates_and_cameras WHERE id = ?");
        $stmt->execute([$id]);
        $gate = $stmt->fetch();

        if (!$gate) {
            $this->error('Gate not found.', 404);
            return;
        }

        $currentUser = $this->getCurrentUser();
        $userId = $currentUser ? (int)$currentUser['id'] : null;

        $res = BarrierRelayService::openBarrier(
            $gate['gate_code'],
            strtoupper($gate['gate_type'] === 'exit' ? 'EXIT' : 'ENTRY'),
            'TEST_SIGNAL',
            'test_signal',
            $userId,
            'Diagnostics: Administrator Test Signal Pulse'
        );

        $this->success([
            'gate_code' => $gate['gate_code'],
            'gate_name' => $gate['gate_name'],
            'relay_ip'  => $gate['relay_ip'],
            'relay_port'=> $gate['relay_port'],
            'result'    => $res
        ], "Test pulse signal sent to {$gate['gate_code']} ({$gate['relay_ip']}:{$gate['relay_port']})");
    }

    public function testCameraPing(int $id): void {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM gates_and_cameras WHERE id = ?");
        $stmt->execute([$id]);
        $gate = $stmt->fetch();

        if (!$gate) {
            $this->error('Gate not found.', 404);
            return;
        }

        $ip = $gate['camera_ip'];
        $port = (int)($gate['camera_port'] ?: 80);

        $connected = false;
        $responseTimeMs = 0;
        $startTime = microtime(true);

        try {
            $fp = @fsockopen($ip, $port, $errno, $errstr, 1.0);
            $responseTimeMs = round((microtime(true) - $startTime) * 1000, 1);
            if ($fp) {
                $connected = true;
                fclose($fp);
            }
        } catch (\Throwable $e) {}

        $this->success([
            'camera_ip'       => $ip,
            'camera_port'     => $port,
            'is_reachable'    => $connected,
            'response_time_ms'=> $responseTimeMs,
            'gate_code'       => $gate['gate_code'],
            'camera_name'     => $gate['camera_name']
        ], $connected 
            ? "ANPR Camera at {$ip}:{$port} is REACHABLE ({$responseTimeMs}ms)."
            : "ANPR Camera at {$ip}:{$port} is OFFLINE or NOT REACHABLE on local network.");
    }
}
