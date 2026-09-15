<?php
// api/pledges.php - CRUD for pledges, hospitalizations, weddings, and event payments in MySQL
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = getDB();

function formatPledge($p) {
    if (!$p) return null;
    if (isset($p['amount'])) {
        $p['amount'] = (float)$p['amount'];
    }
    if (isset($p['pledgeAmount'])) {
        $p['pledgeAmount'] = (float)$p['pledgeAmount'];
    }
    if (isset($p['paidAmount'])) {
        $p['paidAmount'] = (float)$p['paidAmount'];
    }
    return $p;
}

// Auto-migrate column if not exists
try {
    $colCheck = $db->query("SHOW COLUMNS FROM `pledges` LIKE 'paidAmount'");
    if ($colCheck && $colCheck->rowCount() === 0) {
        $db->exec("ALTER TABLE `pledges` ADD COLUMN `paidAmount` DECIMAL(12, 2) DEFAULT 0.00 AFTER `pledgeAmount`");
    }
} catch (Exception $e) {
    // Ignore migration error if permissions or already exists
}

try {
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            $type = $_GET['type'] ?? null;
            $eventId = $_GET['eventId'] ?? null;

            if ($id) {
                $stmt = $db->prepare("SELECT * FROM `pledges` WHERE `id` = ?");
                $stmt->execute([$id]);
                $pledge = $stmt->fetch();
                if ($pledge) {
                    jsonResponse(formatPledge($pledge));
                } else {
                    jsonError('Pledge not found', 404);
                }
            } else if ($eventId) {
                $stmt = $db->prepare("SELECT * FROM `pledges` WHERE `eventId` = ? ORDER BY `family` ASC");
                $stmt->execute([$eventId]);
                $pledges = $stmt->fetchAll();
                jsonResponse(array_map('formatPledge', $pledges));
            } else if ($type) {
                $stmt = $db->prepare("SELECT * FROM `pledges` WHERE `type` = ? ORDER BY `created_at` DESC");
                $stmt->execute([$type]);
                $pledges = $stmt->fetchAll();
                jsonResponse(array_map('formatPledge', $pledges));
            } else {
                $stmt = $db->prepare("SELECT * FROM `pledges` ORDER BY `created_at` DESC");
                $stmt->execute();
                $pledges = $stmt->fetchAll();
                jsonResponse(array_map('formatPledge', $pledges));
            }
            break;

        case 'POST':
            $data = getRequestBody();
            if (empty($data['id']) || empty($data['type'])) {
                jsonError('Pledge ID and type are required', 400);
            }

            $stmt = $db->prepare("
                INSERT INTO `pledges` (
                    `id`, `type`, `family`, `memberId`, `eventId`,
                    `amount`, `pledgeAmount`, `paidAmount`, `status`, `pledgeStatus`, `notes`,
                    `thanksgivingDate`, `hospitalName`, `admissionDate`, `dischargeDate`,
                    `groomName`, `brideName`, `weddingDate`
                ) VALUES (
                    :id, :type, :family, :memberId, :eventId,
                    :amount, :pledgeAmount, :paidAmount, :status, :pledgeStatus, :notes,
                    :thanksgivingDate, :hospitalName, :admissionDate, :dischargeDate,
                    :groomName, :brideName, :weddingDate
                ) ON DUPLICATE KEY UPDATE
                    `type` = VALUES(`type`),
                    `family` = VALUES(`family`),
                    `memberId` = VALUES(`memberId`),
                    `eventId` = VALUES(`eventId`),
                    `amount` = VALUES(`amount`),
                    `pledgeAmount` = VALUES(`pledgeAmount`),
                    `paidAmount` = VALUES(`paidAmount`),
                    `status` = VALUES(`status`),
                    `pledgeStatus` = VALUES(`pledgeStatus`),
                    `notes` = VALUES(`notes`),
                    `thanksgivingDate` = VALUES(`thanksgivingDate`),
                    `hospitalName` = VALUES(`hospitalName`),
                    `admissionDate` = VALUES(`admissionDate`),
                    `dischargeDate` = VALUES(`dischargeDate`),
                    `groomName` = VALUES(`groomName`),
                    `brideName` = VALUES(`brideName`),
                    `weddingDate` = VALUES(`weddingDate`)
            ");

            $stmt->execute([
                ':id' => $data['id'],
                ':type' => $data['type'],
                ':family' => $data['family'] ?? null,
                ':memberId' => $data['memberId'] ?? null,
                ':eventId' => $data['eventId'] ?? null,
                ':amount' => isset($data['amount']) ? (float)$data['amount'] : 0,
                ':pledgeAmount' => isset($data['pledgeAmount']) ? (float)$data['pledgeAmount'] : 0,
                ':paidAmount' => isset($data['paidAmount']) ? (float)$data['paidAmount'] : 0,
                ':status' => $data['status'] ?? null,
                ':pledgeStatus' => $data['pledgeStatus'] ?? null,
                ':notes' => $data['notes'] ?? null,
                ':thanksgivingDate' => $data['thanksgivingDate'] ?? null,
                ':hospitalName' => $data['hospitalName'] ?? null,
                ':admissionDate' => $data['admissionDate'] ?? null,
                ':dischargeDate' => $data['dischargeDate'] ?? null,
                ':groomName' => $data['groomName'] ?? null,
                ':brideName' => $data['brideName'] ?? null,
                ':weddingDate' => $data['weddingDate'] ?? null,
            ]);

            jsonResponse(formatPledge($data), 201);
            break;

        case 'PUT':
            $data = getRequestBody();
            if (empty($data['id'])) {
                jsonError('Pledge ID is required for update', 400);
            }

            $stmt = $db->prepare("
                UPDATE `pledges` SET
                    `type` = :type,
                    `family` = :family,
                    `memberId` = :memberId,
                    `eventId` = :eventId,
                    `amount` = :amount,
                    `pledgeAmount` = :pledgeAmount,
                    `paidAmount` = :paidAmount,
                    `status` = :status,
                    `pledgeStatus` = :pledgeStatus,
                    `notes` = :notes,
                    `thanksgivingDate` = :thanksgivingDate,
                    `hospitalName` = :hospitalName,
                    `admissionDate` = :admissionDate,
                    `dischargeDate` = :dischargeDate,
                    `groomName` = :groomName,
                    `brideName` = :brideName,
                    `weddingDate` = :weddingDate
                WHERE `id` = :id
            ");

            $stmt->execute([
                ':id' => $data['id'],
                ':type' => $data['type'] ?? 'thanksgiving',
                ':family' => $data['family'] ?? null,
                ':memberId' => $data['memberId'] ?? null,
                ':eventId' => $data['eventId'] ?? null,
                ':amount' => isset($data['amount']) ? (float)$data['amount'] : 0,
                ':pledgeAmount' => isset($data['pledgeAmount']) ? (float)$data['pledgeAmount'] : 0,
                ':paidAmount' => isset($data['paidAmount']) ? (float)$data['paidAmount'] : 0,
                ':status' => $data['status'] ?? null,
                ':pledgeStatus' => $data['pledgeStatus'] ?? null,
                ':notes' => $data['notes'] ?? null,
                ':thanksgivingDate' => $data['thanksgivingDate'] ?? null,
                ':hospitalName' => $data['hospitalName'] ?? null,
                ':admissionDate' => $data['admissionDate'] ?? null,
                ':dischargeDate' => $data['dischargeDate'] ?? null,
                ':groomName' => $data['groomName'] ?? null,
                ':brideName' => $data['brideName'] ?? null,
                ':weddingDate' => $data['weddingDate'] ?? null,
            ]);

            jsonResponse(formatPledge($data));
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                $body = getRequestBody();
                $id = $body['id'] ?? null;
            }

            if (!$id) {
                jsonError('Pledge ID is required for delete', 400);
            }

            $stmt = $db->prepare("DELETE FROM `pledges` WHERE `id` = ?");
            $stmt->execute([$id]);
            jsonResponse(['success' => true]);
            break;

        default:
            jsonError('Method not supported', 405);
    }
} catch (Exception $e) {
    jsonError('Pledges API Error: ' . $e->getMessage(), 500);
}
