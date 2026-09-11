<?php
// Dual Environment Database Configuration (Local vs Production)
// Automatically detects cPanel / Sandslab cloud environment

$isCloud = (getenv('APP_ENV') === 'production') || 
    (isset($_SERVER['HTTP_HOST']) && (strpos($_SERVER['HTTP_HOST'], 'sandslab.com') !== false || strpos($_SERVER['HTTP_HOST'], 'parking') !== false)) ||
    (isset($_SERVER['SERVER_NAME']) && (strpos($_SERVER['SERVER_NAME'], 'sandslab.com') !== false || strpos($_SERVER['SERVER_NAME'], 'parking') !== false));

return [
    'default' => $isCloud ? 'production' : (getenv('APP_ENV') ?: 'local'),
    
    'connections' => [
        'local' => [
            'driver'    => 'mysql',
            'host'      => getenv('DB_HOST') ?: '127.0.0.1',
            'port'      => (int)(getenv('DB_PORT') ?: 3306),
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
            'host'      => getenv('DB_HOST') ?: 'localhost',
            'port'      => (int)(getenv('DB_PORT') ?: 3306),
            'database'  => getenv('DB_DATABASE') ?: 'sandsl23_parking_db',
            'username'  => getenv('DB_USERNAME') ?: 'sandsl23_parking_users',
            'password'  => getenv('DB_PASSWORD') ?: 'S@nds1@b',
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

