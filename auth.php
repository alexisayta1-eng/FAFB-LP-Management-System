<?php
// api/auth.php - Handles user authentication against MySQL
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getRequestBody();
$username = trim($body['username'] ?? '');
$password = trim($body['password'] ?? '');

if (empty($username) || empty($password)) {
    jsonError('Username and password are required', 400);
}

try {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM `users` WHERE `username` = ? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError('Invalid credentials', 401);
    }

    // Support both plain text match (for initial default seeds) and password_verify
    $isValid = ($password === $user['password']) || password_verify($password, $user['password']);

    if (!$isValid) {
        jsonError('Invalid credentials', 401);
    }

    jsonResponse([
        'success' => true,
        'username' => $user['username'],
        'role' => $user['role']
    ]);
} catch (Exception $e) {
    jsonError('Authentication error: ' . $e->getMessage(), 500);
}
