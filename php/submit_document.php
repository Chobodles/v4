<?php
require "../include/conn.php";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // 1. Capture Form Inputs
    $first_name = trim($_POST["first_name"]);
    $last_name = trim($_POST["last_name"]);
    $middle_name = trim($_POST["middle_name"]);
    $suffix = $_POST["suffix"];
    $birthday = $_POST["birthday"];
    $age = intval($_POST["age"]);
    $gender = $_POST["gender"];
    $civil_status = $_POST["civil_status"];
    $contact = $_POST["contact"];
    $birthplace = $_POST["birthplace"];
    $stay_years = intval($_POST["stay_years"]);
    $stay_months = intval($_POST["stay_months"]);
    $doc_id = intval($_POST["txtdocumenttype"]);
    $quantity = intval($_POST["quantity"]);
    $purpose = trim($_POST["purpose"]);

    // 2. Validation: Names should not contain numbers (Blotter Logic)
    if (
        preg_match("/[0-9]/", $first_name) ||
        preg_match("/[0-9]/", $last_name)
    ) {
        header("Location: ../residentform.php?error=name_numbers");
        exit();
    }

    // 3. ID Image Upload Handling
    $target_dir = "../uploads/ids/";
    if (!is_dir($target_dir)) {
        mkdir($target_dir, 0777, true);
    }

    $file_extension = pathinfo($_FILES["id_image"]["name"], PATHINFO_EXTENSION);
    $new_filename = "ID_" . time() . "_" . $last_name . "." . $file_extension;
    $target_file = $target_dir . $new_filename;
    $db_save_path = "uploads/ids/" . $new_filename;

    if (!move_uploaded_file($_FILES["id_image"]["tmp_name"], $target_file)) {
        header("Location: ../residentform.php?error=upload_fail");
        exit();
    }

    // 4. Fetch Document Type Name (to display on success page)
    $doc_name = "Document";
    $get_doc = $conn->prepare(
        "SELECT document_type FROM documents WHERE document_ID = ?",
    );
    $get_doc->bind_param("i", $doc_id);
    $get_doc->execute();
    $doc_res = $get_doc->get_result();
    if ($d_row = $doc_res->fetch_assoc()) {
        $doc_name = $d_row["document_type"];
    }

    // 5. Generate Unique Reference Number
    $ref_number =
        "DOC-" .
        date("Y") .
        "-" .
        str_pad(mt_rand(1, 99999), 4, "0", STR_PAD_LEFT);

    // 6. Resident Logic: Check/Insert resident
    $check_res = $conn->prepare(
        "SELECT resident_ID FROM resident_information WHERE first_name = ? AND last_name = ? AND birthdate = ? LIMIT 1",
    );
    $check_res->bind_param("sss", $first_name, $last_name, $birthday);
    $check_res->execute();
    $res_result = $check_res->get_result();

    if ($row = $res_result->fetch_assoc()) {
        $resident_id = $row["resident_ID"];
    } else {
        $mi = !empty($middle_name)
            ? strtoupper(substr($middle_name, 0, 1))
            : "";
        $sex_mapped = $gender === "Male" ? "M" : "F";

        $ins_res = $conn->prepare(
            "INSERT INTO resident_information (first_name, last_name, middle_initial, suffix, sex, birthdate, birthplace) VALUES (?, ?, ?, ?, ?, ?, ?)",
        );
        $ins_res->bind_param(
            "sssssss",
            $first_name,
            $last_name,
            $mi,
            $suffix,
            $sex_mapped,
            $birthday,
            $birthplace,
        );
        $ins_res->execute();
        $resident_id = $conn->insert_id;
    }

    // 7. Insert Document Request
    $sql = "INSERT INTO document_request (
                document_refnumber,
                resident_ID,
                document_ID,
                contact,
                document_purpose,
                quantity,
                age,
                length_stay_years,
                length_stay_months,
                id_image_path,
                date,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Pending')";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "siisssiiis",
        $ref_number,
        $resident_id,
        $doc_id,
        $contact,
        $purpose,
        $quantity,
        $age,
        $stay_years,
        $stay_months,
        $db_save_path,
    );

    if ($stmt->execute()) {
        // SUCCESS REDIRECT: Similar to Blotter, sending data via URL to the HTML page
        header(
            "Location: ../DocumentSuccess.html?ref=" .
                urlencode($ref_number) .
                "&type=" .
                urlencode($doc_name),
        );
    } else {
        header("Location: ../residentform.php?error=db_fail");
    }

    $stmt->close();
    $conn->close();
    exit();
}
?>
