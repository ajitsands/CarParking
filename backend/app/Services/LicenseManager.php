<?php
namespace App\Services;

use App\Core\Database;
use DateTime;
use Exception;
use Throwable;

class LicenseManager {
    public const KEY_SERVER_URL = 'https://key.sandslab.com/public/api/activate';

    /**
     * Activate a License Key with the SaNDS Lab Key Server (https://key.sandslab.com/public/docs)
     */
    public static function activate(string $licenseKey, ?string $domain = null, ?string $ip = null, ?int $userId = null): array {
        $licenseKey = trim($licenseKey);
        if (empty($licenseKey)) {
            throw new Exception('License key is required');
        }

        // Determine domain
        if (empty($domain)) {
            $domain = $_SERVER['HTTP_HOST'] ?? 'localhost';
        }
        $cleanDomain = preg_replace('#^https?://#', '', strtolower($domain));
        $hostOnly = explode(':', $cleanDomain)[0];

        // Determine IP
        if (empty($ip)) {
            $resolvedIp = gethostbyname($hostOnly);
            if ($resolvedIp === $hostOnly || $resolvedIp === '127.0.0.1' || $resolvedIp === '::1') {
                $ip = @file_get_contents('https://api.ipify.org') ?: ($_SERVER['SERVER_ADDR'] ?? '127.0.0.1');
            } else {
                $ip = $resolvedIp;
            }
        }
        $ip = trim((string)$ip);

        // Call SaNDS Lab Activation Endpoint
        $ch = curl_init(self::KEY_SERVER_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode([
                'license_key' => $licenseKey,
                'domain_name' => $hostOnly,
                'ip_address'  => $ip
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_TIMEOUT => 20
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new Exception("Connection to SaNDS Lab Key Server failed: " . ($curlErr ?: 'Network timeout'));
        }

        $data = json_decode($response, true);
        if ($httpCode !== 200 || empty($data['token']) || empty($data['public_key'])) {
            $errMsg = $data['message'] ?? $data['error'] ?? "License activation failed (HTTP {$httpCode})";
            throw new Exception($errMsg);
        }

        $token = $data['token'];
        $publicKey = $data['public_key'];

        // Verify token immediately before saving
        $verification = self::verifyToken($token, $publicKey, $hostOnly);
        if (!$verification['valid']) {
            throw new Exception("Received token verification failed: " . $verification['message']);
        }

        $payload = $verification['payload'] ?? [];
        $issuedTo = $payload['client_name'] ?? $payload['issued_to'] ?? $payload['customer_name'] ?? 'Authorized Client';
        $expiresAt = $payload['expires_at'] ?? date('Y-m-d H:i:s', strtotime('+365 days'));
        $maxLanes = (int)($payload['max_lanes'] ?? $payload['lanes'] ?? 10);

        // Calculate days remaining
        $now = new DateTime();
        $exp = new DateTime($expiresAt);
        $daysRemaining = max(0, (int)$now->diff($exp)->format('%r%a'));

        // Save into DB
        $db = Database::getInstance();
        $stmtExisting = $db->query("SELECT id FROM system_licenses ORDER BY id DESC LIMIT 1");
        $existing = $stmtExisting->fetch();

        if ($existing) {
            $stmtUpdate = $db->prepare("
                UPDATE system_licenses 
                SET license_key = ?, token = ?, public_key = ?, domain_name = ?, ip_address = ?, payload_data = ?, 
                    issued_to = ?, expires_at = ?, duration_days = ?, max_lanes = ?, status = 'active', activated_at = NOW(), updated_by = ?
                WHERE id = ?
            ");
            $stmtUpdate->execute([
                $licenseKey, $token, $publicKey, $hostOnly, $ip, json_encode($payload),
                $issuedTo, $expiresAt, $daysRemaining, $maxLanes, $userId, $existing['id']
            ]);
        } else {
            $stmtInsert = $db->prepare("
                INSERT INTO system_licenses 
                (license_key, token, public_key, domain_name, ip_address, payload_data, issued_to, expires_at, duration_days, max_lanes, status, activated_at, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), ?)
            ");
            $stmtInsert->execute([
                $licenseKey, $token, $publicKey, $hostOnly, $ip, json_encode($payload),
                $issuedTo, $expiresAt, $daysRemaining, $maxLanes, $userId
            ]);
        }

        return [
            'is_valid'       => true,
            'status'         => 'active',
            'license_key'    => $licenseKey,
            'domain_name'    => $hostOnly,
            'issued_to'      => $issuedTo,
            'expires_at'     => $expiresAt,
            'days_remaining' => $daysRemaining,
            'max_lanes'      => $maxLanes,
            'payload'        => $payload,
            'message'        => 'License successfully activated and verified by SaNDS Lab Key Server.'
        ];
    }

    /**
     * Local Offline Asymmetric Verification (Runs on every page/API request)
     */
    public static function getStatus(): array {
        try {
            $db = Database::getInstance();
            $stmt = $db->query("SELECT * FROM system_licenses ORDER BY id DESC LIMIT 1");
            $lic = $stmt->fetch();

            if (!$lic || empty($lic['license_key'])) {
                return [
                    'is_valid'       => false,
                    'status'         => 'unlicensed',
                    'message'        => 'No license key installed. Please activate your SaNDS Lab software license.',
                    'license_key'    => null,
                    'issued_to'      => null,
                    'expires_at'     => null,
                    'days_remaining' => 0
                ];
            }

            // If token & public key exist, do cryptographic verification
            if (!empty($lic['token']) && !empty($lic['public_key'])) {
                $domain = $_SERVER['HTTP_HOST'] ?? ($lic['domain_name'] ?? 'localhost');
                $hostOnly = explode(':', preg_replace('#^https?://#', '', strtolower($domain)))[0];

                $check = self::verifyToken($lic['token'], $lic['public_key'], $hostOnly);
                if (!$check['valid']) {
                    return [
                        'is_valid'       => false,
                        'status'         => 'invalid',
                        'message'        => $check['message'],
                        'license_key'    => $lic['license_key'],
                        'issued_to'      => $lic['issued_to'],
                        'expires_at'     => $lic['expires_at'],
                        'days_remaining' => 0
                    ];
                }

                $payload = $check['payload'];
                $expiresAt = $payload['expires_at'] ?? $lic['expires_at'];
                $now = new DateTime();
                $exp = new DateTime($expiresAt);
                $isPast = $now > $exp;
                $daysRemaining = $isPast ? 0 : (int)$now->diff($exp)->format('%r%a');
                $status = $isPast ? 'expired' : 'active';

                if ($status === 'expired' && $lic['status'] !== 'expired') {
                    $db->prepare("UPDATE system_licenses SET status = 'expired' WHERE id = ?")->execute([$lic['id']]);
                }

                return [
                    'is_valid'       => !$isPast,
                    'status'         => $status,
                    'license_key'    => $lic['license_key'],
                    'issued_to'      => $lic['issued_to'] ?: ($payload['client_name'] ?? 'Client'),
                    'domain_name'    => $lic['domain_name'] ?? $hostOnly,
                    'expires_at'     => $expiresAt,
                    'days_remaining' => $daysRemaining,
                    'max_lanes'      => (int)$lic['max_lanes'],
                    'activated_at'   => $lic['activated_at'] ?? null,
                    'payload'        => $payload,
                    'message'        => $isPast ? 'Software License Expired' : 'License Active & Cryptographically Verified'
                ];
            }

            // Fallback for pre-existing records (if any)
            $now = new DateTime();
            $exp = new DateTime($lic['expires_at']);
            $isPast = $now > $exp;
            $daysRemaining = $isPast ? 0 : (int)$now->diff($exp)->format('%r%a');

            return [
                'is_valid'       => !$isPast && $lic['status'] === 'active',
                'status'         => $isPast ? 'expired' : $lic['status'],
                'license_key'    => $lic['license_key'],
                'issued_to'      => $lic['issued_to'],
                'expires_at'     => $lic['expires_at'],
                'days_remaining' => $daysRemaining,
                'max_lanes'      => (int)$lic['max_lanes'],
                'message'        => $isPast ? 'Software License Expired' : 'License Active'
            ];
        } catch (Throwable $e) {
            return [
                'is_valid'       => false,
                'status'         => 'error',
                'message'        => 'License check error: ' . $e->getMessage(),
                'days_remaining' => 0
            ];
        }
    }

    /**
     * Cryptographic RSA SHA-256 Token Verification (Asymmetric Offline Check)
     */
    public static function verifyToken(string $token, string $publicKey, ?string $currentDomain = null): array {
        if (empty($token) || empty($publicKey)) {
            return ['valid' => false, 'message' => 'Token or Public Key is missing.'];
        }

        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            return ['valid' => false, 'message' => 'Invalid token format (expected 2 parts).'];
        }

        list($payloadBase64, $signatureBase64) = $parts;
        $payloadJson = base64_decode($payloadBase64);
        $signature = base64_decode($signatureBase64);
        $payload = json_decode($payloadJson, true);

        if (!is_array($payload)) {
            return ['valid' => false, 'message' => 'Invalid token payload JSON.'];
        }

        // 1. Verify RSA Signature using OpenSSL
        $verifyResult = openssl_verify($payloadJson, $signature, $publicKey, OPENSSL_ALGO_SHA256);
        if ($verifyResult !== 1) {
            return ['valid' => false, 'message' => 'Cryptographic signature mismatch. Token is corrupted or forged.'];
        }

        // 2. Verify Domain Match (if domain is bound in payload)
        if (!empty($payload['domain_name'])) {
            $cur = preg_replace('#^https?://#', '', strtolower($currentDomain ?: ($_SERVER['HTTP_HOST'] ?? 'localhost')));
            $lic = preg_replace('#^https?://#', '', strtolower($payload['domain_name']));

            $curHost = explode(':', $cur)[0];
            $licHost = explode(':', $lic)[0];

            $isLocalMatch = in_array($curHost, ['localhost', '127.0.0.1', '::1']) && in_array($licHost, ['localhost', '127.0.0.1', '::1']);
            if (!$isLocalMatch && $curHost !== $licHost && !str_ends_with($curHost, '.' . $licHost)) {
                return [
                    'valid' => false,
                    'message' => "Domain mismatch: License is signed for '{$licHost}', but software is running on '{$curHost}'."
                ];
            }
        }

        // 3. Expiry Check
        if (!empty($payload['expires_at'])) {
            $exp = new DateTime($payload['expires_at']);
            $now = new DateTime();
            if ($now > $exp) {
                return [
                    'valid'      => false,
                    'expired'    => true,
                    'message'    => 'License expired on ' . $payload['expires_at'],
                    'payload'    => $payload
                ];
            }
        }

        return [
            'valid'   => true,
            'payload' => $payload
        ];
    }

    /**
     * Deactivate / Clear installed license
     */
    public static function deactivate(?int $userId = null): array {
        $db = Database::getInstance();
        $db->prepare("UPDATE system_licenses SET status = 'suspended', token = NULL, updated_by = ?")->execute([$userId]);
        return self::getStatus();
    }
}
