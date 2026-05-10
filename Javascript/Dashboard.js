// ============================================================
//  Barangay Tugtug E-System — Dashboard Logic
//  File: Javascript/Dashboard.js
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

  // ── State ─────────────────────────────────────────────────
  let currentYear  = new Date().getFullYear();
  let currentMonth = new Date().getMonth(); // 0-indexed
  let blotterScheduleDates = []; // Array of "YYYY-MM-DD" strings

  // ── Fetch blotter records, mark days with PENDING/SCHEDULED blotters ──
  // NOTE: The blotter table has no schedule_date columns.
  // We highlight dates that have active (non-resolved/non-escalated) blotter
  // incidents filed on that petsa (incident date).
  function fetchBlotterSchedules(callback) {
    fetch("php/GetBlotter.php")
      .then(res => res.json())
      .then(data => {
        if (!data.success) { callback([]); return; }

        const activeDates = [];

        (data.records || []).forEach(rec => {
          // Only show indicator for open/active cases
          if (rec.status === "Resolved" || rec.status === "Escalated" || rec.status === "Dismissed") return;

          // Use petsa (incident date) as the calendar indicator date
          if (!rec.petsa || rec.petsa === "0000-00-00") return;

          const d = new Date(rec.petsa + "T00:00:00");
          if (isNaN(d)) return;

          const yyyy = d.getFullYear();
          const mm   = String(d.getMonth() + 1).padStart(2, "0");
          const dd   = String(d.getDate()).padStart(2, "0");
          activeDates.push(`${yyyy}-${mm}-${dd}`);
        });

        callback(activeDates);
      })
      .catch(() => callback([]));
  }

  // ── Calendar render ───────────────────────────────────────
  function renderCalendar(year, month) {
    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];

    document.getElementById("monthYearText").textContent =
      monthNames[month] + " " + year;

    const container = document.getElementById("calendarDates");
    container.innerHTML = "";

    const today     = new Date();
    const todayDate = today.getDate();
    const todayMon  = today.getMonth();
    const todayYear = today.getFullYear();

    const firstDay    = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty cells for offset
    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement("div");
      blank.className = "calendar-date";
      container.appendChild(blank);
    }

    // Date cells
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement("div");
      cell.className = "calendar-date";

      const yyyy = year;
      const mm   = String(month + 1).padStart(2, "0");
      const dd   = String(d).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const isToday = (d === todayDate && month === todayMon && year === todayYear);
      if (isToday) cell.classList.add("current-day");

      // Check if this date has an active blotter incident
      const hasSchedule = blotterScheduleDates.includes(dateStr);

      // Build cell content
      cell.innerHTML = `
        <span style="position:relative;display:inline-block;">
          ${d}
          ${hasSchedule ? `
            <span title="Active blotter filed on this date" style="
              position:absolute;
              top:-4px;
              right:-7px;
              width:8px;
              height:8px;
              background:#e74c3c;
              border-radius:50%;
              display:inline-block;
              border:1.5px solid #fff;
              box-shadow:0 0 3px rgba(231,76,60,0.7);
            "></span>
          ` : ""}
        </span>
      `;

      if (hasSchedule) {
        cell.title = "Active blotter filed on " + dateStr;
        cell.style.fontWeight = "700";
      }

      container.appendChild(cell);
    }
  }

  // ── Navigation buttons ────────────────────────────────────
  document.getElementById("prevMonth").addEventListener("click", function () {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(currentYear, currentMonth);
  });

  document.getElementById("nextMonth").addEventListener("click", function () {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar(currentYear, currentMonth);
  });

  // ── Latest 5 Document Requests ────────────────────────────
  function fetchLatestDocuments() {
    const container = document.querySelector(".document-latest-container");

    fetch("php/GetDocuments.php")
      .then(res => res.json())
      .then(data => {
        if (!data.success || !data.records) return;

        // Sort by date DESC, take top 5
        const sorted = [...data.records]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);

        if (sorted.length === 0) {
          const empty = document.createElement("p");
          empty.style.cssText = `
            text-align:center;color:#888;font-family:'Segoe UI',sans-serif;
            font-size:1.6vh;margin-top:8vh;`;
          empty.textContent = "No recent requests.";
          container.appendChild(empty);
          return;
        }

        const list = document.createElement("div");
        list.style.cssText = `position:relative;top:8%;padding:0 5%;`;

        sorted.forEach((rec, i) => {
          // rec.first_name / rec.last_name / rec.middle_initial from the JOIN
          const fullName = [
            rec.first_name,
            rec.middle_initial ? rec.middle_initial + "." : "",
            rec.last_name
          ].filter(Boolean).join(" ");

          const dateStr = rec.date
            ? new Date(rec.date + "T00:00:00").toLocaleDateString("en-PH", { year:"numeric", month:"short", day:"numeric" })
            : "—";

          const statusColors = {
            Pending:    { bg: "#fff3cd", color: "#856404" },
            Processing: { bg: "#cfe2ff", color: "#084298" },
            Ready:      { bg: "#d1e7dd", color: "#0a3622" },
            Released:   { bg: "#e2d9f3", color: "#4a235a" },
          };
          const sc = statusColors[rec.status] || { bg: "#eee", color: "#333" };

          const row = document.createElement("div");
          row.style.cssText = `
            display:flex;align-items:center;justify-content:space-between;
            padding:1.2vh 1vw;border-bottom:1px solid rgba(0,0,0,0.07);
            background:${i % 2 === 0 ? "#fcfaf7" : "#f3efe8"};border-radius:8px;
            margin-bottom:0.5vh;gap:0.5vw;transition:background 0.2s;
          `;
          row.onmouseover = () => row.style.background = "#e8f0d8";
          row.onmouseout  = () => row.style.background = i % 2 === 0 ? "#fcfaf7" : "#f3efe8";

          row.innerHTML = `
            <span style="font-family:'Segoe UI',sans-serif;font-size:1.35vh;
              color:#375309;font-weight:700;min-width:30%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${rec.document_refnumber || "—"}
            </span>
            <span style="font-family:'Segoe UI',sans-serif;font-size:1.35vh;
              color:#273b07;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;">
              ${fullName || "—"}
            </span>
            <span style="font-size:1.2vh;padding:3px 8px;border-radius:20px;
              background:${sc.bg};color:${sc.color};font-weight:600;
              white-space:nowrap;font-family:'Segoe UI',sans-serif;">
              ${rec.status}
            </span>
          `;

          list.appendChild(row);
        });

        container.appendChild(list);
      })
      .catch(err => console.error("Dashboard doc fetch error:", err));
  }

  // ── Latest 5 Blotter Requests ─────────────────────────────
  function fetchLatestBlotters() {
    const container = document.querySelector(".blotter-latest-container");

    fetch("php/GetBlotter.php")
      .then(res => res.json())
      .then(data => {
        if (!data.success || !data.records) return;

        // Sort by submitted_at DESC (falls back to petsa), take top 5
        const sorted = [...data.records]
          .sort((a, b) => {
            const da = new Date(b.submitted_at || b.petsa || 0);
            const db = new Date(a.submitted_at || a.petsa || 0);
            return da - db;
          })
          .slice(0, 5);

        if (sorted.length === 0) {
          const empty = document.createElement("p");
          empty.style.cssText = `
            text-align:center;color:#888;font-family:'Segoe UI',sans-serif;
            font-size:1.6vh;margin-top:8vh;`;
          empty.textContent = "No recent blotter records.";
          container.appendChild(empty);
          return;
        }

        const list = document.createElement("div");
        list.style.cssText = `position:relative;top:8%;padding:0 5%;`;

        const statusColors = {
          Pending:   { bg: "#fff3cd", color: "#856404" },
          Scheduled: { bg: "#cfe2ff", color: "#084298" },
          Ongoing:   { bg: "#d1ecff", color: "#0c4e86" },
          Resolved:  { bg: "#d1e7dd", color: "#0a3622" },
          Escalated: { bg: "#e2d9f3", color: "#4a235a" },
          Dismissed: { bg: "#f8d7da", color: "#842029" },
        };

        sorted.forEach((rec, i) => {
          const sc = statusColors[rec.status] || { bg: "#eee", color: "#333" };

          // full_name is computed by GetBlotter.php via CONCAT
          const displayName = rec.full_name || [rec.first_name, rec.last_name].filter(Boolean).join(" ") || "—";

          const row = document.createElement("div");
          row.style.cssText = `
            display:flex;align-items:center;justify-content:space-between;
            padding:1.2vh 1vw;border-bottom:1px solid rgba(0,0,0,0.07);
            background:${i % 2 === 0 ? "#fcfaf7" : "#f3efe8"};border-radius:8px;
            margin-bottom:0.5vh;gap:0.5vw;transition:background 0.2s;
          `;
          row.onmouseover = () => row.style.background = "#e8f0d8";
          row.onmouseout  = () => row.style.background = i % 2 === 0 ? "#fcfaf7" : "#f3efe8";

          row.innerHTML = `
            <span style="font-family:'Segoe UI',sans-serif;font-size:1.35vh;
              color:#375309;font-weight:700;min-width:30%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${rec.reference_number || "—"}
            </span>
            <span style="font-family:'Segoe UI',sans-serif;font-size:1.35vh;
              color:#273b07;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;">
              ${displayName}
            </span>
            <span style="font-size:1.2vh;padding:3px 8px;border-radius:20px;
              background:${sc.bg};color:${sc.color};font-weight:600;
              white-space:nowrap;font-family:'Segoe UI',sans-serif;">
              ${rec.status}
            </span>
          `;

          list.appendChild(row);
        });

        container.appendChild(list);
      })
      .catch(err => console.error("Dashboard blotter fetch error:", err));
  }

  // ── Add column headers ────────────────────────────────────
  function addListHeader(container) {
    const header = document.createElement("div");
    header.style.cssText = `
      display:flex;justify-content:space-between;padding:0.8vh 1vw;
      margin:0 5%;border-bottom:2px solid #375309;margin-top:4%;
    `;
    header.innerHTML = `
      <span style="font-family:'Segoe UI',sans-serif;font-size:1.3vh;font-weight:700;color:#375309;min-width:30%;">Ref No.</span>
      <span style="font-family:'Segoe UI',sans-serif;font-size:1.3vh;font-weight:700;color:#375309;flex:1;text-align:center;">Name</span>
      <span style="font-family:'Segoe UI',sans-serif;font-size:1.3vh;font-weight:700;color:#375309;">Status</span>
    `;
    container.appendChild(header);
  }

  // ── Calendar legend note ──────────────────────────────────
  function addCalendarLegend() {
    const wrapper = document.querySelector(".calendar-wrapper");
    if (!wrapper) return;
    const legend = document.createElement("div");
    legend.style.cssText = `
      display:flex;align-items:center;gap:0.5vw;margin-top:1.5vh;
      font-family:'Segoe UI',sans-serif;font-size:1.4vh;color:#555;
    `;
    legend.innerHTML = `
      <span style="width:10px;height:10px;background:#e74c3c;border-radius:50%;
        display:inline-block;box-shadow:0 0 4px rgba(231,76,60,0.6);flex-shrink:0;">
      </span>
      Active blotter filed on this date
    `;
    wrapper.appendChild(legend);
  }

  // ── Init ──────────────────────────────────────────────────
  addCalendarLegend();
  addListHeader(document.querySelector(".document-latest-container"));
  addListHeader(document.querySelector(".blotter-latest-container"));

  fetchBlotterSchedules(function (dates) {
    blotterScheduleDates = dates;
    renderCalendar(currentYear, currentMonth);
  });

  fetchLatestDocuments();
  fetchLatestBlotters();

});