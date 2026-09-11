<?php
// Polyfills for PHP 7.4 compatibility
if (!function_exists('str_contains')) {
    function str_contains(string $haystack, string $needle): bool {
        return $needle === '' || strpos($haystack, $needle) !== false;
    }
}
if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool {
        return strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with(string $haystack, string $needle): bool {
        return $needle === '' || substr($haystack, -strlen($needle)) === $needle;
    }
}

// Dual Environment Database Configuration (Local vs Production)
$cwd = __DIR__ . ' ' . (getcwd() ?: '');
$httpHost = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$user = getenv('USER') ?: (function_exists('get_current_user') ? get_current_user() : '');

$isCloud = (getenv('APP_ENV') === 'production') || 
    (strpos($httpHost, 'sandslab.com') !== false || strpos($httpHost, 'parking') !== false) ||
    (strpos($cwd, 'sandsl23') !== false || strpos($cwd, 'sandslab') !== false || strpos($cwd, 'parking') !== false) ||
    ($user === 'sandsl23');

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

