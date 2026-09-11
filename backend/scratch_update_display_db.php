<?php
require_once __DIR__ . '/app/Core/Database.php';
$db = \App\Core\Database::getInstance();

function addColIfNotExists($db, $table, $col, $def) {
    $stmt = $db->query("SHOW COLUMNS FROM `{$table}` LIKE '{$col}'");
    if ($stmt->rowCount() == 0) {
        $db->query("ALTER TABLE `{$table}` ADD COLUMN `{$col}` {$def}");
        echo "Added {$col} to {$table}\n";
    } else {
        echo "Column {$col} already exists in {$table}\n";
    }
}

addColIfNotExists($db, 'gates_and_cameras', 'display_unit_ip', 'VARCHAR(50) DEFAULT "192.168.8.51" AFTER rtsp_url');
addColIfNotExists($db, 'gates_and_cameras', 'display_unit_port', 'INT DEFAULT 5173 AFTER display_unit_ip');

$db->query("UPDATE gates_and_cameras SET display_unit_ip = '192.168.8.11', display_unit_port = 5173 WHERE gate_code = 'GATE-OUT-01'");
$db->query("UPDATE gates_and_cameras SET display_unit_ip = '192.168.8.11', display_unit_port = 5173 WHERE gate_code = 'GATE-OUT-02'");

echo "All Display Unit columns verified and updated!\n";
