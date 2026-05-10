// ============================================================
//  Barangay Tugtug E-System — Document Records Logic
//  File: Javascript/Documentrequest.js
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  const recordsContainer = document.querySelector(".document-records");
  const searchInput = document.querySelector(".search-input");
  const filterSelect = document.querySelector(".filter-select");
  const btnDisplay = document.querySelector(".btn-display");
  const btnPrint = document.querySelector(".btn-print");

  // ── Inject date range inputs into filter group ────────────
  const filterGroup = document.querySelector(".filter-group");
  const dateWrapper = document.createElement("div");
  dateWrapper.id = "date-filter-wrapper";
  dateWrapper.style.cssText = `
        display: none; align-items: center; gap: 0.5vw;
        position: relative; left: 6vh;
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
    Pending: { bg: "#fff3cd", color: "#856404", border: "#ffc107" },
    Processing: { bg: "#cfe2ff", color: "#084298", border: "#0d6efd" },
    Ready: { bg: "#d1e7dd", color: "#0a3622", border: "#198754" },
    Released: { bg: "#e2d9f3", color: "#4a235a", border: "#8b5cf6" },
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
  searchInput.addEventListener(
    "input",
    debounce(() => fetchRecords(), 400),
  );

  btnPrint.addEventListener("click", () => {
    const search = searchInput.value.trim();
    const filter = filterSelect.value;
    const dateFrom = document.getElementById("date-from")
      ? document.getElementById("date-from").value
      : "";
    const dateTo = document.getElementById("date-to")
      ? document.getElementById("date-to").value
      : "";

    let url = "php/PrintDocuments.php?";
    if (search) url += "search=" + encodeURIComponent(search) + "&";
    if (filter && filter !== "date")
      url += "filter=" + encodeURIComponent(filter) + "&";
    if (filter === "date" && dateFrom)
      url += "date_from=" + encodeURIComponent(dateFrom) + "&";
    if (filter === "date" && dateTo)
      url += "date_to=" + encodeURIComponent(dateTo) + "&";

    window.open(url, "_blank");
  });

  // Delegated click for dynamically rendered Update buttons
  recordsContainer.addEventListener("click", function (e) {
    const btn = e.target.closest(".btn-update-record");
    if (!btn) return;
    const rec = JSON.parse(
      btn.getAttribute("data-record").replace(/&apos;/g, "'"),
    );
    openUpdateModal(rec);
  });

  // ── Fetch ─────────────────────────────────────────────────
  function fetchRecords() {
    const search = searchInput.value.trim();
    const filter = filterSelect.value;
    const dateFrom = document.getElementById("date-from")
      ? document.getElementById("date-from").value
      : "";
    const dateTo = document.getElementById("date-to")
      ? document.getElementById("date-to").value
      : "";

    let url = "php/GetDocuments.php?";
    if (search) url += "search=" + encodeURIComponent(search) + "&";
    if (filter && filter !== "date")
      url += "filter=" + encodeURIComponent(filter) + "&";
    if (filter === "date" && dateFrom)
      url += "date_from=" + encodeURIComponent(dateFrom) + "&";
    if (filter === "date" && dateTo)
      url += "date_to=" + encodeURIComponent(dateTo) + "&";

    recordsContainer.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;
                height:30vh;color:#375309;font-family:'Segoe UI',sans-serif;font-size:2vh;gap:1vw;">
                <span style="width:2.5vh;height:2.5vh;border:3px solid #375309;
                    border-top-color:transparent;border-radius:50%;
                    display:inline-block;animation:spin 0.7s linear infinite;"></span>
                Loading records…
            </div>`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          showError(data.message || "Failed to load records.");
          return;
        }
        updateCounts(data.counts);
        renderTable(data.records);
      })
      .catch((err) => {
        console.error(err);
        showError("Server error. Please try again.");
      });
  }

  // ── Summary cards ─────────────────────────────────────────
  function updateCounts(counts) {
    setCount(document.querySelector(".total"), counts.Total || 0);
    setCount(document.querySelector(".processing"), counts.Processing || 0);
    setCount(document.querySelector(".pending"), counts.Pending || 0);
    setCount(document.querySelector(".ready"), counts.Ready || 0);
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
            position: relative;
            top: 12vh;
            padding: 0 1.5%;
            padding-bottom: 3vh;
        `;

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
                    <th style="${th()}">📋 Req. ID</th>
                    <th style="${th()}">🪪 Ref No.</th>
                    <th style="${th()}">👤 Full Name</th>
                    <th style="${th()}">⚧ Sex</th>
                    <th style="${th()}">📞 Contact</th>
                    <th style="${th()}">📄 Document Purpose</th>
                    <th style="${th()}">📅 Date Requested</th>
                    <th style="${th()}">📅 Document Type</th>
                    <th style="${th()}">🔢 Qty</th>
                    <th style="${th()}">🔖 Status</th>
                    <th style="${th()}">⚙ Action</th>
                </tr>
            </thead>
            <tbody id="records-tbody"></tbody>`;

    const tbody = table.querySelector("#records-tbody");

    records.forEach((rec, i) => {
      const tr = document.createElement("tr");
      const isReleased = rec.status === "Released";
      tr.style.cssText = `background-color:${i % 2 === 0 ? "#fafaf7" : "#f3efe8"};transition:background-color 0.2s;
        ${isReleased ? "opacity:0.82;" : ""}`;
      tr.onmouseover = () => (tr.style.backgroundColor = "#e8f0d8");
      tr.onmouseout = () =>
        (tr.style.backgroundColor = i % 2 === 0 ? "#fafaf7" : "#f3efe8");

      const fullName =
        `${rec.first_name || ""} ${rec.middle_initial ? rec.middle_initial + ". " : ""}${rec.last_name || ""}`.trim();
      const sc = statusColors[rec.status] || {
        bg: "#eee",
        color: "#333",
        border: "#aaa",
      };

      const btnLabel = isReleased ? `🔒 View / Unlock` : `✏ Update`;
      const btnStyle = isReleased
        ? `background:#6c3483;`
        : `background:#375309;`;
      const btnHover = isReleased
        ? `this.style.background='#8b5cf6'`
        : `this.style.background='#7d9e3b'`;
      const btnOut = isReleased
        ? `this.style.background='#6c3483'`
        : `this.style.background='#375309'`;

      tr.innerHTML = `
                <td style="${td()}text-align:center;">${rec.request_ID}</td>
                <td style="${td()}text-align:center;">${rec.document_refnumber}</td>
                <td style="${td()}">${fullName}</td>
                <td style="${td()}text-align:center;">${rec.sex || "—"}</td>
                <td style="${td()}text-align:center;">${rec.contact || "—"}</td>
                <td style="${td()}">${rec.document_purpose || "—"}</td>
                <td style="${td()}text-align:center;">${fmtDate(rec.date)}</td>
                <td style="${td()}text-align:center;">${rec.document_type}</td>
                <td style="${td()}text-align:center;">${rec.quantity || 0}</td>
                <td style="${td()}text-align:center;">
                    <span style="background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};
                        padding:0.4vh 0.8vw;border-radius:20px;font-size:1.4vh;font-weight:600;white-space:nowrap;">
                        ${rec.status}
                    </span>
                </td>
                <td style="${td()}text-align:center;">
                    <button class="btn-update-record"
                        data-record='${JSON.stringify(rec).replace(/'/g, "&apos;")}'
                        style="${btnStyle}color:#f3efe8;border:none;border-radius:5px;
                            padding:0.5vh 0.8vw;cursor:pointer;font-size:1.4vh;font-weight:600;
                            transition:background 0.2s;white-space:nowrap;"
                        onmouseover="${btnHover}"
                        onmouseout="${btnOut}">
                        ${btnLabel}
                    </button>
                </td>`;
      tbody.appendChild(tr);
    });

    recordsContainer.innerHTML = "";
    recordsContainer.appendChild(table);
  }

  function th() {
    return `padding:1.2vh 1vw;text-align:left;font-size:1.5vh;font-weight:600;white-space:nowrap;`;
  }
  function td() {
    return `padding:1vh 1vw;border-bottom:1px solid #ddd;`;
  }
  function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  function showError(msg) {
    recordsContainer.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;
            height:30vh;color:#cc0000;font-family:'Segoe UI',sans-serif;font-size:2vh;">${msg}</div>`;
  }
  function debounce(fn, delay) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ── CSS ───────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
        @keyframes spin { to { transform:rotate(360deg); } }

        .modal-overlay {
            position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;
            display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;
        }
        .modal-box {
            background:#f3efe8;border-radius:15px;padding:3vh 2.5vw;width:38vw;min-width:320px;
            box-shadow:0 10px 40px rgba(0,0,0,0.3);font-family:'Segoe UI',Tahoma,sans-serif;
        }
        .modal-title { font-size:2.2vh;font-weight:700;color:#273b07;margin-bottom:2vh;font-family:'Crimson Text',serif; }
        .modal-label { font-size:1.6vh;color:#375309;font-weight:600;margin-bottom:0.5vh;display:block; }
        .modal-select { width:100%;padding:1vh 1vw;border-radius:8px;border:1.5px solid #7d9e3b;
            font-size:1.7vh;background:white;color:#273b07;margin-bottom:2.5vh;cursor:pointer;outline:none; }
        .modal-select:focus { border-color:#375309; }
        .modal-buttons { display:flex;gap:0.7vw;justify-content:flex-end;flex-wrap:wrap;align-items:center; }
        .modal-btn-cancel { background:transparent;border:2px solid #375309;color:#375309;
            padding:0.8vh 1.5vw;border-radius:8px;font-size:1.6vh;font-weight:600;cursor:pointer;transition:0.2s; }
        .modal-btn-cancel:hover { background:#375309;color:white; }
        .modal-btn-save { background:#375309;border:none;color:#f3efe8;padding:0.8vh 1.5vw;
            border-radius:8px;font-size:1.6vh;font-weight:600;cursor:pointer;transition:0.2s; }
        .modal-btn-save:hover { background:#7d9e3b; }
        .modal-resident { font-size:1.5vh;color:#555;margin-bottom:2vh; }

        /* ── NEW: Delete & View Image buttons ── */
        .modal-btn-delete {
            background:#c0392b;border:none;color:#fff;padding:0.8vh 1.5vw;
            border-radius:8px;font-size:1.6vh;font-weight:600;cursor:pointer;transition:0.2s;
            margin-right:auto;
        }
        .modal-btn-delete:hover { background:#e74c3c; }
        .modal-btn-viewimg {
            background:#1565c0;border:none;color:#fff;padding:0.8vh 1.5vw;
            border-radius:8px;font-size:1.6vh;font-weight:600;cursor:pointer;transition:0.2s;
        }
        .modal-btn-viewimg:hover { background:#1976d2; }
        .modal-btn-viewimg:disabled {
            background:#90a4ae;cursor:not-allowed;opacity:0.7;
        }

        /* Released lock banner */
        .locked-banner {
            background:#f3e8ff;border:1.5px solid #8b5cf6;border-radius:10px;
            padding:1.2vh 1.2vw;margin-bottom:2vh;display:flex;align-items:flex-start;gap:0.8vw;
        }
        .locked-banner-icon { font-size:2.2vh;flex-shrink:0;margin-top:0.1vh; }
        .locked-banner-text { font-size:1.4vh;color:#4a235a;line-height:1.6; }
        .locked-banner-text strong { font-size:1.5vh; }

        /* Delete confirmation */
        .delete-overlay {
            position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:11000;
            display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;
        }
        .delete-box {
            background:#fff;border-radius:15px;padding:3vh 2.5vw;width:30vw;min-width:280px;
            box-shadow:0 12px 50px rgba(0,0,0,0.5);font-family:'Segoe UI',Tahoma,sans-serif;text-align:center;
        }
        .delete-icon  { font-size:5vh;margin-bottom:1.5vh; }
        .delete-title { font-size:2vh;font-weight:700;color:#c0392b;margin-bottom:1vh; }
        .delete-msg   { font-size:1.45vh;color:#555;margin-bottom:1.5vh;line-height:1.6; }
        .delete-warning {
            background:#fff5f5;border:1.5px solid #e74c3c;border-radius:8px;
            padding:1vh 1vw;font-size:1.3vh;color:#c0392b;margin:0 0 2vh;text-align:left;line-height:1.6;
        }
        .delete-buttons { display:flex;gap:1vw;justify-content:center; }
        .delete-btn-no {
            background:transparent;border:2px solid #273b07;color:#273b07;
            padding:0.8vh 2vw;border-radius:8px;font-size:1.6vh;font-weight:600;cursor:pointer;transition:0.2s;
        }
        .delete-btn-no:hover  { background:#273b07;color:#f3efe8;transform:translateY(-2px); }
        .delete-btn-yes {
            background:#c0392b;border:none;color:#fff;
            padding:0.8vh 2vw;border-radius:8px;font-size:1.6vh;font-weight:600;cursor:pointer;transition:0.2s;
        }
        .delete-btn-yes:hover { background:#e74c3c;transform:translateY(-2px); }

        /* Image lightbox */
        .img-overlay {
            position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:12000;
            display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;
            flex-direction:column;gap:2vh;
        }
        .img-overlay img {
            max-width:85vw;max-height:80vh;border-radius:10px;
            box-shadow:0 8px 40px rgba(0,0,0,0.6);object-fit:contain;
        }
        .img-close-btn {
            background:#f3efe8;color:#273b07;border:none;border-radius:8px;
            padding:1vh 2.5vw;font-size:1.7vh;font-weight:700;cursor:pointer;transition:0.2s;
        }
        .img-close-btn:hover { background:#fff;transform:translateY(-2px); }

        /* Confirmation modal */
        .confirm-overlay {
            position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10999;
            display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;
        }
        .confirm-box {
            background:#fff;border-radius:15px;padding:3vh 2.5vw;width:32vw;min-width:280px;
            box-shadow:0 12px 50px rgba(0,0,0,0.4);font-family:'Segoe UI',Tahoma,sans-serif;
            text-align:center;
        }
        .confirm-icon  { font-size:4.5vh;margin-bottom:1.5vh; }
        .confirm-title { font-size:2vh;font-weight:700;color:#273b07;margin-bottom:1vh; }
        .confirm-msg   { font-size:1.5vh;color:#555;margin-bottom:0.8vh;line-height:1.6; }
        .confirm-note {
            background:#fff8e6;border:1.5px solid #ffc107;border-radius:8px;
            padding:1vh 1vw;font-size:1.35vh;color:#856404;margin:1.5vh 0 2vh;
            text-align:left;line-height:1.6;
        }
        .confirm-note strong { display:block;margin-bottom:0.3vh; }
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

        .status-locked-note {
            font-size:1.35vh;color:#6c3483;font-style:italic;margin-top:-1.5vh;margin-bottom:2vh;
            display:flex;align-items:center;gap:0.4vw;
        }

        .toast { position:fixed;bottom:4vh;right:2vw;background:#273b07;color:#f3efe8;
            padding:1.5vh 2vw;border-radius:10px;font-size:1.7vh;font-family:'Segoe UI',sans-serif;
            z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:slideUp 0.3s ease; }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    `;
  document.head.appendChild(style);

  // ── Modal ─────────────────────────────────────────────────
  function openUpdateModal(rec) {
    const existing = document.getElementById("update-modal");
    if (existing) existing.remove();

    const isReleased = rec.status === "Released";

    const fullName =
      `${rec.first_name || ""} ${rec.middle_initial ? rec.middle_initial + ". " : ""}${rec.last_name || ""}`.trim();

    function field(label, value) {
      return `
                <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:0.8vh 0;border-bottom:1px solid #dde8cc;">
                    <span style="font-size:1.4vh;color:#666;font-weight:600;min-width:40%;">${label}</span>
                    <span style="font-size:1.5vh;color:#273b07;text-align:right;">${value || "—"}</span>
                </div>`;
    }

    const priceDisplay =
      !rec.price || rec.price == 0
        ? '<span style="color:#0a3622;font-weight:700;">Free</span>'
        : `<span style="color:#0a3622;font-weight:700;">₱${parseFloat(rec.price).toFixed(2)}</span>`;

    const sc = statusColors[rec.status] || {
      bg: "#eee",
      color: "#333",
      border: "#aaa",
    };
    const statusBadge = `<span style="
        margin-left:1vw;padding:0.3vh 0.8vw;border-radius:20px;font-size:1.4vh;
        background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};">
        ${rec.status}
    </span>`;

    const statuses = ["Pending", "Processing", "Ready", "Released"];
    const statusOptions = statuses
      .map(
        (s) =>
          `<option value="${s}" ${rec.status === s ? "selected" : ""}>${s}</option>`,
      )
      .join("");

    const lockBanner = isReleased
      ? `
        <div class="locked-banner">
            <span class="locked-banner-icon">🔒</span>
            <div class="locked-banner-text">
                <strong>This record is locked.</strong><br>
                This document has been marked as <strong>Released</strong> and is now locked for security purposes.
                You can still view all information. To make changes, unlock the record by selecting a different status and saving.
            </div>
        </div>`
      : "";

    // View Image button — enabled only if id_image_path exists
    const hasImage = rec.id_image_path && rec.id_image_path.trim() !== "";

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "update-modal";
    overlay.innerHTML = `
            <div class="modal-box" style="width:38vw;min-width:320px;max-height:85vh;overflow-y:auto;">
                <div class="modal-title">Request Details #${rec.request_ID}</div>

                ${lockBanner}

                <div style="background:#e8f0d8;border-radius:10px;padding:1.5vh 1.5vw;margin-bottom:2vh;">
                    <div style="font-size:1.3vh;color:#375309;font-weight:700;margin-bottom:1vh;letter-spacing:0.05em;">
                        RESIDENT INFORMATION
                    </div>
                    ${field("Resident ID", rec.resident_ID)}
                    ${field("Full Name", fullName)}
                    ${field("Sex", rec.sex)}
                    ${field("Birthdate", rec.birthdate ? fmtDate(rec.birthdate) : "—")}
                </div>

                <div style="background:#f0ede4;border-radius:10px;padding:1.5vh 1.5vw;margin-bottom:2vh;">
                    <div style="font-size:1.3vh;color:#375309;font-weight:700;margin-bottom:1vh;letter-spacing:0.05em;">
                        REQUEST INFORMATION
                    </div>
                    ${field("Request ID", rec.request_ID)}
                    ${field("Reference Number", rec.document_refnumber)}
                    ${field("Document Type", rec.document_type || "—")}
                    ${field("Contact", rec.contact)}
                    ${field("Document Purpose", rec.document_purpose)}
                    ${field("Date Requested", fmtDate(rec.date))}
                    ${field("Date Released", rec.date_released ? fmtDate(rec.date_released) : "—")}
                    ${field("Age", rec.age)}
                    ${field("Length of Stay", (rec.length_stay_years || 0) + " yr(s) " + (rec.length_stay_months || 0) + " mo(s)")}
                    ${field("Quantity", rec.quantity)}
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.8vh 0;">
                        <span style="font-size:1.4vh;color:#666;font-weight:600;min-width:40%;">Price</span>
                        ${priceDisplay}
                    </div>
                </div>

                <div style="background:${isReleased ? "#f3e8ff" : "#fff8e6"};border-radius:10px;padding:1.5vh 1.5vw;margin-bottom:2vh;
                    border:${isReleased ? "1.5px solid #8b5cf6" : "none"};">
                    <div style="font-size:1.3vh;color:${isReleased ? "#6c3483" : "#856404"};font-weight:700;margin-bottom:1vh;letter-spacing:0.05em;
                        display:flex;align-items:center;justify-content:space-between;">
                        <span>${isReleased ? "🔒 RECORD STATUS (LOCKED)" : "UPDATE STATUS"}</span>
                        ${
                          isReleased
                            ? `
                        <button id="btn-unlock-record" style="
                            background:#6c3483;color:white;border:none;border-radius:6px;
                            padding:0.5vh 1vw;font-size:1.3vh;font-weight:700;cursor:pointer;
                            transition:background 0.2s;display:flex;align-items:center;gap:0.4vw;"
                            onmouseover="this.style.background='#8b5cf6'"
                            onmouseout="this.style.background='#6c3483'"
                            onclick="unlockRecord()">
                            🔓 Unlock to Edit
                        </button>`
                            : ""
                        }
                    </div>
                    <label class="modal-label">Current Status: ${statusBadge}</label>
                    <label class="modal-label" style="margin-top:1.5vh;">New Status</label>
                    <select class="modal-select" id="modal-status-select"
                        style="${isReleased ? "opacity:0.5;cursor:not-allowed;pointer-events:none;" : ""}">
                        ${statusOptions}
                    </select>
                    ${
                      isReleased
                        ? `
                    <div id="locked-hint" style="font-size:1.35vh;color:#6c3483;background:#ede7f6;padding:0.8vh 1vw;
                        border-radius:7px;margin-top:-1vh;margin-bottom:0.5vh;">
                        🔒 Click <strong>"Unlock to Edit"</strong> above to change the status.
                        If you set it to a non-Released status, the date released will be cleared automatically.
                    </div>`
                        : ""
                    }
                </div>

                <!-- ACTION BUTTONS -->
                <div class="modal-buttons">
                    <!-- Delete on the far left -->
                    <button class="modal-btn-delete"
                        onclick="confirmDeleteDocument(${rec.request_ID}, '${(rec.document_refnumber || "").replace(/'/g, "\\'")}')">
                        🗑️ Delete
                    </button>

                    <!-- View Image -->
                    <button class="modal-btn-viewimg"
                        ${!hasImage ? "disabled title='No ID image on file'" : `onclick="viewDocumentImage('${(rec.id_image_path || "").replace(/'/g, "\\'")}')"`}
                    >
                        🖼️ View ID Image
                    </button>

                    <!-- Cancel & Save -->
                    <button class="modal-btn-cancel" onclick="document.getElementById('update-modal').remove()">Cancel</button>
                    <button class="modal-btn-save" id="modal-save-btn" onclick="saveStatus(${rec.request_ID})">
                        Save Changes
                    </button>
                </div>
            </div>`;

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);

    // Unlock button handler
    window.unlockRecord = function () {
      const select = document.getElementById("modal-status-select");
      const hint = document.getElementById("locked-hint");
      const unlockBtn = document.getElementById("btn-unlock-record");

      if (unlockBtn) {
        unlockBtn.disabled = true;
        unlockBtn.textContent = "Unlocking…";
      }

      fetch("php/GetDocuments.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_ID: rec.request_ID,
          status: rec.status,
          clear_date_released: true,
        }),
      })
        .then((r) => r.json())
        .then(() => {
          select.style.opacity = "1";
          select.style.cursor = "pointer";
          select.style.pointerEvents = "auto";
          select.value = "Pending";
          if (hint) hint.style.display = "none";
          if (unlockBtn) unlockBtn.style.display = "none";
        })
        .catch(() => {
          if (unlockBtn) {
            unlockBtn.disabled = false;
            unlockBtn.textContent = "🔓 Unlock to Edit";
          }
          showToast("❌ Failed to unlock. Please try again.");
        });
    };
  }

  // ── View ID Image lightbox ────────────────────────────────
  window.viewDocumentImage = function (imagePath) {
    const existing = document.getElementById("img-lightbox");
    if (existing) existing.remove();

    const lightbox = document.createElement("div");
    lightbox.className = "img-overlay";
    lightbox.id = "img-lightbox";

    // Build image URL — handle relative paths from PHP uploads folder
    // const imgSrc = imagePath.startsWith("http") ? imagePath : ("php/" + imagePath).replace("php/php/", "php/");

    const imgSrc = imagePath.startsWith("http")
      ? imagePath
      : "php/uploadsdoc/" + imagePath.split("/").pop();

    lightbox.innerHTML = `
      <div style="text-align:center;">
        <p style="color:#f3efe8;font-size:1.4vh;font-family:'Segoe UI',sans-serif;margin:0 0 1.5vh;
          opacity:0.75;letter-spacing:0.5px;">🪪 Submitted ID Image</p>
        <img src="${imgSrc}"
          onerror="this.style.display='none';document.getElementById('img-err').style.display='block';"
          alt="ID Image" />
        <div id="img-err" style="display:none;color:#f3efe8;font-size:1.6vh;
          font-family:'Segoe UI',sans-serif;padding:3vh 4vw;
          background:rgba(255,255,255,0.08);border-radius:10px;margin-top:1vh;">
          ⚠️ Image could not be loaded.<br>
          <span style="font-size:1.3vh;opacity:0.7;">Path: ${imagePath}</span>
        </div>
      </div>
      <button class="img-close-btn" onclick="document.getElementById('img-lightbox').remove()">
        ✕ Close
      </button>`;

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.remove();
    });
    document.body.appendChild(lightbox);
  };

  // ── Delete document confirmation ──────────────────────────
  window.confirmDeleteDocument = function (requestId, refNumber) {
    const existing = document.getElementById("delete-modal");
    if (existing) existing.remove();

    const deleteOverlay = document.createElement("div");
    deleteOverlay.className = "delete-overlay";
    deleteOverlay.id = "delete-modal";
    deleteOverlay.innerHTML = `
      <div class="delete-box">
        <div class="delete-icon">🗑️</div>
        <div class="delete-title">Delete Document Request?</div>
        <div class="delete-msg">
          You are about to permanently delete request<br>
          <strong style="font-family:'Courier New',monospace;letter-spacing:1px;">${refNumber}</strong>
        </div>
        <div class="delete-warning">
          ⚠️ <strong>This action cannot be undone.</strong><br>
          All data associated with this request, including the uploaded ID image reference, will be permanently removed from the system.
        </div>
        <div class="delete-buttons">
          <button class="delete-btn-no" onclick="document.getElementById('delete-modal').remove()">
            No, Keep It
          </button>
          <button class="delete-btn-yes" onclick="executeDeleteDocument(${requestId})">
            🗑️ Yes, Delete
          </button>
        </div>
      </div>`;

    document.body.appendChild(deleteOverlay);
  };

  window.executeDeleteDocument = function (requestId) {
    const deleteModal = document.getElementById("delete-modal");
    const updateModal = document.getElementById("update-modal");
    const yesBtn = deleteModal
      ? deleteModal.querySelector(".delete-btn-yes")
      : null;

    if (yesBtn) {
      yesBtn.textContent = "Deleting…";
      yesBtn.disabled = true;
    }

    fetch("php/DeleteDocument.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_ID: requestId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (deleteModal) deleteModal.remove();
        if (updateModal) updateModal.remove();
        if (data.success) {
          showToast("🗑️ Document request deleted successfully.");
          fetchRecords();
        } else {
          showToast("❌ " + (data.message || "Delete failed."));
        }
      })
      .catch(() => {
        if (deleteModal) deleteModal.remove();
        showToast("❌ Server error. Please try again.");
      });
  };

  // ── Save status ───────────────────────────────────────────
  window.saveStatus = function (requestId) {
    const selectEl = document.getElementById("modal-status-select");
    const newStatus = selectEl.value;

    if (newStatus === "Released") {
      showReleaseConfirmation(requestId);
      return;
    }

    doSave(requestId, newStatus);
  };

  function showReleaseConfirmation(requestId) {
    const existing = document.getElementById("confirm-modal");
    if (existing) existing.remove();

    const todayLocal = new Date();
    const yyyy = todayLocal.getFullYear();
    const mm = String(todayLocal.getMonth() + 1).padStart(2, "0");
    const dd = String(todayLocal.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const confirmOverlay = document.createElement("div");
    confirmOverlay.className = "confirm-overlay";
    confirmOverlay.id = "confirm-modal";
    confirmOverlay.innerHTML = `
        <div class="confirm-box">
            <div class="confirm-title">Mark Document as Released?</div>
            <div class="confirm-msg">
                Are you sure this document has been <strong>released</strong> to the resident?
            </div>
            <div class="confirm-note">
                <strong>📌 Please Note:</strong>
                Once confirmed, this record will be <strong>locked</strong> to prevent accidental changes.<br><br>
                🔓 You can <b>unlock</b> this record at any time by opening it and selecting a different status.
            </div>
            <div style="margin:1.5vh 0 2vh;text-align:left;">
                <label style="font-size:1.45vh;font-weight:700;color:#273b07;display:block;margin-bottom:0.6vh;">
                    📅 Date Released
                </label>
                <input type="date" id="release-date-input"
                    value="${todayStr}"
                    max="${todayStr}"
                    style="width:100%;padding:0.9vh 0.8vw;border:1.5px solid #7d9e3b;border-radius:8px;
                        font-size:1.6vh;color:#273b07;background:#fff;outline:none;cursor:pointer;
                        box-sizing:border-box;">
                <span style="font-size:1.25vh;color:#888;display:block;margin-top:0.4vh;">
                    You may change this date if needed (cannot be a future date).
                </span>
            </div>
            <div class="confirm-buttons">
                <button class="confirm-btn-no" onclick="document.getElementById('confirm-modal').remove()">
                    No, Go Back
                </button>
                <button class="confirm-btn-yes" onclick="confirmRelease(${requestId})">
                    ✅ Yes, Mark as Released
                </button>
            </div>
        </div>`;
    document.body.appendChild(confirmOverlay);
  }

  window.confirmRelease = function (requestId) {
    const dateInput = document.getElementById("release-date-input");
    const chosenDate = dateInput ? dateInput.value : "";

    if (!chosenDate) {
      dateInput.style.border = "1.5px solid #cc0000";
      dateInput.placeholder = "Please select a date";
      return;
    }

    document.getElementById("confirm-modal").remove();
    doSave(requestId, "Released", chosenDate);
  };

  function doSave(requestId, newStatus, dateReleased) {
    const saveBtn = document.getElementById("modal-save-btn");
    if (saveBtn) {
      saveBtn.textContent = "Saving…";
      saveBtn.disabled = true;
    }

    const payload = { request_ID: requestId, status: newStatus };
    if (dateReleased) payload.date_released = dateReleased;

    fetch("php/GetDocuments.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        const modal = document.getElementById("update-modal");
        if (modal) modal.remove();
        showToast(
          data.success
            ? newStatus === "Released"
              ? "✅ Document marked as Released and locked."
              : newStatus === "Pending" ||
                  newStatus === "Processing" ||
                  newStatus === "Ready"
                ? "🔓 Record unlocked. Status updated to " + newStatus + "."
                : "✅ Status updated to " + newStatus
            : "❌ " + (data.message || "Update failed."),
        );
        if (data.success) fetchRecords();
      })
      .catch(() => {
        const modal = document.getElementById("update-modal");
        if (modal) modal.remove();
        showToast("❌ Server error. Please try again.");
      });
  }

  function showToast(msg) {
    const ex = document.querySelector(".toast");
    if (ex) ex.remove();
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
});
