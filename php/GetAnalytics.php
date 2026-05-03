<?php
// ============================================================
//  Barangay Tugtug E-System — Analytics Endpoint
//  File: php/GetAnalytics.php
// ============================================================

header("Content-Type: application/json");
header("X-Content-Type-Options: nosniff");
ini_set("display_errors", 0);
ini_set("log_errors", 1);
error_reporting(E_ALL);

define("DB_HOST",    "localhost");
define("DB_NAME",    "db_barangay_e-system");
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
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection error."]);
    exit();
}

$type  = isset($_GET["type"])  ? trim($_GET["type"])  : "";
$year  = isset($_GET["year"])  ? (int)$_GET["year"]   : (int)date("Y");
$month = isset($_GET["month"]) ? (int)$_GET["month"]  : (int)date("n");

// ── 1. Document Requests per type for a given month/year ──────
if ($type === "documents") {
    try {
        $stmt = $pdo->prepare("
            SELECT d.document_type, COUNT(*) AS total
            FROM document_request dr
            LEFT JOIN documents d ON dr.document_ID = d.document_ID
            WHERE YEAR(dr.date) = :year AND MONTH(dr.date) = :month
            GROUP BY d.document_type
            ORDER BY total DESC
        ");
        $stmt->execute([":year" => $year, ":month" => $month]);
        $rows = $stmt->fetchAll();
        echo json_encode(["success" => true, "data" => $rows]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Query failed: " . $e->getMessage()]);
    }
    exit();
}

// ── 2. Blotter cases by month for a given year ────────────────
//  NOTE: Uses actual column names from DB schema:
//    - date column  : petsa
//    - status values: 'Pending', 'Scheduled', 'Ongoing', 'Resolved', 'Escalated', 'Dismissed'
if ($type === "blotter_monthly") {
    try {
        $stmt = $pdo->prepare("
            SELECT
                MONTH(petsa) AS month_num,
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'Resolved'  THEN 1 ELSE 0 END) AS resolved,
                SUM(CASE WHEN status = 'Escalated' THEN 1 ELSE 0 END) AS escalated,
                SUM(CASE WHEN status = 'Dismissed' THEN 1 ELSE 0 END) AS dismissed,
                SUM(CASE WHEN status IN ('Pending', 'Scheduled', 'Ongoing') THEN 1 ELSE 0 END) AS pending
            FROM blotter
            WHERE YEAR(petsa) = :year
            GROUP BY MONTH(petsa)
            ORDER BY MONTH(petsa) ASC
        ");
        $stmt->execute([":year" => $year]);
        $rows = $stmt->fetchAll();

        // Fill all 12 months with zeros so the chart always shows a full year
        $months = [];
        for ($m = 1; $m <= 12; $m++) {
            $months[$m] = [
                "month_num" => $m,
                "total"     => 0,
                "resolved"  => 0,
                "escalated" => 0,
                "dismissed" => 0,
                "pending"   => 0,
            ];
        }
        foreach ($rows as $row) {
            $months[(int)$row["month_num"]] = $row;
        }

        echo json_encode(["success" => true, "data" => array_values($months)]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Query failed: " . $e->getMessage()]);
    }
    exit();
}

// ── 3. Available years ────────────────────────────────────────
if ($type === "years") {
    try {
        $docYears     = $pdo->query("SELECT DISTINCT YEAR(date) AS yr FROM document_request WHERE date IS NOT NULL ORDER BY yr DESC")->fetchAll(PDO::FETCH_COLUMN);
        $blotterYears = $pdo->query("SELECT DISTINCT YEAR(petsa) AS yr FROM blotter WHERE petsa IS NOT NULL ORDER BY yr DESC")->fetchAll(PDO::FETCH_COLUMN);

        $allYears = array_unique(array_merge($docYears, $blotterYears));
        rsort($allYears);
        if (empty($allYears)) $allYears = [(int)date("Y")];

        echo json_encode(["success" => true, "years" => $allYears]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Query failed: " . $e->getMessage()]);
    }
    exit();
}

http_response_code(400);
echo json_encode(["success" => false, "message" => "Invalid type parameter."]);
exit();
?>