// ============================================================
//  Barangay Tugtug E-System — Analytics Page Logic
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

    const MONTHS = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const DOC_COLORS = [
        "#375309", "#5a8c18", "#7dbb29", "#a8d45c",
        "#c8e89a", "#f0c060", "#e08030", "#b04010",
        "#6b4c2a", "#9b7a50"
    ];

    const BLOTTER_COLORS = {
        total:     { bg: "rgba(55,83,9,0.18)",     border: "#375309" },
        resolved:  { bg: "rgba(25,135,84,0.25)",   border: "#198754" },
        escalated: { bg: "rgba(220,53,69,0.25)",   border: "#dc3545" },
        dismissed: { bg: "rgba(108,117,125,0.25)", border: "#6c757d" },
        pending:   { bg: "rgba(255,193,7,0.3)",    border: "#ffc107" },
    };

    let docChartInstance     = null;
    let blotterChartInstance = null;

    // Wrap long label into array of shorter lines
    function wrapLabel(str, maxLen) {
        if (str.length <= maxLen) return str;
        const words = str.split(" ");
        const lines = [];
        let current = "";
        words.forEach(function(word) {
            var candidate = current ? current + " " + word : word;
            if (candidate.length > maxLen) {
                if (current) lines.push(current);
                current = word;
            } else {
                current = candidate;
            }
        });
        if (current) lines.push(current);
        return lines;
    }

    function populateYears(selectEl, years) {
        var currentYear = new Date().getFullYear();
        selectEl.innerHTML = "";
        years.forEach(function(yr) {
            var opt = document.createElement("option");
            opt.value = yr;
            opt.textContent = yr;
            if (yr === currentYear) opt.selected = true;
            selectEl.appendChild(opt);
        });
        if (!selectEl.value && selectEl.options.length) {
            selectEl.options[0].selected = true;
        }
    }

    function setDefaultMonth(selectEl) {
        selectEl.value = new Date().getMonth() + 1;
    }

    async function loadYears() {
        try {
            var res = await fetch("php/GetAnalytics.php?type=years");
            var data = await res.json();
            var years = data.success ? data.years : [new Date().getFullYear()];
            populateYears(document.getElementById("doc-year-select"), years);
            populateYears(document.getElementById("blotter-year-select"), years);
        } catch(e) {
            var y = [new Date().getFullYear()];
            populateYears(document.getElementById("doc-year-select"), y);
            populateYears(document.getElementById("blotter-year-select"), y);
        }
    }

    function hide(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = "none";
    }
    function show(id, type) {
        var el = document.getElementById(id);
        if (el) el.style.display = type || "block";
    }

    // ════════════════════════════════════════════════════════
    //  DOCUMENT CHART
    // ════════════════════════════════════════════════════════

    function showDocLoading() {
        hide("doc-placeholder");
        hide("doc-canvas-wrapper");
        hide("doc-summary");
        var docEmpty = document.getElementById("doc-empty");
        if (docEmpty) docEmpty.style.display = "none";

        var area = document.getElementById("doc-chart-area");
        var loader = document.getElementById("doc-loader");
        if (!loader) {
            loader = document.createElement("div");
            loader.id = "doc-loader";
            loader.className = "chart-loading";
            loader.innerHTML = '<div class="spinner"></div><span>Loading data...</span>';
            area.appendChild(loader);
        }
        loader.style.display = "flex";
    }

    function hideDocLoading() { hide("doc-loader"); }

    async function loadDocumentChart() {
        var month = document.getElementById("doc-month-select").value;
        var year  = document.getElementById("doc-year-select").value;

        showDocLoading();

        try {
            var res  = await fetch("php/GetAnalytics.php?type=documents&month=" + month + "&year=" + year);
            var data = await res.json();
            hideDocLoading();

            var area   = document.getElementById("doc-chart-area");
            var canvas = document.getElementById("docChart");

            if (!data.success || !data.data || data.data.length === 0) {
                var empty = document.getElementById("doc-empty");
                if (!empty) {
                    empty = document.createElement("div");
                    empty.id = "doc-empty";
                    empty.className = "chart-empty";
                    empty.innerHTML = '<i class="fa fa-inbox"></i><span>No document requests found for ' + MONTHS[month] + ' ' + year + '.</span>';
                    area.appendChild(empty);
                } else {
                    empty.querySelector("span").textContent = "No document requests found for " + MONTHS[month] + " " + year + ".";
                    empty.style.display = "flex";
                }
                hide("doc-canvas-wrapper");
                hide("doc-summary");
                return;
            }

            var rawLabels    = data.data.map(function(r) { return r.document_type || "Unknown"; });
            var wrappedLabels = rawLabels.map(function(l) { return wrapLabel(l, 20); });
            var values       = data.data.map(function(r) { return parseInt(r.total); });
            var total        = values.reduce(function(a,b){ return a+b; }, 0);
            var maxIdx       = values.indexOf(Math.max.apply(null, values));

            if (docChartInstance) { docChartInstance.destroy(); docChartInstance = null; }

            show("doc-canvas-wrapper");

            docChartInstance = new Chart(canvas, {
                type: "bar",
                data: {
                    labels: wrappedLabels,
                    datasets: [{
                        label: "Requests",
                        data: values,
                        backgroundColor: rawLabels.map(function(_,i){ return DOC_COLORS[i % DOC_COLORS.length] + "cc"; }),
                        borderColor:     rawLabels.map(function(_,i){ return DOC_COLORS[i % DOC_COLORS.length]; }),
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                        barPercentage: 0.55,
                        categoryPercentage: 0.8,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: "easeOutQuart" },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: "#273b07",
                            titleColor: "#f3efe8",
                            bodyColor: "#d4e8a0",
                            padding: 12,
                            callbacks: {
                                title: function(ctx) { return rawLabels[ctx[0].dataIndex]; },
                                label: function(ctx) { return " " + ctx.parsed.y + " request" + (ctx.parsed.y !== 1 ? "s" : ""); }
                            }
                        },
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: "#375309",
                                font: { size: 11, weight: "600" },
                                maxRotation: 0,
                                autoSkip: false,
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: "rgba(55,83,9,0.08)" },
                            ticks: { color: "#375309", font: { size: 12 }, stepSize: 1, precision: 0 },
                            title: { display: true, text: "Number of Requests", color: "#375309", font: { size: 12, weight: "600" } }
                        }
                    }
                }
            });

            document.getElementById("doc-total-val").textContent = total;
            document.getElementById("doc-top-val").textContent   = rawLabels[maxIdx] || "—";
            show("doc-summary", "flex");

        } catch(err) {
            hideDocLoading();
            console.error("Document analytics error:", err);
        }
    }

    // ════════════════════════════════════════════════════════
    //  BLOTTER CHART
    // ════════════════════════════════════════════════════════

    function showBlotterLoading() {
        hide("blotter-placeholder");
        hide("blotter-canvas-wrapper");
        hide("blotter-summary");
        var blotterEmpty = document.getElementById("blotter-empty");
        if (blotterEmpty) blotterEmpty.style.display = "none";

        var area = document.getElementById("blotter-chart-area");
        var loader = document.getElementById("blotter-loader");
        if (!loader) {
            loader = document.createElement("div");
            loader.id = "blotter-loader";
            loader.className = "chart-loading";
            loader.innerHTML = '<div class="spinner"></div><span>Loading data...</span>';
            area.appendChild(loader);
        }
        loader.style.display = "flex";
    }

    function hideBlotterLoading() { hide("blotter-loader"); }

    async function loadBlotterChart() {
        var year = document.getElementById("blotter-year-select").value;

        showBlotterLoading();

        try {
            var res  = await fetch("php/GetAnalytics.php?type=blotter_monthly&year=" + year);
            var data = await res.json();
            hideBlotterLoading();

            var area   = document.getElementById("blotter-chart-area");
            var canvas = document.getElementById("blotterChart");

            if (!data.success) {
                var empty = document.getElementById("blotter-empty");
                if (!empty) {
                    empty = document.createElement("div");
                    empty.id = "blotter-empty";
                    empty.className = "chart-empty";
                    empty.innerHTML = '<i class="fa fa-inbox"></i><span>No blotter data found for ' + year + '.</span>';
                    area.appendChild(empty);
                } else {
                    empty.querySelector("span").textContent = "No blotter data found for " + year + ".";
                    empty.style.display = "flex";
                }
                hide("blotter-canvas-wrapper");
                hide("blotter-summary");
                return;
            }

            var monthLabels = data.data.map(function(r) { return MONTHS[r.month_num].substring(0, 3); });
            var totals      = data.data.map(function(r) { return parseInt(r.total); });
            var resolved    = data.data.map(function(r) { return parseInt(r.resolved); });
            var escalated   = data.data.map(function(r) { return parseInt(r.escalated); });
            var dismissed   = data.data.map(function(r) { return parseInt(r.dismissed); });
            var pending     = data.data.map(function(r) { return parseInt(r.pending); });

            var grandTotal     = totals.reduce(function(a,b){return a+b;},0);
            var grandResolved  = resolved.reduce(function(a,b){return a+b;},0);
            var grandEscalated = escalated.reduce(function(a,b){return a+b;},0);
            var grandDismissed = dismissed.reduce(function(a,b){return a+b;},0);
            var grandPending   = pending.reduce(function(a,b){return a+b;},0);

            var empty = document.getElementById("blotter-empty");
            if (empty) empty.style.display = "none";

            if (blotterChartInstance) { blotterChartInstance.destroy(); blotterChartInstance = null; }

            show("blotter-canvas-wrapper");

            blotterChartInstance = new Chart(canvas, {
                type: "bar",
                data: {
                    labels: monthLabels,
                    datasets: [
                        { label: "Resolved",    data: resolved,   backgroundColor: BLOTTER_COLORS.resolved.bg,  borderColor: BLOTTER_COLORS.resolved.border,  borderWidth: 2, borderRadius: 4, borderSkipped: false, barPercentage: 0.85, categoryPercentage: 0.9 },
                        { label: "Escalated",   data: escalated,  backgroundColor: BLOTTER_COLORS.escalated.bg, borderColor: BLOTTER_COLORS.escalated.border, borderWidth: 2, borderRadius: 4, borderSkipped: false, barPercentage: 0.85, categoryPercentage: 0.9 },
                        { label: "Dismissed",   data: dismissed,  backgroundColor: BLOTTER_COLORS.dismissed.bg, borderColor: BLOTTER_COLORS.dismissed.border, borderWidth: 2, borderRadius: 4, borderSkipped: false, barPercentage: 0.85, categoryPercentage: 0.9 },
                        { label: "Pending",     data: pending,    backgroundColor: BLOTTER_COLORS.pending.bg,   borderColor: BLOTTER_COLORS.pending.border,   borderWidth: 2, borderRadius: 4, borderSkipped: false, barPercentage: 0.85, categoryPercentage: 0.9 },
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: "easeOutQuart" },
                    plugins: {
                        legend: {
                            display: true,
                            position: "top",
                            labels: { color: "#375309", font: { size: 12, weight: "600" }, padding: 16 }
                        },
                        tooltip: {
                            backgroundColor: "#273b07",
                            titleColor: "#f3efe8",
                            bodyColor: "#d4e8a0",
                            padding: 12,
                            callbacks: {
                                label: function(ctx) { return " " + ctx.dataset.label + ": " + ctx.parsed.y + " case" + (ctx.parsed.y !== 1 ? "s" : ""); }
                            }
                        },
                    },
                    scales: {
                        x: {
                            stacked: true,
                            grid: { display: false },
                            offset: true,
                            ticks: { color: "#375309", font: { size: 11, weight: "600" }, maxRotation: 0, autoSkip: false }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            grid: { color: "rgba(55,83,9,0.08)" },
                            ticks: { color: "#375309", font: { size: 12 }, stepSize: 1, precision: 0 },
                            title: { display: true, text: "Number of Cases", color: "#375309", font: { size: 12, weight: "600" } }
                        }
                    }
                }
            });

            document.getElementById("blotter-total-val").textContent     = grandTotal;
            document.getElementById("blotter-resolved-val").textContent  = grandResolved;
            document.getElementById("blotter-escalated-val").textContent = grandEscalated;
            document.getElementById("blotter-dismissed-val").textContent = grandDismissed;
            document.getElementById("blotter-pending-val").textContent   = grandPending;
            show("blotter-summary", "flex");

        } catch(err) {
            hideBlotterLoading();
            console.error("Blotter analytics error:", err);
        }
    }

    document.getElementById("doc-load-btn").addEventListener("click", loadDocumentChart);
    document.getElementById("blotter-load-btn").addEventListener("click", loadBlotterChart);

    setDefaultMonth(document.getElementById("doc-month-select"));
    loadYears();
});