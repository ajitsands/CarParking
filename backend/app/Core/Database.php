<?php
namespace App\Core;

use PDO;
use PDOException;

class Database {
    private static ?PDO $instance = null;
    private static array $config = [];

    private function __construct() {}
    private function __clone() {}

    public static function getInstance(): PDO {
        if (self::$instance === null) {
            self::connect();
        }
        return self::$instance;
    }

    public static function connect(?string $env = null): PDO {
        $dbConfig = require __DIR__ . '/../../config/database.php';
        $activeEnv = $env ?: $dbConfig['default'];
        $conn = $dbConfig['connections'][$activeEnv] ?? $dbConfig['connections']['local'];

        // If custom override file exists from Superadmin configuration
        $overrideFile = __DIR__ . '/../../storage/security/custom_db.json';
        if (file_exists($overrideFile)) {
            $custom = json_decode(file_get_contents($overrideFile), true);
            if (!empty($custom) && !empty($custom['db_host'])) {
                $conn = array_merge($conn, $custom);
            }
        }

        self::$config = $conn;

        $dsn = sprintf(
            '%s:host=%s;port=%d;dbname=%s;charset=%s',
            $conn['driver'],
            $conn['host'],
            $conn['port'],
            $conn['database'],
            $conn['charset']
        );

        try {
            self::$instance = new PDO($dsn, $conn['username'], $conn['password'], $conn['options']);
            try {
                self::$instance->exec("SET NAMES utf8mb4");
                $tzOffset = \App\Helpers\TimezoneHelper::getOffset();
                self::$instance->exec("SET time_zone = '{$tzOffset}'");
            } catch (\Throwable $tzErr) {
                // Ignore if timezone table is not loaded in MySQL
            }
        } catch (PDOException $e) {
            // If local/custom fails, try local fallback
            if ($activeEnv !== 'local') {
                $local = $dbConfig['connections']['local'];
                $dsnFallback = sprintf(
                    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                    $local['host'],
                    $local['port'],
                    $local['database']
                );
                try {
                    self::$instance = new PDO($dsnFallback, $local['username'], $local['password'], $local['options']);
                    return self::$instance;
                } catch (PDOException $e2) {
                    throw new PDOException("Database connection error: " . $e->getMessage() . " | Fallback: " . $e2->getMessage());
                }
            }
            throw new PDOException("Database connection error: " . $e->getMessage());
        }

        return self::$instance;
    }

    public static function getActiveConfig(): array {
        return self::$config;
    }

    public static function setCustomConfig(array $custom): void {
        $overrideFile = __DIR__ . '/../../storage/security/custom_db.json';
        file_put_contents($overrideFile, json_encode($custom, JSON_PRETTY_PRINT));
        self::$instance = null; // force reconnect on next call
    }
}
