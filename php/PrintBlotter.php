<?php
// ============================================================
//  Barangay Tugtug E-System — Print Blotter Records (TCPDF)
//  File: php/PrintBlotter.php
//
//  Accepts the same GET params as GetBlotter.php
//  (search, filter, date_from, date_to) and generates a
//  formatted PDF of the matching blotter records.
// ============================================================

require_once __DIR__ . '/../tcpdf/tcpdf.php';

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
    die("Database connection error.");
}

// ── Build query (mirrors GetBlotter.php) ──────────────────
$search    = isset($_GET["search"])    ? trim($_GET["search"])    : "";
$filter    = isset($_GET["filter"])    ? trim($_GET["filter"])    : "";
$date_from = isset($_GET["date_from"]) ? trim($_GET["date_from"]) : "";
$date_to   = isset($_GET["date_to"])   ? trim($_GET["date_to"])   : "";

$sql = "SELECT
            b.blotter_id,
            b.reference_number,
            CONCAT(
                b.first_name,
                CASE WHEN b.middle_name IS NOT NULL AND b.middle_name <> '' THEN CONCAT(' ', b.middle_name) ELSE '' END,
                ' ', b.last_name,
                CASE WHEN b.suffix IS NOT NULL AND b.suffix <> '' THEN CONCAT(' ', b.suffix) ELSE '' END
            ) AS full_name,
            b.complaint_against,
            b.complaint_type,
            b.complaint_details,
            b.petsa,
            b.status,
            b.resolved_at,
            b.submitted_at
        FROM blotter b
        WHERE 1=1";

$params = [];
if (!empty($search)) {
    $sql .= " AND (b.first_name LIKE :s1 OR b.last_name LIKE :s2
              OR b.complaint_against LIKE :s3 OR b.status LIKE :s4
              OR b.complaint_type LIKE :s5 OR b.reference_number LIKE :s6)";
    $like = "%" . $search . "%";
    $params = [":s1"=>$like,":s2"=>$like,":s3"=>$like,":s4"=>$like,":s5"=>$like,":s6"=>$like];
}
if (!empty($filter) && $filter !== "Total" && $filter !== "date") {
    $sql .= " AND b.status = :filter";
    $params[":filter"] = $filter;
}
if (!empty($date_from)) { $sql .= " AND b.petsa >= :date_from"; $params[":date_from"] = $date_from; }
if (!empty($date_to))   { $sql .= " AND b.petsa <= :date_to";   $params[":date_to"]   = $date_to;   }
$sql .= " ORDER BY b.blotter_id ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$records = $stmt->fetchAll();

// Fix zero-dates
foreach ($records as &$row) {
    foreach (["petsa", "submitted_at", "resolved_at"] as $col) {
        if (isset($row[$col]) &&
            ($row[$col] === "0000-00-00" || $row[$col] === "0000-00-00 00:00:00")) {
            $row[$col] = null;
        }
    }
}
unset($row);

// ── Helpers ───────────────────────────────────────────────
function statusColor($status) {
    switch ($status) {
        case "Pending":   return ["bg"=>"#fff3cd","text"=>"#856404"];
        case "Scheduled": return ["bg"=>"#cfe2ff","text"=>"#084298"];
        case "Ongoing":   return ["bg"=>"#d1ecff","text"=>"#0c4e86"];
        case "Resolved":  return ["bg"=>"#d1e7dd","text"=>"#0a3622"];
        case "Escalated": return ["bg"=>"#e2d9f3","text"=>"#4a235a"];
        case "Dismissed": return ["bg"=>"#f8d7da","text"=>"#842029"];
        default:          return ["bg"=>"#eeeeee","text"=>"#333333"];
    }
}
function fmtDate($d) {
    if (!$d) return "-";
    $ts = strtotime($d);
    return $ts ? date("M j, Y", $ts) : "-";
}

$filterLabel = "";
if (!empty($search))                         $filterLabel .= "Search: \"" . $search . "\"  ";
if (!empty($filter) && $filter !== "date")   $filterLabel .= "Status: " . $filter . "  ";
if (!empty($date_from))                      $filterLabel .= "From: " . fmtDate($date_from) . "  ";
if (!empty($date_to))                        $filterLabel .= "To: " . fmtDate($date_to);
if (empty(trim($filterLabel)))               $filterLabel = "All Records";

// ── TCPDF Setup ───────────────────────────────────────────
$pdf = new TCPDF("L", PDF_UNIT, PDF_PAGE_FORMAT, true, "UTF-8", false);
$pdf->SetCreator("Barangay Tugtug E-System");
$pdf->SetAuthor("Barangay Tugtug");
$pdf->SetTitle("Blotter Records Report");
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);
$pdf->SetMargins(10, 10, 10);
$pdf->SetAutoPageBreak(true, 12);
$pdf->AddPage();

