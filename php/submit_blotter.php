<?php
// ============================================================
//  Barangay Tugtug E-System — Submit Blotter Report
//  File: php/submit_blotter.php
//  Updated to match db-barangay-system schema (no blotter_details,
//  no blotter_reference_number; uses separate name columns)
// ============================================================
header("Content-Type: application/json");
ini_set("display_errors", 0);
ini_set("log_errors", 1);
error_reporting(E_ALL);

define("DB_HOST",    "localhost");
define("DB_NAME",    "db-barangay-system");
define("DB_USER",    "root");
define("DB_PASS",    "");
define("DB_CHARSET", "utf8mb4");

$dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
$opt = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => true,
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $opt);
} catch (PDOException $e) {
    error_log("DB error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Database connection error."]);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit();
}

$body = file_get_contents("php://input");
$data = json_decode($body, true);

if (!$data) {
    echo json_encode(["success" => false, "message" => "Invalid JSON data received."]);
    exit();
}

// ── Generate unique reference number ─────────────────────────
// New schema uses reference_number directly on blotter table;
// no separate blotter_reference_number table exists.
$year    = date("Y");
$ref_num = "";
do {
    $random  = str_pad(mt_rand(10000, 99999), 5, "0", STR_PAD_LEFT);
    $ref_num = "BRGY-" . $year . "-" . $random;
    $check   = $pdo->prepare(
        "SELECT COUNT(*) FROM blotter WHERE reference_number = :ref"
    );
    $check->execute([":ref" => $ref_num]);
    $exists = $check->fetchColumn();
} while ($exists > 0);

try {
    $stmt = $pdo->prepare(
        "INSERT INTO blotter
            (reference_number, first_name, middle_name, last_name, suffix,
             age, civil_status, address, occupation,
             petsa, oras, complaint_against, complaint_type, complaint_details,
             status, submitted_at)
         VALUES
            (:ref, :first_name, :middle_name, :last_name, :suffix,
             :age, :civil, :address, :occupation,
             :petsa, :oras, :against, :type, :details,
             'Pending', NOW())"
    );
    $stmt->execute([
        ":ref"         => $ref_num,
        ":first_name"  => trim($data["first_name"]       ?? ""),
        ":middle_name" => trim($data["middle_name"]      ?? "") ?: null,
        ":last_name"   => trim($data["last_name"]        ?? ""),
        ":suffix"      => trim($data["suffix"]           ?? "") ?: null,
        ":age"         => intval($data["age"]            ?? 0),
        ":civil"       => trim($data["civil_status"]     ?? ""),
        ":address"     => trim($data["address"]          ?? ""),
        ":occupation"  => trim($data["occupation"]       ?? ""),
        ":petsa"       => $data["petsa"]                 ?? null,
        ":oras"        => $data["oras"]                  ?? null,
        ":against"     => trim($data["complaint_against"] ?? ""),
        ":type"        => trim($data["complaint_type"]   ?? ""),
        ":details"     => trim($data["complaint_details"] ?? ""),
    ]);
    $blotterId = $pdo->lastInsertId();

    echo json_encode([
        "success"          => true,
        "reference_number" => $ref_num,
        "blotter_id"       => $blotterId,
    ]);

} catch (PDOException $e) {
    error_log("Insert error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Failed to save blotter: " . $e->getMessage(),
    ]);
}
exit();
?>