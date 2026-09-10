<?php
namespace App\Core;

use App\Helpers\Response;

abstract class Controller {
    protected function getJsonInput(): array {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    protected function getQueryParams(): array {
        return $_GET;
    }

    protected function success(array $data = [], string $message = 'Success', int $statusCode = 200): void {
        Response::json([
            'success' => true,
            'message' => $message,
            'data'    => $data
        ], $statusCode);
    }

    protected function error(string $message = 'Error', int $statusCode = 400, array $errors = []): void {
        Response::json([
            'success' => false,
            'error'   => $message,
            'errors'  => $errors
        ], $statusCode);
    }

    protected function getCurrentUser(): ?array {
        return $GLOBALS['current_user'] ?? null;
    }
}
