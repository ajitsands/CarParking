<?php
// Dual Environment Database Configuration (Local vs Production)
// Can be switched and reconfigured by Superadmin via UI or Environment variables

return [
    'default' => getenv('APP_ENV') ?: 'local',
    
    'connections' => [
        'local' => [
            'driver'    => 'mysql',
            'host'      => getenv('DB_HOST') ?: '127.0.0.1',
            'port'      => getenv('DB_PORT') ?: 3306,
            'database'  => getenv('DB_DATABASE') ?: 'car_parking_solution',
            'username'  => getenv('DB_USERNAME') ?: 'root',
            'password'  => getenv('DB_PASSWORD') ?: 'S@nds1@b',
            'charset'   => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'options'   => [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ],
        ],

        'production' => [
            'driver'    => 'mysql',
            'host'      => 'parking.sandslab.com',
            'port'      => 3306,
            'database'  => 'sandsl23_parking_db',
            'username'  => 'sandsl23_parking_users',
            'password'  => 'S@nds1@b',
            'charset'   => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'options'   => [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ],
        ]
    ]
];
