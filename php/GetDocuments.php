<?php
// ============================================================
//  Barangay Tugtug E-System — Get Document Records
//  File: php/GetDocuments.php
//  Updated DB name to match db-barangay-system schema.
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

$dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
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

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $search    = isset($_GET["search"])    ? trim($_GET["search"])    : "";
    $filter    = isset($_GET["filter"])    ? trim($_GET["filter"])    : "";
    $date_from = isset($_GET["date_from"]) ? trim($_GET["date_from"]) : "";
    $date_to   = isset($_GET["date_to"])   ? trim($_GET["date_to"])   : "";

    $sql = "SELECT
                dr.request_ID,
                dr.document_refnumber,
                dr.resident_ID,
                ri.first_name,
                ri.last_name,
                ri.middle_initial,
                ri.sex,
                ri.birthdate,
                dr.document_ID,
                d.document_type,
                d.price,
                dr.contact,
                dr.document_purpose,
                dr.date,
                dr.status,
                dr.date_released,
                dr.quantity
            FROM document_request dr
            LEFT JOIN resident_information ri ON dr.resident_ID = ri.resident_ID
            LEFT JOIN documents d ON dr.document_ID = d.document_ID
            WHERE 1=1";

    $params = [];

    if (!empty($search)) {
        $sql .= " AND (ri.first_name LIKE :search1
                    OR ri.last_name  LIKE :search2
                    OR dr.document_purpose LIKE :search3
                    OR dr.status LIKE :search4
                    OR d.document_type LIKE :search5
                    OR dr.document_refnumber LIKE :search6)";
        $likeSearch = "%" . $search . "%";
        $params[":search1"] = $likeSearch;
        $params[":search2"] = $likeSearch;
        $params[":search3"] = $likeSearch;
        $params[":search4"] = $likeSearch;
        $params[":search5"] = $likeSearch;
        $params[":search6"] = $likeSearch;
    }

    if (!empty($filter) && $filter !== "Total" && $filter !== "date") {
        $sql .= " AND dr.status = :filter";
        $params[":filter"] = $filter;
    }

    if (!empty($date_from)) {
        $sql .= " AND dr.date >= :date_from";
        $params[":date_from"] = $date_from;
    }
    if (!empty($date_to)) {
        $sql .= " AND dr.date <= :date_to";
        $params[":date_to"] = $date_to;
    }

    $sql .= " ORDER BY dr.request_ID ASC";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll();

        // Fix zero-dates from MySQL
        foreach ($records as &$row) {
            if (
                isset($row["date_released"]) &&
                ($row["date_released"] === "0000-00-00" ||
                    $row["date_released"] === "0000-00-00 00:00:00")
            ) {
                $row["date_released"] = null;
            }
        }
        unset($row);

        $countStmt = $pdo->query(
            "SELECT status, COUNT(*) as count FROM document_request GROUP BY status"
        );
        $counts = [
            "Total"      => 0,
            "Pending"    => 0,
            "Processing" => 0,
            "Ready"      => 0,
            "Released"   => 0,
            "Canceled"   => 0,
        ];
        while ($row = $countStmt->fetch()) {
            $counts[$row["status"]] = (int) $row["count"];
            $counts["Total"]       += (int) $row["count"];
        }

        echo json_encode([
            "success" => true,
            "records" => $records,
            "counts"  => $counts,
        ]);
    } catch (PDOException $e) {
        error_log("Query error: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Failed to fetch records.",
        ]);
    }
    exit();
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $body = file_get_contents("php://input");
    $data = json_decode($body, true);

    if (!isset($data["request_ID"], $data["status"])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing fields."]);
        exit();
    }

    $allowedStatuses = ["Pending", "Processing", "Ready", "Released", "Canceled"];
    if (!in_array($data["status"], $allowedStatuses)) {
        echo json_encode(["success" => false, "message" => "Invalid status."]);
        exit();
    }

    try {
        if (!empty($data["clear_date_released"])) {
            $date_released = null;
        } elseif ($data["status"] === "Released") {
            if (!empty($data["date_released"])) {
                $d = DateTime::createFromFormat("Y-m-d", $data["date_released"]);
                $date_released = ($d && $d->format("Y-m-d") === $data["date_released"])
                    ? $data["date_released"]
                    : date("Y-m-d");
            } else {
                $date_released = date("Y-m-d");
            }
        } else {
            $date_released = null;
        }

        $stmt = $pdo->prepare(
            "UPDATE document_request
             SET status = :status, date_released = :date_released
             WHERE request_ID = :id"
        );

        $stmt->execute([
            ":status"        => $data["status"],
            ":date_released" => $date_released,
            ":id"            => $data["request_ID"],
        ]);

        echo json_encode([
            "success"       => true,
            "message"       => "Status updated successfully.",
            "date_released" => $date_released,
        ]);
    } catch (PDOException $e) {
        error_log("Update error: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Failed to update status.",
        ]);
    }
    exit();
}

http_response_code(405);
echo json_encode(["success" => false, "message" => "Method not allowed."]);
exit();
?>