<?php
namespace App\Middleware;

use App\Helpers\JWT;
use App\Helpers\Response;
use App\Core\Database;

class AuthMiddleware {
    public function handle(): bool {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!$authHeader && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            Response::json(['success' => false, 'error' => 'Unauthorized: Missing or invalid token'], 401);
            return false;
        }

        $token = $matches[1];
        $payload = JWT::decode($token);

        if (!$payload || !isset($payload['user_id'])) {
            Response::json(['success' => false, 'error' => 'Unauthorized: Token is expired or invalid'], 401);
            return false;
        }

        // Load user from DB
        try {
            $db = Database::getInstance();
            $stmt = $db->prepare("SELECT id, username, email, full_name, role, status FROM users WHERE id = ? AND status = 'active' LIMIT 1");
            $stmt->execute([$payload['user_id']]);
            $user = $stmt->fetch();

            if (!$user) {
                Response::json(['success' => false, 'error' => 'Unauthorized: User account not found or deactivated'], 401);
                return false;
            }

            $GLOBALS['current_user'] = $user;
            return true;
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => 'Database error during authentication'], 500);
            return false;
        }
    }
}
