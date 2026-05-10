<?php
// ============================================================
//  Barangay Tugtug E-System — Print Single Blotter Record (TCPDF)
//  File: php/PrintBlotterSingle.php
//
//  Accepts GET param: blotter_id
//  Generates a formatted PDF for the single blotter record,
//  matching the TCPDF style of PrintBlotter.php.
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

// ── Validate blotter_id ───────────────────────────────────
$blotterId = isset($_GET["blotter_id"]) ? intval($_GET["blotter_id"]) : 0;
if ($blotterId <= 0) {
    die("Invalid blotter ID.");
}

// ── Fetch the single record ───────────────────────────────
$sql = "
    SELECT
        b.blotter_id,
        b.reference_number,
        CONCAT(
            b.first_name,
            CASE WHEN b.middle_name IS NOT NULL AND b.middle_name <> '' THEN CONCAT(' ', b.middle_name) ELSE '' END,
            ' ', b.last_name,
            CASE WHEN b.suffix IS NOT NULL AND b.suffix <> '' THEN CONCAT(' ', b.suffix) ELSE '' END
        ) AS full_name,
        b.age,
        b.civil_status,
        b.address,
        b.occupation,
        b.complaint_against,
        b.complaint_type,
        b.complaint_details,
        b.petsa,
        b.oras,
        b.status,
        b.resolved_at,
        b.submitted_at
    FROM blotter b
    WHERE b.blotter_id = :id
    LIMIT 1
";
$stmt = $pdo->prepare($sql);
$stmt->execute([":id" => $blotterId]);
$rec = $stmt->fetch();

if (!$rec) {
    die("Blotter record not found.");
}

// Fix zero-dates
foreach (["petsa", "submitted_at", "resolved_at"] as $col) {
    if (isset($rec[$col]) &&
        ($rec[$col] === "0000-00-00" || $rec[$col] === "0000-00-00 00:00:00")) {
        $rec[$col] = null;
    }
}

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
    return $ts ? date("F j, Y", $ts) : "-";
}
function fmtTime($t) {
    if (!$t) return "-";
    $parts = explode(":", $t);
    $h = intval($parts[0]);
    $m = isset($parts[1]) ? $parts[1] : "00";
    $ampm = $h >= 12 ? "PM" : "AM";
    $h12 = $h % 12;
    if ($h12 === 0) $h12 = 12;
    return $h12 . ":" . $m . " " . $ampm;
}
function safe($v) {
    return $v !== null && $v !== "" ? $v : "-";
}

// ── TCPDF Setup (Portrait A4 — single record form) ────────
$pdf = new TCPDF("P", PDF_UNIT, "A4", true, "UTF-8", false);
$pdf->SetCreator("Barangay Tugtug E-System");
$pdf->SetAuthor("Barangay Tugtug");
$pdf->SetTitle("Barangay Blotter — " . $rec["reference_number"]);
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);
$pdf->SetMargins(18, 14, 18);
$pdf->SetAutoPageBreak(true, 14);
$pdf->AddPage();

$pageW = $pdf->getPageWidth(); // 210mm
$usable = $pageW - 36;        // 174mm (18mm margin each side)

// ── Logo ─────────────────────────────────────────────────
$logoPath    = __DIR__ . "/../photos/logo.png.png";
$hasImageLib = extension_loaded("gd") || extension_loaded("imagick");
if ($hasImageLib && file_exists($logoPath)) {
    try {
        $pdf->Image($logoPath, 18, 10, 18, 18, "PNG", "", "T", false, 300, "", false, false, 0, false, false, false);
    } catch (Exception $e) { }
}

// ── Header ───────────────────────────────────────────────
$headerX = ($hasImageLib && file_exists($logoPath)) ? 38 : 18;
$headerW  = $pageW - $headerX - 18;

$pdf->SetFont("helvetica", "", 8);
$pdf->SetTextColor(80, 80, 80);
$pdf->SetXY($headerX, 10);
$pdf->Cell($headerW, 4, "Republic of the Philippines", 0, 1, "C");

$pdf->SetFont("helvetica", "", 8);
$pdf->SetX($headerX);
$pdf->Cell($headerW, 4, "PROVINCE OF BATANGAS  |  Municipality of San Jose", 0, 1, "C");

$pdf->SetFont("helvetica", "B", 16);
$pdf->SetTextColor(39, 59, 7);
$pdf->SetX($headerX);
$pdf->Cell($headerW, 7, "BARANGAY TUGTUG", 0, 1, "C");

$pdf->SetFont("helvetica", "B", 9);
$pdf->SetTextColor(60, 80, 20);
$pdf->SetX($headerX);
$pdf->Cell($headerW, 4, "OFFICE OF THE PUNONG BARANGAY", 0, 1, "C");

