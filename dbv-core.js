(function () {
    window.DBV = window.DBV || {};

    // --- Shared State & Event Bus ---
    DBV.data = { headers: [], colTypes: [], rows: [] };
    DBV.events = {};
    DBV.on = function(event, callback){
        if(!DBV.events[event]) DBV.events[event] = [];
        DBV.events[event].push(callback);
    };
    DBV.trigger = function(event, payload){
        if(DBV.events[event]) DBV.events[event].forEach(fn => fn(payload));
    };

    // --- CSS (Core) ---
    var CORE_CSS = `
    :root{
        --bg: #f3f4f6; --text: #0b1220; --muted: #4b5563;
        --surface: #ffffff; --surface-2: #eef0f3; --border: #d7dbe2;
        --shadow: 0 10px 28px rgba(17, 24, 39, 0.10);
        --shadow-soft: 0 1px 2px rgba(17, 24, 39, 0.08);
        --accent: #24C780; --accent-2: rgba(36, 199, 128, 0.14);
        --radius: 14px;
        --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        --mono: ui-monospace, SFMono-Regular, monospace;
    }
    
    *, *:before, *:after { box-sizing: border-box; }

    html[data-theme="dark"]{
        --bg: #0f1115; --text: #e7e9ee; --muted: #a4acb8;
        --surface: #14171d; --surface-2: #191d24;
        --border: rgba(231, 233, 238, 0.10);
        --accent: #1fb371; --accent-2: rgba(31, 179, 113, 0.16);
    }
    
    html, body { height: 100%; margin: 0; padding: 0; font-family: var(--sans); background: var(--bg); color: var(--text); font-size: 13px; line-height: 1.45; }
    
    .dbv-shell { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; min-height: 100vh; padding: 20px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-soft); overflow: hidden; margin-bottom: 20px; }
    
    /* Toolbar */
    .dbv-toolbar { padding: 12px; margin-bottom: 12px; position: sticky; top: 12px; z-index: 50; box-shadow: var(--shadow); backdrop-filter: blur(8px); display: flex; justify-content: space-between; align-items: center; }
    .dbv-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 99px; border: 1px solid var(--border); background: var(--surface-2); color: var(--muted); font-size: 12px; }
    
    /* --- Info Table (Date/Rows/Cols) --- */
    .dbv-info-table {
        width: 100%;
        border-collapse: separate; /* Required for border-radius */
        border-spacing: 0;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
        margin-bottom: 20px;
        box-shadow: var(--shadow-soft);
    }
    /* Borders between rows */
    .dbv-info-table tr:not(:last-child) th,
    .dbv-info-table tr:not(:last-child) td {
        border-bottom: 1px solid var(--border);
    }
    /* Label Column */
    .dbv-info-table th {
        background: var(--surface-2);
        color: var(--muted);
        font-weight: 700;
        font-size: 13px;
        text-align: left;
        padding: 10px 16px;
        width: 1%; /* Shrink to text width */
        white-space: nowrap;
        border-right: 1px solid var(--border);
        vertical-align: middle;
    }
    /* Value Column */
    .dbv-info-table td {
        background: var(--surface);
        color: var(--text);
        font-weight: 600;
        font-family: var(--mono);
        font-size: 13px;
        padding: 10px 16px;
        vertical-align: middle;
    }

    .dbv-sql-block { margin-top: -10px; margin-bottom: 20px; padding: 16px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--mono); font-size: 12px; overflow-x: auto; color: var(--text); }
    
    /* Inputs & Buttons */
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; transition: all 0.1s; }
    .btn:hover { border-color: var(--accent); }
    .btn.active { background: var(--accent-2); border-color: var(--accent); color: var(--text); }
    .btn.icon { width: 36px; height: 36px; padding: 0; justify-content: center; }
    .field { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
    input, select { background: transparent; border: none; color: var(--text); outline: none; }
    
    /* Icons */
    .icon { width: 16px; height: 16px; stroke-width: 2px; }
    .muted { color: var(--muted); }

    /* Footer */
    .dbv-footer { margin-top: auto; padding: 24px 0; border-top: 1px solid var(--border); width: 100%; }
    .dbv-footer-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; }
    
    .dbv-footer-left { display: flex; align-items: center; gap: 12px; }
    .dbv-footer-logo { height: 26px; width: auto; color: var(--text); display: block; }
    .dbv-footer-gen { font-weight: 600; font-size: 13px; color: var(--text); }
    
    .dbv-footer-links { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); }
    .dbv-footer-links a { color: var(--muted); text-decoration: underline; text-decoration-color: transparent; transition: all 0.2s; }
    .dbv-footer-links a:hover { color: var(--accent); text-decoration-color: var(--accent); }
    .dbv-footer-dot { width: 3px; height: 3px; background: var(--muted); border-radius: 50%; opacity: 0.5; }
    `;

    // --- Helpers ---
    DBV.utils = {
        $: (sel, root) => (root || document).querySelector(sel),
        $all: (sel, root) => Array.from((root || document).querySelectorAll(sel)),
        normalize: (s) => (s || "").toString().replace(/\s+/g, " ").trim(),
        isNullish: (t) => {
            const s = DBV.utils.normalize(t).toLowerCase();
            return s === "" || s === "null" || s === "(null)" || s === "undefined";
        },
        parseNumber: (t) => {
            let s = DBV.utils.normalize(t);
            if(DBV.utils.isNullish(s)) return null;
            let clean = s.replace(/[\s\u00A0]/g, "");
            if(clean.includes(",") && clean.includes(".")) clean = clean.replace(/,/g, "");
            else if(clean.includes(",") && !clean.includes(".")) clean = clean.replace(/,/g, ".");
            const n = parseFloat(clean);
            return isNaN(n) ? null : n;
        },
        parseDate: (t) => {
            const s = DBV.utils.normalize(t);
            if(!s) return null;
            const d = Date.parse(s.replace(" ", "T"));
            return isNaN(d) ? null : d;
        },
        guessType: (rows, idx) => {
            let n=0, d=0, t=0;
            for(let i=0; i<Math.min(rows.length, 100); i++){ // sample 100 rows
                const txt = rows[i].cells[idx]?.textContent;
                if(DBV.utils.isNullish(txt)) continue;
                if(DBV.utils.parseNumber(txt) !== null) n++;
                else if(DBV.utils.parseDate(txt) !== null) d++;
                else t++;
            }
            if(n >= d && n >= t && n > 0) return "number";
            if(d >= n && d >= t && d > 0) return "date";
            return "text";
        },
        injectCss: (id, css) => {
            if(document.getElementById(id)) return;
            const style = document.createElement("style");
            style.id = id;
            style.textContent = css;
            document.head.appendChild(style);
        }
    };

    // --- Icons ---
    DBV.Icons = {
        sun: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>',
        moon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a7 7 0 1 0 9 9A9 9 0 1 1 12 3z"></path></svg>',
        table: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"></path></svg>',
        chart: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18M7 14l3-3 4 4 6-8"></path></svg>',
        logo: '<svg viewBox="0 0 286 45" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_206_2)"><path d="M0 3.68412C0 1.65324 8.2304 0 18.3705 0C28.5107 0 36.734 1.63899 36.734 3.68412C36.734 5.72925 28.5107 7.37532 18.3705 7.37532C8.2304 7.37532 0 5.72212 0 3.68412ZM18.3705 18.2423C28.5249 18.2423 36.734 16.6104 36.734 14.5511V11.2518C36.734 13.2898 28.5321 14.943 18.3705 14.943C8.20903 14.943 0 13.3111 0 11.2518V14.5511C0 16.5891 8.21615 18.2423 18.3705 18.2423ZM18.3705 29.095H20.3302C20.3302 29.095 20.4299 28.1758 20.6081 27.4276C20.7435 26.8718 20.9074 26.3159 21.1069 25.7815C20.1948 25.8242 19.2969 25.8243 18.3705 25.8243C8.20903 25.8243 0 24.1924 0 22.133V25.4323C0 27.4703 8.20903 29.1235 18.3705 29.1022V29.095ZM23.2589 38.1591C22.8385 37.6746 22.4537 37.1544 22.1045 36.6129C20.9003 36.6913 19.6461 36.6912 18.3705 36.6912C8.20903 36.6912 0 35.0594 0 33.0071V36.3064C0 38.323 8.20903 39.9977 18.3705 39.9977C20.6508 39.9977 22.8314 39.9121 24.8409 39.7553C24.2708 39.2779 23.7364 38.7435 23.2589 38.1663V38.1591ZM41.1877 35.4869L46.8527 41.1592L43.5036 44.5083L37.7672 38.7933C32.9858 41.5938 26.8361 39.9833 24.0356 35.2019C21.2352 30.4204 22.8456 24.2708 27.6271 21.4704C32.4086 18.6699 38.5582 20.2803 41.3587 25.0617C43.2542 28.2969 43.1829 32.3159 41.1877 35.4798V35.4869ZM38.3088 30.1568C38.3088 27.0428 35.7791 24.5202 32.6651 24.5273C29.5582 24.5344 27.0427 27.0641 27.0499 30.171C27.057 33.2779 29.5867 35.7934 32.6936 35.7862C35.8005 35.7791 38.3088 33.2565 38.3088 30.1568ZM85.076 19.9169C85.076 29.1235 79.981 35.5369 70.4038 35.5369H59.5155V4.63183H70.4038C79.981 4.63183 85.076 10.5535 85.076 19.924V19.9169ZM80.0594 19.9169C80.0594 12.7625 76.3183 9.52022 69.6983 9.52022H64.4394V30.6485H69.6983C76.3183 30.6485 80.0594 27.0285 80.0594 19.924V19.9169ZM108.463 24.4775C108.463 31.0974 104.601 36.0285 99.0071 36.0285C96.7482 36.0285 94.7744 35.209 93.3349 33.1496V35.5369H88.3183V4.46795H93.3349V15.4418C94.8527 13.7173 96.8694 12.9335 99.0499 12.9335C104.473 12.9335 108.463 17.8646 108.463 24.4846V24.4775ZM103.447 24.563C103.447 20.8646 101.352 17.9858 98.4299 17.9858C95.5083 17.9858 93.3777 20.943 93.3777 24.6413C93.3777 28.3397 95.4727 31.133 98.3943 31.133C101.316 31.133 103.447 28.2542 103.447 24.5558V24.563ZM121.204 26.2875L113.515 4.6247H108.257L119.48 35.5297H122.972L134.109 4.6247H128.85L121.204 26.2875ZM139.083 3.47744C137.359 3.47744 135.962 4.8314 135.962 6.59862C135.962 8.36585 137.359 9.71977 139.083 9.71977C140.808 9.71977 142.247 8.32309 142.247 6.59862C142.247 4.87416 140.85 3.47744 139.083 3.47744ZM136.618 35.5369H141.549V13.3397H136.618V35.5369ZM155.444 22.3468C152.031 21.3635 150.841 20.5796 150.841 19.4252C150.841 18.2708 152.116 17.5368 154.29 17.5368C156.67 17.5368 158.109 18.4418 158.979 20.4584L163.539 19.1402C162.1 15.0713 158.936 12.9335 154.247 12.9335C149.273 12.9335 145.824 15.3563 145.824 19.1402C145.824 22.3041 148.247 24.6057 153.755 26.4157C157.204 27.4846 158.729 28.4323 158.729 29.6223C158.729 30.8124 157.211 31.5962 154.988 31.5962C152.401 31.5962 150.549 30.5273 149.729 28.2684L145.247 29.6223C146.523 33.7767 149.85 36.0356 154.867 36.0356C160.126 36.0356 163.582 33.5273 163.582 29.5012C163.582 26.1734 161.116 24.0784 155.444 22.3468ZM181.055 26.0024C180.071 29.2091 177.477 31.0546 174.969 31.0546C172.753 31.0546 170.943 29.6152 170.943 26.5724V13.3824H166.012V27.1497C166.012 32.7791 169.055 36.0285 174.029 36.0285C176.615 36.0285 179.002 35.1235 181.055 32.8218V35.5369H186.029V13.3824H181.055V26.0024ZM209.295 31.4252V35.6579C208.596 35.9073 207.855 36.0285 207.157 36.0285C205.39 36.0285 203.829 35.1663 203.088 33.8124C201.278 35.209 198.734 36.0285 196.14 36.0285C191.537 36.0285 188.33 33.4774 188.33 29.7007C188.33 26.4941 190.632 24.3135 194.002 23.3729C199.14 21.9762 201.855 21.3563 201.855 19.6746C201.855 18.4846 200.501 17.7007 198.527 17.7007C196.104 17.7007 194.458 18.8124 193.76 20.8219L189.2 19.1758C190.432 15.228 193.846 12.9691 198.57 12.9691C203.872 12.9691 207.121 15.8908 207.121 21.0286V29.9858C207.121 31.2185 208.069 31.8385 209.302 31.4252H209.295ZM202.226 24.9691C197.622 27.3563 193.304 26.7791 193.304 29.4085C193.304 30.8479 194.622 31.6247 196.589 31.6247C198.727 31.6247 200.907 30.677 202.219 29.3658V24.9691H202.226ZM212.337 35.5297H217.268V4.46081H212.337V35.5297ZM222.078 35.5297H227.01V13.3326H222.078V35.5297ZM224.544 3.4703C222.819 3.4703 221.423 4.82427 221.423 6.59149C221.423 8.35871 222.819 9.71264 224.544 9.71264C226.268 9.71264 227.708 8.31596 227.708 6.59149C227.708 4.86703 226.311 3.4703 224.544 3.4703ZM231.078 18.3492H241.026L230.914 31.8313V35.5297H248.095V30.5986H238.105L248.095 17.2803V13.3326H231.078V18.3492ZM270.413 24.4347V26.1164H255.328C255.777 29.1164 257.793 31.1687 260.836 31.1687C263.138 31.1687 265.069 30.057 266.181 27.9192L270.086 30.2637C267.905 34.1687 264.784 36.0214 260.793 36.0214C254.38 36.0214 250.268 31.2114 250.268 24.4275C250.268 17.6437 254.38 12.962 260.544 12.962C266.708 12.962 270.406 17.5225 270.406 24.4275L270.413 24.4347ZM265.233 21.9263C264.948 19.4608 263.138 17.772 260.587 17.772C258.036 17.772 256.069 19.5392 255.534 21.9263H265.233ZM278.266 16.297V13.3397H273.335V35.5369H278.266V25.3468C278.266 20.9501 280.774 18.7269 285.663 18.8551V13.1829C282.292 12.9763 280.076 13.924 278.266 16.3041V16.297Z" fill="currentColor"/></g><defs><clipPath id="clip0_206_2"><rect width="286" height="45" fill="white"/></clipPath></defs></svg>'
    };

    // --- Initialization ---
    function initCore() {
        DBV.utils.injectCss("dbv-core-css", CORE_CSS);

        const table = DBV.utils.$("table.data");
        if(!table) return;

        const ths = DBV.utils.$all("thead th", table);
        const trs = DBV.utils.$all("tbody tr", table);

        DBV.data.headers = ths.map(th => DBV.utils.normalize(th.textContent));
        DBV.data.rows = trs;
        DBV.data.colTypes = DBV.data.headers.map((_, i) => DBV.utils.guessType(trs, i));

        const infoTable = DBV.utils.$(".dbv-info-table");
        if (infoTable) {
            const tds = DBV.utils.$all("td", infoTable);
            tds.forEach(td => {
                if (td.textContent.trim() === "${date}") {
                    // Replaces it dynamically with the current local date and time
                    td.textContent = new Date().toLocaleString();
                }
            });
        }

        const shell = document.createElement("div");
        shell.className = "dbv-shell";
        document.body.insertBefore(shell, document.body.firstChild);

        Array.from(document.body.children).forEach(child => {
            if(child !== shell) shell.appendChild(child);
        });

        const toolbar = document.createElement("div");
        toolbar.className = "dbv-toolbar card";
        toolbar.innerHTML = `
            <div style="display:flex; gap:10px; align-items:center;">
                <span class="dbv-badge">DbVisualizer Pro</span>
                <span class="muted" id="dbv-status-text">${trs.length} rows</span>
            </div>
            <div style="display:flex; gap:10px;">
                <div id="dbv-view-switch" style="display:flex; gap:5px;"></div>
                <button class="btn icon" id="dbv-theme-btn"></button>
            </div>
        `;
        shell.prepend(toolbar);

        const footer = document.createElement("footer");
        footer.className = "dbv-footer";
        footer.innerHTML = `
            <div class="dbv-footer-inner">
                <div class="dbv-footer-left">
                    <a href="https://www.dbvis.com" target="_blank" class="dbv-footer-logo">
                        ${DBV.Icons.logo}
                    </a>
                    <span class="dbv-footer-gen">Generated by DbVisualizer Pro</span>
                </div>
                <div class="dbv-footer-links">
                    <a href="https://www.dbvis.com/" target="_blank">dbvis.com</a>
                    <span class="dbv-footer-dot"></span>
                    <a href="https://www.dbvis.com/" target="_blank">Product</a>
                    <span class="dbv-footer-dot"></span>
                    <a href="https://www.dbvis.com/download/" target="_blank">Download</a>
                </div>
            </div>
        `;
        shell.appendChild(footer);

        const themeBtn = document.getElementById("dbv-theme-btn");
        const toggleTheme = () => {
            const isDark = document.documentElement.getAttribute("data-theme") === "dark";
            const newTheme = isDark ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", newTheme);
            themeBtn.innerHTML = newTheme === "dark" ? DBV.Icons.sun : DBV.Icons.moon;
        };
        themeBtn.addEventListener("click", toggleTheme);
        toggleTheme();

        DBV.ui = { shell, toolbar };
    }

    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initCore);
    else initCore();

})();