// ============================================================
//  Barangay Tugtug E-System — Login Logic
//  File: Javascript/Login.js
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

    const submitBtn  = document.getElementById("submit-button");
    const emailInput = document.getElementById("Email");
    const passInput  = document.getElementById("Password");

    // ── 1. Remove inline onclick so PHP handles auth ──────────
    submitBtn.removeAttribute("onclick");

    // ── 2. Feedback label ─────────────────────────────────────
    const feedback = document.createElement("p");
    feedback.id = "login-feedback";
    feedback.style.cssText = `
        position  : absolute;
        bottom    : 12%;
        left      : 7%;
        right     : 7%;
        color     : #ff6b6b;
        font-size : 13px;
        font-family: system-ui, sans-serif;
        text-align: center;
        margin    : 0;
        display   : none;
    `;
    submitBtn.parentElement.appendChild(feedback);

    function showFeedback(msg, color = "#ff6b6b") {
        feedback.textContent   = msg;
        feedback.style.color   = color;
        feedback.style.display = "block";
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async function handleLogin() {

        const email    = emailInput.value.trim();
        const password = passInput.value;

        if (!email || !password) {
            showFeedback("Please fill in both fields.");
            return;
        }
        if (!isValidEmail(email)) {
            showFeedback("Please enter a valid email address.");
            return;
        }

        submitBtn.disabled    = true;
        submitBtn.textContent = "Logging in…";
        feedback.style.display = "none";

        try {
            const response = await fetch("php/Login.php", {
                method  : "POST",
                headers : { "Content-Type": "application/json" },
                body    : JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                showFeedback("Login successful! Redirecting…", "#6bffb8");
                document.body.classList.add("fade-out");

                setTimeout(() => {
                    // ── Redirect to PHP-protected dashboard ──
                    window.location.href = "Dashboard.php";
                }, 500);

            } else {
                showFeedback(result.message || "Invalid email or password.");
                submitBtn.disabled    = false;
                submitBtn.textContent = "Log-in";
            }

        } catch (error) {
            console.error("Login error:", error);
            showFeedback("Server error. Please try again later.");
            submitBtn.disabled    = false;
            submitBtn.textContent = "Log-in";
        }
    }

    submitBtn.addEventListener("click", handleLogin);

    [emailInput, passInput].forEach(input => {
        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") handleLogin();
        });
    });

});