// Ref badge (top-right)

$pdf->SetFont("helvetica", "", 7.5);
$pdf->SetTextColor(100, 100, 100);
$pdf->SetXY($pageW - 60, 10);
$pdf->Cell(42, 4, "Reference No.", 0, 1, "R");
$pdf->SetFont("helvetica", "B", 9);
$pdf->SetTextColor(3, 47, 21);
$pdf->SetX($pageW - 60);
$pdf->Cell(42, 5, safe($rec["reference_number"]), 0, 1, "R");

$pdf->SetTextColor(0, 0, 0);
$pdf->SetFont("helvetica", "B", 7.5);
$pdf->SetX($pageW - 60);
$pdf->Cell(42, 5, $rec["status"], 0, 1, "R", false);

// ── Title bar ────────────────────────────────────────────
$pdf->SetY(32);
$pdf->SetDrawColor(0, 0, 0);
$pdf->SetLineWidth(0.6);
$pdf->SetFillColor(255, 255, 255);
$pdf->SetTextColor(0, 0, 0);
$pdf->SetFont("helvetica", "B", 13);
$pdf->Cell($usable, 7, "BARANGAY BLOTTER", "TB", 1, "C", false);
$pdf->Ln(3);

// ── Section: Complainee Information ──────────────────────
$pdf->SetFont("helvetica", "B", 8);
$pdf->SetTextColor(39, 59, 7);
$pdf->SetDrawColor(39, 59, 7);
$pdf->SetLineWidth(0.4);
$pdf->Cell($usable, 5, "COMPLAINEE INFORMATION", "B", 1, "L");
$pdf->Ln(1);

// Helper: labeled underline field (2-col)
function labelField($pdf, $x, $y, $w, $label, $value) {
    $pdf->SetFont("helvetica", "B", 7);
    $pdf->SetTextColor(80, 80, 80);
    $pdf->SetXY($x, $y);
    $pdf->Cell($w, 4, strtoupper($label), 0, 1, "L");
    $pdf->SetFont("helvetica", "", 9);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetXY($x, $y + 4);
    $pdf->SetDrawColor(80, 80, 80);
    $pdf->SetLineWidth(0.3);
    $pdf->Cell($w, 5, $value, "B", 0, "L");
}

$y = $pdf->GetY();
$half = $usable / 2;
$lx = 18;
$rx = 18 + $half + 4;

// NAME (full width)
$pdf->SetFont("helvetica", "B", 7);
$pdf->SetTextColor(80, 80, 80);
$pdf->SetXY($lx, $y);
$pdf->Cell($usable, 4, "NAME", 0, 1, "L");
$pdf->SetFont("helvetica", "", 9);
$pdf->SetTextColor(0, 0, 0);
$pdf->SetXY($lx, $y + 4);
$pdf->SetDrawColor(80, 80, 80);
$pdf->SetLineWidth(0.3);
$pdf->Cell($usable, 5, safe($rec["full_name"]), "B", 1, "L");
$pdf->Ln(3);

// AGE | CIVIL STATUS
$y = $pdf->GetY();
labelField($pdf, $lx, $y, $half - 4, "AGE", safe($rec["age"]));
labelField($pdf, $rx, $y, $half - 4, "CIVIL STATUS", safe($rec["civil_status"]));
$pdf->SetY($y + 12);
$pdf->Ln(1);

// ADDRESS (full width)
$y = $pdf->GetY();
$pdf->SetFont("helvetica", "B", 7);
$pdf->SetTextColor(80, 80, 80);
$pdf->SetXY($lx, $y);
$pdf->Cell($usable, 4, "ADDRESS", 0, 1, "L");
$pdf->SetFont("helvetica", "", 9);
$pdf->SetTextColor(0, 0, 0);
$pdf->SetXY($lx, $y + 4);
$pdf->SetDrawColor(80, 80, 80);
$pdf->SetLineWidth(0.3);
$pdf->Cell($usable, 5, safe($rec["address"]), "B", 1, "L");
$pdf->Ln(3);

// OCCUPATION (full width)
$y = $pdf->GetY();
$pdf->SetFont("helvetica", "B", 7);
$pdf->SetTextColor(80, 80, 80);
$pdf->SetXY($lx, $y);
$pdf->Cell($usable, 4, "OCCUPATION", 0, 1, "L");
$pdf->SetFont("helvetica", "", 9);
$pdf->SetTextColor(0, 0, 0);
$pdf->SetXY($lx, $y + 4);
$pdf->SetDrawColor(80, 80, 80);
$pdf->SetLineWidth(0.3);
$pdf->Cell($usable, 5, safe($rec["occupation"]), "B", 1, "L");
$pdf->Ln(5);

