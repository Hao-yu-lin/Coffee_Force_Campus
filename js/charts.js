/* ═══════════════════════════════════════════════════
   CHARTS — Chart.js initialization and update
   Depends on: state.js, constants.js
═══════════════════════════════════════════════════ */

const externalTooltipHandler = (context) => {
    const {chart, tooltip} = context;
    const isMobile = window.innerWidth <= 640;

    if (isMobile) {
        let tooltipEl = chart.canvas.parentNode.querySelector('div.chartjs-tooltip');

        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.classList.add('chartjs-tooltip');
            tooltipEl.style.background = 'rgba(0, 0, 0, 0.88)';
            tooltipEl.style.borderRadius = '4px';
            tooltipEl.style.color = 'white';
            tooltipEl.style.opacity = 1;
            tooltipEl.style.pointerEvents = 'none';
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.transition = 'all .1s ease';
            tooltipEl.style.zIndex = 1000;
            tooltipEl.style.maxHeight = '200px';
            tooltipEl.style.overflowY = 'auto';
            tooltipEl.style.padding = '12px';
            tooltipEl.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';

            tooltipEl.style.scrollbarWidth = 'none';
            tooltipEl.style.msOverflowStyle = 'none';
            const style = document.createElement('style');
            style.innerHTML = '.chartjs-tooltip::-webkit-scrollbar { display: none; }';
            document.head.appendChild(style);

            chart.canvas.parentNode.appendChild(tooltipEl);
        }

        if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = 0;
            tooltipEl.style.pointerEvents = 'none';
            return;
        }

        if (tooltip.body) {
            const titleLines = tooltip.title || [];

            let innerHtml = '<div style="font-weight:bold;margin-bottom:8px;font-size:14px;border-bottom:1px solid #444;padding-bottom:4px;">';
            titleLines.forEach(title => { innerHtml += `<div>${title}</div>`; });
            innerHtml += '</div><div style="font-size:12px;line-height:1.4;">';

            tooltip.body.forEach((bodyItem, i) => {
                const colors = tooltip.labelColors[i];
                const dotColor = colors.borderColor || colors.backgroundColor;
                const spanStyle = `background:${dotColor}; display:inline-block; width:10px; height:10px; margin-right:8px; vertical-align:top; margin-top:3px; border-radius:50%; flex-shrink:0;`;
                const span = `<span style="${spanStyle}"></span>`;

                const allLines = [
                    ...bodyItem.lines,
                    ...(bodyItem.after || [])
                ];
                const lines = allLines.join('<br/>').replace(/  - /g, '&nbsp;&nbsp;&nbsp;&nbsp;- ');
                innerHtml += `<div style="margin-bottom:6px; display:flex; align-items:flex-start;">${span}<div style="flex:1;">${lines}</div></div>`;
            });
            innerHtml += '</div>';

            tooltipEl.innerHTML = innerHtml;
        }

        const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;

        tooltipEl.style.opacity = 1;
        tooltipEl.style.pointerEvents = 'auto';
        tooltipEl.style.left = positionX + tooltip.caretX + 20 + 'px';
        
        let top = positionY + tooltip.caretY - tooltipEl.offsetHeight / 2;
        if (top < positionY) top = positionY;
        if (top + tooltipEl.offsetHeight > positionY + chart.canvas.offsetHeight) {
            top = positionY + chart.canvas.offsetHeight - tooltipEl.offsetHeight;
        }
        tooltipEl.style.top = top + 'px';
    } else {
        let tooltipEl = document.getElementById('leftTooltipPanel');

        if (!tooltipEl) return;

        let mobileTooltip = chart.canvas.parentNode.querySelector('div.chartjs-tooltip');
        if (mobileTooltip) {
            mobileTooltip.style.opacity = 0;
            mobileTooltip.style.pointerEvents = 'none';
        }

        if (tooltip.opacity === 0) {
            tooltipEl.innerHTML = '<div style="color: #888; text-align: center; margin-top: 20px;">游標移至圖表以顯示詳細數據</div>';
            return;
        }

        if (tooltip.body) {
            const titleLines = tooltip.title || [];

            let innerHtml = '<div style="font-weight:bold;margin-bottom:8px;font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;">';
            titleLines.forEach(title => { innerHtml += `<div>${title}</div>`; });
            innerHtml += '</div><div style="font-size:12px;line-height:1.4;">';

            tooltip.body.forEach((bodyItem, i) => {
                const colors = tooltip.labelColors[i];
                const dotColor = colors.borderColor || colors.backgroundColor;
                const spanStyle = `background:${dotColor}; display:inline-block; width:10px; height:10px; margin-right:8px; vertical-align:top; margin-top:3px; border-radius:50%; flex-shrink:0;`;
                const span = `<span style="${spanStyle}"></span>`;

                const allLines = [
                    ...bodyItem.lines,
                    ...(bodyItem.after || [])
                ];
                const lines = allLines.join('<br/>').replace(/  - /g, '&nbsp;&nbsp;&nbsp;&nbsp;- ');
                innerHtml += `<div style="margin-bottom:6px; display:flex; align-items:flex-start;">${span}<div style="flex:1;">${lines}</div></div>`;
            });
            innerHtml += '</div>';

            tooltipEl.innerHTML = innerHtml;
        }
    }
};

