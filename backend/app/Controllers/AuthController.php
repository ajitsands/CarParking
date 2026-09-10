<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Helpers\JWT;
use App\Services\SuperadminVault;

class AuthController extends Controller {
    public function login(): void {
        $input = $this->getJsonInput();
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (!$username || !$password) {
            $this->error('Username and password are required', 400);
            return;
        }

        // 1. Check Superadmin Login
        if (strtolower($username) === 'superadmin') {
            SuperadminVault::initIfNotExists();
            if (SuperadminVault::verifyPassword($password)) {
                // Ensure record exists in DB for foreign keys & role references
                $db = Database::getInstance();
                $stmt = $db->prepare("SELECT * FROM users WHERE username = 'superadmin' LIMIT 1");
                $stmt->execute();
                $user = $stmt->fetch();

                if (!$user) {
                    $db->prepare("INSERT INTO users (username, email, password_hash, full_name, role, status) VALUES ('superadmin', 'superadmin@sandslab.com', 'ENCRYPTED_VAULT_MANAGED', 'SaNDS Super Administrator', 'superadmin', 'active')")->execute();
                    $userId = (int)$db->lastInsertId();
                } else {
                    $userId = (int)$user['id'];
                }

                $token = JWT::encode([
                    'user_id'  => $userId,
                    'username' => 'superadmin',
                    'role'     => 'superadmin',
                    'full_name'=> 'SaNDS Super Administrator'
                ]);

                // Update last login
                $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$userId]);

                $this->success([
                    'token' => $token,
                    'user'  => [
                        'id'        => $userId,
                        'username'  => 'superadmin',
                        'email'     => 'superadmin@sandslab.com',
                        'full_name' => 'SaNDS Super Administrator',
                        'role'      => 'superadmin'
                    ]
                ], 'Superadmin authenticated via secure server vault');
                return;
            } else {
                $this->error('Invalid superadmin credentials', 401);
                return;
            }
        }

        // 2. Check Standard Users (Admin / Operator / Cashier) from MySQL DB
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM users WHERE (username = ? OR email = ?) AND status = 'active' LIMIT 1");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->error('Invalid username or password', 401);
            return;
        }

        $token = JWT::encode([
            'user_id'  => (int)$user['id'],
            'username' => $user['username'],
            'role'     => $user['role'],
            'full_name'=> $user['full_name']
        ]);

        $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);

        $this->success([
            'token' => $token,
            'user'  => [
                'id'        => (int)$user['id'],
                'username'  => $user['username'],
                'email'     => $user['email'],
                'full_name' => $user['full_name'],
                'role'      => $user['role']
            ]
        ], 'Login successful');
    }

    public function me(): void {
        $user = $this->getCurrentUser();
        if (!$user) {
            $this->error('Not authenticated', 401);
            return;
        }

        $this->success(['user' => $user]);
    }

    public function changePassword(): void {
        $user = $this->getCurrentUser();
        if (!$user) {
            $this->error('Not authenticated', 401);
            return;
        }

        $input = $this->getJsonInput();
        $currentPassword = $input['current_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        if (strlen($newPassword) < 6) {
            $this->error('New password must be at least 6 characters', 400);
            return;
        }

        // Superadmin self-reset: saved in encrypted file format
        if ($user['role'] === 'superadmin') {
            if (!SuperadminVault::verifyPassword($currentPassword)) {
                $this->error('Current password does not match', 400);
                return;
            }
            SuperadminVault::saveEncryptedPassword($newPassword);
            $this->success([], 'Superadmin password updated in encrypted server vault');
            return;
        }

        // Standard user / Admin self-reset: saved in DB
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$user['id']]);
        $hash = $stmt->fetchColumn();

        if (!password_verify($currentPassword, $hash)) {
            $this->error('Current password does not match', 400);
            return;
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$newHash, $user['id']]);

        $this->success([], 'Password changed successfully in database');
    }

    public function resetUserPassword(): void {
        $currentUser = $this->getCurrentUser();
        $input = $this->getJsonInput();
        $targetUserId = (int)($input['user_id'] ?? 0);
        $newPassword = $input['new_password'] ?? '';

        if (!$targetUserId || strlen($newPassword) < 6) {
            $this->error('Target user and valid new password (min 6 chars) required', 400);
            return;
        }

        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$targetUserId]);
        $targetUser = $stmt->fetch();

        if (!$targetUser) {
            $this->error('Target user not found', 404);
            return;
        }

        // Superadmin can reset anyone (including Admin and his own vault)
        if ($currentUser['role'] === 'superadmin') {
            if ($targetUser['role'] === 'superadmin') {
                SuperadminVault::saveEncryptedPassword($newPassword);
                $this->success([], 'Superadmin password reset in secure server file vault');
                return;
            }

            // Reset in DB for Admin or Operator
            $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
            $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$newHash, $targetUserId]);
            $this->success([], "Password for {$targetUser['username']} has been reset in the database by Superadmin");
            return;
        }

        // Admin can reset all users EXCEPT Superadmin
        if ($currentUser['role'] === 'admin') {
            if ($targetUser['role'] === 'superadmin') {
                $this->error('Access denied: Admins cannot reset Superadmin credentials', 403);
                return;
            }

            $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
            $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$newHash, $targetUserId]);
            $this->success([], "Password for {$targetUser['username']} has been reset in the database");
            return;
        }

        $this->error('Permission denied', 403);
    }
}
