<?php
session_start();
if (!isset($_SESSION["logged_in"]) || $_SESSION["logged_in"] !== true) {
    header("Location: Login.html");
    exit();
}
?>
<!DOCTYPE html>
<html>
    <head>
        <title>Analytics | Barangay Tugtug E-System</title>
        <link rel="stylesheet" href="cssfile/Dashboard.css"/>
        <link rel="stylesheet" href="cssfile/Analytics.css"/>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <link rel="icon" href="photos/logo.png.png"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
        <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap" rel="stylesheet"/>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"/>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
        <style>
            .logout-container {
                position: relative;
                top: 28vh;
                left: 1vw;
                width: 3.4vw;
                height: 6vh;
                background-color: transparent;
                border-radius: 10px;
                cursor: pointer;
            }
            .logout-container:hover {
                background-color: rgb(180, 40, 40);
            }
            .sidebar-container:hover .logout-container {
                position: relative;
                bottom: 4vh;
                left: 1vw;
                width: 200vw;
                height: 6vh;
                cursor: pointer;
            }
            .logout-container .picture-logout {
                width: 2vw;
                position: relative;
                top: 10%;
                left: 8%;
                visibility: visible;
            }
            .sidebar-container:hover .logout-container .picture-logout {
                position: relative;
                bottom: 50%;
                right: 15vw;
                width: 2vw;
                visibility: visible;
            }
            .Logout-btn {
                background-color: transparent;
                border-color: transparent;
                cursor: pointer;
            }
            .Logout-word {
                display: flex;
                align-items: center;
                font-size: 0;
                color: rgb(205, 205, 181);
                font-family: system-ui, sans-serif;
                visibility: hidden;
                transition: opacity 0.3s ease-in-out;
            }
            .sidebar-container:hover .Logout-word {
                visibility: visible;
                position: relative;
                bottom: 90%;
                left: 5vw;
                font-size: 2vh;
                color: rgb(255, 180, 180);
            }
            .logout-container:hover .Logout-word {
                color: white;
            }
        </style>
    </head>

    <body>
        <nav class="sidebar-container">
            <div class="Logo-container">
                <image class="Logo" src="photos/logo.png.png" alt="Logo"></image>
                <h2 class="E-System">Barangay E-System</h2>

                <div class="home-container" onclick="window.location.href='Dashboard.php'">
                    <button class="Home" type="button">
                        <image class="picture-home" src="photos/Home.png"></image>
                    </button>
                    <h3 class="Home-word">Home</h3>
                </div>

                <div class="document-container" onclick="window.location.href='Documentrequest.php'">
                    <button class="Document" type="button">
                        <image class="picture-document" src="photos/Document.png"></image>
                    </button>
                    <h3 class="Document-word">Document Requests</h3>
                </div>

                <div class="blotter-container" onclick="window.location.href='Blotter.php'">
                    <button class="Blotter" type="button">
                        <image class="picture-blotter" src="photos/Blotter.png"></image>
                    </button>
                    <h3 class="Blotter-word">Blotter Dashboard</h3>
                </div>

                <hr class="sidebar-divider2"/>

                <div class="analytics-container analytics-active">
                    <button class="Analytics-btn" type="button">
                        <i class="fa fa-bar-chart analytics-icon"></i>
                    </button>
                    <h3 class="Analytics-word">Analytics</h3>
                </div>

                <div class="logout-container" onclick="logoutUser()">
                    <button class="Logout-btn" type="button">
                        <img class="picture-logout" src="photos/Logout.png" alt="Logout"/>
                    </button>
                    <h3 class="Logout-word">Logout</h3>
                </div>

            </div>
        </nav>

        <nav class="upbar-container">
            <h1 class="home-title">Analytics</h1>
        </nav>

        <div class="analytics-page-wrapper">

            <section class="analytics-card" id="doc-analytics-card">
                <div class="card-header">
                    <div class="card-title-group">
                        <i class="fa fa-file-text card-icon"></i>
                        <h2 class="card-title">Document Requests by Type</h2>
                    </div>
                    <div class="card-controls">
                        <label class="ctrl-label">Month</label>
                        <select id="doc-month-select" class="ctrl-select">
                            <option value="1">January</option>
                            <option value="2">February</option>
                            <option value="3">March</option>
                            <option value="4">April</option>
                            <option value="5">May</option>
                            <option value="6">June</option>
                            <option value="7">July</option>
                            <option value="8">August</option>
                            <option value="9">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                        </select>
                        <label class="ctrl-label">Year</label>
                        <select id="doc-year-select" class="ctrl-select"></select>
                        <button id="doc-load-btn" class="ctrl-btn">
                            <i class="fa fa-refresh"></i> Load
                        </button>
                    </div>
                </div>
                <div class="chart-area" id="doc-chart-area">
                    <div class="chart-placeholder" id="doc-placeholder">
                        <i class="fa fa-bar-chart placeholder-icon"></i>
                        <p>Select a month and year, then click <strong>Load</strong> to view document request data.</p>
                    </div>
                    <div class="chart-canvas-wrapper" id="doc-canvas-wrapper" style="display:none;">
                        <canvas id="docChart"></canvas>
                    </div>
                </div>
                <div class="summary-row" id="doc-summary" style="display:none;">
                    <div class="summary-chip total-chip">
                        <span class="chip-label">Total Requests</span>
                        <span class="chip-value" id="doc-total-val">0</span>
                    </div>
                    <div class="summary-chip top-chip">
                        <span class="chip-label">Most Requested</span>
                        <span class="chip-value" id="doc-top-val">—</span>
                    </div>
                </div>
            </section>

            <section class="analytics-card" id="blotter-analytics-card">
                <div class="card-header">
                    <div class="card-title-group">
                        <i class="fa fa-shield card-icon"></i>
                        <h2 class="card-title">Blotter Cases per Month</h2>
                    </div>
                    <div class="card-controls">
                        <label class="ctrl-label">Year</label>
                        <select id="blotter-year-select" class="ctrl-select"></select>
                        <button id="blotter-load-btn" class="ctrl-btn">
                            <i class="fa fa-refresh"></i> Load
                        </button>
                    </div>
                </div>
                <div class="chart-area" id="blotter-chart-area">
                    <div class="chart-placeholder" id="blotter-placeholder">
                        <i class="fa fa-shield placeholder-icon"></i>
                        <p>Select a year, then click <strong>Load</strong> to view blotter case data.</p>
                    </div>
                    <div class="chart-canvas-wrapper" id="blotter-canvas-wrapper" style="display:none;">
                        <canvas id="blotterChart"></canvas>
                    </div>
                </div>
                <div class="summary-row" id="blotter-summary" style="display:none;">
                    <div class="summary-chip total-chip">
                        <span class="chip-label">Total Filed</span>
                        <span class="chip-value" id="blotter-total-val">0</span>
                    </div>
                    <div class="summary-chip resolved-chip">
                        <span class="chip-label">Resolved</span>
                        <span class="chip-value" id="blotter-resolved-val">0</span>
                    </div>
                    <div class="summary-chip escalated-chip">
                        <span class="chip-label">Escalated</span>
                        <span class="chip-value" id="blotter-escalated-val">0</span>
                    </div>
                    <div class="summary-chip dismissed-chip">
                        <span class="chip-label">Dismissed</span>
                        <span class="chip-value" id="blotter-dismissed-val">0</span>
                    </div>
                    <div class="summary-chip pending-chip">
                        <span class="chip-label">Pending</span>
                        <span class="chip-value" id="blotter-pending-val">0</span>
                    </div>
                </div>
            </section>

        </div>

        <div class="spacer"></div>

        <script src="Javascript/Analytics.js"></script>
        <script>
            function logoutUser() {
                fetch("php/Logout.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        window.location.href = "Login.html";
                    }
                })
                .catch(() => {
                    window.location.href = "Login.html";
                });
            }
        </script>
    </body>
</html>
