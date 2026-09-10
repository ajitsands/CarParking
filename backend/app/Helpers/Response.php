<?php
namespace App\Helpers;

class Response {
    public static function json($data, int $statusCode = 200): void {
        // Clear any previous output buffers
        while (ob_get_level()) {
            ob_end_clean();
        }

        // Send headers
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-KEY');
        http_response_code($statusCode);

        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
}
