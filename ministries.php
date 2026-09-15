<?php
// api/ministries.php - CRUD for ministries in MySQL
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = getDB();

function formatMinistry($m) {
    if (!$m) return null;
    $participants = [];
    if (!empty($m['participants'])) {
        $decoded = json_decode($m['participants'], true);
        $participants = is_array($decoded) ? $decoded : explode(',', $m['participants']);
    }
    $m['participantIds'] = $participants;
    return $m;
}

try {
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            if ($id) {
                $stmt = $db->prepare("SELECT * FROM `ministries` WHERE `id` = ?");
                $stmt->execute([$id]);
                $min = $stmt->fetch();
                if ($min) {
                    jsonResponse(formatMinistry($min));
                } else {
                    jsonError('Ministry activity not found', 404);
                }
            } else {
                $stmt = $db->prepare("SELECT * FROM `ministries` ORDER BY `datetime` ASC");
                $stmt->execute();
                $mins = $stmt->fetchAll();
                $formatted = array_map('formatMinistry', $mins);
                jsonResponse($formatted);
            }
            break;

        case 'POST':
            $data = getRequestBody();
            if (empty($data['id']) || empty($data['name'])) {
                jsonError('Ministry ID and name are required', 400);
            }

            $participants = $data['participantIds'] ?? $data['participants'] ?? [];
            if (is_array($participants)) {
                $participantsJson = json_encode($participants);
            } else {
                $participantsJson = json_encode([$participants]);
            }

            $stmt = $db->prepare("
                INSERT INTO `ministries` (`id`, `name`, `datetime`, `description`, `participants`)
                VALUES (:id, :name, :datetime, :description, :participants)
                ON DUPLICATE KEY UPDATE
                    `name` = VALUES(`name`),
                    `datetime` = VALUES(`datetime`),
                    `description` = VALUES(`description`),
                    `participants` = VALUES(`participants`)
            ");

            $stmt->execute([
                ':id' => $data['id'],
                ':name' => $data['name'] ?? '',
                ':datetime' => $data['datetime'] ?? '',
                ':description' => $data['description'] ?? '',
                ':participants' => $participantsJson,
            ]);

            $data['participantIds'] = is_array($participants) ? $participants : [];
            jsonResponse($data, 201);
            break;

        case 'PUT':
            $data = getRequestBody();
            if (empty($data['id'])) {
                jsonError('Ministry ID is required for update', 400);
            }

            $participants = $data['participantIds'] ?? $data['participants'] ?? [];
            if (is_array($participants)) {
                $participantsJson = json_encode($participants);
            } else {
                $participantsJson = json_encode([$participants]);
            }

            $stmt = $db->prepare("
                UPDATE `ministries` SET
                    `name` = :name,
                    `datetime` = :datetime,
                    `description` = :description,
                    `participants` = :participants
                WHERE `id` = :id
            ");

            $stmt->execute([
                ':id' => $data['id'],
                ':name' => $data['name'] ?? '',
                ':datetime' => $data['datetime'] ?? '',
                ':description' => $data['description'] ?? '',
                ':participants' => $participantsJson,
            ]);

            $data['participantIds'] = is_array($participants) ? $participants : [];
            jsonResponse($data);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                $body = getRequestBody();
                $id = $body['id'] ?? null;
            }

            if (!$id) {
                jsonError('Ministry ID is required for delete', 400);
            }

            $stmt = $db->prepare("DELETE FROM `ministries` WHERE `id` = ?");
            $stmt->execute([$id]);
            jsonResponse(['success' => true]);
            break;

        default:
            jsonError('Method not supported', 405);
    }
} catch (Exception $e) {
    jsonError('Ministries API Error: ' . $e->getMessage(), 500);
}
