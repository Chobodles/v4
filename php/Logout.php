<?php
// ============================================================
//  Barangay Tugtug E-System — Logout
//  File: php/Logout.php
// ============================================================
header("Content-Type: application/json");
session_start();
session_unset();
session_destroy();
echo json_encode(["success" => true]);
exit();
?>
