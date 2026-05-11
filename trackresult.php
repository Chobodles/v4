<?php
/* ============================================================
   Barangay Tugtug E-System — Track Request (MySQLi Version)
   File: trackresult.php
   ============================================================ */

// --- Database Configuration ---
$db_host = "localhost";
$db_name = "db-barangay-system";
$db_user = "root";
$db_pass = "";

// Establish connection
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$ref = isset($_GET["ref"]) ? strtoupper(trim($_GET["ref"])) : "";
$resultData = null;
$errorMsg = null;
$type = null;

if (!empty($ref)) {
    // --- Blotter Lookup (BRGY- prefix) ---
    if (str_starts_with($ref, "BRGY-")) {
        $stmt = $conn->prepare(
            "SELECT * FROM blotter WHERE reference_number = ? LIMIT 1",
        );
        $stmt->bind_param("s", $ref);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        if ($row) {
            $type = "blotter";
            $resultData = [
                "ref" => $row["reference_number"],
                "name" => trim($row["first_name"] . " " . $row["last_name"]),
                "target" => $row["complaint_against"],
                "date" => $row["petsa"],
                "status" => $row["status"],
                "details" => $row["complaint_details"],
                "price" => "Free",
            ];
        } else {
            $errorMsg = "Blotter record not found.";
        }
        $stmt->close();

        // --- Document Lookup (DOC- prefix) ---
    } elseif (str_starts_with($ref, "DOC-")) {
        $query = "
            SELECT dr.*, ri.first_name, ri.last_name, d.document_type, d.price
            FROM document_request dr
            JOIN resident_information ri ON dr.resident_ID = ri.resident_ID
            LEFT JOIN documents d ON dr.document_ID = d.document_ID
            WHERE dr.document_refnumber = ? LIMIT 1";

        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $ref);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        if ($row) {
            $type = "document";

            // Calculate Total: Price * Quantity
            $unitPrice = $row["price"] ?? 0;
            $quantity = $row["quantity"] ?? 1;
            $totalPrice = $unitPrice * $quantity;

            $resultData = [
                "ref" => $row["document_refnumber"],
                "name" => $row["first_name"] . " " . $row["last_name"],
                "doc_type" => $row["document_type"] ?? "General Document",
                "date" => $row["date"],
                "status" => $row["status"],
                "qty" => $quantity,
                "purpose" => $row["document_purpose"],
                "price" =>
                    $totalPrice == 0
                        ? "Free"
                        : "₱" . number_format($totalPrice, 2),
            ];
        } else {
            $errorMsg = "Document request not found.";
        }
        $stmt->close();
    } else {
        $errorMsg = "Invalid format. Use BRGY-YEAR-XXXX or DOC-YEAR-XXXX.";
    }
}

