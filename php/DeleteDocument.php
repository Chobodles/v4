<?php
// ============================================================
//  Barangay Tugtug E-System — Delete Document Request
//  File: php/DeleteDocument.php
// ============================================================

header("Content-Type: application/json");
header("X-Content-Type-Options: nosniff");
ini_set("display_errors", 0);
ini_set("log_errors", 1);
error_reporting(E_ALL);

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit();
}

define("DB_HOST",    "localhost");
define("DB_NAME",    "db-barangay-system");
define("DB_USER",    "root");
define("DB_PASS",    "");
define("DB_CHARSET", "utf8mb4");

$dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => true,
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    error_log("DB Connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection error."]);
    exit();
}

$body = file_get_contents("php://input");
$data = json_decode($body, true);

if (!isset($data["request_ID"]) || !is_numeric($data["request_ID"])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing or invalid request_ID."]);
    exit();
}

$requestId = (int) $data["request_ID"];

try {
    // Fetch the image path first so we can optionally delete the file
    $fetchStmt = $pdo->prepare("SELECT id_image_path FROM document_request WHERE request_ID = :id LIMIT 1");
    $fetchStmt->execute([":id" => $requestId]);
    $row = $fetchStmt->fetch();

    if (!$row) {
        echo json_encode(["success" => false, "message" => "Record not found."]);
        exit();
    }

    // Delete the database row
    $delStmt = $pdo->prepare("DELETE FROM document_request WHERE request_ID = :id");
    $delStmt->execute([":id" => $requestId]);

    if ($delStmt->rowCount() === 0) {
        echo json_encode(["success" => false, "message" => "No record was deleted."]);
        exit();
    }

    // Optionally remove the uploaded image file from disk
    if (!empty($row["id_image_path"])) {
        // id_image_path is stored relative to the project root (e.g. "uploads/ids/ID_...")
        $filePath = dirname(__DIR__) . "/" . ltrim($row["id_image_path"], "/");
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
    }

    echo json_encode([
        "success" => true,
        "message" => "Document request deleted successfully.",
    ]);

} catch (PDOException $e) {
    error_log("Delete document error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Failed to delete record."]);
}
exit();
?>
