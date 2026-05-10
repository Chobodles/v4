// ============================================================
//  Barangay Tugtug E-System — Track Request JS
//  File: Javascript/trackresult.js
// ============================================================

// Allow Enter key to trigger search
document.getElementById("ref-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") trackRequest();
});

// Auto-uppercase while typing
document.getElementById("ref-input").addEventListener("input", function () {
    const pos = this.selectionStart;
    this.value = this.value.toUpperCase();
    this.setSelectionRange(pos, pos);
});

// Check if a ref was passed via URL
window.addEventListener("load", function () {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
        document.getElementById("ref-input").value = ref.toUpperCase();
        trackRequest();
    }
});

function trackRequest() {
    const ref = document.getElementById("ref-input").value.trim().toUpperCase();

    if (!ref) {
        alert("Please enter a reference number.");
        return;
    }

    const resultSection  = document.getElementById("result-section");
    const resultLoading  = document.getElementById("result-loading");
    const resultError    = document.getElementById("result-error");
    const resultCard     = document.getElementById("result-card");

    resultSection.style.display = "block";
    resultLoading.style.display = "block";
    resultError.style.display   = "none";
    resultCard.style.display    = "none";

    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

    fetch("php/track_request.php?ref=" + encodeURIComponent(ref))
        .then(res => res.json())
        .then(data => {
            resultLoading.style.display = "none";

            if (!data.success) {
                document.getElementById("error-message").textContent = data.message || "Reference number not found.";
                resultError.style.display = "block";
                return;
            }

            renderResult(data);
            resultCard.style.display = "block";
        })
        .catch(() => {
            resultLoading.style.display = "none";
            document.getElementById("error-message").textContent = "Server error. Please try again.";
            resultError.style.display = "block";
        });
}

