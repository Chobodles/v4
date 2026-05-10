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
        <title>Home | Barangay Tugtug E-System</title>
        <script src="Javascript/Dashboard.js"></script>
        <link rel="stylesheet" href="cssfile/Dashboard.css"/>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <link rel="icon" href="photos/logo.png.png"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
        <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap" rel="stylesheet"/>
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
                <image class="Logo" src="photos/logo.png.png" alt="Error to Load Image"></image>
                <h2 class="E-System">Barangay E-System</h2>

                <div class="home-container">
                    <button class="Home" type="button">
                        <image class="picture-home" src="photos/home.png"></image>
                    </button>
                    <h3 class="Home-word">Home</h3>
                </div>

                <div class="document-container" onclick="window.location.href='Documentrequest.php'">
                    <button class="Document" type="button" onclick="window.location.href='Documentrequest.php'">
                        <image class="picture-document" src="photos/Document.png"></image>
                    </button>
                    <h3 class="Document-word">Document Requests</h3>
                </div>

                <div class="blotter-container" onclick="window.location.href='Blotter.php'">
                    <button class="Blotter" type="button" onclick="window.location.href='Blotter.php'">
                        <image class="picture-blotter" src="photos/Blotter.png"></image>
                    </button>
                    <h3 class="Blotter-word">Blotter Dashboard</h3>
                </div>

                <hr class="sidebar-divider2"/>

                <div class="analytics-container" onclick="window.location.href='Analytics.php'">
                    <button class="Analytics" type="button" onclick="window.location.href='Analytics.php'">
                        <image class="picture-analytics" src="photos/Analytics.png"></image>
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
            <h1 class="home-title">Home</h1>
        </nav>

        <section class="calendar-wrapper">
            <div class="calendar-header">
                <button id="prevMonth">Previous</button>
                <h2 id="monthYearText">Month Year</h2>
                <button id="nextMonth">Next</button>
            </div>

            <div class="calendar-grid">
                <div class="day-name">Sun</div><div class="day-name">Mon</div>
                <div class="day-name">Tue</div><div class="day-name">Wed</div>
                <div class="day-name">Thu</div><div class="day-name">Fri</div>
                <div class="day-name">Sat</div>
                <div id="calendarDates" class="dates-container"></div>
            </div>
        </section>

        <section class="document-latest-container">
            <label class="dtitle">Document Requests</label>
        </section>

        <section class="blotter-latest-container">
            <label class="btitle">Blotter Requests</label>
        </section>

        <div class="spacer"></div>

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
