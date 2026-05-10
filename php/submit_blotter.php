<?php
$servername = "localhost";
$username = "root";
$password = "";
$database = "db-barangay-system";

$conn = mysqli_connect($servername, $username, $password, $database);

if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // Inputs
    $first_name = trim($_POST["first_name"]);
    $last_name = trim($_POST["last_name"]);
    $middle_name = trim($_POST["middle_name"]);
    $suffix = $_POST["suffix"];
    $age = intval($_POST["age"]);
    $civil_status = $_POST["civil_status"];
    $address = trim($_POST["address"]);
    $occupation = trim($_POST["occupation"]);
    $incident_date = $_POST["incident_date"];
    $incident_time = $_POST["incident_time"];
    $complaint_against = trim($_POST["complaint_against"]);
    $complaint_type = $_POST["complaint_type"];
    $complaint_details = trim($_POST["complaint_details"]);

    // 1. Validation: No numbers in names
    if (
        preg_match("/[0-9]/", $first_name) ||
        preg_match("/[0-9]/", $last_name)
    ) {
        header("Location: ../blotterdemo.html?error=name_numbers");
        exit();
    }

    // 2. File Upload Handling
    $target_dir = "uploadsblot/";
    if (!is_dir($target_dir)) {
        mkdir($target_dir, 0777, true);
    }

    $file_ext = pathinfo($_FILES["id_image"]["name"], PATHINFO_EXTENSION);
    $new_filename = "ID_" . time() . "_" . $last_name . "." . $file_ext;
    $id_image_path = $target_dir . $new_filename;

    if (!move_uploaded_file($_FILES["id_image"]["tmp_name"], $id_image_path)) {
        header("Location: ../blotterdemo.html?error=upload_fail");
        exit();
    }

    // Generate Reference

    $ref_number =
        "BRGY-" .
        date("Y") .
        "-" .
        str_pad(mt_rand(1, 99999), 4, "0", STR_PAD_LEFT);

    // 3. Database Insertion (Matching your 'blotter' table columns)
    $sql = "INSERT INTO blotter (
        reference_number, first_name, middle_name, last_name, suffix,
        age, civil_status, address, occupation,
        petsa, oras, complaint_against, complaint_type, complaint_details,
        id_image_path, status, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())";

    $stmt = mysqli_prepare($conn, $sql);

    if ($stmt) {
        // "sssssisssssssss" = 15 placeholders
        mysqli_stmt_bind_param(
            $stmt,
            "sssssisssssssss",
            $ref_number,
            $first_name,
            $middle_name,
            $last_name,
            $suffix,
            $age,
            $civil_status,
            $address,
            $occupation,
            $incident_date,
            $incident_time,
            $complaint_against,
            $complaint_type,
            $complaint_details,
            $id_image_path,
        );

        if (mysqli_stmt_execute($stmt)) {
            header("Location: ../blotterthankyou.html?ref=" . $ref_number);
            exit();
        } else {
            header("Location: ../blotterdemo.html?error=db_fail");
            exit();
        }
    } else {
        header("Location: ../blotterdemo.html?error=prepare_fail");
        exit();
    }
}
mysqli_close($conn);
?>
