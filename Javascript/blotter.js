// ============================================================
//  Barangay Tugtug E-System — Blotter Records Logic
//  File: Javascript/Blotter.js
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  const recordsContainer = document.querySelector(".document-records");
  const searchInput      = document.querySelector(".search-input");
  const filterSelect     = document.querySelector(".filter-select");
  const btnDisplay       = document.querySelector(".btn-display");
  const btnPrint         = document.querySelector(".btn-print");
  const btnHearings      = document.querySelector(".btn-hearings");

  // ── Shared modal record (used by saveSchedule) ─────────────
  let currentRec = null;

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

  // ── Status colors ─────────────────────────────────────────
  const statusColors = {
    Pending:   { bg: "#fff3cd", color: "#856404", border: "#ffc107" },
    Scheduled: { bg: "#cfe2ff", color: "#084298", border: "#0d6efd" },
    Resolved:  { bg: "#d1e7dd", color: "#0a3622", border: "#198754" },
    Escalated: { bg: "#e2d9f3", color: "#4a235a", border: "#8b5cf6" },
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
  // ── Dashboard Print All — fetches all records and prints a summary ──
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
    if (search)                       url += "search="    + encodeURIComponent(search)   + "&";
    if (filter && filter !== "date")  url += "filter="    + encodeURIComponent(filter)   + "&";
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
          <th style="${th()}">🔖 Blotter Status</th>
          <th style="${th()}">📆 Next Schedule</th>
          <th style="${th()}">⚙ Action</th>
        </tr>
      </thead>
      <tbody id="records-tbody"></tbody>`;

    const tbody = table.querySelector("#records-tbody");

    records.forEach((rec, i) => {
      const tr = document.createElement("tr");
      const isLocked = rec.status === "Resolved" || rec.status === "Escalated";
      tr.style.cssText = `background-color:${i % 2 === 0 ? "#fafaf7" : "#f3efe8"};transition:background-color 0.2s;
        ${isLocked ? "opacity:0.85;" : ""}`;
      tr.onmouseover = () => (tr.style.backgroundColor = "#e8f0d8");
      tr.onmouseout  = () => (tr.style.backgroundColor = i % 2 === 0 ? "#fafaf7" : "#f3efe8");

      const sc = statusColors[rec.status] || { bg: "#eee", color: "#333", border: "#aaa" };

      // Next schedule logic:
      // Priority 1: nearest UPCOMING date (>= today) with NO outcome yet
      // Priority 2: if all no-outcome slots are past, show most recent past no-outcome slot
      // Priority 3: if all slots have outcomes, show the date of the last continue-type
      //             outcome (case is still open / rescheduled, awaiting next input)
      let nextSchedule = "—";
      if (!isLocked) {
        const todayMs        = new Date().setHours(0, 0, 0, 0);
        const continueOuts   = ["Appeared - Rescheduled", "Did Not Appear - No Response"];

        // Slots with a date but no outcome yet
        const noOutcome = [1, 2, 3]
          .filter(n => rec[`schedule_date_${n}`] && !rec[`schedule_outcome_${n}`])
          .map(n => ({ date: rec[`schedule_date_${n}`], ms: new Date(rec[`schedule_date_${n}`]).setHours(0,0,0,0) }));

        if (noOutcome.length > 0) {
          const upcoming = noOutcome.filter(c => c.ms >= todayMs);
          const pick = upcoming.length > 0
            ? upcoming.reduce((a, b) => a.ms <= b.ms ? a : b)   // nearest future
            : noOutcome.reduce((a, b) => a.ms >= b.ms ? a : b); // most recent past
          nextSchedule = fmtDate(pick.date);
        } else {
          // All filled slots have outcomes — show the last continue-type slot's date
          // (means case is still open, next schedule not yet entered)
          const continueSlots = [1, 2, 3]
            .filter(n => rec[`schedule_date_${n}`] && continueOuts.includes(rec[`schedule_outcome_${n}`]))
            .map(n => ({ date: rec[`schedule_date_${n}`], ms: new Date(rec[`schedule_date_${n}`]).setHours(0,0,0,0) }));
          if (continueSlots.length > 0) {
            const last = continueSlots.reduce((a, b) => a.ms >= b.ms ? a : b);
            nextSchedule = fmtDate(last.date) + " "; // hourglass = awaiting reschedule
          }
        }
      }

      // Button style
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
        <td style="${td()}text-align:center;">${nextSchedule}</td>
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
    const [h, m] = t.split(":");
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

    /* Section headers inside modal */
    .modal-section-title {
      font-size:1.3vh;font-weight:700;margin-bottom:1vh;letter-spacing:0.05em;text-transform:uppercase;
    }

    /* Locked banner */
    .locked-banner {
      background:#f3e8ff;border:1.5px solid #8b5cf6;border-radius:10px;
      padding:1.2vh 1.2vw;margin-bottom:2vh;display:flex;align-items:flex-start;gap:0.8vw;
    }
    .locked-banner-icon { font-size:2.2vh;flex-shrink:0;margin-top:0.1vh; }
    .locked-banner-text { font-size:1.4vh;color:#4a235a;line-height:1.6; }
    .locked-banner-text strong { font-size:1.5vh; }

    /* Confirmation modal */
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

    /* Schedule blocks */
    .schedule-block {
      background:#fff;border:1.5px solid #d0e4b0;border-radius:10px;
      padding:1.5vh 1.5vw;margin-bottom:1.5vh;
    }
    .schedule-block.locked-sched { border-color:#b0c8e8; background:#f0f6ff; }
    .schedule-block.disabled-sched { opacity:0.45;pointer-events:none; }
    .sched-header {
      display:flex;justify-content:space-between;align-items:center;
      margin-bottom:1vh;
    }
    .sched-title { font-size:1.5vh;font-weight:700;color:#273b07; }
    .btn-edit-sched {
      background:#375309;color:#f3efe8;border:none;border-radius:5px;
      padding:0.4vh 0.9vw;font-size:1.3vh;font-weight:600;cursor:pointer;transition:0.2s;
    }
    .btn-edit-sched:hover { background:#7d9e3b; }
    .btn-save-sched {
      background:#0a3622;color:#f3efe8;border:none;border-radius:5px;
      padding:0.4vh 0.9vw;font-size:1.3vh;font-weight:600;cursor:pointer;transition:0.2s;
    }
    .btn-save-sched:hover { background:#198754; }
    .sched-field { margin-bottom:0.8vh; }
    .sched-field label { font-size:1.3vh;font-weight:600;color:#555;display:block;margin-bottom:0.3vh; }
    .sched-field input, .sched-field textarea, .sched-field select {
      width:100%;padding:0.7vh 0.8vw;border:1.5px solid #c5d9a0;border-radius:7px;
      font-size:1.45vh;color:#273b07;background:#fff;outline:none;box-sizing:border-box;
    }
    .sched-field input:focus, .sched-field textarea:focus, .sched-field select:focus {
      border-color:#375309;
    }
    .sched-readview { font-size:1.4vh;color:#273b07; }
    .sched-readview span { display:inline-block;margin-right:1.5vw;margin-bottom:0.3vh; }
    .sched-readview .sched-outcome-badge {
      padding:0.3vh 0.8vw;border-radius:20px;font-size:1.3vh;font-weight:600;
    }

    /* Resolution section */
    .resolution-block {
      background:#fff8e6;border:1.5px solid #ffc107;border-radius:10px;padding:1.5vh 1.5vw;margin-bottom:1.5vh;
    }
    .resolution-block.escalated-style { background:#f3e8ff;border-color:#8b5cf6; }

    /* Toast */
    .toast {
      position:fixed;bottom:4vh;right:2vw;background:#273b07;color:#f3efe8;
      padding:1.5vh 2vw;border-radius:10px;font-size:1.7vh;font-family:'Segoe UI',sans-serif;
      z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:slideUp 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  // ── Modal ─────────────────────────────────────────────────
  function openUpdateModal(rec) {
    currentRec = rec;  // keep a shared reference for saveSchedule
    const existing = document.getElementById("update-modal");
    if (existing) existing.remove();

    const isLocked = rec.status === "Resolved" || rec.status === "Escalated";
    const sc       = statusColors[rec.status] || { bg:"#eee", color:"#333", border:"#aaa" };
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
          This blotter has been marked as <strong>${rec.status}</strong> and is locked for security purposes.
          To make changes, unlock the record by selecting a different status.
        </div>
      </div>` : "";

    const statuses = ["Pending", "Scheduled", "Resolved", "Escalated"];
    const statusOptions = statuses.map(s =>
      `<option value="${s}" ${rec.status === s ? "selected" : ""}>${s}</option>`
    ).join("");

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "update-modal";
    overlay.innerHTML = `
      <div class="modal-box" style="width:48vw;min-width:360px;max-height:90vh;overflow-y:auto;">
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

        <!-- SECTION 2: Schedule Management -->
        <div style="background:#f0ede4;border-radius:10px;padding:1.5vh 1.5vw;margin-bottom:1.5vh;">
          <div class="modal-section-title" style="color:#375309;">📆 Schedule Management</div>
          <div id="schedule-container"></div>
        </div>

        <!-- SECTION 3: Resolution Details (shown only when Resolved/Escalated) -->
        <div id="resolution-section" style="${isLocked ? "" : "display:none;"}">
          <div class="${rec.status === "Escalated" ? "resolution-block escalated-style" : "resolution-block"}"
            style="margin-bottom:1.5vh;">
            <div class="modal-section-title" style="color:${rec.status === "Escalated" ? "#4a235a" : "#856404"};">
              ${rec.status === "Escalated" ? "🔺 Escalation Details" : "✅ Resolution Details"}
            </div>
            <div class="sched-field">
              <label>Resolution Notes</label>
              <textarea id="resolution-notes" rows="3" ${isLocked ? "readonly" : ""}
                style="${isLocked ? "background:#f9f9f9;cursor:default;" : ""}"
              >${rec.resolution_notes || ""}</textarea>
            </div>
            <div style="display:flex;gap:1vw;">
              <div class="sched-field" style="flex:1;">
                <label>Presiding Kagawad</label>
                <input type="text" id="presiding-kagawad" value="${rec.presiding_kagawad || ""}"
                  ${isLocked ? "readonly" : ""} style="${isLocked ? "background:#f9f9f9;cursor:default;" : ""}">
              </div>
              <div class="sched-field" style="flex:1;">
                <label>Secretary Name</label>
                <input type="text" id="secretary-name" value="${rec.secretary_name || ""}"
                  ${isLocked ? "readonly" : ""} style="${isLocked ? "background:#f9f9f9;cursor:default;" : ""}">
              </div>
            </div>
            <div class="sched-field">
              <label>Date ${rec.status === "Escalated" ? "Escalated" : "Resolved"}</label>
              <input type="date" id="resolved-at-input" value="${rec.resolved_at ? rec.resolved_at.split("T")[0] : ""}"
                ${isLocked ? "readonly" : ""} style="${isLocked ? "background:#f9f9f9;cursor:default;" : ""}">
            </div>
          </div>
        </div>

        <!-- SECTION 4: Update Status -->
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

    // Build schedules after DOM is ready
    buildScheduleBlocks(rec, isLocked);

    // Listen to status dropdown to show/hide resolution section
    const selectEl = document.getElementById("modal-status-select");
    if (selectEl) {
      selectEl.addEventListener("change", function () {
        const resSection = document.getElementById("resolution-section");
        if (resSection) {
          resSection.style.display = (this.value === "Resolved" || this.value === "Escalated") ? "" : "none";
        }
      });
    }

    // ── Unlock handler ─────────────────────────────────────
    window.unlockRecord = function () {
      const select    = document.getElementById("modal-status-select");
      const hint      = document.getElementById("locked-hint");
      const unlockBtn = document.getElementById("btn-unlock-record");

      if (unlockBtn) { unlockBtn.disabled = true; unlockBtn.textContent = "Unlocking…"; }

      fetch("php/GetBlotter.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blotter_id: rec.blotter_id, status: rec.status, clear_locked: true }),
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

  // ── Build schedule blocks ──────────────────────────────────
  function buildScheduleBlocks(rec, isLocked) {
    const container = document.getElementById("schedule-container");
    if (!container) return;

    const outcomes = [
      "Appeared - Resolved",
      "Appeared - Rescheduled",
      "Did Not Appear - No Response",
      "Resolved",
      "Escalated"
    ];

    for (let i = 1; i <= 3; i++) {
      const dateKey    = `schedule_date_${i}`;
      const timeKey    = `schedule_time_${i}`;
      const detailKey  = `schedule_details_${i}`;
      const outcomeKey = `schedule_outcome_${i}`;

      const prevOutcomeKey = `schedule_outcome_${i - 1}`;
      const hasData        = !!rec[dateKey];
      const outcomeSaved   = !!rec[outcomeKey];

      // Continue-type outcomes are the only ones that unlock the next schedule
      const continueOutcomes = ["Appeared - Rescheduled", "Did Not Appear - No Response"];
      const terminalOutcomes = ["Appeared - Resolved", "Resolved", "Escalated"];

      // prevDone: Schedule 1 is always open; for 2 & 3, the previous schedule must have
      // a continue-type outcome (reschedule / no response) to unlock the next one.
      const prevOutcomeValue = rec[prevOutcomeKey] || "";
      const prevDone = i === 1 || continueOutcomes.includes(prevOutcomeValue);

      // If ANY previous schedule has a terminal outcome, all subsequent ones are disabled
      let anyPrevTerminal = false;
      for (let j = 1; j < i; j++) {
        if (terminalOutcomes.includes(rec[`schedule_outcome_${j}`])) {
          anyPrevTerminal = true;
          break;
        }
      }
      const effectivelyLocked = isLocked || anyPrevTerminal;

      const block = document.createElement("div");
      block.id = `sched-block-${i}`;
      block.className = "schedule-block" + (effectivelyLocked ? " locked-sched" : "") + ((!prevDone || anyPrevTerminal) && !hasData ? " disabled-sched" : "");

      const outcomeOpts = outcomes.map(o =>
        `<option value="${o}" ${rec[outcomeKey] === o ? "selected" : ""}>${o}</option>`
      ).join("");

      // If outcome already saved → show read view with edit button (unless globally locked)
      // IMPORTANT: outcomeSaved check must come first; then anyPrevTerminal; then prevDone for editable
      if (outcomeSaved) {
        // Read-only locked view. Always show Unlock & Edit (for human error correction).
        // Only suppress if the overall blotter is globally locked (Resolved/Escalated status).
        const terminalOut  = ["Appeared - Resolved","Resolved","Escalated"];
        const lockBadgeSty = terminalOut.includes(rec[outcomeKey])
          ? "background:#f3e8ff;color:#6c3483;border:1px solid #c084fc;"
          : "background:#fff3cd;color:#856404;border:1px solid #ffc107;";
        const lockLabel = terminalOut.includes(rec[outcomeKey]) ? "🔒 Final" : "🔒 Locked";

        block.innerHTML = `
          <div class="sched-header">
            <span class="sched-title">📅 Schedule ${i}
              <span style="margin-left:0.5vw;font-size:1.2vh;padding:0.2vh 0.6vw;border-radius:12px;
                ${lockBadgeSty}">${lockLabel}</span>
            </span>
            ${!effectivelyLocked
              ? `<button class="btn-edit-sched" id="btn-unlock-sched-${i}"
                  onclick="editSchedule(${i}, ${rec.blotter_id})"
                  title="Unlock to correct a mistake">🔓 Unlock & Edit</button>`
              : ""}
          </div>
          <div class="sched-readview" id="sched-read-${i}">
            <span>📅 <strong>${fmtDate(rec[dateKey])}</strong></span>
            <span>⏰ <strong>${fmtTime(rec[timeKey])}</strong></span>
            <span>Details: ${rec[detailKey] || "—"}</span><br>
            <span>Outcome: <span class="sched-outcome-badge" style="${outcomeStyle(rec[outcomeKey])}">
              ${rec[outcomeKey]}
            </span></span>
          </div>
          <div id="sched-edit-${i}" style="display:none;">
            <div style="background:#fff8e6;border:1px solid #ffc107;border-radius:7px;
              padding:0.8vh 1vw;margin-bottom:1vh;font-size:1.3vh;color:#856404;">
              ⚠️ Editing a saved schedule — for correcting mistakes only.
            </div>
            <div class="sched-field"><label>Date</label>
              <input type="date" id="sched-date-${i}" value="${rec[dateKey] || ""}"></div>
            <div class="sched-field"><label>Time</label>
              <input type="time" id="sched-time-${i}" value="${rec[timeKey] || ""}"></div>
            <div class="sched-field"><label>Details</label>
              <textarea id="sched-details-${i}" rows="2">${rec[detailKey] || ""}</textarea></div>
            <div class="sched-field"><label>Outcome</label>
              <select id="sched-outcome-${i}"><option value="">— Select Outcome —</option>${outcomeOpts}</select></div>
            <div style="display:flex;gap:0.8vw;margin-top:0.8vh;">
              <button class="btn-save-sched" onclick="saveSchedule(${i}, ${rec.blotter_id})">Save Correction</button>
              <button class="btn-edit-sched" onclick="cancelEditSchedule(${i})">Cancel</button>
            </div>
          </div>`;
      } else if (prevDone && !anyPrevTerminal) {
        // Editable input form (first time filling)
        block.innerHTML = `
          <div class="sched-header">
            <span class="sched-title">📅 Schedule ${i}</span>
          </div>
          <div class="sched-field"><label>Date</label>
            <input type="date" id="sched-date-${i}" value="${rec[dateKey] || ""}"></div>
          <div class="sched-field"><label>Time</label>
            <input type="time" id="sched-time-${i}" value="${rec[timeKey] || ""}"></div>
          <div class="sched-field"><label>Details</label>
            <textarea id="sched-details-${i}" rows="2">${rec[detailKey] || ""}</textarea></div>
          <div class="sched-field"><label>Outcome</label>
            <select id="sched-outcome-${i}"><option value="">— Select Outcome —</option>${outcomeOpts}</select></div>
          <div style="margin-top:0.8vh;">
            <button class="btn-save-sched" onclick="saveSchedule(${i}, ${rec.blotter_id})">Save Schedule ${i}</button>
          </div>`;
      } else {
        // Locked — either previous schedule not done, or previous had a terminal outcome
        const lockReason = anyPrevTerminal
          ? `🔒 Disabled — case already ${terminalOutcomes.includes(rec[`schedule_outcome_${i-1}`]) ? rec[`schedule_outcome_${i-1}`] : "closed"}`
          : `🔐 Unlocks after Schedule ${i-1} outcome is Rescheduled / No Response`;
        block.innerHTML = `
          <div class="sched-header">
            <span class="sched-title">📅 Schedule ${i}</span>
            <span style="font-size:1.3vh;color:#999;">${lockReason}</span>
          </div>`;
      }

      container.appendChild(block);
    }
  }

  // ── Edit / Cancel schedule ────────────────────────────────
  window.editSchedule = function (n, blotterId) {
    document.getElementById(`sched-read-${n}`).style.display   = "none";
    document.getElementById(`sched-edit-${n}`).style.display   = "";
    // Hide the Edit button
    const editBtn = document.querySelector(`#sched-block-${n} .btn-edit-sched`);
    if (editBtn) editBtn.style.display = "none";
  };
  window.cancelEditSchedule = function (n) {
    document.getElementById(`sched-read-${n}`).style.display   = "";
    document.getElementById(`sched-edit-${n}`).style.display   = "none";
    const editBtn = document.querySelector(`#sched-block-${n} .btn-edit-sched`);
    if (editBtn) editBtn.style.display = "";
  };

  // ── Save single schedule ──────────────────────────────────
  window.saveSchedule = function (n, blotterId) {
    const date    = document.getElementById(`sched-date-${n}`)?.value;
    const time    = document.getElementById(`sched-time-${n}`)?.value;
    const details = document.getElementById(`sched-details-${n}`)?.value;
    const outcome = document.getElementById(`sched-outcome-${n}`)?.value;

    if (!date || !time || !outcome) {
      showToast("❌ Please fill in date, time, and outcome before saving.");
      return;
    }

    const terminalOutcomes = ["Appeared - Resolved", "Resolved", "Escalated"];
    const continueOutcomes = ["Appeared - Rescheduled", "Did Not Appear - No Response"];
    const autoEscalate     = (n === 3) && continueOutcomes.includes(outcome);

    const btn = document.querySelector(`#sched-block-${n} .btn-save-sched`);
    if (btn) { btn.textContent = "Saving…"; btn.disabled = true; }

    fetch("php/GetBlotter.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blotter_id:       blotterId,
        action:           "save_schedule",
        schedule_number:  n,
        schedule_date:    date,
        schedule_time:    time,
        schedule_details: details,
        schedule_outcome: outcome,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          showToast("❌ " + (data.message || "Failed to save schedule."));
          if (btn) { btn.textContent = `💾 Save Schedule ${n}`; btn.disabled = false; }
          return;
        }

        const today = new Date().toISOString().split("T")[0];

        // Terminal outcome → auto-lock blotter
        if (terminalOutcomes.includes(outcome)) {
          const newStatus = (outcome === "Appeared - Resolved" || outcome === "Resolved")
            ? "Resolved" : "Escalated";
          return fetch("php/GetBlotter.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blotter_id: blotterId, action: "update_status",
              status: newStatus, resolved_at: today }),
          })
          .then(r => r.json())
          .then(() => {
            showToast(`✅ Schedule ${n} saved. Blotter marked as ${newStatus} and locked.`);
            const modal = document.getElementById("update-modal");
            if (modal) modal.remove();
            fetchRecords();
          });
        }

        // Schedule 3 + continue outcome → auto-escalate
        if (autoEscalate) {
          return fetch("php/GetBlotter.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blotter_id: blotterId, action: "update_status",
              status: "Escalated", resolved_at: today }),
          })
          .then(r => r.json())
          .then(() => {
            showToast("🔺 Schedule 3 exhausted. Blotter automatically escalated.");
            const modal = document.getElementById("update-modal");
            if (modal) modal.remove();
            fetchRecords();
          });
        }

        // Continue outcome → update the shared currentRec in-place and rebuild schedule blocks
        if (currentRec) {
          currentRec[`schedule_date_${n}`]    = date;
          currentRec[`schedule_time_${n}`]    = time;
          currentRec[`schedule_details_${n}`] = details;
          currentRec[`schedule_outcome_${n}`] = outcome;
        }

        showToast(`✅ Schedule ${n} saved and locked. Schedule ${n + 1} is now unlocked.`);

        // Rebuild only the schedule blocks with the updated rec — no modal close/reopen needed
        const schedContainer = document.getElementById("schedule-container");
        if (schedContainer && currentRec) {
          schedContainer.innerHTML = "";
          buildScheduleBlocks(currentRec, false);
        }
        fetchRecords();
      })
      .catch(() => {
        showToast("❌ Server error. Please try again.");
        if (btn) { btn.textContent = `💾 Save Schedule ${n}`; btn.disabled = false; }
      });
  };

  // ── Outcome badge style ───────────────────────────────────
  function outcomeStyle(outcome) {
    const map = {
      "Appeared - Resolved":          "background:#d1e7dd;color:#0a3622;border:1px solid #198754;",
      "Appeared - Rescheduled":       "background:#cfe2ff;color:#084298;border:1px solid #0d6efd;",
      "Did Not Appear - No Response": "background:#fff3cd;color:#856404;border:1px solid #ffc107;",
      "Resolved":                     "background:#d1e7dd;color:#0a3622;border:1px solid #198754;",
      "Escalated":                    "background:#e2d9f3;color:#4a235a;border:1px solid #8b5cf6;",
    };
    return map[outcome] || "background:#eee;color:#333;";
  }

  // ── Save main status ──────────────────────────────────────
  window.saveBlotterStatus = function (blotterId) {
    const selectEl  = document.getElementById("modal-status-select");
    const newStatus = selectEl.value;

    if (newStatus === "Resolved" || newStatus === "Escalated") {
      showLockConfirmation(blotterId, newStatus);
      return;
    }

    doSaveStatus(blotterId, newStatus);
  };

  function showLockConfirmation(blotterId, newStatus) {
    const existing = document.getElementById("confirm-modal");
    if (existing) existing.remove();

    const todayLocal = new Date();
    const yyyy = todayLocal.getFullYear();
    const mm   = String(todayLocal.getMonth() + 1).padStart(2, "0");
    const dd   = String(todayLocal.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const isEscalated = newStatus === "Escalated";

    const confirmOverlay = document.createElement("div");
    confirmOverlay.className = "confirm-overlay";
    confirmOverlay.id = "confirm-modal";
    confirmOverlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-title">${isEscalated ? "🔺 Mark as Escalated?" : "✅ Mark as Resolved?"}</div>
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
            ✅ Yes, Mark as ${newStatus}
          </button>
        </div>
      </div>`;
    document.body.appendChild(confirmOverlay);
  }

  window.confirmLockBlotter = function (blotterId, newStatus) {
    const dateInput  = document.getElementById("resolved-date-input");
    const chosenDate = dateInput ? dateInput.value : "";

    // Pull resolution fields from the modal
    const resNotes  = document.getElementById("resolution-notes")?.value  || "";
    const kagawad   = document.getElementById("presiding-kagawad")?.value || "";
    const secretary = document.getElementById("secretary-name")?.value    || "";

    if (!chosenDate) {
      if (dateInput) dateInput.style.border = "1.5px solid #cc0000";
      return;
    }

    document.getElementById("confirm-modal").remove();
    doSaveStatus(blotterId, newStatus, chosenDate, resNotes, kagawad, secretary);
  };

  function doSaveStatus(blotterId, newStatus, resolvedAt, resNotes, kagawad, secretary) {
    const saveBtn = document.getElementById("modal-save-btn");
    if (saveBtn) { saveBtn.textContent = "Saving…"; saveBtn.disabled = true; }

    const payload = { blotter_id: blotterId, status: newStatus, action: "update_status" };
    if (resolvedAt) payload.resolved_at   = resolvedAt;
    if (resNotes)   payload.resolution_notes = resNotes;
    if (kagawad)    payload.presiding_kagawad = kagawad;
    if (secretary)  payload.secretary_name    = secretary;

    fetch("php/GetBlotter.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        const modal = document.getElementById("update-modal");
        if (modal) modal.remove();
        showToast(
          data.success
            ? (newStatus === "Resolved"  ? "✅ Blotter marked as Resolved and locked."  :
               newStatus === "Escalated" ? "🔺 Blotter marked as Escalated and locked." :
               "✅ Status updated to " + newStatus)
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

  // ── Print blotter record ─────────────────────────────────
  window.printBlotterRecord = function () {
    if (!currentRec) return;
    const rec    = currentRec;
    const modal  = document.getElementById("update-modal");

    // ── Pull live resolution fields from modal if open ──────
    const kagawad   = modal?.querySelector("#presiding-kagawad")?.value  || rec.presiding_kagawad  || "";
    const secretary = modal?.querySelector("#secretary-name")?.value     || rec.secretary_name     || "";
    const resNotes  = modal?.querySelector("#resolution-notes")?.value   || rec.resolution_notes   || "";
    const resolvedAt = modal?.querySelector("#resolved-at-input")?.value
      || (rec.resolved_at ? rec.resolved_at.split("T")[0] : "");

    // ── Helpers ─────────────────────────────────────────────
    function fmtD(d) {
      if (!d) return "—";
      const dt = new Date(d);
      return dt.toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
    }
    function fmtT(t) {
      if (!t) return "—";
      const [h, m] = String(t).split(":");
      const hr = parseInt(h);
      return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
    }
    function safe(v) {
      return v ? String(v).replace(/</g,"&lt;").replace(/>/g,"&gt;") : "—";
    }

    // ── Age category — not stored separately, left blank for barangay staff ─
    const ageCatLabel = "";

    // ── Resolution block (only for Resolved / Escalated) ────
    const isSettled = rec.status === "Resolved" || rec.status === "Escalated";
    const resBlock = isSettled ? `
      <div class="section-title">${rec.status === "Escalated" ? "🔺 Escalation Details" : "✅ Resolution Details"}</div>
      <table class="info-table">
        <tr>
          <td class="lbl">Date ${rec.status === "Escalated" ? "Escalated" : "Resolved"}</td>
          <td>${safe(fmtD(resolvedAt))}</td>
          <td class="lbl">Presiding Kagawad</td>
          <td>${safe(kagawad)}</td>
        </tr>
        <tr>
          <td class="lbl">Secretary</td>
          <td>${safe(secretary)}</td>
          <td class="lbl">Blotter Status</td>
          <td><strong>${safe(rec.status)}</strong></td>
        </tr>
        <tr>
          <td class="lbl">Resolution / Notes</td>
          <td colspan="3">${safe(resNotes)}</td>
        </tr>
      </table>` : "";

    const todayStr = new Date().toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });

    // ── Status badge style ───────────────────────────────────
    const statusStyleMap = {
      Pending:   "background:#fff3cd;color:#856404;border:1px solid #ffc107;",
      Scheduled: "background:#cfe2ff;color:#084298;border:1px solid #0d6efd;",
      Resolved:  "background:#d1e7dd;color:#0a3622;border:1px solid #198754;",
      Escalated: "background:#e2d9f3;color:#4a235a;border:1px solid #8b5cf6;",
    };
    const statusStyle = statusStyleMap[rec.status] || "background:#eee;color:#333;border:1px solid #aaa;";

    const win = window.open("", "_blank", "width=900,height=800");
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Barangay Blotter — ${safe(rec.reference_number)}</title>
<style>
  /* ── Reset ─────────────────────────────────────── */
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

  /* ── Page ──────────────────────────────────────── */
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12.5px;
    color: #000;
    background: #fff;
    padding: 32px 44px;
  }
  @media print {
    body { padding: 0; }
    @page { size: A4 portrait; margin: 1.5cm 1.8cm; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
  }

  /* ── Header ─────────────────────────────────────── */
  .form-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .form-logo {
    width: 78px;
    height: auto;
    flex-shrink: 0;
  }
  .header-text {
    flex: 1;
    text-align: center;
    padding: 0 12px;
  }
  .header-text .line-sm   { font-size: 10.5px; margin: 1px 0; }
  .header-text .brgy-name { font-size: 22px; font-weight: bold; color: #032f15; margin: 3px 0; }
  .header-text .office    { font-size: 12px; font-weight: bold; margin: 2px 0; }
  .ref-badge {
    text-align: right;
    font-size: 10px;
    color: #555;
    flex-shrink: 0;
    min-width: 90px;
  }
  .ref-badge strong { display: block; font-size: 12px; color: #032f15; }

  /* ── Form title ─────────────────────────────────── */
  .form-title {
    text-align: center;
    font-size: 15px;
    font-weight: bold;
    letter-spacing: 3px;
    border-top: 2.5px solid #000;
    border-bottom: 2.5px solid #000;
    padding: 5px 0;
    margin: 8px 0 14px;
  }

  /* ── Section title ──────────────────────────────── */
  .section-title {
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #032f15;
    border-bottom: 1.5px solid #032f15;
    padding-bottom: 2px;
    margin: 14px 0 5px;
  }

  /* ── Info table ─────────────────────────────────── */
  .info-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }
  .info-table td {
    padding: 6px 9px;
    border: 1px solid #c8c8c8;
    font-size: 12px;
    vertical-align: top;
  }
  .info-table td.lbl {
    font-weight: bold;
    background: #f5f5f0;
    width: 20%;
    white-space: nowrap;
    color: #333;
  }
  .info-table td.val-lg { font-size: 12.5px; }

  /* ── Form rows (label-above style) ──────────────── */
  .field-label {
    display: block;
    font-size: 9.5px;
    font-weight: bold;
    text-transform: uppercase;
    color: #374151;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
    margin-top: 10px;
  }
  .field-value {
    border-bottom: 1px solid #444;
    min-height: 20px;
    font-size: 12.5px;
    padding: 2px 4px;
    display: block;
  }
  .field-box {
    border: 1px solid #c8c8c8;
    border-radius: 3px;
    padding: 6px 8px;
    min-height: 20px;
    font-size: 12.5px;
  }

  /* ── Two-column row ─────────────────────────────── */
  .row2 { display: flex; gap: 20px; }
  .row2 .col { flex: 1; }

  /* ── Textarea-style block ───────────────────────── */
  .complaint-block {
    border: 1px solid #c8c8c8;
    border-radius: 3px;
    padding: 8px 10px;
    min-height: 60px;
    font-size: 12.5px;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  /* ── Radio inline ───────────────────────────────── */
  .radio-group {
    display: flex;
    gap: 24px;
    margin-top: 4px;
    font-size: 12px;
  }
  .radio-group .opt { display: flex; align-items: center; gap: 5px; }
  .radio-box {
    width: 11px; height: 11px;
    border: 1.5px solid #444;
    border-radius: 50%;
    display: inline-block;
    position: relative;
  }
  .radio-box.checked::after {
    content: '';
    width: 6px; height: 6px;
    background: #032f15;
    border-radius: 50%;
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
  }

  /* ── Divider ─────────────────────────────────────── */
  .divider { border: 0; border-top: 1.5px solid #032f15; opacity: 0.2; margin: 14px 0; }

  /* ── Footer text ─────────────────────────────────── */
  .location-footer {
    font-size: 12px;
    line-height: 2.1;
    margin: 10px 0;
  }
  .location-footer .fill {
    display: inline-block;
    border-bottom: 1px solid #000;
    min-width: 60px;
    text-align: center;
    font-weight: bold;
    padding: 0 4px;
  }
  .fill-wide  { min-width: 110px !important; }
  .fill-short { min-width: 36px !important; }

  /* ── Status badge ────────────────────────────────── */
  .status-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: bold;
  }

  /* ── Schedule table ──────────────────────────────── */
  .sched-table { width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:6px; }
  .sched-table th {
    background: #273b07; color: #fff;
    padding: 6px 9px; text-align: left; font-size: 11px;
  }
  .sched-table td { padding: 6px 9px; border: 1px solid #c8c8c8; }
  .sched-table .s-num   { font-weight: bold; background: #f0f4e8; white-space: nowrap; }
  .sched-table .s-out   { font-weight: bold; }
  .sched-table .s-empty { color: #999; font-style: italic; }

  /* ── Signature section ───────────────────────────── */
  .sig-section { margin-top: 30px; }
  .sig-row { display: flex; gap: 24px; margin-top: 0; }
  .sig-col { flex: 1; text-align: center; }
  .sig-line {
    border-bottom: 1px solid #000;
    height: 42px;
    margin-bottom: 5px;
  }
  .sig-lbl {
    font-size: 9.5px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #333;
  }

  /* ── Page footer ─────────────────────────────────── */
  .page-footer {
    margin-top: 18px;
    padding-top: 6px;
    border-top: 1px solid #ccc;
    font-size: 9.5px;
    color: #888;
    text-align: center;
  }

  /* ── Print button ────────────────────────────────── */
  .print-btn {
    display: block;
    margin: 0 auto 20px;
    padding: 10px 32px;
    background: #032f15;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    letter-spacing: 1px;
  }
  .print-btn:hover { background: #054d22; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

<!-- ═══════════════════════════════════════════════════
     HEADER  (mirrors blotterdemo.html)
════════════════════════════════════════════════════ -->
<div class="form-header">
  <img class="form-logo" src="../photos/logo.png.png" alt="Barangay Logo"
    onerror="this.style.display='none'">

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

<!-- ═══════════════════════════════════════════════════
     COMPLAINEE INFORMATION
════════════════════════════════════════════════════ -->
<span class="field-label">NAME</span>
<span class="field-value">${safe(rec.full_name)}</span>

<div class="row2">
  <div class="col">
    <span class="field-label">AGE</span>
    <span class="field-value">${safe(rec.age)}</span>
  </div>
  <div class="col">
    <span class="field-label">STATUS (Civil Status)</span>
    <span class="field-value">${safe(rec.civil_status)}</span>
  </div>
</div>

<span class="field-label">ADDRESS</span>
<span class="field-value">${safe(rec.address)}</span>

<span class="field-label">OCCUPATION</span>
<span class="field-value">${safe(rec.occupation)}</span>

<hr class="divider">

<!-- ═══════════════════════════════════════════════════
     INCIDENT DETAILS
════════════════════════════════════════════════════ -->
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

<span class="field-label">NAGSADYA DITO SI (NAME OF COMPLAINANT)</span>
<span class="field-value">${safe(rec.complaint_against)}</span>

<div class="field-label" style="margin-top:6px;">AGE CATEGORY</div>
<div class="radio-group">
  <div class="opt">
    <span class="radio-box"></span>
    Minor
  </div>
  <div class="opt">
    <span class="radio-box"></span>
    May Sapat na Gulang (Adult)
  </div>
</div>

<span class="field-label" style="margin-top:10px;">COMPLAINT TYPE</span>
<span class="field-value">${safe(rec.complaint_type)}</span>

<span class="field-label">REKLAMO / TULONG (FOR/PARA KAY/SA)</span>
<div class="complaint-block">${safe(rec.complaint_details)}</div>

<!-- ═══════════════════════════════════════════════════
     LOCATION FOOTER  — left blank, to be filled at barangay
════════════════════════════════════════════════════ -->
<div class="location-footer">
  Ipinatala ganap na ika
  <span class="fill" style="min-width:80px;">&nbsp;</span>
  ng (<span class="fill fill-short">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>), ika
  <span class="fill fill-short">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
  ng
  <span class="fill fill-wide">&nbsp;</span>,
  20<span class="fill fill-short">&nbsp;&nbsp;&nbsp;&nbsp;</span>
  <br>
  Tanggapan ng Punong Barangay, Tugtug, San Jose, Batangas.
</div>

<hr class="divider">

<!-- ═══════════════════════════════════════════════════
     SIGNATURE SECTION  (mirrors blotterdemo.html)
════════════════════════════════════════════════════ -->
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

<!-- ═══════════════════════════════════════════════════
     PAGE FOOTER
════════════════════════════════════════════════════ -->
<div class="page-footer">
  Printed on: ${todayStr} &nbsp;|&nbsp; Barangay Tugtug E-System &nbsp;|&nbsp; Ref: ${safe(rec.reference_number)}
</div>

</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  // ── Toast ─────────────────────────────────────────────────

  // ── Print ALL blotter records (dashboard button) ─────────
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
      Resolved:  "background:#d1e7dd;color:#0a3622;border:1px solid #198754;",
      Escalated: "background:#e2d9f3;color:#4a235a;border:1px solid #8b5cf6;",
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
        <td style="${td2()}">${safe(r.status)}</td>
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
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Times New Roman',Times,serif; font-size:11px; color:#000; background:#fff; padding:28px 36px; }
  @media print {
    body { padding:0; }
    @page { size: A3 landscape; margin: 1.2cm 1.5cm; }
    .no-print { display:none !important; }
  }
  .print-btn {
    display:block; margin:0 auto 18px; padding:9px 28px;
    background:#032f15; color:#fff; border:none; border-radius:6px;
    font-size:13px; font-weight:bold; cursor:pointer; letter-spacing:1px;
  }
  .print-btn:hover { background:#054d22; }
  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
  .header-logo { width:60px; height:auto; }
  .header-text { flex:1; text-align:center; }
  .header-text .sm   { font-size:9.5px; margin:1px 0; }
  .header-text .brgy { font-size:18px; font-weight:bold; color:#032f15; margin:2px 0; }
  .header-text .off  { font-size:11px; font-weight:bold; }
  .report-title {
    text-align:center; font-size:13px; font-weight:bold; letter-spacing:2px;
    border-top:2px solid #000; border-bottom:2px solid #000;
    padding:4px 0; margin:6px 0 12px;
  }
  .summary-bar {
    display:table; width:100%; border-collapse:collapse;
    border:1px solid #c8c8c8; border-radius:4px; margin-bottom:12px;
    background:#f9f9f4;
  }
  .sum-card {
    display:table-cell; text-align:center; padding:5px 10px;
    border-right:1px solid #ddd; vertical-align:middle;
  }
  .sum-card:last-child { border-right:none; }
  .sum-card .num { font-size:13px; font-weight:bold; color:#032f15; display:inline; }
  .sum-card .lbl { font-size:9.5px; text-transform:uppercase; color:#555; letter-spacing:0.4px; display:inline; margin-left:4px; }
  table { width:100%; border-collapse:collapse; }
  thead tr { background:#273b07; color:#f3efe8; }
  thead th { padding:6px 7px; text-align:left; font-size:10px; font-weight:600; white-space:nowrap; border:1px solid #1a2d05; }
  .footer { margin-top:14px; padding-top:6px; border-top:1px solid #ccc; font-size:9px; color:#888; text-align:center; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">&#128424;&#65039; Print / Save as PDF</button>

<div class="header">
  <img class="header-logo" src="../photos/logo.png.png" alt="Logo" onerror="this.style.display='none'">
  <div class="header-text">
    <p class="sm">Republic of the Philippines &nbsp;|&nbsp; PROVINCE OF BATANGAS &nbsp;|&nbsp; Municipality of San Jose</p>
    <p class="brgy">Barangay Tugtug</p>
    <p class="off">OFFICE OF THE PUNONG BARANGAY</p>
  </div>
  <div style="min-width:70px;text-align:right;font-size:9px;color:#555;">
    Printed:<br><strong>${todayStr}</strong>
  </div>
</div>

<div class="report-title">BARANGAY BLOTTER — ALL RECORDS</div>

<div class="summary-bar">
  <div class="sum-card"><span class="num">${c.Total || 0}</span> <span class="lbl">Total Records</span></div>
  <div class="sum-card"><span class="num">${c.Pending || 0}</span> <span class="lbl">Pending</span></div>
  <div class="sum-card"><span class="num">${c.Scheduled || 0}</span> <span class="lbl">Scheduled</span></div>
  <div class="sum-card"><span class="num">${c.Resolved || 0}</span> <span class="lbl">Resolved</span></div>
  <div class="sum-card"><span class="num">${c.Escalated || 0}</span> <span class="lbl">Escalated</span></div>
</div>

<table>
  <thead>
    <tr>
      <th>Ref No.</th>
      <th>Full Name</th>
      <th>Age</th>
      <th>Civil Status</th>
      <th>Address</th>
      <th>Complaint Against</th>
      <th>Complaint Type</th>
      <th>Date (Petsa)</th>
      <th>Time (Oras)</th>
      <th>Status</th>
      <th>Complaint Details</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="footer">
  Total Records: ${records.length} &nbsp;|&nbsp; Barangay Tugtug E-System &nbsp;|&nbsp; Printed on: ${todayStr}
</div>
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