<?php
// ============================================================
//  Barangay Tugtug E-System — Print Document Requests (TCPDF)
//  File: php/PrintDocuments.php
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

$search    = isset($_GET["search"])    ? trim($_GET["search"])    : "";
$filter    = isset($_GET["filter"])    ? trim($_GET["filter"])    : "";
$date_from = isset($_GET["date_from"]) ? trim($_GET["date_from"]) : "";
$date_to   = isset($_GET["date_to"])   ? trim($_GET["date_to"])   : "";

$sql = "SELECT
            dr.request_ID, dr.document_refnumber,
            ri.first_name, ri.last_name, ri.middle_initial, ri.sex,
            dr.contact, dr.document_purpose, dr.date, dr.status,
            dr.date_released, dr.quantity, d.document_type, d.price
        FROM document_request dr
        LEFT JOIN resident_information ri ON dr.resident_ID = ri.resident_ID
        LEFT JOIN documents d             ON dr.document_ID = d.document_ID
        WHERE 1=1";

$params = [];
if (!empty($search)) {
    $sql .= " AND (ri.first_name LIKE :s1 OR ri.last_name LIKE :s2
              OR dr.document_purpose LIKE :s3 OR dr.status LIKE :s4
              OR d.document_type LIKE :s5 OR dr.document_refnumber LIKE :s6)";
    $like = "%" . $search . "%";
    $params = [":s1"=>$like,":s2"=>$like,":s3"=>$like,":s4"=>$like,":s5"=>$like,":s6"=>$like];
}
if (!empty($filter) && $filter !== "Total" && $filter !== "date") {
    $sql .= " AND dr.status = :filter";
    $params[":filter"] = $filter;
}
if (!empty($date_from)) { $sql .= " AND dr.date >= :date_from"; $params[":date_from"] = $date_from; }
if (!empty($date_to))   { $sql .= " AND dr.date <= :date_to";   $params[":date_to"]   = $date_to;   }
$sql .= " ORDER BY dr.request_ID ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$records = $stmt->fetchAll();

foreach ($records as &$row) {
    if (isset($row["date_released"]) &&
        ($row["date_released"] === "0000-00-00" || $row["date_released"] === "0000-00-00 00:00:00")) {
        $row["date_released"] = null;
    }
}
unset($row);

function statusColor($status) {
    switch ($status) {
        case "Pending":    return ["bg"=>"#fff3cd","text"=>"#856404"];
        case "Processing": return ["bg"=>"#cfe2ff","text"=>"#084298"];
        case "Ready":      return ["bg"=>"#d1e7dd","text"=>"#0a3622"];
        case "Released":   return ["bg"=>"#e2d9f3","text"=>"#4a235a"];
        case "Canceled":   return ["bg"=>"#f8d7da","text"=>"#842029"];
        default:           return ["bg"=>"#eeeeee","text"=>"#333333"];
    }
}
function fmtDate($d) {
    if (!$d) return "-";
    $ts = strtotime($d);
    return $ts ? date("M j, Y", $ts) : "-";
}

$filterLabel = "";
if (!empty($search))                            $filterLabel .= "Search: \"" . $search . "\"  ";
if (!empty($filter) && $filter !== "date")      $filterLabel .= "Status: " . $filter . "  ";
if (!empty($date_from))                         $filterLabel .= "From: " . fmtDate($date_from) . "  ";
if (!empty($date_to))                           $filterLabel .= "To: " . fmtDate($date_to);
if (empty(trim($filterLabel)))                  $filterLabel = "All Records";

// ── TCPDF ─────────────────────────────────────────────────
$pdf = new TCPDF("L", PDF_UNIT, PDF_PAGE_FORMAT, true, "UTF-8", false);
$pdf->SetCreator("Barangay Tugtug E-System");
$pdf->SetAuthor("Barangay Tugtug");
$pdf->SetTitle("Document Requests Report");
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);
$pdf->SetMargins(10, 10, 10);
$pdf->SetAutoPageBreak(true, 12);
$pdf->AddPage();

