// ============================================================
//  Barangay Tugtug E-System — Blotter Records Logic
//  File: Javascript/Blotter.js
//
//  SCHEMA NOTE: The blotter table has NO schedule_date/time/outcome
//  columns and NO presiding_kagawad / secretary_name / resolution_notes
//  columns. The only status-related columns are: status, resolved_at.
//  Allowed statuses: Pending, Scheduled, Ongoing, Resolved, Escalated, Dismissed
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  const recordsContainer = document.querySelector(".document-records");
  const searchInput      = document.querySelector(".search-input");
  const filterSelect     = document.querySelector(".filter-select");
  const btnDisplay       = document.querySelector(".btn-display");
  const btnPrint         = document.querySelector(".btn-print");
  const btnHearings      = document.querySelector(".btn-hearings");

  // ── Inject date range inputs into filter group ────────────
  const filterGroup = document.querySelector(".filter-group");
  const dateWrapper = document.createElement("div");
  dateWrapper.id = "date-filter-wrapper";
  dateWrapper.style.cssText = `
    display:none;align-items:center;gap:0.5vw;
    position:relative;left:6vh;
  `;
  dateWrapper.innerHTML = `
    <label style="color:#f3efe8;font-size:1.5vh;font-weight:600;white-space:nowrap;">From:</label>
    <input type="date" id="date-from" style="
      background:#f3efe8;border:none;border-radius:5px;
      padding:5px 8px;color:#273b07;font-size:1.4vh;font-weight:600;cursor:pointer;outline:none;">
    <label style="color:#f3efe8;font-size:1.5vh;font-weight:600;white-space:nowrap;">To:</label>
    <input type="date" id="date-to" style="
      background:#f3efe8;border:none;border-radius:5px;
      padding:5px 8px;color:#273b07;font-size:1.4vh;font-weight:600;cursor:pointer;outline:none;">
    <button id="btn-apply-date" style="
      background:#7d9e3b;color:white;border:none;border-radius:5px;
      padding:5px 12px;font-weight:bold;cursor:pointer;font-size:1.4vh;transition:0.3s;">
      Apply
    </button>
  `;
  filterGroup.insertBefore(dateWrapper, document.querySelector(".btn-display"));

  // ── Show/hide date inputs ─────────────────────────────────
  filterSelect.addEventListener("change", function () {
    if (filterSelect.value === "date") {
      dateWrapper.style.display = "flex";
    } else {
      dateWrapper.style.display = "none";
      fetchRecords();
    }
  });

  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "btn-apply-date") fetchRecords();
  });

  // ── Status colors (all statuses in DB enum) ───────────────
  const statusColors = {
    Pending:   { bg: "#fff3cd", color: "#856404", border: "#ffc107" },
    Scheduled: { bg: "#cfe2ff", color: "#084298", border: "#0d6efd" },
    Ongoing:   { bg: "#d1ecff", color: "#0c4e86", border: "#3b82f6" },
    Resolved:  { bg: "#d1e7dd", color: "#0a3622", border: "#198754" },
    Escalated: { bg: "#e2d9f3", color: "#4a235a", border: "#8b5cf6" },
    Dismissed: { bg: "#f8d7da", color: "#842029", border: "#f1aeb5" },
  };

  // ── Init ──────────────────────────────────────────────────
  fetchRecords();

  // ── Events ────────────────────────────────────────────────
  btnDisplay.addEventListener("click", () => {
    filterSelect.value = "";
    dateWrapper.style.display = "none";
    document.getElementById("date-from").value = "";
    document.getElementById("date-to").value = "";
    searchInput.value = "";
    fetchRecords();
  });

  searchInput.addEventListener("input", debounce(() => fetchRecords(), 400));

  // Print All — fetches all records and prints a summary
  btnPrint.addEventListener("click", () => {
    const origText = btnPrint.textContent;
    btnPrint.textContent = "Loading…";
    btnPrint.disabled = true;

    fetch("php/GetBlotter.php")
      .then(res => res.json())
      .then(data => {
        btnPrint.textContent = origText;
        btnPrint.disabled = false;
        if (!data.success || !data.records) { showToast("❌ Could not load records for printing."); return; }
        printAllRecords(data.records, data.counts);
      })
      .catch(() => {
        btnPrint.textContent = origText;
        btnPrint.disabled = false;
        showToast("❌ Server error while loading records.");
      });
  });

  // Hearings button — filter to Scheduled only
  if (btnHearings) {
    btnHearings.addEventListener("click", () => {
      filterSelect.value = "Scheduled";
      dateWrapper.style.display = "none";
      searchInput.value = "";
      fetchRecords();
    });
  }

  // Delegated click for dynamically rendered Update buttons
  recordsContainer.addEventListener("click", function (e) {
    const btn = e.target.closest(".btn-update-record");
    if (!btn) return;
    const rec = JSON.parse(btn.getAttribute("data-record").replace(/&apos;/g, "'"));
    openUpdateModal(rec);
  });

  // ── Fetch ─────────────────────────────────────────────────
  function fetchRecords() {
    const search   = searchInput.value.trim();
    const filter   = filterSelect.value;
    const dateFrom = document.getElementById("date-from") ? document.getElementById("date-from").value : "";
    const dateTo   = document.getElementById("date-to")   ? document.getElementById("date-to").value   : "";

    let url = "php/GetBlotter.php?";
    if (search)                        url += "search="    + encodeURIComponent(search)   + "&";
    if (filter && filter !== "date")   url += "filter="    + encodeURIComponent(filter)   + "&";
    if (filter === "date" && dateFrom) url += "date_from=" + encodeURIComponent(dateFrom) + "&";
    if (filter === "date" && dateTo)   url += "date_to="   + encodeURIComponent(dateTo)   + "&";

    recordsContainer.innerHTML = `
      <div style="display:flex;justify-content:center;align-items:center;
          height:30vh;color:#375309;font-family:'Segoe UI',sans-serif;font-size:2vh;gap:1vw;">
        <span style="width:2.5vh;height:2.5vh;border:3px solid #375309;
          border-top-color:transparent;border-radius:50%;
          display:inline-block;animation:spin 0.7s linear infinite;"></span>
        Loading records…
      </div>`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data.success) { showError(data.message || "Failed to load records."); return; }
        updateCounts(data.counts);
        renderTable(data.records);
      })
      .catch(err => { console.error(err); showError("Server error. Please try again."); });
  }

  // ── Summary cards ─────────────────────────────────────────
  // NOTE: DB counts keys: Total, Pending, Scheduled, Ongoing, Resolved, Escalated, Dismissed
  function updateCounts(counts) {
    setCount(document.querySelector(".total"),      counts.Total     || 0);
    setCount(document.querySelector(".processing"), counts.Scheduled || 0);
    setCount(document.querySelector(".pending"),    counts.Pending   || 0);
    setCount(document.querySelector(".ready"),      counts.Resolved  || 0);
  }
  function setCount(el, count) {
    if (!el) return;
    let numEl = el.querySelector(".count-number");
    if (!numEl) {
      numEl = document.createElement("p");
      numEl.className = "count-number";
      numEl.style.cssText = `position:absolute;bottom:1vh;left:1vw;
        font-size:4vh;font-weight:700;color:#273b07;margin:0;
        font-family:'Segoe UI',Tahoma,sans-serif;`;
      el.appendChild(numEl);
    }
    numEl.textContent = count;
  }

  // ── Render table ──────────────────────────────────────────
  function renderTable(records) {
    recordsContainer.style.cssText = `
      position:relative;top:12vh;padding:0 1.5%;padding-bottom:3vh;`;

    if (!records || records.length === 0) {
      recordsContainer.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;
            height:30vh;color:#888;font-family:'Segoe UI',sans-serif;font-size:2vh;">
          No records found.</div>`;
      return;
    }

    const table = document.createElement("table");
    table.style.cssText = `width:100%;border-collapse:collapse;
      font-family:'Segoe UI',Tahoma,sans-serif;font-size:1.6vh;`;

    table.innerHTML = `
      <thead>
        <tr style="background-color:#273b07;color:#f3efe8;position:sticky;top:0;z-index:1;">
          <th style="${th()}">🪪 Ref No.</th>
          <th style="${th()}">👤 Name of Complainee</th>
          <th style="${th()}">⚠️ Complaint Against</th>
          <th style="${th()}">📋 Type</th>
          <th style="${th()}">📅 Date Filed</th>
          <th style="${th()}">🔖 Status</th>
          <th style="${th()}">📅 Submitted At</th>
          <th style="${th()}">⚙ Action</th>
        </tr>
      </thead>
      <tbody id="records-tbody"></tbody>`;

    const tbody = table.querySelector("#records-tbody");

    records.forEach((rec, i) => {
      const tr = document.createElement("tr");
      // Locked = terminal status
      const isLocked = rec.status === "Resolved" || rec.status === "Escalated" || rec.status === "Dismissed";
      tr.style.cssText = `background-color:${i % 2 === 0 ? "#fafaf7" : "#f3efe8"};transition:background-color 0.2s;
        ${isLocked ? "opacity:0.85;" : ""}`;
      tr.onmouseover = () => (tr.style.backgroundColor = "#e8f0d8");
      tr.onmouseout  = () => (tr.style.backgroundColor = i % 2 === 0 ? "#fafaf7" : "#f3efe8");

      const sc = statusColors[rec.status] || { bg: "#eee", color: "#333", border: "#aaa" };

      const btnLabel = isLocked ? `🔒 View / Unlock` : `✏ Update`;
      const btnBg    = isLocked ? "#6c3483" : "#375309";
      const btnHov   = isLocked ? "#8b5cf6" : "#7d9e3b";

      tr.innerHTML = `
        <td style="${td()}text-align:center;">${rec.reference_number || "—"}</td>
        <td style="${td()}">${rec.full_name || "—"}</td>
        <td style="${td()}">${rec.complaint_against || "—"}</td>
        <td style="${td()}">${rec.complaint_type || "—"}</td>
        <td style="${td()}text-align:center;">${fmtDate(rec.petsa)}</td>
        <td style="${td()}text-align:center;">
          <span style="background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};
            padding:0.4vh 0.8vw;border-radius:20px;font-size:1.4vh;font-weight:600;white-space:nowrap;">
            ${rec.status}
          </span>
        </td>
        <td style="${td()}text-align:center;">${fmtDate(rec.submitted_at)}</td>
        <td style="${td()}text-align:center;">
          <button class="btn-update-record"
            data-record='${JSON.stringify(rec).replace(/'/g, "&apos;")}'
            style="background:${btnBg};color:#f3efe8;border:none;border-radius:5px;
              padding:0.5vh 0.8vw;cursor:pointer;font-size:1.4vh;font-weight:600;
              transition:background 0.2s;white-space:nowrap;"
            onmouseover="this.style.background='${btnHov}'"
            onmouseout="this.style.background='${btnBg}'">
            ${btnLabel}
          </button>
        </td>`;
      tbody.appendChild(tr);
    });

    recordsContainer.innerHTML = "";
    recordsContainer.appendChild(table);
  }

  // ── Helpers ───────────────────────────────────────────────
  function th() { return `padding:1.2vh 1vw;text-align:left;font-size:1.5vh;font-weight:600;white-space:nowrap;`; }
  function td() { return `padding:1vh 1vw;border-bottom:1px solid #ddd;`; }
  function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PH", { year:"numeric", month:"short", day:"numeric" });
  }
  function fmtTime(t) {
    if (!t) return "—";
    const [h, m] = String(t).split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12  = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }
  function showError(msg) {
    recordsContainer.innerHTML = `
      <div style="display:flex;justify-content:center;align-items:center;
        height:30vh;color:#cc0000;font-family:'Segoe UI',sans-serif;font-size:2vh;">${msg}</div>`;
  }
  function debounce(fn, delay) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), delay); };
  }

  // ── CSS ───────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin { to { transform:rotate(360deg); } }
    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }

    .modal-overlay {
      position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;
      display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;
    }
    .modal-box {
      background:#f3efe8;border-radius:15px;padding:3vh 2.5vw;width:48vw;min-width:360px;
      box-shadow:0 10px 40px rgba(0,0,0,0.3);font-family:'Segoe UI',Tahoma,sans-serif;
    }
    .modal-title { font-size:2.2vh;font-weight:700;color:#273b07;margin-bottom:2vh;font-family:'Crimson Text',serif; }
    .modal-label { font-size:1.6vh;color:#375309;font-weight:600;margin-bottom:0.5vh;display:block; }
    .modal-select {
      width:100%;padding:1vh 1vw;border-radius:8px;border:1.5px solid #7d9e3b;
      font-size:1.7vh;background:white;color:#273b07;margin-bottom:2.5vh;cursor:pointer;outline:none;
    }
    .modal-select:focus { border-color:#375309; }
    .modal-buttons { display:flex;gap:1vw;justify-content:flex-end;margin-top:2vh; }
    .modal-btn-cancel {
      background:transparent;border:2px solid #375309;color:#375309;
      padding:0.8vh 1.5vw;border-radius:8px;font-size:1.6vh;font-weight:600;cursor:pointer;transition:0.2s;
    }
    .modal-btn-cancel:hover { background:#375309;color:white; }
    .modal-btn-save {
      background:#375309;border:none;color:#f3efe8;padding:0.8vh 1.5vw;
      border-radius:8px;font-size:1.6vh;font-weight:600;cursor:pointer;transition:0.2s;
    }
    .modal-btn-save:hover { background:#7d9e3b; }

    .modal-section-title {
      font-size:1.3vh;font-weight:700;margin-bottom:1vh;letter-spacing:0.05em;text-transform:uppercase;
    }

    .locked-banner {
      background:#f3e8ff;border:1.5px solid #8b5cf6;border-radius:10px;
      padding:1.2vh 1.2vw;margin-bottom:2vh;display:flex;align-items:flex-start;gap:0.8vw;
    }
    .locked-banner-icon { font-size:2.2vh;flex-shrink:0;margin-top:0.1vh; }
    .locked-banner-text { font-size:1.4vh;color:#4a235a;line-height:1.6; }
    .locked-banner-text strong { font-size:1.5vh; }

    .confirm-overlay {
      position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10999;
      display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;
    }
    .confirm-box {
      background:#fff;border-radius:15px;padding:3vh 2.5vw;width:32vw;min-width:300px;
      box-shadow:0 12px 50px rgba(0,0,0,0.4);font-family:'Segoe UI',Tahoma,sans-serif;text-align:center;
    }
    .confirm-title { font-size:2vh;font-weight:700;color:#273b07;margin-bottom:1vh; }
    .confirm-msg   { font-size:1.5vh;color:#555;margin-bottom:0.8vh;line-height:1.6; }
    .confirm-note  {
      background:#fff8e6;border:1.5px solid #ffc107;border-radius:8px;
      padding:1vh 1vw;font-size:1.35vh;color:#856404;margin:1.5vh 0 2vh;text-align:left;line-height:1.6;
    }
    .confirm-buttons { display:flex;gap:1vw;justify-content:center; }
    .confirm-btn-no {
      background:transparent;border:2px solid #273b07;color:#273b07;
      padding:0.8vh 2vw;border-radius:8px;font-size:1.6vh;font-weight:600;cursor:pointer;transition:0.2s;
    }
    .confirm-btn-no:hover  { background:#273b07;color:#f3efe8;transform:translateY(-10%); }
    .confirm-btn-yes {
      background:#273b07;border:none;color:#f3efe8;
      padding:0.8vh 2vw;border-radius:8px;font-size:1.6vh;font-weight:600;cursor:pointer;transition:0.2s;
    }
    .confirm-btn-yes:hover { background:#7d9e3b;transform:translateY(-10%); }

    .sched-field { margin-bottom:0.8vh; }
    .sched-field label { font-size:1.3vh;font-weight:600;color:#555;display:block;margin-bottom:0.3vh; }
    .sched-field input {
      width:100%;padding:0.7vh 0.8vw;border:1.5px solid #c5d9a0;border-radius:7px;
      font-size:1.45vh;color:#273b07;background:#fff;outline:none;box-sizing:border-box;
    }
    .sched-field input:focus { border-color:#375309; }

    .toast {
      position:fixed;bottom:4vh;right:2vw;background:#273b07;color:#f3efe8;
      padding:1.5vh 2vw;border-radius:10px;font-size:1.7vh;font-family:'Segoe UI',sans-serif;
      z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:slideUp 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  // ── Modal ─────────────────────────────────────────────────
  function openUpdateModal(rec) {
    const existing = document.getElementById("update-modal");
    if (existing) existing.remove();

    // Terminal statuses lock the record
    const isLocked = rec.status === "Resolved" || rec.status === "Escalated" || rec.status === "Dismissed";
    const sc = statusColors[rec.status] || { bg:"#eee", color:"#333", border:"#aaa" };

    const statusBadge = `<span style="margin-left:1vw;padding:0.3vh 0.8vw;border-radius:20px;
      font-size:1.4vh;background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};">
      ${rec.status}</span>`;

    function field(label, value) {
      return `<div style="display:flex;justify-content:space-between;align-items:center;
          padding:0.8vh 0;border-bottom:1px solid #dde8cc;">
          <span style="font-size:1.4vh;color:#666;font-weight:600;min-width:42%;">${label}</span>
          <span style="font-size:1.45vh;color:#273b07;text-align:right;">${value || "—"}</span>
        </div>`;
    }

    const lockBanner = isLocked ? `
      <div class="locked-banner">
        <span class="locked-banner-icon">🔒</span>
        <div class="locked-banner-text">
          <strong>This record is locked.</strong><br>
          This blotter has been marked as <strong>${rec.status}</strong>.
          To make changes, click "Unlock to Edit" and select a new status.
        </div>
      </div>` : "";

    // All valid statuses from DB enum
    const statuses = ["Pending", "Scheduled", "Ongoing", "Resolved", "Escalated", "Dismissed"];
    const statusOptions = statuses.map(s =>
      `<option value="${s}" ${rec.status === s ? "selected" : ""}>${s}</option>`
    ).join("");

    // resolved_at section — shown when status is or becomes terminal
    const resolvedAtVal = rec.resolved_at ? rec.resolved_at.split("T")[0] : "";
    const showResolved  = isLocked;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "update-modal";
    overlay.innerHTML = `
      <div class="modal-box" style="width:46vw;min-width:360px;max-height:90vh;overflow-y:auto;">
        <div class="modal-title" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2vh;">
          <span>Blotter Record — ${rec.reference_number || "—"}</span>
          <button onclick="printBlotterRecord()" title="Print this blotter record"
            style="background:#273b07;color:#f3efe8;border:none;border-radius:7px;
              padding:0.5vh 1.1vw;font-size:1.35vh;font-weight:700;cursor:pointer;
              display:flex;align-items:center;gap:0.4vw;transition:0.2s;flex-shrink:0;"
            onmouseover="this.style.background='#7d9e3b'"
            onmouseout="this.style.background='#273b07'">
            🖨️ Print
          </button>
        </div>

        ${lockBanner}

        <!-- SECTION 1: Complainee Info -->
        <div style="background:#e8f0d8;border-radius:10px;padding:1.5vh 1.5vw;margin-bottom:1.5vh;">
          <div class="modal-section-title" style="color:#375309;">📋 Complainee Information</div>
          ${field("Reference No.", rec.reference_number)}
          ${field("Full Name", rec.full_name)}
          ${field("Age", rec.age)}
          ${field("Civil Status", rec.civil_status)}
          ${field("Address", rec.address)}
          ${field("Occupation", rec.occupation)}
          ${field("Date of Incident", fmtDate(rec.petsa))}
          ${field("Time of Incident", fmtTime(rec.oras))}
          ${field("Complaint Against", rec.complaint_against)}
          ${field("Complaint Type", rec.complaint_type)}
          ${field("Complaint Details", rec.complaint_details)}
          ${field("Date Submitted", fmtDate(rec.submitted_at))}
        </div>

        <!-- SECTION 2: Resolution date (shown for terminal statuses) -->
        <div id="resolution-section" style="${showResolved ? "" : "display:none;"}">
          <div style="background:#fff8e6;border-radius:10px;padding:1.5vh 1.5vw;margin-bottom:1.5vh;
            border:1.5px solid #ffc107;">
            <div class="modal-section-title" style="color:#856404;">
              ${rec.status === "Escalated" ? "🔺 Escalation Details" :
                rec.status === "Dismissed" ? "🚫 Dismissal Details" : "✅ Resolution Details"}
            </div>
            <div class="sched-field">
              <label>Date ${rec.status === "Escalated" ? "Escalated" :
                             rec.status === "Dismissed" ? "Dismissed" : "Resolved"}</label>
              <input type="date" id="resolved-at-input" value="${resolvedAtVal}"
                ${isLocked ? "readonly style='background:#f9f9f9;cursor:default;'" : ""}>
            </div>
          </div>
        </div>

        <!-- SECTION 3: Update Status -->
        <div style="background:${isLocked ? "#f3e8ff" : "#fff8e6"};border-radius:10px;padding:1.5vh 1.5vw;
          margin-bottom:1.5vh;border:${isLocked ? "1.5px solid #8b5cf6" : "none"};">
          <div class="modal-section-title" style="color:${isLocked ? "#6c3483" : "#856404"};
            display:flex;align-items:center;justify-content:space-between;">
            <span>${isLocked ? "🔒 RECORD STATUS (LOCKED)" : "UPDATE STATUS"}</span>
            ${isLocked ? `
            <button id="btn-unlock-record" style="background:#6c3483;color:white;border:none;
              border-radius:6px;padding:0.5vh 1vw;font-size:1.3vh;font-weight:700;cursor:pointer;transition:0.2s;"
              onmouseover="this.style.background='#8b5cf6'"
              onmouseout="this.style.background='#6c3483'"
              onclick="unlockRecord()">🔓 Unlock to Edit</button>` : ""}
          </div>
          <label class="modal-label">Current Status: ${statusBadge}</label>
          <label class="modal-label" style="margin-top:1.5vh;">New Status</label>
          <select class="modal-select" id="modal-status-select"
            style="${isLocked ? "opacity:0.5;cursor:not-allowed;pointer-events:none;" : ""}">
            ${statusOptions}
          </select>
          ${isLocked ? `<div id="locked-hint" style="font-size:1.35vh;color:#6c3483;background:#ede7f6;
            padding:0.8vh 1vw;border-radius:7px;margin-top:-1vh;">
            🔒 Click <strong>"Unlock to Edit"</strong> above to change the status.
          </div>` : ""}
        </div>

        <div class="modal-buttons">
          <button class="modal-btn-cancel" onclick="document.getElementById('update-modal').remove()">Cancel</button>
          <button class="modal-btn-save" id="modal-save-btn" onclick="saveBlotterStatus(${rec.blotter_id})">
            Save Changes
          </button>
        </div>
      </div>`;

    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    // Show/hide resolution section when status dropdown changes
    const selectEl = document.getElementById("modal-status-select");
    if (selectEl) {
      selectEl.addEventListener("change", function () {
        const resSection = document.getElementById("resolution-section");
        const terminalStatuses = ["Resolved", "Escalated", "Dismissed"];
        if (resSection) {
          resSection.style.display = terminalStatuses.includes(this.value) ? "" : "none";
        }
      });
    }

    // ── Unlock handler (clears resolved_at in DB) ──────────
    window.unlockRecord = function () {
      const select    = document.getElementById("modal-status-select");
      const hint      = document.getElementById("locked-hint");
      const unlockBtn = document.getElementById("btn-unlock-record");

      if (unlockBtn) { unlockBtn.disabled = true; unlockBtn.textContent = "Unlocking…"; }

      fetch("php/GetBlotter.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blotter_id: rec.blotter_id, clear_locked: true }),
      })
        .then(r => r.json())
        .then(() => {
          select.style.opacity       = "1";
          select.style.cursor        = "pointer";
          select.style.pointerEvents = "auto";
          select.value = "Scheduled";
          if (hint) hint.style.display = "none";
          if (unlockBtn) unlockBtn.style.display = "none";
          const resSection = document.getElementById("resolution-section");
          if (resSection) resSection.style.display = "none";
        })
        .catch(() => {
          if (unlockBtn) { unlockBtn.disabled = false; unlockBtn.textContent = "🔓 Unlock to Edit"; }
          showToast("❌ Failed to unlock. Please try again.");
        });
    };
  }

  // ── Save main status ──────────────────────────────────────
  window.saveBlotterStatus = function (blotterId) {
    const selectEl  = document.getElementById("modal-status-select");
    const newStatus = selectEl.value;

    const terminalStatuses = ["Resolved", "Escalated", "Dismissed"];
    if (terminalStatuses.includes(newStatus)) {
      showLockConfirmation(blotterId, newStatus);
      return;
    }

    doSaveStatus(blotterId, newStatus, null);
  };

  function showLockConfirmation(blotterId, newStatus) {
    const existing = document.getElementById("confirm-modal");
    if (existing) existing.remove();

    const todayLocal = new Date();
    const yyyy = todayLocal.getFullYear();
    const mm   = String(todayLocal.getMonth() + 1).padStart(2, "0");
    const dd   = String(todayLocal.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const emojiMap = { Resolved: "✅", Escalated: "🔺", Dismissed: "🚫" };
    const emoji = emojiMap[newStatus] || "";

    const confirmOverlay = document.createElement("div");
    confirmOverlay.className = "confirm-overlay";
    confirmOverlay.id = "confirm-modal";
    confirmOverlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-title">${emoji} Mark as ${newStatus}?</div>
        <div class="confirm-msg">
          Are you sure this blotter is now <strong>${newStatus}</strong>?
        </div>
        <div class="confirm-note">
          <strong>📌 Please Note:</strong>
          Once confirmed, this record will be <strong>locked</strong> to prevent accidental changes.<br><br>
          🔓 You can <b>unlock</b> this record at any time by opening it and selecting a different status.
        </div>
        <div style="margin:1.5vh 0 2vh;text-align:left;">
          <label style="font-size:1.45vh;font-weight:700;color:#273b07;display:block;margin-bottom:0.6vh;">
            📅 Date ${newStatus}
          </label>
          <input type="date" id="resolved-date-input" value="${todayStr}" max="${todayStr}"
            style="width:100%;padding:0.9vh 0.8vw;border:1.5px solid #7d9e3b;border-radius:8px;
              font-size:1.6vh;color:#273b07;background:#fff;outline:none;cursor:pointer;box-sizing:border-box;">
          <span style="font-size:1.25vh;color:#888;display:block;margin-top:0.4vh;">
            Cannot be a future date.
          </span>
        </div>
        <div class="confirm-buttons">
          <button class="confirm-btn-no" onclick="document.getElementById('confirm-modal').remove()">
            No, Go Back
          </button>
          <button class="confirm-btn-yes" onclick="confirmLockBlotter(${blotterId}, '${newStatus}')">
            ${emoji} Yes, Mark as ${newStatus}
          </button>
        </div>
      </div>`;
    document.body.appendChild(confirmOverlay);
  }

  window.confirmLockBlotter = function (blotterId, newStatus) {
    const dateInput  = document.getElementById("resolved-date-input");
    const chosenDate = dateInput ? dateInput.value : "";

    if (!chosenDate) {
      if (dateInput) dateInput.style.border = "1.5px solid #cc0000";
      return;
    }

    document.getElementById("confirm-modal").remove();
    doSaveStatus(blotterId, newStatus, chosenDate);
  };

  function doSaveStatus(blotterId, newStatus, resolvedAt) {
    const saveBtn = document.getElementById("modal-save-btn");
    if (saveBtn) { saveBtn.textContent = "Saving…"; saveBtn.disabled = true; }

    // Payload matches GetBlotter.php POST action: update_status
    const payload = {
      blotter_id: blotterId,
      action:     "update_status",
      status:     newStatus,
    };
    if (resolvedAt) payload.resolved_at = resolvedAt;

    fetch("php/GetBlotter.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        const modal = document.getElementById("update-modal");
        if (modal) modal.remove();
        const terminalMsg = {
          Resolved:  "✅ Blotter marked as Resolved and locked.",
          Escalated: "🔺 Blotter marked as Escalated and locked.",
          Dismissed: "🚫 Blotter marked as Dismissed and locked.",
        };
        showToast(
          data.success
            ? (terminalMsg[newStatus] || "✅ Status updated to " + newStatus)
            : "❌ " + (data.message || "Update failed.")
        );
        if (data.success) fetchRecords();
      })
      .catch(() => {
        const modal = document.getElementById("update-modal");
        if (modal) modal.remove();
        showToast("❌ Server error. Please try again.");
      });
  }

  // ── Print single blotter record ───────────────────────────
  window.printBlotterRecord = function () {
    const modal = document.getElementById("update-modal");
    if (!modal) return;

    // Get the rec from the open modal's save button data-blotter-id
    // We derive it from the currently open record via the modal title
    // (rec was embedded in the button's onclick attr; pull from modal DOM)
    const saveBtn = document.getElementById("modal-save-btn");
    if (!saveBtn) return;

    // Re-fetch the record by its blotter_id embedded in the onclick attr
    // e.g. onclick="saveBlotterStatus(2)" → id=2
    const onclickVal = saveBtn.getAttribute("onclick") || "";
    const idMatch = onclickVal.match(/\d+/);
    if (!idMatch) return;
    const blotterId = parseInt(idMatch[0]);

    fetch("php/GetBlotter.php")
      .then(r => r.json())
      .then(data => {
        if (!data.success) return;
        const rec = (data.records || []).find(r => r.blotter_id === blotterId);
        if (!rec) return;
        printSingleRecord(rec);
      })
      .catch(() => showToast("❌ Could not load record for printing."));
  };

  function printSingleRecord(rec) {
    function safe(v) { return v ? String(v).replace(/</g,"&lt;").replace(/>/g,"&gt;") : "—"; }
    function fmtD(d) {
      if (!d) return "—";
      return new Date(d).toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
    }
    function fmtT(t) {
      if (!t) return "—";
      const [h, m] = String(t).split(":");
      const hr = parseInt(h);
      return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
    }

    const statusStyleMap = {
      Pending:   "background:#fff3cd;color:#856404;border:1px solid #ffc107;",
      Scheduled: "background:#cfe2ff;color:#084298;border:1px solid #0d6efd;",
      Ongoing:   "background:#d1ecff;color:#0c4e86;border:1px solid #3b82f6;",
      Resolved:  "background:#d1e7dd;color:#0a3622;border:1px solid #198754;",
      Escalated: "background:#e2d9f3;color:#4a235a;border:1px solid #8b5cf6;",
      Dismissed: "background:#f8d7da;color:#842029;border:1px solid #f1aeb5;",
    };
    const statusStyle = statusStyleMap[rec.status] || "background:#eee;color:#333;border:1px solid #aaa;";
    const todayStr = new Date().toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });

    // Resolution block only for terminal statuses
    const isTerminal = ["Resolved","Escalated","Dismissed"].includes(rec.status);
    const resBlock = isTerminal ? `
      <div class="section-title">${rec.status === "Escalated" ? "🔺 Escalation Details" :
        rec.status === "Dismissed" ? "🚫 Dismissal Details" : "✅ Resolution Details"}</div>
      <table class="info-table">
        <tr>
          <td class="lbl">Date ${rec.status}</td>
          <td>${safe(fmtD(rec.resolved_at))}</td>
          <td class="lbl">Blotter Status</td>
          <td><strong>${safe(rec.status)}</strong></td>
        </tr>
      </table>` : "";

    const win = window.open("", "_blank", "width=900,height=800");
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Barangay Blotter — ${safe(rec.reference_number)}</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Times New Roman',Times,serif;font-size:12.5px;color:#000;background:#fff;padding:32px 44px;}
  @media print{body{padding:0;}@page{size:A4 portrait;margin:1.5cm 1.8cm;}.no-print{display:none!important;}}
  .print-btn{display:block;margin:0 auto 20px;padding:10px 32px;background:#032f15;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;}
  .print-btn:hover{background:#054d22;}
  .form-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
  .form-logo{width:78px;height:auto;flex-shrink:0;}
  .header-text{flex:1;text-align:center;padding:0 12px;}
  .header-text .line-sm{font-size:10.5px;margin:1px 0;}
  .header-text .brgy-name{font-size:22px;font-weight:bold;color:#032f15;margin:3px 0;}
  .header-text .office{font-size:12px;font-weight:bold;margin:2px 0;}
  .ref-badge{text-align:right;font-size:10px;color:#555;flex-shrink:0;min-width:90px;}
  .ref-badge strong{display:block;font-size:12px;color:#032f15;}
  .form-title{text-align:center;font-size:15px;font-weight:bold;letter-spacing:3px;border-top:2.5px solid #000;border-bottom:2.5px solid #000;padding:5px 0;margin:8px 0 14px;}
  .section-title{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#032f15;border-bottom:1.5px solid #032f15;padding-bottom:2px;margin:14px 0 5px;}
  .info-table{width:100%;border-collapse:collapse;margin-bottom:8px;}
  .info-table td{padding:6px 9px;border:1px solid #c8c8c8;font-size:12px;vertical-align:top;}
  .info-table td.lbl{font-weight:bold;background:#f5f5f0;width:20%;white-space:nowrap;color:#333;}
  .field-label{display:block;font-size:9.5px;font-weight:bold;text-transform:uppercase;color:#374151;letter-spacing:0.5px;margin-bottom:2px;margin-top:10px;}
  .field-value{border-bottom:1px solid #444;min-height:20px;font-size:12.5px;padding:2px 4px;display:block;}
  .row2{display:flex;gap:20px;}
  .row2 .col{flex:1;}
  .complaint-block{border:1px solid #c8c8c8;border-radius:3px;padding:8px 10px;min-height:60px;font-size:12.5px;line-height:1.7;white-space:pre-wrap;}
  .divider{border:0;border-top:1.5px solid #032f15;opacity:0.2;margin:14px 0;}
  .location-footer{font-size:12px;line-height:2.1;margin:10px 0;}
  .location-footer .fill{display:inline-block;border-bottom:1px solid #000;min-width:60px;text-align:center;font-weight:bold;padding:0 4px;}
  .status-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:bold;}
  .sig-section{margin-top:30px;}
  .sig-row{display:flex;gap:24px;margin-top:0;}
  .sig-col{flex:1;text-align:center;}
  .sig-line{border-bottom:1px solid #000;height:42px;margin-bottom:5px;}
  .sig-lbl{font-size:9.5px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#333;}
  .page-footer{margin-top:18px;padding-top:6px;border-top:1px solid #ccc;font-size:9.5px;color:#888;text-align:center;}
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

<div class="form-header">
  <img class="form-logo" src="../photos/logo.png.png" alt="Barangay Logo" onerror="this.style.display='none'">
  <div class="header-text">
    <p class="line-sm">Republic of the Philippines</p>
    <p class="line-sm">PROVINCE OF BATANGAS</p>
    <p class="line-sm">Municipality of San Jose</p>
    <p class="brgy-name">Barangay Tugtug</p>
    <p class="office">OFFICE OF THE PUNONG BARANGAY</p>
  </div>
  <div class="ref-badge">
    <span>Reference No.</span>
    <strong>${safe(rec.reference_number)}</strong>
    <br>
    <span style="margin-top:4px;display:block;">
      Status: <span class="status-badge" style="${statusStyle}">${safe(rec.status)}</span>
    </span>
  </div>
</div>

<div class="form-title">BARANGAY BLOTTER</div>

<span class="field-label">NAME</span>
<span class="field-value">${safe(rec.full_name)}</span>

<div class="row2">
  <div class="col">
    <span class="field-label">AGE</span>
    <span class="field-value">${safe(rec.age)}</span>
  </div>
  <div class="col">
    <span class="field-label">CIVIL STATUS</span>
    <span class="field-value">${safe(rec.civil_status)}</span>
  </div>
</div>

<span class="field-label">ADDRESS</span>
<span class="field-value">${safe(rec.address)}</span>

<span class="field-label">OCCUPATION</span>
<span class="field-value">${safe(rec.occupation)}</span>

<hr class="divider">

<div class="row2">
  <div class="col">
    <span class="field-label">PETSA (DATE)</span>
    <span class="field-value">${safe(fmtD(rec.petsa))}</span>
  </div>
  <div class="col">
    <span class="field-label">ORAS (TIME)</span>
    <span class="field-value">${safe(fmtT(rec.oras))}</span>
  </div>
</div>

<span class="field-label">NAGSADYA DITO SI (COMPLAINANT)</span>
<span class="field-value">${safe(rec.complaint_against)}</span>

<span class="field-label">COMPLAINT TYPE</span>
<span class="field-value">${safe(rec.complaint_type)}</span>

<span class="field-label">REKLAMO / TULONG (DETAILS)</span>
<div class="complaint-block">${safe(rec.complaint_details)}</div>

<div class="location-footer">
  Ipinatala ganap na ika
  <span class="fill" style="min-width:80px;">&nbsp;</span>
  ng, ika <span class="fill" style="min-width:36px;">&nbsp;</span>
  ng <span class="fill" style="min-width:110px;">&nbsp;</span>, 20<span class="fill" style="min-width:36px;">&nbsp;</span>
  <br>
  Tanggapan ng Punong Barangay, Tugtug, San Jose, Batangas.
</div>

<hr class="divider">

<div class="sig-section">
  <div class="sig-row" style="margin-bottom:20px;">
    <div class="sig-col" style="flex:2;">
      <div class="sig-line"></div>
      <div class="sig-lbl">Pangalan / Lagda sa Ibabaw ng Nagrereklamo</div>
    </div>
  </div>
  <div class="sig-row">
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-lbl">SAKSI (Witness)</div>
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-lbl">SAKSI (Witness)</div>
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-lbl">NAGPATOTOO:<br>Kagawad on Duty</div>
    </div>
  </div>
</div>

${resBlock}

<div class="page-footer">
  Printed on: ${todayStr} &nbsp;|&nbsp; Barangay Tugtug E-System &nbsp;|&nbsp; Ref: ${safe(rec.reference_number)}
</div>

</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  // ── Print ALL blotter records ─────────────────────────────
  function printAllRecords(records, counts) {
    function safe(v) { return v ? String(v).replace(/</g,"&lt;").replace(/>/g,"&gt;") : "—"; }
    function fmtD(d) {
      if (!d) return "—";
      return new Date(d).toLocaleDateString("en-PH", { year:"numeric", month:"short", day:"numeric" });
    }
    function fmtT(t) {
      if (!t) return "—";
      const [h, m] = String(t).split(":");
      const hr = parseInt(h);
      return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
    }
    function td2() { return "padding:5px 7px;border:1px solid #d0d0d0;font-size:10.5px;vertical-align:top;"; }

    const statusStyleMap = {
      Pending:   "background:#fff3cd;color:#856404;border:1px solid #ffc107;",
      Scheduled: "background:#cfe2ff;color:#084298;border:1px solid #0d6efd;",
      Ongoing:   "background:#d1ecff;color:#0c4e86;border:1px solid #3b82f6;",
      Resolved:  "background:#d1e7dd;color:#0a3622;border:1px solid #198754;",
      Escalated: "background:#e2d9f3;color:#4a235a;border:1px solid #8b5cf6;",
      Dismissed: "background:#f8d7da;color:#842029;border:1px solid #f1aeb5;",
    };

    const rows = records.map((r, i) => {
      const ss = statusStyleMap[r.status] || "background:#eee;color:#333;border:1px solid #aaa;";
      return `<tr style="background:${i % 2 === 0 ? "#fafaf7" : "#f3efe8"};">
        <td style="${td2()}">${safe(r.reference_number)}</td>
        <td style="${td2()}">${safe(r.full_name)}</td>
        <td style="${td2()}">${safe(r.age)}</td>
        <td style="${td2()}">${safe(r.civil_status)}</td>
        <td style="${td2()}">${safe(r.address)}</td>
        <td style="${td2()}">${safe(r.complaint_against)}</td>
        <td style="${td2()}">${safe(r.complaint_type)}</td>
        <td style="${td2()}">${fmtD(r.petsa)}</td>
        <td style="${td2()}">${fmtT(r.oras)}</td>
        <td style="${td2()}"><span style="${ss}padding:2px 6px;border-radius:10px;font-size:9.5px;font-weight:bold;">${safe(r.status)}</span></td>
        <td style="${td2()};max-width:160px;">${safe(r.complaint_details)}</td>
      </tr>`;
    }).join("");

    const todayStr = new Date().toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
    const c = counts || {};

    const win = window.open("", "_blank", "width=1150,height=820");
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Barangay Blotter — All Records</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Times New Roman',Times,serif;font-size:11px;color:#000;background:#fff;padding:28px 36px;}
  @media print{body{padding:0;}@page{size:A3 landscape;margin:1.2cm 1.5cm;}.no-print{display:none!important;}}
  .print-btn{display:block;margin:0 auto 18px;padding:9px 28px;background:#032f15;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;letter-spacing:1px;}
  .print-btn:hover{background:#054d22;}
  .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
  .header-logo{width:60px;height:auto;}
  .header-text{flex:1;text-align:center;}
  .header-text .sm{font-size:9.5px;margin:1px 0;}
  .header-text .brgy{font-size:18px;font-weight:bold;color:#032f15;margin:2px 0;}
  .header-text .off{font-size:11px;font-weight:bold;}
  .report-title{text-align:center;font-size:13px;font-weight:bold;letter-spacing:2px;border-top:2px solid #000;border-bottom:2px solid #000;padding:4px 0;margin:6px 0 12px;}
  .summary-bar{display:table;width:100%;border-collapse:collapse;border:1px solid #c8c8c8;border-radius:4px;margin-bottom:12px;background:#f9f9f4;}
  .sum-card{display:table-cell;text-align:center;padding:5px 10px;border-right:1px solid #ddd;vertical-align:middle;}
  .sum-card:last-child{border-right:none;}
  .sum-card .num{font-size:13px;font-weight:bold;color:#032f15;display:inline;}
  .sum-card .lbl{font-size:9.5px;text-transform:uppercase;color:#555;letter-spacing:0.4px;display:inline;margin-left:4px;}
  table{width:100%;border-collapse:collapse;}
  thead tr{background:#273b07;color:#f3efe8;}
  thead th{padding:6px 7px;text-align:left;font-size:10px;font-weight:600;white-space:nowrap;border:1px solid #1a2d05;}
  .footer{margin-top:14px;padding-top:6px;border-top:1px solid #ccc;font-size:9px;color:#888;text-align:center;}
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
<div class="header">
  <img class="header-logo" src="../photos/logo.png.png" alt="Logo" onerror="this.style.display='none'">
  <div class="header-text">
    <p class="sm">Republic of the Philippines &nbsp;|&nbsp; PROVINCE OF BATANGAS &nbsp;|&nbsp; Municipality of San Jose</p>
    <p class="brgy">Barangay Tugtug</p>
    <p class="off">OFFICE OF THE PUNONG BARANGAY</p>
  </div>
  <div style="min-width:70px;text-align:right;font-size:9px;color:#555;">Printed:<br><strong>${todayStr}</strong></div>
</div>
<div class="report-title">BARANGAY BLOTTER — ALL RECORDS</div>
<div class="summary-bar">
  <div class="sum-card"><span class="num">${c.Total||0}</span><span class="lbl">Total</span></div>
  <div class="sum-card"><span class="num">${c.Pending||0}</span><span class="lbl">Pending</span></div>
  <div class="sum-card"><span class="num">${c.Scheduled||0}</span><span class="lbl">Scheduled</span></div>
  <div class="sum-card"><span class="num">${c.Ongoing||0}</span><span class="lbl">Ongoing</span></div>
  <div class="sum-card"><span class="num">${c.Resolved||0}</span><span class="lbl">Resolved</span></div>
  <div class="sum-card"><span class="num">${c.Escalated||0}</span><span class="lbl">Escalated</span></div>
  <div class="sum-card"><span class="num">${c.Dismissed||0}</span><span class="lbl">Dismissed</span></div>
</div>
<table>
  <thead>
    <tr>
      <th>Ref No.</th><th>Full Name</th><th>Age</th><th>Civil Status</th>
      <th>Address</th><th>Complaint Against</th><th>Complaint Type</th>
      <th>Date (Petsa)</th><th>Time (Oras)</th><th>Status</th><th>Complaint Details</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">Total Records: ${records.length} &nbsp;|&nbsp; Barangay Tugtug E-System &nbsp;|&nbsp; Printed on: ${todayStr}</div>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  function showToast(msg) {
    const ex = document.querySelector(".toast");
    if (ex) ex.remove();
    const t = document.createElement("div");
    t.className   = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
});