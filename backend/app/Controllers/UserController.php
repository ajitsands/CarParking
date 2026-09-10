<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;

class UserController extends Controller {
    public function index(): void {
        $currentUser = $this->getCurrentUser();
        $db = Database::getInstance();

        if ($currentUser['role'] === 'superadmin') {
            // Superadmin can see all users
            $stmt = $db->query("SELECT id, username, email, full_name, phone, role, status, assigned_gates, last_login, created_at FROM users ORDER BY id ASC");
        } else {
            // Admin can see all users EXCEPT superadmin
            $stmt = $db->query("SELECT id, username, email, full_name, phone, role, status, assigned_gates, last_login, created_at FROM users WHERE role != 'superadmin' ORDER BY id ASC");
        }

        $users = $stmt->fetchAll();
        $this->success(['users' => $users]);
    }

    public function store(): void {
        $currentUser = $this->getCurrentUser();
        $input = $this->getJsonInput();

        $username = trim($input['username'] ?? '');
        $email = trim($input['email'] ?? '');
        $fullName = trim($input['full_name'] ?? '');
        $password = $input['password'] ?? '';
        $role = $input['role'] ?? 'operator';
        $phone = $input['phone'] ?? '';
        $assignedGates = trim($input['assigned_gates'] ?? 'ALL');

        if (!$username || !$email || !$fullName || strlen($password) < 6) {
            $this->error('Username, email, full name and password (min 6 chars) are required', 400);
            return;
        }

        // Only superadmin can create other superadmins
        if ($role === 'superadmin' && $currentUser['role'] !== 'superadmin') {
            $this->error('Forbidden: Only Superadmin can create superadmin accounts', 403);
            return;
        }

        $db = Database::getInstance();
        // Check uniqueness
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        if ($stmt->fetch()) {
            $this->error('Username or email already exists', 400);
            return;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $db->prepare("INSERT INTO users (username, email, password_hash, full_name, phone, role, status, assigned_gates) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)");
        $stmt->execute([$username, $email, $hash, $fullName, $phone, $role, $assignedGates ?: 'ALL']);

        $userId = (int)$db->lastInsertId();
        $this->success(['user_id' => $userId], 'User created successfully', 201);
    }

    public function update(int $id): void {
        $currentUser = $this->getCurrentUser();
        $db = Database::getInstance();

        $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $targetUser = $stmt->fetch();

        if (!$targetUser) {
            $this->error('User not found', 404);
            return;
        }

        if ($targetUser['role'] === 'superadmin' && $currentUser['role'] !== 'superadmin') {
            $this->error('Forbidden: Only Superadmin can edit superadmin accounts', 403);
            return;
        }

        $input = $this->getJsonInput();
        $fullName = trim($input['full_name'] ?? $targetUser['full_name']);
        $email = trim($input['email'] ?? $targetUser['email']);
        $phone = trim($input['phone'] ?? $targetUser['phone']);
        $status = $input['status'] ?? $targetUser['status'];
        $role = $input['role'] ?? $targetUser['role'];
        $assignedGates = isset($input['assigned_gates']) ? trim($input['assigned_gates']) : ($targetUser['assigned_gates'] ?? 'ALL');

        if ($role === 'superadmin' && $currentUser['role'] !== 'superadmin') {
            $role = $targetUser['role'];
        }

        $stmt = $db->prepare("UPDATE users SET full_name = ?, email = ?, phone = ?, status = ?, role = ?, assigned_gates = ? WHERE id = ?");
        $stmt->execute([$fullName, $email, $phone, $status, $role, $assignedGates ?: 'ALL', $id]);

        $this->success([], 'User updated successfully');
    }

    public function delete(int $id): void {
        $currentUser = $this->getCurrentUser();
        $db = Database::getInstance();

        $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $targetUser = $stmt->fetch();

        if (!$targetUser) {
            $this->error('User not found', 404);
            return;
        }

        if ($targetUser['role'] === 'superadmin') {
            $this->error('Forbidden: Superadmin accounts cannot be deleted', 403);
            return;
        }

        if ($id === (int)$currentUser['id']) {
            $this->error('Cannot delete your own logged-in account', 400);
            return;
        }

        $db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
        $this->success([], 'User deleted successfully');
    }
}