// ── Logo ──────────────────────────────────────────────────
$logoPath    = __DIR__ . "/../photos/logo.png.png";
$hasImageLib = extension_loaded("gd") || extension_loaded("imagick");
if ($hasImageLib && file_exists($logoPath)) {
    try {
        $pdf->Image($logoPath, 10, 8, 18, 18, "PNG", "", "T", false, 300, "", false, false, 0, false, false, false);
    } catch (Exception $e) { }
}

// ── Header ────────────────────────────────────────────────
$headerX = ($hasImageLib && file_exists($logoPath)) ? 30 : 10;
$pdf->SetFont("helvetica", "B", 15);
$pdf->SetTextColor(39, 59, 7);
$pdf->SetXY($headerX, 8);
$pdf->Cell(0, 7, "BARANGAY TUGTUG", 0, 1, "L");

$pdf->SetFont("helvetica", "", 9);
$pdf->SetTextColor(80, 80, 80);
$pdf->SetX($headerX);
$pdf->Cell(0, 5, "Barangay E-System - Blotter Records Report", 0, 1, "L");

$pdf->SetX($headerX);
$pdf->Cell(0, 4, "Generated: " . date("F j, Y  h:i A"), 0, 1, "L");

$pdf->SetX($headerX);
$pdf->SetTextColor(100, 100, 100);
$pdf->SetFont("helvetica", "I", 8);
$pdf->Cell(0, 4, "Filter: " . $filterLabel, 0, 1, "L");

$pdf->SetDrawColor(39, 59, 7);
$pdf->SetLineWidth(0.5);
$pdf->Line(10, 30, $pdf->getPageWidth() - 10, 30);
$pdf->Ln(4);

// ── Summary boxes ─────────────────────────────────────────
$counts = ["Total"=>0,"Pending"=>0,"Scheduled"=>0,"Ongoing"=>0,"Resolved"=>0,"Escalated"=>0,"Dismissed"=>0];
foreach ($records as $r) {
    $counts["Total"]++;
    if (isset($counts[$r["status"]])) $counts[$r["status"]]++;
}

$summaryItems = [
    ["label"=>"Total",     "val"=>$counts["Total"],     "bg"=>"#375309","fg"=>"#ffffff"],
    ["label"=>"Pending",   "val"=>$counts["Pending"],   "bg"=>"#fff3cd","fg"=>"#856404"],
    ["label"=>"Scheduled", "val"=>$counts["Scheduled"], "bg"=>"#cfe2ff","fg"=>"#084298"],
    ["label"=>"Ongoing",   "val"=>$counts["Ongoing"],   "bg"=>"#d1ecff","fg"=>"#0c4e86"],
    ["label"=>"Resolved",  "val"=>$counts["Resolved"],  "bg"=>"#d1e7dd","fg"=>"#0a3622"],
    ["label"=>"Escalated", "val"=>$counts["Escalated"], "bg"=>"#e2d9f3","fg"=>"#4a235a"],
    ["label"=>"Dismissed", "val"=>$counts["Dismissed"], "bg"=>"#f8d7da","fg"=>"#842029"],
];
$boxW = 35; $boxH = 10; $startX = 10; $y = $pdf->GetY();
foreach ($summaryItems as $idx => $s) {
    $x = $startX + $idx * ($boxW + 2);
    list($r,$g,$b) = sscanf($s["bg"], "#%02x%02x%02x");
    $pdf->SetFillColor($r, $g, $b);
    list($r,$g,$b) = sscanf($s["fg"], "#%02x%02x%02x");
    $pdf->SetTextColor($r, $g, $b);
    $pdf->SetDrawColor(200, 200, 200);
    $pdf->SetLineWidth(0.2);
    $pdf->RoundedRect($x, $y, $boxW, $boxH, 2, "1111", "FD");
    $pdf->SetXY($x, $y + 1);
    $pdf->SetFont("helvetica", "", 7);
    $pdf->Cell($boxW, 4, $s["label"], 0, 0, "C");
    $pdf->SetXY($x, $y + 5);
    $pdf->SetFont("helvetica", "B", 9);
    $pdf->Cell($boxW, 4, $s["val"], 0, 0, "C");
}
$pdf->Ln($boxH + 5);

// ── Table columns
// Landscape A4 usable width ~277mm. Total = 8+26+46+46+40+24+20+22+22 = 254mm
$cols = [
    ["label"=>"Blotter ID",       "w"=> 8,  "align"=>"C"],
    ["label"=>"Ref No.",          "w"=>26,  "align"=>"C"],
    ["label"=>"Name of Complainee","w"=>46, "align"=>"L"],
    ["label"=>"Complaint Against", "w"=>46, "align"=>"L"],
    ["label"=>"Type",             "w"=>40,  "align"=>"L"],
    ["label"=>"Date Filed",       "w"=>24,  "align"=>"C"],
    ["label"=>"Status",           "w"=>20,  "align"=>"C"],
    ["label"=>"Submitted At",     "w"=>22,  "align"=>"C"],
    ["label"=>"Resolved At",      "w"=>22,  "align"=>"C"],
];