function initCharts() {
    const commonTooltip = {
        enabled: false, // Disable native tooltip
        external: externalTooltipHandler,
        callbacks: {
            title: ctx => `時間: ${ctx[0].label} 秒`,
            label: ctx => {
                const label = ctx.dataset.label || '';
                return label.replace(' - Weight', '').replace(' - Flow', '').replace(' - Temp', '');
            },
            afterLabel: ctx => {
                const dsId = ctx.dataset.datasetId;
                const ds = allDatasets[dsId];
                if (!ds) return null;
                const timeIdx = ctx.dataIndex;
                const showWeight = document.getElementById('showWeight') ? document.getElementById('showWeight').checked : true;
                const showFlow = document.getElementById('showFlow') ? document.getElementById('showFlow').checked : true;
                const showTemp = document.getElementById('showTemp') ? document.getElementById('showTemp').checked : true;

                let lines = [];
                if (showWeight && ds.weight && ds.weight[timeIdx] !== undefined) {
                    const w = Number(ds.weight[timeIdx]);
                    if (!isNaN(w)) lines.push(`  - weight: ${w.toFixed(2)}`);
                }
                if (showFlow && ds.flow && ds.flow[timeIdx] !== undefined) {
                    const f = Number(ds.flow[timeIdx]);
                    if (!isNaN(f)) lines.push(`  - flow: ${f.toFixed(2)}`);
                }
                if (showTemp && ds.temp && ds.temp[timeIdx] !== undefined) {
                    const t = Number(ds.temp[timeIdx]);
                    if (!isNaN(t)) lines.push(`  - tmp: ${t.toFixed(2)}`);
                }
                return lines.length ? lines : null;
            }
        }
    };
    let crosshairIndex = null;
    let isTooltipPinned = false;
    let pinnedIndex = null;

    const pinnedMarkerPlugin = {
        id: 'pinnedMarker',
        afterDatasetsDraw(chart) {
            const activeIdx = isTooltipPinned ? pinnedIndex : crosshairIndex;
            if (activeIdx === null) return;
            const ctx = chart.ctx;
            chart.data.datasets.forEach((ds, i) => {
                if (!chart.isDatasetVisible(i)) return;
                const meta = chart.getDatasetMeta(i);
                const point = meta.data[activeIdx];
                if (!point) return;
                ctx.save();
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                if (isTooltipPinned) {
                    ctx.fillStyle = ds.borderColor;
                    ctx.fill();
                } else {
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = ds.borderColor;
                    ctx.lineWidth = 2;
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();
            });
        }
    };

    const freezeInteractionPlugin = {
        id: 'freezeInteraction',
        beforeEvent: (chart, args, options) => {
            const event = args.event;
            if (event.type === 'click') {
                isTooltipPinned = !isTooltipPinned;
                pinnedIndex = isTooltipPinned ? crosshairIndex : null;
                if (weightChart) weightChart.update('none');
                if (flowTempChart) flowTempChart.update('none');
            } else if (isTooltipPinned) {
                return false;
            }
        }
    };

    const verticalHoverLinePlugin = {
        id: 'verticalHoverLine',
        afterDraw: chart => {
            const activeIdx = isTooltipPinned ? pinnedIndex : crosshairIndex;
            if (activeIdx === null) return;

            let x = null;
            for (let i = 0; i < chart.data.datasets.length; i++) {
                const meta = chart.getDatasetMeta(i);
                if (meta && meta.data && meta.data[activeIdx]) {
                    x = meta.data[activeIdx].x;
                    break;
                }
            }
            if (x === null && chart.scales.x) {
                const lbl = chart.data.labels?.[activeIdx];
                if (lbl !== undefined) x = chart.scales.x.getPixelForValue(lbl);
            }

            if (x !== null) {
                const ctx = chart.ctx;
                const topY = chart.scales.y.top;
                const bottomY = chart.scales.y.bottom;

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, topY);
                ctx.lineTo(x, bottomY);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.restore();
            }
        }
    };

    const syncActiveElements = (targetChart, newIdx) => {
        if (!targetChart) return;
        const elements = [];
        if (newIdx !== null) {
            for (let i = 0; i < targetChart.data.datasets.length; i++) {
                if (targetChart.isDatasetVisible(i)) {
                    elements.push({ datasetIndex: i, index: newIdx });
                }
            }
        }
        targetChart.setActiveElements(elements);
        targetChart.tooltip.setActiveElements(elements, { x: 0, y: 0 });
        targetChart.update('none');
    };

    const onHoverSync = (e, elements, chart) => {
        const newIdx = elements.length ? (elements[0].element?.$context?.dataIndex ?? elements[0].index) : null;
        if (crosshairIndex !== newIdx) {
            crosshairIndex = newIdx;
            if (chart.canvas.id === 'weightChart' && flowTempChart) {
                syncActiveElements(flowTempChart, newIdx);
            }
            if (chart.canvas.id === 'flowTempChart' && weightChart) {
                syncActiveElements(weightChart, newIdx);
            }
        }
    };

    weightChart = new Chart(document.getElementById('weightChart').getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [] },
        plugins: [verticalHoverLinePlugin, freezeInteractionPlugin, pinnedMarkerPlugin],
        options: {
            onHover: onHoverSync,
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: commonTooltip },
            layout: { padding: 0 },
            scales: {
                x: { title: { display: false }, grid: { color: 'rgba(0,0,0,0.08)' } },
                y: { afterFit(s) { s.width = 60; }, title: { display: true, text: 'Weight (g)' }, grid: { color: 'rgba(0,0,0,0.08)' } }
            }
        }
    });

    flowTempChart = new Chart(document.getElementById('flowTempChart').getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [] },
        plugins: [verticalHoverLinePlugin, freezeInteractionPlugin, pinnedMarkerPlugin],
        options: {
            onHover: onHoverSync,
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: commonTooltip },
            layout: { padding: 0 },
            scales: {
                x: { title: { display: true, text: 'Time (s)' }, grid: { color: 'rgba(0,0,0,0.08)' } },
                y: { min: -20, max: 20, afterFit(s) { s.width = 60; }, title: { display: true, text: 'Flow / Temp' }, grid: { color: 'rgba(0,0,0,0.08)' } }
            }
        }
    });

    const handleMouseOut = () => {
        if (isTooltipPinned) return;
        crosshairIndex = null;
        if (weightChart) syncActiveElements(weightChart, null);
        if (flowTempChart) syncActiveElements(flowTempChart, null);
    };
    document.getElementById('weightChart').addEventListener('mouseleave', handleMouseOut);
    document.getElementById('flowTempChart').addEventListener('mouseleave', handleMouseOut);
}

