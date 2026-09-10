<?php
namespace App\Middleware;

use App\Helpers\Response;

class RoleMiddleware {
    public static function superadminOnly(): \Closure {
        return function(): bool {
            $user = $GLOBALS['current_user'] ?? null;
            if (!$user || $user['role'] !== 'superadmin') {
                Response::json(['success' => false, 'error' => 'Forbidden: Superadmin access required'], 403);
                return false;
            }
            return true;
        };
    }

    public static function adminOrSuperadmin(): \Closure {
        return function(): bool {
            $user = $GLOBALS['current_user'] ?? null;
            if (!$user || !in_array($user['role'], ['superadmin', 'admin'])) {
                Response::json(['success' => false, 'error' => 'Forbidden: Administrator access required'], 403);
                return false;
            }
            return true;
        };
    }

    public static function anyAuthenticatedUser(): \Closure {
        return function(): bool {
            $user = $GLOBALS['current_user'] ?? null;
            if (!$user) {
                Response::json(['success' => false, 'error' => 'Unauthorized'], 401);
                return false;
            }
            return true;
        };
    }
}
