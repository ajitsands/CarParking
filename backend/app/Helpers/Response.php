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
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0');
        header('Pragma: no-cache');
        header('Expires: 0');
        header('X-Accel-Expires: 0');
        header('X-LiteSpeed-Cache-Control: no-cache');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-KEY, Cache-Control, Pragma');
        http_response_code($statusCode);

        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
}
