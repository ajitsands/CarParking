<?php
require_once __DIR__ . '/../app/Core/Database.php';

function testGetLogs($direction, $startDate, $endDate) {
    $db = \App\Core\Database::getInstance('local');
    $where = [];
    $params = [];

    if ($direction === 'ENTRY' || $direction === 'EXIT') {
        $where[] = "b.direction = ?";
        $params[] = $direction;
    }

    if ($startDate) {
        $where[] = "b.created_at >= ?";
        $params[] = $startDate . (strlen($startDate) === 10 ? ' 00:00:00' : '');
    }

    if ($endDate) {
        $where[] = "b.created_at <= ?";
        $params[] = $endDate . (strlen($endDate) === 10 ? ' 23:59:59' : '');
    }

    $whereSql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("SELECT b.*, u.full_name as operator_name 
        FROM barrier_logs b 
        LEFT JOIN users u ON b.operator_id = u.id 
        {$whereSql}
        ORDER BY b.id DESC LIMIT 500");
    $stmt->execute($params);
    $logs = $stmt->fetchAll();
    echo "Query [dir={$direction}, start={$startDate}, end={$endDate}] -> Returned: " . count($logs) . " rows\n";
    foreach ($logs as $l) {
        echo "  - ID {$l['id']} | {$l['created_at']} | {$l['direction']} | {$l['plate_number']} | {$l['trigger_type']}\n";
    }
}

echo "=== TEST 1: direction=ENTRY, today=2026-09-11 ===\n";
testGetLogs('ENTRY', '2026-09-11', '2026-09-11');

echo "\n=== TEST 2: direction=ALL, today=2026-09-11 ===\n";
testGetLogs('ALL', '2026-09-11', '2026-09-11');
