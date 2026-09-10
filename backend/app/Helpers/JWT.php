<?php
namespace App\Helpers;

class JWT {
    public static function encode(array $payload, ?string $secret = null): string {
        $config = require __DIR__ . '/../../config/app.php';
        $key = $secret ?: $config['jwt_secret'];

        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['iat'] = time();
        $payload['exp'] = time() + ($config['jwt_expiry'] ?? 86400 * 7);

        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $key, true);
        $base64UrlSignature = self::base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function decode(string $token, ?string $secret = null): ?array {
        $config = require __DIR__ . '/../../config/app.php';
        $key = $secret ?: $config['jwt_secret'];

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$base64UrlHeader, $base64UrlPayload, $base64UrlSignature] = $parts;

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $key, true);
        $expectedSignature = self::base64UrlEncode($signature);

        if (!hash_equals($expectedSignature, $base64UrlSignature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($base64UrlPayload), true);
        if (!$payload || !is_array($payload)) {
            return null;
        }

        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null; // Expired
        }

        return $payload;
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
