<?php
// api/organizations.php - CRUD for organizations in MySQL
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = getDB();

try {
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            if ($id) {
                $stmt = $db->prepare("SELECT * FROM `organizations` WHERE `id` = ?");
                $stmt->execute([$id]);
                $org = $stmt->fetch();
                if ($org) {
                    jsonResponse($org);
                } else {
                    jsonError('Organization not found', 404);
                }
            } else {
                $stmt = $db->prepare("SELECT * FROM `organizations` ORDER BY `name` ASC");
                $stmt->execute();
                $orgs = $stmt->fetchAll();
                jsonResponse($orgs);
            }
            break;

        case 'POST':
            $data = getRequestBody();
            if (empty($data['id']) || empty($data['name'])) {
                jsonError('Organization ID and name are required', 400);
            }

            $stmt = $db->prepare("
                INSERT INTO `organizations` (`id`, `name`, `leaderId`, `description`)
                VALUES (:id, :name, :leaderId, :description)
                ON DUPLICATE KEY UPDATE
                    `name` = VALUES(`name`),
                    `leaderId` = VALUES(`leaderId`),
                    `description` = VALUES(`description`)
            ");

            $stmt->execute([
                ':id' => $data['id'],
                ':name' => $data['name'] ?? '',
                ':leaderId' => $data['leaderId'] ?? '',
                ':description' => $data['description'] ?? '',
            ]);

            jsonResponse($data, 201);
            break;

        case 'PUT':
            $data = getRequestBody();
            if (empty($data['id'])) {
                jsonError('Organization ID is required for update', 400);
            }

            $stmt = $db->prepare("
                UPDATE `organizations` SET
                    `name` = :name,
                    `leaderId` = :leaderId,
                    `description` = :description
                WHERE `id` = :id
            ");

            $stmt->execute([
                ':id' => $data['id'],
                ':name' => $data['name'] ?? '',
                ':leaderId' => $data['leaderId'] ?? '',
                ':description' => $data['description'] ?? '',
            ]);

            jsonResponse($data);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                $body = getRequestBody();
                $id = $body['id'] ?? null;
            }

            if (!$id) {
                jsonError('Organization ID is required for delete', 400);
            }

            $stmt = $db->prepare("DELETE FROM `organizations` WHERE `id` = ?");
            $stmt->execute([$id]);
            jsonResponse(['success' => true]);
            break;

        default:
            jsonError('Method not supported', 405);
    }
} catch (Exception $e) {
    jsonError('Organizations API Error: ' . $e->getMessage(), 500);
}
