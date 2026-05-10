<?php
// ============================================================
//  Barangay Tugtug E-System — Submit Document Request
//  File: php/submit_document.php
//  Updated to match db-barangay-system schema (no
//  document_reference_number table; reference stored directly
//  in document_request.document_refnumber)
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
// New schema: document_refnumber is a unique column on document_request;
// no separate document_reference_number table.
$year    = date("Y");
$ref_num = "";
do {
    $random  = str_pad(mt_rand(10000, 99999), 5, "0", STR_PAD_LEFT);
    $ref_num = "DOC-" . $year . "-" . $random;
    $check   = $pdo->prepare(
        "SELECT COUNT(*) FROM document_request WHERE document_refnumber = :ref"
    );
    $check->execute([":ref" => $ref_num]);
    $exists = $check->fetchColumn();
} while ($exists > 0);

try {
    // ── Find or insert resident ───────────────────────────────
    $res_check = $pdo->prepare(
        "SELECT resident_ID FROM resident_information
         WHERE first_name = :fn AND last_name = :ln LIMIT 1"
    );
    $res_check->execute([
        ":fn" => trim($data["first_name"] ?? ""),
        ":ln" => trim($data["last_name"]  ?? ""),
    ]);
    $resident = $res_check->fetch();

    if ($resident) {
        $resident_id = $resident["resident_ID"];
    } else {
        $middle = trim($data["middle_name"] ?? "");
        $mi     = $middle ? strtoupper(substr($middle, 0, 1)) : "";
        $gender = $data["gender"] ?? "";
        $sex    = $gender === "Male" ? "M" : ($gender === "Female" ? "F" : "O");
        $suffix = trim($data["suffix"] ?? "") ?: null;

        $ins = $pdo->prepare(
            "INSERT INTO resident_information
                (first_name, last_name, middle_initial, suffix, sex, birthdate, birthplace)
             VALUES (:fn, :ln, :mi, :suffix, :sex, :bd, :bp)"
        );
        $ins->execute([
            ":fn"     => trim($data["first_name"] ?? ""),
            ":ln"     => trim($data["last_name"]  ?? ""),
            ":mi"     => $mi,
            ":suffix" => $suffix,
            ":sex"    => $sex,
            ":bd"     => $data["birthday"]   ?? null,
            ":bp"     => $data["birthplace"] ?? "",
        ]);
        $resident_id = $pdo->lastInsertId();
    }

    // ── Validate document_ID ──────────────────────────────────
    $doc_id = intval($data["certificate"] ?? 0);
    $docCheck = $pdo->prepare("SELECT COUNT(*) FROM documents WHERE document_ID = :did");
    $docCheck->execute([":did" => $doc_id]);
    if ($docCheck->fetchColumn() < 1) {
        echo json_encode(["success" => false, "message" => "Invalid certificate selected. Got: " . ($data["certificate"] ?? "none")]);
        exit();
    }

    // ── Insert document request ───────────────────────────────
    $doc_stmt = $pdo->prepare(
        "INSERT INTO document_request
            (document_refnumber, resident_ID, document_ID, contact, document_purpose,
             date, status, age, length_stay_years, length_stay_months, quantity)
         VALUES
            (:ref, :rid, :did, :contact, :purpose,
             CURDATE(), 'Pending', :age, :stay_y, :stay_m, :qty)"
    );
    $doc_stmt->execute([
        ":ref"     => $ref_num,
        ":rid"     => $resident_id,
        ":did"     => $doc_id,
        ":contact" => trim($data["contact"]     ?? ""),
        ":purpose" => trim($data["purpose"]     ?? ""),
        ":age"     => intval($data["age"]       ?? 0),
        ":stay_y"  => intval($data["stay_years"]  ?? 0),
        ":stay_m"  => intval($data["stay_months"] ?? 0),
        ":qty"     => intval($data["quantity"]  ?? 1),
    ]);
    $request_id = $pdo->lastInsertId();

    echo json_encode([
        "success"          => true,
        "reference_number" => $ref_num,
        "request_id"       => $request_id,
    ]);

} catch (PDOException $e) {
    error_log("Insert error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Failed to save request: " . $e->getMessage(),
    ]);
}
exit();
?>