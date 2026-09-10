<?php
namespace App\Core;

use PDO;

abstract class Model {
    protected static string $table = '';
    protected static string $primaryKey = 'id';

    public static function db(): PDO {
        return Database::getInstance();
    }

    public static function all(string $orderBy = 'id DESC'): array {
        $stmt = self::db()->query("SELECT * FROM " . static::$table . " ORDER BY " . $orderBy);
        return $stmt->fetchAll();
    }

    public static function find($id): ?array {
        $stmt = self::db()->prepare("SELECT * FROM " . static::$table . " WHERE " . static::$primaryKey . " = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findBy(string $field, $value): ?array {
        $stmt = self::db()->prepare("SELECT * FROM " . static::$table . " WHERE {$field} = ? LIMIT 1");
        $stmt->execute([$value]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function where(string $condition, array $params = [], string $orderBy = 'id DESC', ?int $limit = null): array {
        $sql = "SELECT * FROM " . static::$table . " WHERE " . $condition . " ORDER BY " . $orderBy;
        if ($limit !== null) {
            $sql .= " LIMIT " . (int)$limit;
        }
        $stmt = self::db()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function create(array $data): int {
        $keys = array_keys($data);
        $fields = implode(', ', array_map(fn($k) => "`$k`", $keys));
        $placeholders = implode(', ', array_fill(0, count($keys), '?'));

        $sql = "INSERT INTO " . static::$table . " ({$fields}) VALUES ({$placeholders})";
        $stmt = self::db()->prepare($sql);
        $stmt->execute(array_values($data));
        return (int)self::db()->lastInsertId();
    }

    public static function update($id, array $data): bool {
        $setClauses = [];
        $values = [];
        foreach ($data as $k => $v) {
            $setClauses[] = "`$k` = ?";
            $values[] = $v;
        }
        $values[] = $id;

        $sql = "UPDATE " . static::$table . " SET " . implode(', ', $setClauses) . " WHERE " . static::$primaryKey . " = ?";
        $stmt = self::db()->prepare($sql);
        return $stmt->execute($values);
    }

    public static function delete($id): bool {
        $stmt = self::db()->prepare("DELETE FROM " . static::$table . " WHERE " . static::$primaryKey . " = ?");
        return $stmt->execute([$id]);
    }

    public static function count(string $condition = '1=1', array $params = []): int {
        $stmt = self::db()->prepare("SELECT COUNT(*) FROM " . static::$table . " WHERE " . $condition);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }
}
