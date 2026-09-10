<?php
namespace App\Services;

use App\Helpers\JWT;

class SuperadminVault {
    private static function getVaultPath(): string {
        $config = require __DIR__ . '/../../config/app.php';
        return $config['superadmin_vault_path'];
    }

    private static function getSecretKey(): string {
        $config = require __DIR__ . '/../../config/app.php';
        return $config['superadmin_enc_key'];
    }

    public static function initIfNotExists(): void {
        $path = self::getVaultPath();
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        if (!file_exists($path)) {
            self::saveEncryptedPassword('S@nds1@b');
        }
    }

    public static function verifyPassword(string $password): bool {
        self::initIfNotExists();
        $path = self::getVaultPath();
        
        $content = file_get_contents($path);
        $data = json_decode($content, true);
        if (!$data || !isset($data['token'], $data['signature'])) {
            return false;
        }

        // Verify file tamper signature
        $expectedSig = hash_hmac('sha256', $data['token'] . $data['salt'], self::getSecretKey());
        if (!hash_equals($expectedSig, $data['signature'])) {
            return false; // Tampered!
        }

        // Decode encrypted token
        $payload = JWT::decode($data['token'], self::getSecretKey());
        if (!$payload || !isset($payload['hash'])) {
            return false;
        }

        return password_verify($password, $payload['hash']);
    }

    public static function saveEncryptedPassword(string $newPassword): bool {
        $path = self::getVaultPath();
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $salt = bin2hex(random_bytes(16));
        $hash = password_hash($newPassword, PASSWORD_BCRYPT);

        $payload = [
            'username'   => 'superadmin',
            'hash'       => $hash,
            'updated_at' => date('Y-m-d H:i:s'),
            'type'       => 'SUPERADMIN_SECURITY_VAULT'
        ];

        $token = JWT::encode($payload, self::getSecretKey());
        $signature = hash_hmac('sha256', $token . $salt, self::getSecretKey());

        $vaultData = [
            'username'   => 'superadmin',
            'token'      => $token,
            'salt'       => $salt,
            'signature'  => $signature,
            'storage'    => 'server_file_encrypted',
            'updated_at' => date('Y-m-d H:i:s')
        ];

        return file_put_contents($path, json_encode($vaultData, JSON_PRETTY_PRINT)) !== false;
    }

    public static function getVaultMetadata(): array {
        self::initIfNotExists();
        $path = self::getVaultPath();
        $data = json_decode(file_get_contents($path), true);
        return [
            'storage_type'  => 'Encrypted Server File (.json JWT-signed vault)',
            'file_path'     => realpath($path) ?: $path,
            'last_updated'  => $data['updated_at'] ?? 'Unknown',
            'status'        => 'Secure & Active'
        ];
    }
}
