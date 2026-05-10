<?php
// ============================================================
//  Barangay Tugtug E-System — Analytics Data API
//  File: php/GetAnalytics.php
//
//  Handles three query types (via ?type=):
//    years            – distinct years from both tables
//    documents        – document requests grouped by type for a given month+year
//    blotter_monthly  – blotter cases grouped by month for a given year
// ============================================================

header("Content-Type: application/json");
header("X-Content-Type-Options: nosniff");
ini_set("display_errors", 0);
ini_set("log_errors", 1);
error_reporting(E_ALL);

define("DB_HOST", "localhost");
define("DB_NAME", "db-barangay-system");
define("DB_USER", "root");
define("DB_PASS", "");
define("DB_CHARSET", "utf8mb4");

$dsn =
    "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => true,
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    error_log("DB Connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database connection error.",
    ]);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit();
}

$type = isset($_GET["type"]) ? trim($_GET["type"]) : "";

// ────────────────────────────────────────────────────────────
//  type=years  →  distinct years present in both tables
// ────────────────────────────────────────────────────────────
if ($type === "years") {
    try {
        $stmt = $pdo->query(
            "SELECT DISTINCT YEAR(date) AS yr FROM document_request WHERE date IS NOT NULL
             UNION
             SELECT DISTINCT YEAR(petsa) AS yr FROM blotter WHERE petsa IS NOT NULL
             ORDER BY yr DESC",
        );
        $rows = $stmt->fetchAll();
        $years = array_map(function ($r) {
            return (int) $r["yr"];
        }, $rows);

        if (empty($years)) {
            $years = [(int) date("Y")];
        }

        echo json_encode(["success" => true, "years" => $years]);
    } catch (PDOException $e) {
        error_log("Analytics years error: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Failed to fetch years.",
        ]);
    }
    exit();
}

// ────────────────────────────────────────────────────────────
//  type=documents  →  requests per document_type for month+year
// ────────────────────────────────────────────────────────────
if ($type === "documents") {
    $month = isset($_GET["month"]) ? (int) $_GET["month"] : (int) date("m");
    $year = isset($_GET["year"]) ? (int) $_GET["year"] : (int) date("Y");

    if ($month < 1 || $month > 12) {
        echo json_encode(["success" => false, "message" => "Invalid month."]);
        exit();
    }

    try {
        $stmt = $pdo->prepare(
            "SELECT d.document_type, COUNT(*) AS total
             FROM document_request dr
             LEFT JOIN documents d ON dr.document_ID = d.document_ID
             WHERE MONTH(dr.date) = :month
               AND YEAR(dr.date)  = :year
             GROUP BY d.document_type
             ORDER BY total DESC",
        );
        $stmt->execute([":month" => $month, ":year" => $year]);
        $rows = $stmt->fetchAll();

        echo json_encode([
            "success" => true,
            "data" => $rows,
        ]);
    } catch (PDOException $e) {
        error_log("Analytics documents error: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Failed to fetch document analytics.",
        ]);
    }
    exit();
}

// ────────────────────────────────────────────────────────────
//  type=blotter_monthly  →  cases per month for a given year,
//                           broken down by status
// ────────────────────────────────────────────────────────────
if ($type === "blotter_monthly") {
    $year = isset($_GET["year"]) ? (int) $_GET["year"] : (int) date("Y");

    try {
        $stmt = $pdo->prepare(
            "SELECT
                MONTH(petsa)                                           AS month_num,
                COUNT(*)                                               AS total,
                SUM(CASE WHEN status = 'Resolved'  THEN 1 ELSE 0 END) AS resolved,
                SUM(CASE WHEN status = 'Escalated' THEN 1 ELSE 0 END) AS escalated,
                SUM(CASE WHEN status = 'Dismissed' THEN 1 ELSE 0 END) AS dismissed,
                SUM(CASE WHEN status = 'Pending'   THEN 1 ELSE 0 END) AS pending
             FROM blotter
             WHERE YEAR(petsa) = :year
             GROUP BY MONTH(petsa)
             ORDER BY MONTH(petsa) ASC",
        );
        $stmt->execute([":year" => $year]);
        $rows = $stmt->fetchAll();

        $data = array_map(function ($r) {
            return [
                "month_num" => (int) $r["month_num"],
                "total" => (int) $r["total"],
                "resolved" => (int) $r["resolved"],
                "escalated" => (int) $r["escalated"],
                "dismissed" => (int) $r["dismissed"],
                "pending" => (int) $r["pending"],
            ];
        }, $rows);

        echo json_encode([
            "success" => true,
            "data" => $data,
        ]);
    } catch (PDOException $e) {
        error_log("Analytics blotter error: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Failed to fetch blotter analytics.",
        ]);
    }
    exit();
}

// Unknown type
http_response_code(400);
echo json_encode([
    "success" => false,
    "message" => "Unknown analytics type: " . htmlspecialchars($type),
]);
exit();
?>