// ── Logo — only attempt if GD or Imagick is loaded ────────
$logoPath = __DIR__ . "/../photos/logo.png.png";
$hasImageLib = extension_loaded("gd") || extension_loaded("imagick");
if ($hasImageLib && file_exists($logoPath)) {
    try {
        $pdf->Image($logoPath, 10, 8, 18, 18, "PNG", "", "T", false, 300, "", false, false, 0, false, false, false);
    } catch (Exception $e) {
        // skip logo silently
    }
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
$pdf->Cell(0, 5, "Barangay E-System - Document Requests Report", 0, 1, "L");

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
$counts = ["Total"=>0,"Pending"=>0,"Processing"=>0,"Ready"=>0,"Released"=>0,"Canceled"=>0];
foreach ($records as $r) {
    $counts["Total"]++;
    if (isset($counts[$r["status"]])) $counts[$r["status"]]++;
}

$summaryItems = [
    ["label"=>"Total",      "val"=>$counts["Total"],      "bg"=>"#375309","fg"=>"#ffffff"],
    ["label"=>"Pending",    "val"=>$counts["Pending"],    "bg"=>"#fff3cd","fg"=>"#856404"],
    ["label"=>"Processing", "val"=>$counts["Processing"], "bg"=>"#cfe2ff","fg"=>"#084298"],
    ["label"=>"Ready",      "val"=>$counts["Ready"],      "bg"=>"#d1e7dd","fg"=>"#0a3622"],
    ["label"=>"Released",   "val"=>$counts["Released"],   "bg"=>"#e2d9f3","fg"=>"#4a235a"],
    ["label"=>"Canceled",   "val"=>$counts["Canceled"],   "bg"=>"#f8d7da","fg"=>"#842029"],
];
$boxW = 40; $boxH = 10; $startX = 10; $y = $pdf->GetY();
foreach ($summaryItems as $idx => $s) {
    $x = $startX + $idx * ($boxW + 3);
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

// ── Table header ──────────────────────────────────────────
// Landscape A4 usable width ~277mm. Total = 8+24+40+8+24+44+22+52+7+20+24 = 273mm
$cols = [
    ["label"=>"Req. ID",       "w"=> 8,  "align"=>"C"],
    ["label"=>"Ref No.",       "w"=>24,  "align"=>"C"],
    ["label"=>"Full Name",     "w"=>40,  "align"=>"L"],
    ["label"=>"Sex",           "w"=> 8,  "align"=>"C"],
    ["label"=>"Contact",       "w"=>24,  "align"=>"C"],
    ["label"=>"Purpose",       "w"=>44,  "align"=>"L"],
    ["label"=>"Date Req.",     "w"=>22,  "align"=>"C"],
    ["label"=>"Doc Type",      "w"=>52,  "align"=>"L"],
    ["label"=>"Qty",           "w"=> 7,  "align"=>"C"],
    ["label"=>"Status",        "w"=>20,  "align"=>"C"],
    ["label"=>"Date Released", "w"=>24,  "align"=>"C"],
];

$pdf->SetFillColor(39, 59, 7);
$pdf->SetTextColor(243, 239, 232);
$pdf->SetFont("helvetica", "B", 7.5);
$pdf->SetDrawColor(255, 255, 255);
$pdf->SetLineWidth(0.1);
foreach ($cols as $col) {
    $pdf->Cell($col["w"], 7, $col["label"], 1, 0, $col["align"], true);
}
$pdf->Ln();

// ── Table rows — use MultiCell for wrapping long text ────
$pdf->SetFont("helvetica", "", 7);
$pdf->SetDrawColor(220, 220, 220);
$pdf->SetLineWidth(0.1);
$lineH = 5; // line height per text line inside a cell

foreach ($records as $i => $rec) {
    $fullName = trim(
        ($rec["first_name"] ?? "") . " " .
        (!empty($rec["middle_initial"]) ? $rec["middle_initial"] . ". " : "") .
        ($rec["last_name"] ?? "")
    );
    $purpose  = $rec["document_purpose"] ?? "-";
    $docType  = $rec["document_type"]    ?? "-";

    $sc = statusColor($rec["status"]);
    list($br,$bg,$bb) = sscanf($sc["bg"],   "#%02x%02x%02x");
    list($tr,$tg,$tb) = sscanf($sc["text"], "#%02x%02x%02x");

    $rowBg = ($i % 2 === 0) ? [250,250,247] : [243,239,232];

    // Pre-calculate how many lines each wrapping column needs
    $pdf->SetFont("helvetica", "", 7);
    $nameLines    = $pdf->getNumLines($fullName, $cols[2]["w"]);
    $purposeLines = $pdf->getNumLines($purpose,  $cols[5]["w"]);
    $docLines     = $pdf->getNumLines($docType,  $cols[7]["w"]);
    $rowH         = max($nameLines, $purposeLines, $docLines, 1) * $lineH;

    // Save Y position before drawing this row
    $startY = $pdf->GetY();
    $startX = $pdf->GetX();

    $pdf->SetFillColor(...$rowBg);
    $pdf->SetTextColor(50, 50, 50);
    $pdf->SetFont("helvetica", "", 7);

    // Draw single-line cells first (they use Cell, not MultiCell)
    $x = 10; // left margin
    $cells = [
        ["val" => $rec["request_ID"],                   "align"=>"C", "col"=>0],
        ["val" => $rec["document_refnumber"] ?? "-",    "align"=>"C", "col"=>1],
    ];
    foreach ($cells as $c) {
        $pdf->SetXY($x, $startY);
        $pdf->Cell($cols[$c["col"]]["w"], $rowH, $c["val"], 1, 0, $c["align"], true);
        $x += $cols[$c["col"]]["w"];
    }

    // Full Name (MultiCell)
    $pdf->SetXY($x, $startY);
    $pdf->MultiCell($cols[2]["w"], $lineH, $fullName, 1, "L", true, 0);
    $x += $cols[2]["w"];

    // Sex
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[3]["w"], $rowH, $rec["sex"] ?? "-", 1, 0, "C", true);
    $x += $cols[3]["w"];

    // Contact
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[4]["w"], $rowH, $rec["contact"] ?? "-", 1, 0, "C", true);
    $x += $cols[4]["w"];

    // Purpose (MultiCell)
    $pdf->SetXY($x, $startY);
    $pdf->MultiCell($cols[5]["w"], $lineH, $purpose, 1, "L", true, 0);
    $x += $cols[5]["w"];

    // Date Req.
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[6]["w"], $rowH, fmtDate($rec["date"]), 1, 0, "C", true);
    $x += $cols[6]["w"];

    // Doc Type (MultiCell)
    $pdf->SetXY($x, $startY);
    $pdf->MultiCell($cols[7]["w"], $lineH, $docType, 1, "L", true, 0);
    $x += $cols[7]["w"];

    // Qty
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[8]["w"], $rowH, $rec["quantity"] ?? 0, 1, 0, "C", true);
    $x += $cols[8]["w"];

    // Status (colored)
    $pdf->SetFillColor($br, $bg, $bb);
    $pdf->SetTextColor($tr, $tg, $tb);
    $pdf->SetFont("helvetica", "B", 6.5);
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[9]["w"], $rowH, $rec["status"], 1, 0, "C", true);
    $x += $cols[9]["w"];

    // Date Released
    $pdf->SetFillColor(...$rowBg);
    $pdf->SetTextColor(50, 50, 50);
    $pdf->SetFont("helvetica", "", 7);
    $pdf->SetXY($x, $startY);
    $pdf->Cell($cols[10]["w"], $rowH, fmtDate($rec["date_released"]), 1, 0, "C", true);

    // Move cursor to next row
    $pdf->SetXY(10, $startY + $rowH);
}

$pdf->SetDrawColor(39, 59, 7);
$pdf->SetLineWidth(0.4);
$pdf->Line(10, $pdf->GetY(), $pdf->getPageWidth() - 10, $pdf->GetY());
$pdf->Ln(3);
$pdf->SetFont("helvetica", "I", 7);
$pdf->SetTextColor(150, 150, 150);
$pdf->Cell(0, 5, "Generated by Barangay Tugtug E-System  |  Total records: " . count($records), 0, 1, "R");

$pdf->Output("document_requests_" . date("Ymd_His") . ".pdf", "I");
?>