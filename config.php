<?php
// api/config.php - Central database configuration and CORS handling

// Enable error logging while hiding HTML notices in output
error_reporting(E_ALL);
ini_set('display_errors', '0');

// Handle Cross-Origin Resource Sharing (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration supporting both local XAMPP and Cloud hosting (Render, TiDB, Aiven, Railway, etc.)
$DB_HOST = getenv('DB_HOST') ?: '127.0.0.1';
$DB_PORT = getenv('DB_PORT') ?: '3306';
$DB_NAME = getenv('DB_NAME') ?: 'fafb_db';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASS = getenv('DB_PASS') !== false ? getenv('DB_PASS') : (getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : '');

// Support complete connection strings like DATABASE_URL (e.g., mysql://user:pass@host:port/dbname)
if ($dbUrl = getenv('DATABASE_URL')) {
    $parsed = parse_url($dbUrl);
    if ($parsed) {
        if (!empty($parsed['host'])) $DB_HOST = $parsed['host'];
        if (!empty($parsed['port'])) $DB_PORT = (string)$parsed['port'];
        if (!empty($parsed['user'])) $DB_USER = $parsed['user'];
        if (isset($parsed['pass']))  $DB_PASS = $parsed['pass'];
        if (!empty($parsed['path'])) $DB_NAME = ltrim($parsed['path'], '/');
    }
}

function getDB() {
    global $DB_HOST, $DB_PORT, $DB_NAME, $DB_USER, $DB_PASS;
    static $pdo = null;

    if ($pdo === null) {
        $dsn = "mysql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_NAME};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        // SSL options for cloud MySQL providers (e.g., TiDB Cloud, Aiven)
        if (getenv('MYSQL_ATTR_SSL_CA')) {
            $options[PDO::MYSQL_ATTR_SSL_CA] = getenv('MYSQL_ATTR_SSL_CA');
        } elseif (getenv('DB_SSL') === 'true' || getenv('MYSQL_SSL') === 'true') {
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
        }

        try {
            $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
        } catch (PDOException $e) {
            // If local development (127.0.0.1/localhost) and database does not exist, attempt auto-create
            if ($DB_HOST === '127.0.0.1' || $DB_HOST === 'localhost') {
                try {
                    $rootPdo = new PDO("mysql:host={$DB_HOST};port={$DB_PORT};charset=utf8mb4", $DB_USER, $DB_PASS);
                    $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `{$DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
                } catch (Exception $ex) {
                    jsonError("Database connection failed: " . $e->getMessage(), 500);
                    exit();
                }
            } else {
                jsonError("Database connection failed: " . $e->getMessage(), 500);
                exit();
            }
        }
    }
    return $pdo;
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

function jsonError($message, $statusCode = 400) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

function getRequestBody() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
