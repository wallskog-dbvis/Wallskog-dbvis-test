(function () {
    if(!window.DBV) return console.error("DBV Core not loaded");

    var CHART_CSS = `
    /* Main Layout */
    .chart-action-bar { 
        padding: 12px; 
        display: flex; 
        justify-content: flex-end; 
        align-items: center;
        border-bottom: 1px solid var(--border); 
    }
    .chart-action-bar .btn { 
        display: inline-flex; 
        align-items: center; 
        gap: 6px; 
    }
    .chart-action-bar svg { 
        opacity: 0.7; 
    }

    .chart-controls { 
        padding: 20px; 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
        gap: 20px; 
        border-bottom: 1px solid var(--border); 
        background: var(--surface-2); 
    }

    .chart-label {
        font-size: 11px; 
        text-transform: uppercase; 
        letter-spacing: 0.5px; 
        font-weight: 700; 
        color: var(--muted); 
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .y-metrics-list {
        max-height: 120px;
        overflow-y: auto;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    
    .y-metric-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.15s;
        font-size: 13px;
        color: var(--text);
        user-select: none;
    }
    
    .y-metric-item:hover { background: var(--surface-2); }
    .y-metric-item input { cursor: pointer; margin: 0; }

    /* Canvas Area */
    .chart-stage { 
        position: relative; 
        height: 450px; 
        padding: 20px 40px; 
        background: var(--surface);
        box-sizing: border-box;
    }
    canvas { width: 100%; height: 100%; display: block; }

    /* Legend */
    .legend { 
        display: flex; 
        flex-wrap: wrap; 
        gap: 16px; 
        padding: 0 20px 24px; 
        justify-content: center; 
        background: var(--surface);
    }
    .legend-item { 
        display: flex; 
        align-items: center; 
        gap: 8px; 
        font-size: 12px; 
        font-weight: 500;
        color: var(--text); 
        background: var(--surface-2);
        padding: 4px 10px;
        border-radius: 99px;
        border: 1px solid var(--border);
    }
    .color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    
    .y-metrics-list::-webkit-scrollbar { width: 6px; }
    .y-metrics-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 99px; }
    .y-metrics-list::-webkit-scrollbar-track { background: transparent; }

    /* --- Tooltip CSS --- */
    .dbv-tooltip {
        position: absolute;
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 13px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.1s ease;
        box-shadow: var(--shadow);
        z-index: 9999;
        white-space: nowrap;
    }
    .dbv-tooltip-val { font-family: var(--mono); font-weight: 700; margin-left: auto; padding-left: 12px; }
    `;

    function initCharts() {
        DBV.utils.injectCss("dbv-chart-css", CHART_CSS);

        const switcher = document.getElementById("dbv-view-switch");
        if (!switcher) return;

        const chartBtn = document.createElement("button");
        chartBtn.className = "btn";
        chartBtn.id = "dbv-chart-btn";
        chartBtn.innerHTML = `${DBV.Icons.chart} Graph`;

        const card = document.createElement("div");
        card.className = "card";
        card.id = "dbv-chart-card";
        card.style.display = "none";

        const lucideDownloadSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`;

        const actionBar = document.createElement("div");
        actionBar.className = "chart-action-bar";

        const exportBtn = document.createElement("button");
        exportBtn.className = "btn";
        exportBtn.id = "dbv-dl-png";
        exportBtn.innerHTML = `${lucideDownloadSVG} PNG`;

        exportBtn.onclick = () => {
            const canvasObj = document.getElementById("dbv-canvas");
            if (!canvasObj) return;

            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = canvasObj.width;
            tempCanvas.height = canvasObj.height;
            const tCtx = tempCanvas.getContext("2d");

            const isDark = document.documentElement.getAttribute("data-theme") === "dark";
            tCtx.fillStyle = isDark ? "#1e1e1e" : "#ffffff";
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.drawImage(canvasObj, 0, 0);

            const link = document.createElement('a');
            link.download = `DBV-Chart-${new Date().getTime()}.png`;
            link.href = tempCanvas.toDataURL('image/png');
            link.click();
        };

        actionBar.appendChild(exportBtn);

        const controls = document.createElement("div");
        controls.className = "chart-controls";

        const xDiv = document.createElement("div");
        xDiv.innerHTML = `<div class="chart-label">${DBV.Icons.chart} X Axis</div>`;
        const xField = document.createElement("div");
        xField.className = "field";
        xField.style.width = "100%";

        const xSel = document.createElement("select");
        xSel.style.width = "100%";
        DBV.data.headers.forEach((h,i) => { xSel.add(new Option(h, i)); });
        xField.appendChild(xSel);
        xDiv.appendChild(xField);

        const tDiv = document.createElement("div");
        tDiv.innerHTML = `<div class="chart-label">${DBV.Icons.chart} Chart Type</div>`;
        const tField = document.createElement("div");
        tField.className = "field";
        tField.style.width = "100%";

        const tSel = document.createElement("select");
        tSel.id = "dbv-chart-type";
        tSel.style.width = "100%";
        tSel.add(new Option("Auto (Best Fit)", "auto"));
        tSel.add(new Option("Bar Chart", "bar"));
        tSel.add(new Option("Line Chart", "line"));
        tField.appendChild(tSel);
        tDiv.appendChild(tField);

        const yDiv = document.createElement("div");
        yDiv.innerHTML = `<div class="chart-label">${DBV.Icons.chart} Y Metrics</div>`;
        const yContainer = document.createElement("div");
        yContainer.className = "y-metrics-list";

        DBV.data.headers.forEach((h,i) => {
            if(DBV.data.colTypes[i] === "number"){
                const label = document.createElement("label");
                label.className = "y-metric-item";
                const isChecked = i !== parseInt(xSel.value);
                label.innerHTML = `<input type="checkbox" value="${i}" ${isChecked ? 'checked' : ''}> <span>${h}</span>`;
                yContainer.appendChild(label);
            }
        });

        if(yContainer.children.length === 0) {
            yContainer.innerHTML = `<div style="padding:10px; color:var(--muted); font-style:italic; font-size:12px;">No numeric columns found.</div>`;
        }

        yDiv.appendChild(yContainer);

        const swapDiv = document.createElement("div");
        swapDiv.innerHTML = `<div class="chart-label">${DBV.Icons.chart} Orientation</div>`;
        const swapField = document.createElement("div");
        swapField.className = "field";
        swapField.innerHTML = `<label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="checkbox" id="dbv-swap-axes"> Swap X / Y</label>`;
        swapDiv.appendChild(swapField);

        controls.appendChild(xDiv);
        controls.appendChild(tDiv);
        controls.appendChild(swapDiv);
        controls.appendChild(yDiv);
        card.appendChild(controls);
        card.appendChild(actionBar);

        const stage = document.createElement("div");
        stage.className = "chart-stage";
        stage.innerHTML = `<canvas id="dbv-canvas"></canvas>`;
        card.appendChild(stage);

        const legend = document.createElement("div");
        legend.className = "legend";
        card.appendChild(legend);

        const tableCard = document.getElementById("dbv-table-card");
        tableCard.parentNode.insertBefore(card, tableCard);

        const tooltip = document.createElement("div");
        tooltip.className = "dbv-tooltip";
        document.body.appendChild(tooltip);

        chartBtn.onclick = () => {
            card.style.display = "block";
            tableCard.style.display = "none";
            chartBtn.classList.add("active");

            const tableBtn = document.getElementById("dbv-table-btn");
            if(tableBtn) tableBtn.classList.remove("active");

            requestAnimationFrame(updateChart);
        };
        switcher.appendChild(chartBtn);

        const canvas = document.getElementById("dbv-canvas");
        const ctx = canvas.getContext("2d");

        let hitRegions = [];
        const colors = ["#24C780", "#3B82F6", "#F59E0B", "#EF4444", "#A855F7", "#EC4899"];

        function updateChart() {
            if(card.style.display === "none") return;

            tooltip.style.opacity = 0;
            hitRegions = [];

            const xIdx = parseInt(xSel.value);
            const yIdxs = Array.from(yContainer.querySelectorAll("input:checked")).map(cb => parseInt(cb.value));
            const typeReq = tSel.value;
            const isSwapped = document.getElementById("dbv-swap-axes").checked;

            const visibleRows = DBV.data.rows.filter(r => r.style.display !== "none");
            const xType = DBV.data.colTypes[xIdx];

            let mode = "line";
            if(typeReq === "bar") mode = "bar";
            else if(typeReq === "line") mode = "line";
            else mode = (xType === "text") ? "bar" : "line";

            const dataMap = {};
            const labels = [];

            visibleRows.forEach(row => {
                const xVal = row.cells[xIdx].textContent.trim();
                if(!xVal) return;

                if(!dataMap[xVal]) {
                    dataMap[xVal] = { count: 0, sums: new Array(yIdxs.length).fill(0) };
                    labels.push(xVal);
                }

                yIdxs.forEach((yIdx, i) => {
                    const val = DBV.utils.parseNumber(row.cells[yIdx].textContent);
                    if(val !== null) dataMap[xVal].sums[i] += val;
                });
                dataMap[xVal].count++;
            });

            const rect = canvas.getBoundingClientRect();
            if(rect.width === 0 || rect.height === 0) return;

            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const w = rect.width;
            const h = rect.height;

            const theme = document.documentElement.getAttribute("data-theme");
            const isDark = theme === "dark";
            const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
            const textColor = isDark ? "#a4acb8" : "#6b7280";

            ctx.clearRect(0,0,w,h);

            let maxVal = 0;
            labels.forEach(l => {
                dataMap[l].sums.forEach(s => maxVal = Math.max(maxVal, s));
            });

            const isBinary = maxVal <= 1;
            if (!isBinary) maxVal *= 1.1;
            if(maxVal === 0) maxVal = 10;

            const pad = {l: 85, r: 20, t: 20, b: 60};
            const graphW = w - pad.l - pad.r;
            const graphH = h - pad.t - pad.b;

            // --- Draw Titles Based on Swap State ---
            const primaryLabel = DBV.data.headers[xIdx];
            const secondaryNames = yIdxs.map(idx => DBV.data.headers[idx]);
            let secondaryLabel = secondaryNames.join(", ");
            if (secondaryNames.length > 2 || secondaryLabel.length > 40) secondaryLabel = secondaryNames.length + " Metrics Selected";
            if (secondaryNames.length === 0) secondaryLabel = "Values";

            const xAxisTitle = isSwapped ? secondaryLabel : primaryLabel;
            const yAxisTitle = isSwapped ? primaryLabel : secondaryLabel;

            ctx.fillStyle = textColor;
            ctx.textAlign = "center";
            ctx.font = "bold 12px sans-serif";
            ctx.fillText(xAxisTitle, pad.l + (graphW / 2), h - 15);

            ctx.save();
            ctx.translate(20, pad.t + (graphH / 2));
            ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = textColor;
            ctx.textAlign = "center";
            ctx.font = "bold 12px sans-serif";
            ctx.fillText(yAxisTitle, 0, 0);
            ctx.restore();

            // --- Draw Base Graph Lines ---
            ctx.beginPath();
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            ctx.moveTo(pad.l, pad.t);
            ctx.lineTo(pad.l, h - pad.b);
            ctx.lineTo(w - pad.r, h - pad.b);
            ctx.stroke();

            // --- Draw Ticks & Grid ---
            ctx.fillStyle = textColor;
            ctx.font = "10px sans-serif";

            let tickCount = isBinary ? 1 : 4;

            for(let i=0; i<=tickCount; i++) {
                const ratio = i / tickCount;
                let rawVal = maxVal * ratio;
                let valStr;

                if (isBinary) valStr = rawVal.toFixed(0);
                else if (maxVal <= 5) valStr = Number(rawVal.toFixed(2)).toString();
                else if (maxVal <= 20) valStr = Number(rawVal.toFixed(1)).toString();
                else valStr = Math.round(rawVal).toString();

                if (!isSwapped) {
                    const y = h - pad.b - (graphH * ratio);
                    ctx.textAlign = "right";
                    ctx.fillText(valStr, pad.l - 6, y + 3);

                    if(i > 0) {
                        ctx.beginPath();
                        ctx.strokeStyle = gridColor;
                        ctx.setLineDash([4, 4]);
                        ctx.moveTo(pad.l, y);
                        ctx.lineTo(w - pad.r, y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                } else {
                    const x = pad.l + (graphW * ratio);
                    ctx.textAlign = "center";
                    ctx.fillText(valStr, x, h - pad.b + 18);

                    if(i > 0) {
                        ctx.beginPath();
                        ctx.strokeStyle = gridColor;
                        ctx.setLineDash([4, 4]);
                        ctx.moveTo(x, pad.t);
                        ctx.lineTo(x, h - pad.b);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
            }

            // --- Draw Data Shapes ---
            const step = (isSwapped ? graphH : graphW) / Math.max(1, labels.length);

            if(mode === "bar") {
                const thickness = (step * 0.7) / Math.max(1, yIdxs.length);
                labels.forEach((lbl, i) => {
                    const center = (isSwapped ? pad.t : pad.l) + (i * step) + (step / 2);
                    const start = center - ((yIdxs.length * thickness) / 2);

                    yIdxs.forEach((yIdx, j) => {
                        const val = dataMap[lbl].sums[j];
                        const length = (val / maxVal) * (isSwapped ? graphW : graphH);
                        const colColor = colors[j % colors.length];

                        let x, y, barW, barH;
                        if (!isSwapped) {
                            x = start + (j * thickness);
                            y = h - pad.b - length;
                            barW = thickness;
                            barH = length;
                        } else {
                            x = pad.l;
                            y = start + (j * thickness);
                            barW = length;
                            barH = thickness;
                        }

                        ctx.fillStyle = colColor;
                        ctx.fillRect(x, y, barW, barH);

                        hitRegions.push({
                            type: 'rect', x: x, y: y, w: barW, h: barH,
                            label: lbl, val: val,
                            metricName: DBV.data.headers[yIdx], color: colColor
                        });
                    });

                    if(labels.length <= 10 || i % Math.ceil(labels.length/10) === 0) {
                        ctx.fillStyle = textColor;
                        let shortLbl = lbl.substring(0, 10);
                        if (!isSwapped) {
                            ctx.textAlign = "center";
                            ctx.fillText(shortLbl, center, h - pad.b + 14);
                        } else {
                            ctx.textAlign = "right";
                            ctx.fillText(shortLbl, pad.l - 6, center + 4);
                        }
                    }
                });
            } else {
                yIdxs.forEach((yIdx, j) => {
                    const colColor = colors[j % colors.length];
                    ctx.beginPath();
                    ctx.strokeStyle = colColor;
                    ctx.lineWidth = 2;

                    labels.forEach((lbl, i) => {
                        const val = dataMap[lbl].sums[j];
                        const length = (val / maxVal) * (isSwapped ? graphW : graphH);
                        const center = (isSwapped ? pad.t : pad.l) + (i * step) + (step / 2);

                        let x, y;
                        if (!isSwapped) {
                            x = center;
                            y = h - pad.b - length;
                        } else {
                            x = pad.l + length;
                            y = center;
                        }

                        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
                    });
                    ctx.stroke();

                    ctx.fillStyle = colColor;
                    labels.forEach((lbl, i) => {
                        const val = dataMap[lbl].sums[j];
                        const length = (val / maxVal) * (isSwapped ? graphW : graphH);
                        const center = (isSwapped ? pad.t : pad.l) + (i * step) + (step / 2);

                        let x, y;
                        if (!isSwapped) {
                            x = center;
                            y = h - pad.b - length;
                        } else {
                            x = pad.l + length;
                            y = center;
                        }

                        ctx.beginPath();
                        ctx.arc(x, y, 4, 0, Math.PI*2);
                        ctx.fill();

                        hitRegions.push({
                            type: 'circle', x: x, y: y, r: 15,
                            label: lbl, val: val,
                            metricName: DBV.data.headers[yIdx], color: colColor
                        });
                    });
                });

                labels.forEach((lbl, i) => {
                    if(labels.length <= 10 || i % Math.ceil(labels.length/10) === 0) {
                        const center = (isSwapped ? pad.t : pad.l) + (i * step) + (step / 2);
                        ctx.fillStyle = textColor;
                        let shortLbl = lbl.substring(0, 10);
                        if (!isSwapped) {
                            ctx.textAlign = "center";
                            ctx.fillText(shortLbl, center, h - pad.b + 14);
                        } else {
                            ctx.textAlign = "right";
                            ctx.fillText(shortLbl, pad.l - 6, center + 4);
                        }
                    }
                });
            }

            legend.innerHTML = "";
            yIdxs.forEach((idx, i) => {
                const div = document.createElement("div");
                div.className = "legend-item";
                div.innerHTML = `<div class="color-dot" style="background:${colors[i%colors.length]}"></div> ${DBV.data.headers[idx]}`;
                legend.appendChild(div);
            });
        }

        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let hoveredObj = null;

            for (let i = hitRegions.length - 1; i >= 0; i--) {
                const shape = hitRegions[i];
                if (shape.type === 'rect') {
                    if (mouseX >= shape.x && mouseX <= shape.x + shape.w &&
                        mouseY >= shape.y && mouseY <= shape.y + shape.h) {
                        hoveredObj = shape;
                        break;
                    }
                } else if (shape.type === 'circle') {
                    const dx = mouseX - shape.x;
                    const dy = mouseY - shape.y;
                    if (dx * dx + dy * dy <= shape.r * shape.r) {
                        hoveredObj = shape;
                        break;
                    }
                }
            }

            if (hoveredObj) {
                let displayVal = hoveredObj.val;
                if(displayVal % 1 !== 0) displayVal = displayVal.toFixed(2);

                tooltip.innerHTML = `
                    <div style="font-size:11px; color:var(--muted); margin-bottom:6px; font-weight: 600;">
                        X: ${hoveredObj.label}
                    </div>
                    <div style="display:flex; align-items:center;">
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${hoveredObj.color}; margin-right:8px;"></span>
                        <span>${hoveredObj.metricName}</span>
                        <span class="dbv-tooltip-val">${displayVal}</span>
                    </div>
                `;
                tooltip.style.opacity = 1;
                tooltip.style.left = (e.pageX + 15) + "px";
                tooltip.style.top = (e.pageY + 15) + "px";
                canvas.style.cursor = "pointer";
            } else {
                tooltip.style.opacity = 0;
                canvas.style.cursor = "default";
            }
        });

        canvas.addEventListener("mouseleave", () => {
            tooltip.style.opacity = 0;
        });

        xSel.onchange = updateChart;
        tSel.onchange = updateChart;
        yContainer.addEventListener("change", updateChart);

        const swapCb = document.getElementById("dbv-swap-axes");
        if (swapCb) swapCb.addEventListener("change", updateChart);

        DBV.on("filter", updateChart);
        window.addEventListener("resize", updateChart);

        if(chartBtn.classList.contains("active")) updateChart();
    }

    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initCharts);
    else initCharts();
})();