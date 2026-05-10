<?php
// ============================================================
//  Barangay Tugtug E-System — Track Request
//  File: php/track_request.php
//  Updated to match db-barangay-system schema:
//  - No blotter_reference_number or blotter_details tables;
//    blotter queried directly by reference_number column
//  - No document_reference_number table;
//    document_request queried directly by document_refnumber column
//  GET ?ref=BRGY-2026-XXXXX  or  ?ref=DOC-2026-XXXXX
// ============================================================
header("Content-Type: application/json");
ini_set("display_errors", 0);
ini_set("log_errors", 1);

define("DB_HOST",    "localhost");
define("DB_NAME",    "db-barangay-system");
define("DB_USER",    "root");
define("DB_PASS",    "");
define("DB_CHARSET", "utf8mb4");

$dsn = "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=".DB_CHARSET;
$opt = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => true,
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $opt);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Database connection error."]);
    exit;
}

$ref = isset($_GET["ref"]) ? trim($_GET["ref"]) : "";

if (empty($ref)) {
    echo json_encode(["success" => false, "message" => "No reference number provided."]);
    exit;
}

// ── Determine type by prefix ──────────────────────────────────
if (str_starts_with($ref, "BRGY-")) {

    // ── Blotter lookup ────────────────────────────────────────
    // Query directly on blotter.reference_number (no junction table).
    try {
        $stmt = $pdo->prepare(
            "SELECT
                b.blotter_id,
                b.reference_number,
                b.first_name,
                b.middle_name,
                b.last_name,
                b.suffix,
                CONCAT(
                    b.first_name,
                    CASE WHEN b.middle_name IS NOT NULL AND b.middle_name <> '' THEN CONCAT(' ', b.middle_name) ELSE '' END,
                    ' ',
                    b.last_name,
                    CASE WHEN b.suffix IS NOT NULL AND b.suffix <> '' THEN CONCAT(' ', b.suffix) ELSE '' END
                ) AS full_name,
                b.complaint_against,
                b.petsa,
                b.status,
                b.complaint_details,
                b.resolved_at
             FROM blotter b
             WHERE b.reference_number = :ref
             LIMIT 1"
        );
        $stmt->execute([":ref" => $ref]);
        $row = $stmt->fetch();

        if (!$row) {
            echo json_encode(["success" => false, "message" => "Reference number not found."]);
            exit;
        }

        // Fix zero-dates
        $resolvedAt = $row["resolved_at"];
        if ($resolvedAt === "0000-00-00" || $resolvedAt === "0000-00-00 00:00:00") {
            $resolvedAt = null;
        }

        echo json_encode([
            "success" => true,
            "type"    => "blotter",
            "data"    => [
                "reference_number" => $row["reference_number"],
                "name"             => $row["full_name"],
                "complainant"      => $row["complaint_against"],
                "incident_date"    => $row["petsa"],
                "complaint"        => $row["complaint_details"],
                "status"           => $row["status"],
                "price"            => "Free",
                "resolved_at"      => $resolvedAt,
                // Schedule fields no longer exist in this schema;
                // return null so front-end gracefully hides them.
                "schedule_date_1"  => null,
                "schedule_time_1"  => null,
                "schedule_date_2"  => null,
                "schedule_time_2"  => null,
                "schedule_date_3"  => null,
                "schedule_time_3"  => null,
            ]
        ]);
    } catch (PDOException $e) {
        error_log($e->getMessage());
        echo json_encode(["success" => false, "message" => "Query error."]);
    }

} elseif (str_starts_with($ref, "DOC-")) {

    // ── Document lookup ───────────────────────────────────────
    // Query directly on document_request.document_refnumber (no junction table).
    try {
        $stmt = $pdo->prepare(
            "SELECT
                dr.request_ID,
                dr.document_refnumber,
                ri.first_name,
                ri.last_name,
                dr.document_purpose,
                dr.date,
                dr.status,
                dr.date_released,
                dr.quantity,
                d.document_type,
                d.price
             FROM document_request dr
             JOIN resident_information ri ON dr.resident_ID = ri.resident_ID
             LEFT JOIN documents d        ON dr.document_ID = d.document_ID
             WHERE dr.document_refnumber = :ref
             LIMIT 1"
        );
        $stmt->execute([":ref" => $ref]);
        $row = $stmt->fetch();

        if (!$row) {
            echo json_encode(["success" => false, "message" => "Reference number not found."]);
            exit;
        }

        // Format price
        $rawPrice     = $row["price"] ?? 0;
        $priceDisplay = ($rawPrice == 0)
            ? "Free"
            : "₱" . number_format((float)$rawPrice, 2);

        // Fix zero date_released
        $dateReleased = $row["date_released"];
        if ($dateReleased === "0000-00-00" || $dateReleased === "0000-00-00 00:00:00") {
            $dateReleased = null;
        }

        echo json_encode([
            "success" => true,
            "type"    => "document",
            "data"    => [
                "reference_number" => $row["document_refnumber"],
                "name"             => $row["first_name"] . " " . $row["last_name"],
                "document_type"    => $row["document_type"] ?? "—",
                "purpose"          => $row["document_purpose"],
                "date_requested"   => $row["date"],
                "date_released"    => $dateReleased,
                "quantity"         => $row["quantity"],
                "status"           => $row["status"],
                "price"            => $priceDisplay,
            ]
        ]);
    } catch (PDOException $e) {
        error_log($e->getMessage());
        echo json_encode(["success" => false, "message" => "Query error."]);
    }

} else {
    echo json_encode(["success" => false, "message" => "Invalid reference number format. Use BRGY-YEAR-XXXXX or DOC-YEAR-XXXXX."]);
}
exit;
?>