// Visual Helper for Status Icons and Colors
function getStatusMeta($status)
{
    $meta = [
        "Pending" => [
            "bg" => "#fff7ed",
            "border" => "#fb923c",
            "text" => "#9a3412",
            "icon" => "⏳",
        ],
        "Processing" => [
            "bg" => "#eff6ff",
            "border" => "#60a5fa",
            "text" => "#1e40af",
            "icon" => "🔄",
        ],
        "Ready" => [
            "bg" => "#f0fdf4",
            "border" => "#4ade80",
            "text" => "#166534",
            "icon" => "✅",
        ],
        "Resolved" => [
            "bg" => "#f0fdf4",
            "border" => "#4ade80",
            "text" => "#166534",
            "icon" => "✅",
        ],
        "Escalated" => [
            "bg" => "#fef2f2",
            "border" => "#fca5a5",
            "text" => "#991b1b",
            "icon" => "🔺",
        ],
    ];
    return $meta[$status] ?? [
        "bg" => "#f9fafb",
        "border" => "#d1d5db",
        "text" => "#374151",
        "icon" => "ℹ️",
    ];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Track Request | Barangay Tugtug</title>
    <link rel="icon" href="photos/logo.png.png"/>
    <link rel="stylesheet" href="cssfile/trackresult.css"/>
</head>
<body>

    <button class="btn-back" onclick="location.href='residentchoice.html'">
        <img class="backbutton" src="photos/backbutton.png" alt="Back">
        <label class="back">Back</label>
    </button>

    <div class="track-container">
        <div class="search-section">
            <div class="search-header">
                <img class="track-logo" src="photos/logo.png.png" alt="Barangay Logo"/>
                <div>
                    <h1 class="track-title">Track Your Request</h1>
                    <p class="track-sub">Check the real-time status of your application</p>
                </div>
            </div>

            <form action="trackresult.php" method="GET" class="search-box">
                <input type="text" name="ref" class="ref-input"
                       placeholder="BRGY-2026-55804 or DOC-2026-57037"
                       value="<?php echo htmlspecialchars(
                           $ref,
                       ); ?>" required autofocus>
                <button type="submit" class="search-btn">🔍 Track</button>
            </form>
        </div>

        <?php if ($errorMsg): ?>
            <div class="result-section">
                <div class="error-box">
                    <span style="font-size:30px;">❌</span>
                    <p><?php echo $errorMsg; ?></p>
                </div>
            </div>
        <?php endif; ?>

        <?php if ($resultData):
            $meta = getStatusMeta($resultData["status"]); ?>
            <div class="result-section">
                <div class="result-type-badge" style="background: <?php echo $type ==
                "blotter"
                    ? "#fef2f2"
                    : "#f0fdf4"; ?>; color: <?php echo $type == "blotter"
    ? "#991b1b"
    : "#166534"; ?>; border: 1.5px solid <?php echo $type == "blotter"
    ? "#fca5a5"
    : "#86efac"; ?>;">
                    <?php echo $type == "blotter"
                        ? "🚨 Blotter Report"
                        : "📄 Document Request"; ?>
                </div>

                <div class="result-ref-box">
                    <span class="ref-label-sm">REFERENCE NUMBER</span>
                    <h2 class="result-ref-num"><?php echo $resultData[
                        "ref"
                    ]; ?></h2>
                </div>

                <div class="status-banner" style="background:<?php echo $meta[
                    "bg"
                ]; ?>; border:2px solid <?php echo $meta["border"]; ?>;">
                    <span class="status-label" style="color:<?php echo $meta[
                        "text"
                    ]; ?>;">STATUS</span>
                    <span class="status-value" style="color:<?php echo $meta[
                        "text"
                    ]; ?>;">
                        <?php echo $meta["icon"] .
                            " " .
                            $resultData["status"]; ?>
                    </span>
                </div>

                <div class="price-banner">
                    <span class="price-label">AMOUNT TO PAY</span>
                    <span class="price-value"><?php echo $resultData[
                        "price"
                    ]; ?></span>
                </div>

                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-key">Full Name</span>
                        <span class="detail-val"><?php echo htmlspecialchars(
                            $resultData["name"],
                        ); ?></span>
                    </div>
                    <?php if ($type == "blotter"): ?>
                        <div class="detail-item">
                            <span class="detail-key">Complained Against</span>
                            <span class="detail-val"><?php echo htmlspecialchars(
                                $resultData["target"],
                            ); ?></span>
                        </div>
                    <?php else: ?>
                        <div class="detail-item">
                            <span class="detail-key">Document Type</span>
                            <span class="detail-val"><?php echo htmlspecialchars(
                                $resultData["doc_type"],
                            ); ?></span>
                        </div>
                    <?php endif; ?>

                    <div class="detail-item">
                        <span class="detail-key">Date Filed</span>
                        <span class="detail-val"><?php echo date(
                            "M d, Y",
                            strtotime($resultData["date"]),
                        ); ?></span>
                    </div>

                    <?php if ($type == "document"): ?>
                        <div class="detail-item">
                            <span class="detail-key">Quantity</span>
                            <span class="detail-val"><?php echo $resultData[
                                "qty"
                            ]; ?></span>
                        </div>
                    <?php endif; ?>

                    <div class="detail-item full">
                        <span class="detail-key"><?php echo $type == "blotter"
                            ? "Complaint Details"
                            : "Purpose"; ?></span>
                        <span class="detail-val"><?php echo htmlspecialchars(
                            $resultData["details"] ?? $resultData["purpose"],
                        ); ?></span>
                    </div>
                </div>
<!--ARE YUNG NASA BABA NA PART-->
                <!--<div class="progress-section">
                    <h4 class="progress-title">REQUEST PROGRESS</h4>
                    <div class="progress-steps">
                        <?php
                        $steps =
                            $type == "blotter"
                                ? ["Pending", "Processing", "Resolved"]
                                : ["Pending", "Processing", "Ready"];

                        $currentIdx = array_search(
                            $resultData["status"],
                            $steps,
                        );
                        // If escalated, we keep it at the processing stage visually
                        if (
                            $currentIdx === false &&
                            $resultData["status"] == "Escalated"
                        ) {
                            $currentIdx = 1;
                        }

                        foreach ($steps as $idx => $stepName):

                            $class =
                                $idx < $currentIdx
                                    ? "done"
                                    : ($idx == $currentIdx
                                        ? "active"
                                        : "");
                            $icon =
                                $stepName == "Pending"
                                    ? "📝"
                                    : ($stepName == "Processing"
                                        ? "🔄"
                                        : "✅");
                            ?>
                            <div class="step <?php echo $class; ?>">
                                <div class="step-dot"><?php echo $icon; ?></div>
                                <span class="step-label"><?php echo $stepName; ?></span>
                            </div>
                        <?php
                        endforeach;
                        ?>
                    </div>
                </div>-->

                <!--Until here-->
            </div>
        <?php
        endif; ?>
    </div>

    <script>
        // UX: Auto-uppercase input
        document.querySelector('.ref-input').addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    </script>
</body>
</html>
<?php $conn->close(); ?>
