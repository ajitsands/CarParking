<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;

class ServerConfigController extends Controller {
    public function getConfig(): void {
        $db = Database::getInstance();
        $stmt = $db->query("SELECT * FROM server_configs ORDER BY id ASC LIMIT 1");
        $config = $stmt->fetch();

        if (!$config) {
            $config = [
                'environment'            => 'local',
                'server_url'             => 'http://localhost:8000',
                'db_host'                => '127.0.0.1',
                'db_port'                => 3306,
                'db_name'                => 'car_parking_solution',
                'db_user'                => 'root',
                'db_password'            => 'S@nds1@b',
                'production_server_url'  => 'https://parking.sandslab.com',
                'production_db_host'     => 'parking.sandslab.com',
                'production_db_port'     => 3306,
                'production_db_name'     => 'sandsl23_parking_db',
                'production_db_user'     => 'sandsl23_parking_users',
                'production_db_password' => 'S@nds1@b'
            ];
        }

        // Mask password for security preview
        $masked = $config;
        $masked['db_password_masked'] = '••••••••';
        $masked['production_db_password_masked'] = '••••••••';

        $this->success(['config' => $masked]);
    }

    public function updateConfig(): void {
        $input = $this->getJsonInput();
        $db = Database::getInstance();

        $stmt = $db->prepare("UPDATE server_configs SET 
            environment = ?, 
            server_url = ?, 
            db_host = ?, 
            db_port = ?, 
            db_name = ?, 
            db_user = ?, 
            db_password = ?,
            production_server_url = ?,
            production_db_host = ?,
            production_db_port = ?,
            production_db_name = ?,
            production_db_user = ?,
            production_db_password = ?,
            updated_at = NOW()
            WHERE id = 1");

        $env = $input['environment'] ?? 'local';
        $serverUrl = $input['server_url'] ?? 'http://localhost:8000';
        $dbHost = $input['db_host'] ?? '127.0.0.1';
        $dbPort = (int)($input['db_port'] ?? 3306);
        $dbName = $input['db_name'] ?? 'car_parking_solution';
        $dbUser = $input['db_user'] ?? 'root';
        $dbPass = !empty($input['db_password']) ? $input['db_password'] : 'S@nds1@b';

        $prodUrl = $input['production_server_url'] ?? 'https://parking.sandslab.com';
        $prodHost = $input['production_db_host'] ?? 'parking.sandslab.com';
        $prodPort = (int)($input['production_db_port'] ?? 3306);
        $prodName = $input['production_db_name'] ?? 'sandsl23_parking_db';
        $prodUser = $input['production_db_user'] ?? 'sandsl23_parking_users';
        $prodPass = !empty($input['production_db_password']) ? $input['production_db_password'] : 'S@nds1@b';

        $stmt->execute([
            $env, $serverUrl, $dbHost, $dbPort, $dbName, $dbUser, $dbPass,
            $prodUrl, $prodHost, $prodPort, $prodName, $prodUser, $prodPass
        ]);

        // If in custom or dynamic mode, update local override file
        if ($env === 'custom' || $env === 'production') {
            Database::setCustomConfig([
                'host'     => ($env === 'production') ? $prodHost : $dbHost,
                'port'     => ($env === 'production') ? $prodPort : $dbPort,
                'database' => ($env === 'production') ? $prodName : $dbName,
                'username' => ($env === 'production') ? $prodUser : $dbUser,
                'password' => ($env === 'production') ? $prodPass : $dbPass,
            ]);
        }

        $this->success([], 'Server and Database configuration updated successfully by Superadmin');
    }
}
