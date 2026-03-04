(function () {
    if(!window.DBV) return console.error("DBV Core not loaded");

    var TABLE_CSS = `
    .table-scroll { width: 100%; overflow: auto; max-height: 70vh; }
    table.data { width: 100%; border-collapse: collapse; }
    
    /* Header Base */
    table.data th { 
        position: sticky; top: 0; background: var(--surface-2); 
        padding: 10px 24px 10px 10px; 
        text-align: left; cursor: pointer; user-select: none; z-index: 2; 
        white-space: nowrap; 
    }
    table.data th:hover { background: var(--border); }
    
    /* Sort Indicators (Absolute Positioned to prevent width jumping) */
    table.data th::after {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.8em;
        width: 12px;
        text-align: center;
    }
    table.data th.sort-asc::after { content: "▲"; }
    table.data th.sort-desc::after { content: "▼"; }
    table.data th:not(.sort-asc):not(.sort-desc):hover::after { content: "⇅"; opacity: 0.5; }
    
    /* Resizer Handle */
    table.data th .resizer {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 6px;
        cursor: col-resize;
        z-index: 3;
    }
    table.data th .resizer:hover, 
    table.data th .resizer.resizing {
        background-color: var(--accent);
        opacity: 0.6;
    }
    
    table.data td { padding: 8px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    table.data tr:hover td { background: var(--accent-2); }
    
    /* Filter Bar Layout */
    .filter-bar { padding: 12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid var(--border); }
    .search-group { display: flex; gap: 8px; flex: 1; align-items: center; }
    .search-box { position: relative; display: flex; align-items: center; }
    .search-box input { padding-right: 28px; width: 200px; }
    
    /* Clear Button */
    .clear-btn { position: absolute; right: 6px; background: none; border: none; cursor: pointer; color: var(--muted); display: none; font-size: 16px; padding: 0 4px; line-height: 1; border-radius: 4px; }
    .clear-btn:hover { color: var(--text); background: var(--surface-2); }
    
    /* Export Group */
    .export-group { margin-left: auto; display: flex; gap: 8px; align-items: center; }
    .export-group .btn { display: inline-flex; align-items: center; gap: 6px; }
    .export-group svg { opacity: 0.7; }
    `;

    function initTable() {
        DBV.utils.injectCss("dbv-table-css", TABLE_CSS);

        const switcher = document.getElementById("dbv-view-switch");
        if(switcher) {
            const tableBtn = document.createElement("button");
            tableBtn.className = "btn active";
            tableBtn.id = "dbv-table-btn";
            tableBtn.innerHTML = `${DBV.Icons.table} Table`;
            tableBtn.onclick = () => {
                document.getElementById("dbv-table-card").style.display = "block";
                const chart = document.getElementById("dbv-chart-card");
                if(chart) chart.style.display = "none";
                tableBtn.classList.add("active");
                const chartBtn = document.getElementById("dbv-chart-btn");
                if(chartBtn) chartBtn.classList.remove("active");
            };
            switcher.appendChild(tableBtn);
        }

        const oldTable = DBV.utils.$("table.data");
        if (!oldTable) return;

        const card = document.createElement("div");
        card.className = "card";
        card.id = "dbv-table-card";

        const colOptions = `<option value="all">All Columns</option>` +
            DBV.data.headers.map((h, i) => `<option value="${i}">${h}</option>`).join('');

        const lucideDownloadSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`;

        const filterBar = document.createElement("div");
        filterBar.className = "filter-bar";
        filterBar.innerHTML = `
            <div class="search-group">
                <div class="field">
                    <select id="dbv-search-col" title="Select column to search">
                        ${colOptions}
                    </select>
                </div>
                <div class="field search-box">
                    <input id="dbv-search" type="text" placeholder="Search...">
                    <button id="dbv-search-clear" class="clear-btn" aria-label="Clear search">&times;</button>
                </div>
            </div>
            <div class="export-group">
                <button class="btn" id="dbv-dl-csv">${lucideDownloadSVG} CSV</button>
                <button class="btn" id="dbv-dl-json">${lucideDownloadSVG} JSON</button>
                <button class="btn" id="dbv-dl-html">${lucideDownloadSVG} HTML</button>
            </div>
        `;
        card.appendChild(filterBar);

        const scroll = document.createElement("div");
        scroll.className = "table-scroll";
        oldTable.parentNode.insertBefore(card, oldTable);
        scroll.appendChild(oldTable);
        card.appendChild(scroll);

        let rows = Array.from(DBV.data.rows);

        rows.forEach((r, idx) => {
            r.dataset.originalIndex = idx;
        });

        const tbody = oldTable.querySelector("tbody");
        const thead = oldTable.querySelector("thead");
        const ths = DBV.utils.$all("th", thead);

        // Resizing
        ths.forEach(th => {
            const resizer = document.createElement("div");
            resizer.classList.add("resizer");
            th.appendChild(resizer);

            let startX, startColWidth, startTableWidth;

            resizer.addEventListener("click", e => e.stopPropagation());

            resizer.addEventListener("mousedown", function(e) {
                e.stopPropagation();
                startX = e.pageX;
                startColWidth = th.offsetWidth;
                startTableWidth = oldTable.offsetWidth;
                resizer.classList.add("resizing");

                if (oldTable.style.tableLayout !== "fixed") {
                    ths.forEach(h => {
                        if (!h.style.width) h.style.width = h.offsetWidth + "px";
                    });
                    oldTable.style.tableLayout = "fixed";
                }

                oldTable.style.width = startTableWidth + "px";

                document.addEventListener("mousemove", mouseMoveHandler);
                document.addEventListener("mouseup", mouseUpHandler);
            });

            function mouseMoveHandler(e) {
                const delta = e.pageX - startX;
                const newColWidth = Math.max(startColWidth + delta, 40);

                const actualDelta = newColWidth - startColWidth;

                th.style.width = newColWidth + "px";
                oldTable.style.width = (startTableWidth + actualDelta) + "px";
            }

            function mouseUpHandler() {
                resizer.classList.remove("resizing");
                document.removeEventListener("mousemove", mouseMoveHandler);
                document.removeEventListener("mouseup", mouseUpHandler);
            }
        });

        const searchInput = document.getElementById("dbv-search");
        const searchCol = document.getElementById("dbv-search-col");
        const clearBtn = document.getElementById("dbv-search-clear");

        function applyFilters() {
            const val = searchInput.value.toLowerCase();
            const colIdx = searchCol.value;

            clearBtn.style.display = val.length > 0 ? "block" : "none";

            let vis = 0;
            rows.forEach(r => {
                let show = true;

                if (val) {
                    if (colIdx === "all") {
                        show = r.textContent.toLowerCase().includes(val);
                    } else {
                        const cell = r.cells[parseInt(colIdx)];
                        show = cell ? cell.textContent.toLowerCase().includes(val) : false;
                    }
                }

                r.style.display = show ? "" : "none";
                if(show) vis++;
            });

            const statusEl = document.getElementById("dbv-status-text");
            if(statusEl) statusEl.textContent = `${vis} / ${rows.length} rows`;

            DBV.trigger("filter", { visibleRows: rows.filter(r => r.style.display !== "none") });
        }

        searchInput.addEventListener("input", applyFilters);
        searchCol.addEventListener("change", applyFilters);

        clearBtn.addEventListener("click", () => {
            searchInput.value = "";
            applyFilters();
            searchInput.focus();
        });

        let currentSortCol = -1;
        let sortState = 0; // 0: None, 1: Asc, 2: Desc

        ths.forEach((th, i) => {
            th.title = "Click to sort (Asc > Desc > Default)";
            th.addEventListener("click", () => {

                if (currentSortCol !== i) {
                    currentSortCol = i;
                    sortState = 1; // Start with Ascending
                } else {
                    sortState = (sortState + 1) % 3; // Cycles 1 -> 2 -> 0
                }

                ths.forEach(h => h.classList.remove("sort-asc", "sort-desc"));
                if (sortState === 1) th.classList.add("sort-asc");
                else if (sortState === 2) th.classList.add("sort-desc");
                else currentSortCol = -1;

                const type = DBV.data.colTypes[i];

                rows.sort((a, b) => {
                    if (sortState === 0) {
                        return parseInt(a.dataset.originalIndex) - parseInt(b.dataset.originalIndex);
                    }

                    const valA = a.cells[i] ? a.cells[i].textContent : "";
                    const valB = b.cells[i] ? b.cells[i].textContent : "";
                    const isAsc = sortState === 1;

                    if (DBV.utils.isNullish(valA) && !DBV.utils.isNullish(valB)) return isAsc ? 1 : -1;
                    if (!DBV.utils.isNullish(valA) && DBV.utils.isNullish(valB)) return isAsc ? -1 : 1;
                    if (DBV.utils.isNullish(valA) && DBV.utils.isNullish(valB)) return 0;

                    let cmp = 0;
                    if (type === "number") {
                        cmp = (DBV.utils.parseNumber(valA) || 0) - (DBV.utils.parseNumber(valB) || 0);
                    } else if (type === "date") {
                        cmp = (DBV.utils.parseDate(valA) || 0) - (DBV.utils.parseDate(valB) || 0);
                    } else {
                        cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
                    }
                    return isAsc ? cmp : -cmp;
                });

                tbody.append(...rows);
            });
        });

        // --- EXPORT LOGIC ---
        function getVisibleRows() {
            return rows.filter(r => r.style.display !== "none");
        }

        function triggerDownload(content, type, filename) {
            const blob = new Blob([content], { type: type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }

        // Export CSV
        document.getElementById("dbv-dl-csv").addEventListener("click", () => {
            const headers = DBV.data.headers.join(",");
            const lines = getVisibleRows().map(r =>
                Array.from(r.cells).map(c => `"${c.textContent.replace(/"/g, '""')}"`).join(",")
            );
            triggerDownload(headers + "\n" + lines.join("\n"), 'text/csv', 'export.csv');
        });

        // Export JSON
        document.getElementById("dbv-dl-json").addEventListener("click", () => {
            const headers = DBV.data.headers;
            const jsonData = getVisibleRows().map(r => {
                let obj = {};
                Array.from(r.cells).forEach((c, i) => {
                    obj[headers[i]] = c.textContent;
                });
                return obj;
            });
            triggerDownload(JSON.stringify(jsonData, null, 2), 'application/json', 'export.json');
        });

        // Export HTML
        document.getElementById("dbv-dl-html").addEventListener("click", () => {
            const headerCells = DBV.data.headers.map(h => `<th>${h}</th>`).join("");
            const tableRows = getVisibleRows().map(r => {
                const cells = Array.from(r.cells).map(c => `<td>${c.textContent}</td>`).join("");
                return `<tr>${cells}</tr>`;
            }).join("\n        ");

            const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Data Export</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; color: #333; }
        table { border-collapse: collapse; width: 100%; font-size: 14px; }
        th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
        th { background-color: #f4f4f5; font-weight: 600; }
        tr:nth-child(even) { background-color: #fafafa; }
    </style>
</head>
<body>
    <table>
        <thead>
            <tr>${headerCells}</tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>
</body>
</html>`;
            triggerDownload(htmlContent, 'text/html', 'export.html');
        });
    }

    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTable);
    else initTable();
})();