// ── Divider ──────────────────────────────────────────────
$pdf->SetDrawColor(39, 59, 7);
$pdf->SetLineWidth(0.25);
$pdf->Line($lx, $pdf->GetY(), $lx + $usable, $pdf->GetY());
$pdf->Ln(3);

// ── Section: Incident Details ─────────────────────────────
$pdf->SetFont("helvetica", "B", 8);
$pdf->SetTextColor(39, 59, 7);
$pdf->SetDrawColor(39, 59, 7);
$pdf->SetLineWidth(0.4);
$pdf->Cell($usable, 5, "INCIDENT DETAILS", "B", 1, "L");
$pdf->Ln(1);

// DATE | TIME
$y = $pdf->GetY();
labelField($pdf, $lx, $y, $half - 4, "PETSA (DATE OF INCIDENT)", fmtDate($rec["petsa"]));
labelField($pdf, $rx, $y, $half - 4, "ORAS (TIME OF INCIDENT)", fmtTime($rec["oras"]));
$pdf->SetY($y + 12);
$pdf->Ln(1);

// COMPLAINANT AGAINST (full width)
$y = $pdf->GetY();
$pdf->SetFont("helvetica", "B", 7);
$pdf->SetTextColor(80, 80, 80);
$pdf->SetXY($lx, $y);
$pdf->Cell($usable, 4, "NAGSADYA DITO SI (COMPLAINANT / COMPLAINT AGAINST)", 0, 1, "L");
$pdf->SetFont("helvetica", "", 9);
$pdf->SetTextColor(0, 0, 0);
$pdf->SetXY($lx, $y + 4);
$pdf->SetDrawColor(80, 80, 80);
$pdf->SetLineWidth(0.3);
$pdf->Cell($usable, 5, safe($rec["complaint_against"]), "B", 1, "L");
$pdf->Ln(3);

// COMPLAINT TYPE (full width)
$y = $pdf->GetY();
$pdf->SetFont("helvetica", "B", 7);
$pdf->SetTextColor(80, 80, 80);
$pdf->SetXY($lx, $y);
$pdf->Cell($usable, 4, "COMPLAINT TYPE", 0, 1, "L");
$pdf->SetFont("helvetica", "", 9);
$pdf->SetTextColor(0, 0, 0);
$pdf->SetXY($lx, $y + 4);
$pdf->SetDrawColor(80, 80, 80);
$pdf->SetLineWidth(0.3);
$pdf->Cell($usable, 5, safe($rec["complaint_type"]), "B", 1, "L");
$pdf->Ln(3);

// COMPLAINT DETAILS (multi-line box)
$y = $pdf->GetY();
$pdf->SetFont("helvetica", "B", 7);
$pdf->SetTextColor(80, 80, 80);
$pdf->SetXY($lx, $y);
$pdf->Cell($usable, 4, "REKLAMO / TULONG (COMPLAINT DETAILS)", 0, 1, "L");
$pdf->SetFont("helvetica", "", 9);
$pdf->SetTextColor(0, 0, 0);
$pdf->SetDrawColor(180, 180, 180);
$pdf->SetLineWidth(0.3);
$pdf->SetXY($lx, $y + 4);
$detailText = safe($rec["complaint_details"]);
$detailLines = $pdf->getNumLines($detailText, $usable);
$detailH = max($detailLines, 3) * 5;
$pdf->MultiCell($usable, 5, $detailText, 1, "L", false, 1);
$pdf->Ln(3);

// ── Location footer ───────────────────────────────────────
$pdf->SetFont("helvetica", "", 9);
$pdf->SetTextColor(0, 0, 0);
$pdf->SetDrawColor(0, 0, 0);
$pdf->SetLineWidth(0.3);
$y = $pdf->GetY();
$pdf->SetXY($lx, $y);
$pdf->Write(5, "Ipinatala ganap na ika ");
$pdf->SetFont("helvetica", "B", 9);
$pdf->SetDrawColor(80, 80, 80);
// blank underline for day
$pdf->Cell(20, 5, "", "B", 0, "C");
$pdf->SetFont("helvetica", "", 9);
$pdf->Write(5, " ng, ika ");
$pdf->Cell(14, 5, "", "B", 0, "C");
$pdf->Write(5, " ng ");
$pdf->Cell(28, 5, "", "B", 0, "C");
$pdf->Write(5, ", 20");
$pdf->Cell(12, 5, "", "B", 0, "C");
$pdf->Ln(6);
$pdf->SetXY($lx, $pdf->GetY());
$pdf->Write(5, "Tanggapan ng Punong Barangay, Tugtug, San Jose, Batangas.");
$pdf->Ln(7);