function renderResult(data) {
    const d    = data.data;
    const type = data.type; // "blotter" or "document"

    // ── Type badge ────────────────────────────────────────────
    const badge = document.getElementById("result-type-badge");
    if (type === "blotter") {
        badge.textContent = "🚨 Blotter Request";
        badge.style.cssText = "background:#fef2f2;color:#991b1b;border:1.5px solid #fca5a5;display:inline-block;padding:4px 14px;border-radius:20px;font-size:0.75rem;font-weight:bold;letter-spacing:1px;margin-bottom:16px;";
    } else {
        badge.textContent = "📄 Document Request";
        badge.style.cssText = "background:#f0fdf4;color:#166534;border:1.5px solid #86efac;display:inline-block;padding:4px 14px;border-radius:20px;font-size:0.75rem;font-weight:bold;letter-spacing:1px;margin-bottom:16px;";
    }

    // ── Reference number ──────────────────────────────────────
    document.getElementById("result-ref-num").textContent = d.reference_number;

    // ── Status banner ─────────────────────────────────────────
    const statusBanner = document.getElementById("status-banner");
    const statusValue  = document.getElementById("status-value");
    const statusColors = {
        "Pending":    { bg: "#fff7ed", border: "#fb923c", color: "#9a3412" },
        "Processing": { bg: "#eff6ff", border: "#60a5fa", color: "#1e40af" },
        "Scheduled":  { bg: "#eff6ff", border: "#60a5fa", color: "#1e40af" },
        "Ongoing":    { bg: "#e0f2fe", border: "#38bdf8", color: "#0c4a6e" },
        "Ready":      { bg: "#f0fdf4", border: "#4ade80", color: "#166534" },
        "Resolved":   { bg: "#f0fdf4", border: "#4ade80", color: "#166534" },
        "Escalated":  { bg: "#f5f3ff", border: "#8b5cf6", color: "#4a235a" },
        "Dismissed":  { bg: "#fff1f2", border: "#fda4af", color: "#881337" },
        "Released":   { bg: "#fdf4ff", border: "#d8b4fe", color: "#6b21a8" },
    };
    const sc = statusColors[d.status] || { bg: "#f9fafb", border: "#d1d5db", color: "#374151" };
    statusBanner.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-radius:10px;margin-bottom:12px;background:${sc.bg};border:2px solid ${sc.border};`;
    statusBanner.querySelector(".status-label").style.color = sc.color;
    statusValue.style.color = sc.color;

    // Status emoji
    const statusEmoji = {
        "Pending":    "⏳",
        "Processing": "🔄",
        "Scheduled":  "📅",
        "Ongoing":    "🔄",
        "Ready":      "✅",
        "Resolved":   "✅",
        "Escalated":  "🔺",
        "Dismissed":  "🚫",
        "Released":   "📦",
    };
    statusValue.textContent = (statusEmoji[d.status] || "") + " " + d.status;

    // ── Price ─────────────────────────────────────────────────
    document.getElementById("price-value").textContent = d.price || "—";

    // ── Detail grid ───────────────────────────────────────────
    const grid = document.getElementById("detail-grid");
    grid.innerHTML = "";

    let details = [];

    if (type === "blotter") {
        details = [
            { key: "Name",          val: d.name,                    full: false },
            { key: "Complainant",   val: d.complainant,             full: false },
            { key: "Incident Date", val: fmtDate(d.incident_date),  full: false },
            { key: "Complaint",     val: d.complaint,               full: true  },
        ];
        // Schedule fields — track_request.php returns null for all schedule columns
        // (schedule_date/time columns do not exist in the blotter table).
        // Only show schedule rows if they actually have data.
        for (let i = 1; i <= 3; i++) {
            const sd = d["schedule_date_" + i];
            const st = d["schedule_time_" + i];
            if (sd) {
                details.push({
                    key: "Schedule " + i,
                    val: fmtDate(sd) + (st ? " @ " + fmtTime(st) : ""),
                    full: false
                });
            }
        }
    } else {
        details = [
            { key: "Resident Name",  val: d.name,                              full: false },
            { key: "Document Type",  val: d.document_type,                     full: false },
            { key: "Date Requested", val: fmtDate(d.date_requested),           full: false },
            { key: "Date Released",  val: d.date_released ? fmtDate(d.date_released) : "— Not yet released", full: false },
            { key: "Quantity",       val: d.quantity,                           full: false },
            { key: "Purpose",        val: d.purpose,                            full: true  },
        ];
    }

    details.forEach(item => {
        const div = document.createElement("div");
        div.className = "detail-item" + (item.full ? " full" : "");
        div.innerHTML = `<span class="detail-key">${item.key}</span><span class="detail-val">${item.val || "—"}</span>`;
        grid.appendChild(div);
    });

    // ── Progress steps ────────────────────────────────────────
    const stepsContainer = document.getElementById("progress-steps");
    stepsContainer.innerHTML = "";

    // Blotter statuses from DB enum: Pending, Scheduled, Ongoing, Resolved, Escalated, Dismissed
    // Document statuses from DB enum: Pending, Processing, Ready, Released, Canceled
    let steps;
    let statusOrder;

    if (type === "blotter") {
        // Handle terminal statuses separately
        if (d.status === "Escalated") {
            steps = [
                { label: "Submitted", icon: "📝" },
                { label: "Scheduled", icon: "📅" },
                { label: "Escalated", icon: "🔺" },
            ];
            statusOrder = ["Pending", "Scheduled", "Escalated"];
        } else if (d.status === "Dismissed") {
            steps = [
                { label: "Submitted", icon: "📝" },
                { label: "Scheduled", icon: "📅" },
                { label: "Dismissed", icon: "🚫" },
            ];
            statusOrder = ["Pending", "Scheduled", "Dismissed"];
        } else {
            steps = [
                { label: "Submitted", icon: "📝" },
                { label: "Scheduled", icon: "📅" },
                { label: "Ongoing",   icon: "🔄" },
                { label: "Resolved",  icon: "✅" },
            ];
            statusOrder = ["Pending", "Scheduled", "Ongoing", "Resolved"];
        }
    } else {
        if (d.status === "Canceled") {
            steps = [
                { label: "Submitted", icon: "📝" },
                { label: "Canceled",  icon: "🚫" },
            ];
            statusOrder = ["Pending", "Canceled"];
        } else {
            steps = [
                { label: "Submitted",   icon: "📝" },
                { label: "Processing",  icon: "🔄" },
                { label: "Ready",       icon: "✅" },
                { label: "Released",    icon: "📦" },
            ];
            statusOrder = ["Pending", "Processing", "Ready", "Released"];
        }
    }

    // Map the current status to its index in the statusOrder array
    // "Pending" maps to index 0 (Submitted step)
    const normalizedStatus = d.status === "Pending" ? statusOrder[0] : d.status;
    const currentIdx = statusOrder.indexOf(normalizedStatus);

    steps.forEach((step, i) => {
        const div = document.createElement("div");

        let stepClass = "step";
        if (i < currentIdx) {
            stepClass += " done";
        } else if (i === currentIdx) {
            stepClass += " active";
        }

        div.className = stepClass;
        div.innerHTML = `
            <div class="step-dot">${step.icon}</div>
            <span class="step-label">${step.label}</span>
        `;
        stepsContainer.appendChild(div);
    });
}

function fmtDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtTime(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12  = hour % 12 || 12;
    return h12 + ":" + m + " " + ampm;
}