// ── Table header ──────────────────────────────────────────
$pdf->SetFillColor(39, 59, 7);
$pdf->SetTextColor(243, 239, 232);
$pdf->SetFont("helvetica", "B", 7.5);
$pdf->SetDrawColor(255, 255, 255);
$pdf->SetLineWidth(0.1);
foreach ($cols as $col) {
    $pdf->Cell($col["w"], 7, $col["label"], 1, 0, $col["align"], true);
}
$pdf->Ln();

// ── Table rows ────────────────────────────────────────────
$pdf->SetDrawColor(220, 220, 220);
$pdf->SetLineWidth(0.1);
$lineH = 5;

foreach ($records as $i => $rec) {
    $fullName       = $rec["full_name"]        ?? "-";
    $compAgainst    = $rec["complaint_against"] ?? "-";
    $compType       = $rec["complaint_type"]    ?? "-";

    $sc = statusColor($rec["status"]);
    list($br,$bg,$bb) = sscanf($sc["bg"],   "#%02x%02x%02x");
    list($tr,$tg,$tb) = sscanf($sc["text"], "#%02x%02x%02x");

    $rowBg = ($i % 2 === 0) ? [250,250,247] : [243,239,232];

    // Calculate row height based on wrapping columns
    $pdf->SetFont("helvetica", "", 7);
    $nameLines    = $pdf->getNumLines($fullName,    $cols[2]["w"]);
    $againstLines = $pdf->getNumLines($compAgainst, $cols[3]["w"]);
    $typeLines    = $pdf->getNumLines($compType,    $cols[4]["w"]);
    $rowH         = max($nameLines, $againstLines, $typeLines, 1) * $lineH;

    $startY = $pdf->GetY();

    $pdf->SetFillColor(...$rowBg);
    $pdf->SetTextColor(50, 50, 50);
    $pdf->SetFont("helvetica", "", 7);

    $x = 10;

    // Blotter ID
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[0]["w"], $rowH, $rec["blotter_id"], 1, 0, "C", true);
    $x += $cols[0]["w"];

    // Ref No.
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[1]["w"], $rowH, $rec["reference_number"] ?? "-", 1, 0, "C", true);
    $x += $cols[1]["w"];

    // Name of Complainee (MultiCell)
    $pdf->SetXY($x, $startY);
    $pdf->MultiCell($cols[2]["w"], $lineH, $fullName, 1, "L", true, 0);
    $x += $cols[2]["w"];

    // Complaint Against (MultiCell)
    $pdf->SetXY($x, $startY);
    $pdf->MultiCell($cols[3]["w"], $lineH, $compAgainst, 1, "L", true, 0);
    $x += $cols[3]["w"];

    // Complaint Type (MultiCell)
    $pdf->SetXY($x, $startY);
    $pdf->MultiCell($cols[4]["w"], $lineH, $compType, 1, "L", true, 0);
    $x += $cols[4]["w"];

    // Date Filed
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[5]["w"], $rowH, fmtDate($rec["petsa"]), 1, 0, "C", true);
    $x += $cols[5]["w"];

    // Status (colored)
    $pdf->SetFillColor($br, $bg, $bb);
    $pdf->SetTextColor($tr, $tg, $tb);
    $pdf->SetFont("helvetica", "B", 6.5);
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[6]["w"], $rowH, $rec["status"], 1, 0, "C", true);
    $x += $cols[6]["w"];

    // Submitted At
    $pdf->SetFillColor(...$rowBg);
    $pdf->SetTextColor(50, 50, 50);
    $pdf->SetFont("helvetica", "", 7);
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[7]["w"], $rowH, fmtDate($rec["submitted_at"]), 1, 0, "C", true);
    $x += $cols[7]["w"];

    // Resolved At
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[8]["w"], $rowH, fmtDate($rec["resolved_at"]), 1, 0, "C", true);

    // Move to next row
    $pdf->SetXY(10, $startY + $rowH);
}

// ── Footer ────────────────────────────────────────────────
$pdf->SetDrawColor(39, 59, 7);
$pdf->SetLineWidth(0.4);
$pdf->Line(10, $pdf->GetY(), $pdf->getPageWidth() - 10, $pdf->GetY());
$pdf->Ln(3);
$pdf->SetFont("helvetica", "I", 7);
$pdf->SetTextColor(150, 150, 150);
$pdf->Cell(0, 5, "Generated by Barangay Tugtug E-System  |  Total records: " . count($records), 0, 1, "R");

$pdf->Output("blotter_records_" . date("Ymd_His") . ".pdf", "I");
?>
