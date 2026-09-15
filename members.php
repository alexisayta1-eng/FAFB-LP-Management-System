<?php
// api/members.php - CRUD for members in MySQL
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = getDB();

try {
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            if ($id) {
                $stmt = $db->prepare("SELECT * FROM `members` WHERE `id` = ?");
                $stmt->execute([$id]);
                $member = $stmt->fetch();
                if ($member) {
                    jsonResponse($member);
                } else {
                    jsonError('Member not found', 404);
                }
            } else {
                $stmt = $db->prepare("SELECT * FROM `members` ORDER BY `name` ASC");
                $stmt->execute();
                $members = $stmt->fetchAll();
                jsonResponse($members);
            }
            break;

        case 'POST':
            $data = getRequestBody();
            if (empty($data['id']) || empty($data['name'])) {
                jsonError('Member ID and name are required', 400);
            }

            $stmt = $db->prepare("
                INSERT INTO `members` (`id`, `name`, `profileImage`, `family`, `birthdate`, `contact`, `address`, `organizationId`)
                VALUES (:id, :name, :profileImage, :family, :birthdate, :contact, :address, :organizationId)
                ON DUPLICATE KEY UPDATE
                    `name` = VALUES(`name`),
                    `profileImage` = VALUES(`profileImage`),
                    `family` = VALUES(`family`),
                    `birthdate` = VALUES(`birthdate`),
                    `contact` = VALUES(`contact`),
                    `address` = VALUES(`address`),
                    `organizationId` = VALUES(`organizationId`)
            ");

            $stmt->execute([
                ':id' => $data['id'],
                ':name' => $data['name'] ?? '',
                ':profileImage' => $data['profileImage'] ?? null,
                ':family' => $data['family'] ?? '',
                ':birthdate' => $data['birthdate'] ?? '',
                ':contact' => $data['contact'] ?? '',
                ':address' => $data['address'] ?? '',
                ':organizationId' => $data['organizationId'] ?? '',
            ]);

            jsonResponse($data, 201);
            break;

        case 'PUT':
            $data = getRequestBody();
            if (empty($data['id'])) {
                jsonError('Member ID is required for update', 400);
            }

            $stmt = $db->prepare("
                UPDATE `members` SET
                    `name` = :name,
                    `profileImage` = :profileImage,
                    `family` = :family,
                    `birthdate` = :birthdate,
                    `contact` = :contact,
                    `address` = :address,
                    `organizationId` = :organizationId
                WHERE `id` = :id
            ");

            $stmt->execute([
                ':id' => $data['id'],
                ':name' => $data['name'] ?? '',
                ':profileImage' => $data['profileImage'] ?? null,
                ':family' => $data['family'] ?? '',
                ':birthdate' => $data['birthdate'] ?? '',
                ':contact' => $data['contact'] ?? '',
                ':address' => $data['address'] ?? '',
                ':organizationId' => $data['organizationId'] ?? '',
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
                jsonError('Member ID is required for delete', 400);
            }

            $stmt = $db->prepare("DELETE FROM `members` WHERE `id` = ?");
            $stmt->execute([$id]);
            jsonResponse(['success' => true]);
            break;

        default:
            jsonError('Method not supported', 405);
    }
} catch (Exception $e) {
    jsonError('Members API Error: ' . $e->getMessage(), 500);
}