function updateCharts() {
    const showWeight = document.getElementById('showWeight').checked;
    const showFlow   = document.getElementById('showFlow').checked;
    const showTemp   = document.getElementById('showTemp').checked;
    if (!weightChart || !flowTempChart) return;

    const visible = Object.keys(allDatasets)
        .filter(id => datasetVisibility[id])
        .map(id => allDatasets[id]);

    if (visible.length === 0) {
        weightChart.data.labels = [];   weightChart.data.datasets = [];
        flowTempChart.data.labels = []; flowTempChart.data.datasets = [];
        weightChart.update(); flowTempChart.update();
        return;
    }

    const longestDs = visible.reduce((best, d) => d.time.length > best.time.length ? d : best, visible[0]);
    const labels = longestDs.time;
    const maxTime = labels.length > 0 ? labels[labels.length - 1] : 0;

    // Force both charts to show the same x range (actual time values) so they stay visually aligned
    weightChart.options.scales.x.min = 0;
    weightChart.options.scales.x.max = maxTime;
    flowTempChart.options.scales.x.min = 0;
    flowTempChart.options.scales.x.max = maxTime;

    weightChart.data.labels = labels;
    weightChart.data.datasets = showWeight ? visible.map(d => ({
        datasetId: d.id,
        label: `${d.name} - Weight`, data: d.weight,
        borderColor: d.color, backgroundColor: `${d.color}20`,
        borderWidth: 2.5, fill: false, tension: 0.1, pointRadius: 0
    })) : [];

    // 99th-percentile cap for weight: monotonic cumulative data breaks IQR
    const allW = (showWeight ? visible.flatMap(d => d.weight || []) : [])
        .filter(v => typeof v === 'number' && isFinite(v));
    weightChart.options.scales.y.min = 0;
    if (allW.length >= 4) {
        const sortedW = [...allW].sort((a, b) => a - b);
        const p99 = sortedW[Math.min(sortedW.length - 1, Math.floor(sortedW.length * 0.99))];
        weightChart.options.scales.y.max = p99 * 1.08;
    } else {
        delete weightChart.options.scales.y.max;
    }
    weightChart.update();

    const ftDatasets = [];
    if (showFlow) visible.forEach(d => ftDatasets.push({
        datasetId: d.id,
        label: `${d.name} - Flow`, data: d.flow,
        borderColor: d.color, backgroundColor: `${d.color}20`,
        borderWidth: 1.5, fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
    }));
    if (showTemp) visible.forEach(d => ftDatasets.push({
        datasetId: d.id,
        label: `${d.name} - Temp`, data: d.temp,
        borderColor: d.color, backgroundColor: `${d.color}20`,
        borderWidth: 1.5, borderDash: [5,5], fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
    }));
    flowTempChart.data.labels   = labels;
    flowTempChart.data.datasets = ftDatasets;
    flowTempChart.options.scales.y.min = -20;
    flowTempChart.options.scales.y.max = 20;

    flowTempChart.update();
}