// ── Divider ──────────────────────────────────────────────
$pdf->SetDrawColor(39, 59, 7);
$pdf->SetLineWidth(0.25);
$pdf->Line($lx, $pdf->GetY(), $lx + $usable, $pdf->GetY());
$pdf->Ln(6);

// ── Signature section ────────────────────────────────────
$sigW = $usable / 3;

// Complainant (2/3 width)
$y = $pdf->GetY();
$pdf->SetDrawColor(0, 0, 0);
$pdf->SetLineWidth(0.3);
$pdf->SetXY($lx, $y);
$pdf->Cell($sigW * 2 - 6, 12, "", 0, 0);
$pdf->Line($lx, $y + 12, $lx + $sigW * 2 - 6, $y + 12);
$pdf->SetFont("helvetica", "B", 7);
$pdf->SetTextColor(60, 60, 60);
$pdf->SetXY($lx, $y + 13);
$pdf->Cell($sigW * 2 - 6, 4, "PANGALAN / LAGDA SA IBABAW NG NAGREREKLAMO", 0, 0, "C");

// Kagawad on Duty (1/3 width)
$kagX = $lx + $sigW * 2;
$pdf->SetXY($kagX, $y);
$pdf->Cell($sigW - 4, 12, "", 0, 0);
$pdf->Line($kagX, $y + 12, $kagX + $sigW - 4, $y + 12);
$pdf->SetXY($kagX, $y + 13);
$pdf->Cell($sigW - 4, 4, "NAGPATOTOO: Kagawad on Duty", 0, 0, "C");

$pdf->Ln(20);

// Witnesses row
$y = $pdf->GetY();
$wW = ($usable / 2) - 3;

$pdf->SetXY($lx, $y);
$pdf->Cell($wW, 12, "", 0, 0);
$pdf->Line($lx, $y + 12, $lx + $wW, $y + 12);
$pdf->SetFont("helvetica", "B", 7);
$pdf->SetTextColor(60, 60, 60);
$pdf->SetXY($lx, $y + 13);
$pdf->Cell($wW, 4, "SAKSI (WITNESS)", 0, 0, "C");

$w2X = $lx + $wW + 6;
$pdf->SetXY($w2X, $y);
$pdf->Cell($wW, 12, "", 0, 0);
$pdf->Line($w2X, $y + 12, $w2X + $wW, $y + 12);
$pdf->SetXY($w2X, $y + 13);
$pdf->Cell($wW, 4, "SAKSI (WITNESS)", 0, 0, "C");

$pdf->Ln(20);

// ── Resolution / Escalation / Dismissal block ─────────────
$isTerminal = in_array($rec["status"], ["Resolved", "Escalated", "Dismissed"]);
if ($isTerminal) {
    $pdf->SetDrawColor(39, 59, 7);
    $pdf->SetLineWidth(0.25);
    $pdf->Line($lx, $pdf->GetY(), $lx + $usable, $pdf->GetY());
    $pdf->Ln(3);

    $sectionLabel = $rec["status"] === "Escalated"
        ? "ESCALATION DETAILS"
        : ($rec["status"] === "Dismissed"
            ? "DISMISSAL DETAILS"
            : "RESOLUTION DETAILS");

    $pdf->SetFont("helvetica", "B", 8);
    $pdf->SetTextColor(39, 59, 7);
    $pdf->SetDrawColor(39, 59, 7);
    $pdf->SetLineWidth(0.4);
    $pdf->Cell($usable, 5, $sectionLabel, "B", 1, "L");
    $pdf->Ln(1);

    $y = $pdf->GetY();
    $dateLabel = "DATE " . strtoupper($rec["status"]);
    labelField($pdf, $lx, $y, $half - 4, $dateLabel, fmtDate($rec["resolved_at"]));

    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont("helvetica", "B", 8.5);
    $pdf->SetXY($rx, $y + 4);
    $pdf->Cell($half - 4, 6, "STATUS: " . $rec["status"], 1, 0, "C", false);

    $pdf->SetY($y + 14);
}

// ── Footer ────────────────────────────────────────────────
$pdf->SetDrawColor(39, 59, 7);
$pdf->SetLineWidth(0.4);
$footY = $pdf->GetPageHeight() - 14;
$pdf->Line($lx, $footY, $lx + $usable, $footY);
$pdf->SetXY($lx, $footY + 2);
$pdf->SetFont("helvetica", "I", 7);
$pdf->SetTextColor(150, 150, 150);
$today = date("F j, Y");
$pdf->Cell(0, 4,
    "Printed on: " . $today .
    "  |  Barangay Tugtug E-System  |  Ref: " . safe($rec["reference_number"]),
    0, 1, "C");

$pdf->Output("blotter_" . safe($rec["reference_number"]) . ".pdf", "I");
?>