<?php
// ============================================================
//  Barangay Tugtug E-System — Login Backend
//  File: php/login.php
//  Updated DB name to match db-barangay-system schema.
// ============================================================

header("Content-Type: application/json");
header("X-Content-Type-Options: nosniff");

ini_set("display_errors", 0);
ini_set("log_errors",     1);
error_reporting(E_ALL);

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit;
}

$body = file_get_contents("php://input");
$data = json_decode($body, true);

if (!isset($data["email"], $data["password"])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing email or password."]);
    exit;
}

$email    = trim($data["email"]);
$password = $data["password"];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "Invalid email format."]);
    exit;
}
if (strlen($password) < 1) {
    echo json_encode(["success" => false, "message" => "Password cannot be empty."]);
    exit;
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
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    error_log("DB Connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection error. Please contact the administrator."]);
    exit;
}

try {
    $stmt = $pdo->prepare(
        "SELECT id, email, password_hash, role, is_active
         FROM   users
         WHERE  email = :email
         LIMIT  1"
    );
    $stmt->execute([":email" => $email]);
    $user = $stmt->fetch();

} catch (PDOException $e) {
    error_log("Query error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error. Please try again."]);
    exit;
}

$genericError = ["success" => false, "message" => "Invalid email or password."];

if (!$user) {
    echo json_encode($genericError);
    exit;
}

if (!$user["is_active"]) {
    echo json_encode(["success" => false, "message" => "Your account is inactive. Please contact the Barangay administrator."]);
    exit;
}

if (!password_verify($password, $user["password_hash"])) {
    echo json_encode($genericError);
    exit;
}

session_start();
session_regenerate_id(true);

$_SESSION["user_id"]    = $user["id"];
$_SESSION["user_email"] = $user["email"];
$_SESSION["user_role"]  = $user["role"];
$_SESSION["logged_in"]  = true;

echo json_encode([
    "success" => true,
    "message" => "Login successful.",
    "role"    => $user["role"],
]);
exit;
?>