/* ═══════════════════════════════════════════════════
   CHARTS — Chart.js initialization and update
   Depends on: state.js, constants.js
═══════════════════════════════════════════════════ */

const externalTooltipHandler = (context) => {
    const {chart, tooltip} = context;
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
        tooltipEl.style.pointerEvents = 'auto';
        tooltipEl.style.padding = '12px';
        tooltipEl.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        
        // Hide scrollbar but keep scroll functionality for aesthetics
        tooltipEl.style.scrollbarWidth = 'none'; // Firefox
        tooltipEl.style.msOverflowStyle = 'none';  // IE 10+
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
            // Use borderColor (solid) for the dot since backgroundColor may be semi-transparent
            const dotColor = colors.borderColor || colors.backgroundColor;
            const spanStyle = `background:${dotColor}; display:inline-block; width:10px; height:10px; margin-right:8px; vertical-align:top; margin-top:3px; border-radius:50%; flex-shrink:0;`;
            const span = `<span style="${spanStyle}"></span>`;

            // Combine label lines + afterLabel lines (b.after)
            const allLines = [
                ...bodyItem.lines,
                ...(bodyItem.after || [])
            ];
            const lines = allLines.join('<br/>').replace(/  ↳/g, '&nbsp;&nbsp;&nbsp;&nbsp;↳');
            innerHtml += `<div style="margin-bottom:6px; display:flex; align-items:flex-start;">${span}<div style="flex:1;">${lines}</div></div>`;
        });
        innerHtml += '</div>';

        tooltipEl.innerHTML = innerHtml;
    }

    const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;

    tooltipEl.style.opacity = 1;
    tooltipEl.style.pointerEvents = 'auto';
    tooltipEl.style.left = positionX + tooltip.caretX + 20 + 'px';
    
    // Attempt to vertically align around caretY but bound by canvas parent height
    let top = positionY + tooltip.caretY - tooltipEl.offsetHeight / 2;
    if (top < positionY) top = positionY;
    if (top + tooltipEl.offsetHeight > positionY + chart.canvas.offsetHeight) {
        top = positionY + chart.canvas.offsetHeight - tooltipEl.offsetHeight;
    }
    tooltipEl.style.top = top + 'px';
};

function initCharts() {
    const commonTooltip = {
        enabled: false, // Disable native tooltip
        external: externalTooltipHandler,
        callbacks: {
            title: ctx => `時間: ${ctx[0].label} 秒`,
            label: ctx => {
                const label = ctx.dataset.label || '';
                const val = Number(ctx.parsed.y).toFixed(2);
                return `${label}: ${val}`;
            },
            afterLabel: ctx => {
                const label = ctx.dataset.label || '';
                if (label.includes(' - Weight')) {
                    const dsId = ctx.dataset.datasetId;
                    const ds = allDatasets[dsId];
                    if (ds) {
                        const showFlow = document.getElementById('showFlow') ? document.getElementById('showFlow').checked : true;
                        const showTemp = document.getElementById('showTemp') ? document.getElementById('showTemp').checked : true;
                        
                        let lines = [];
                        const timeIdx = ctx.dataIndex;
                        if (showFlow && ds.flow && ds.flow[timeIdx] !== undefined) {
                            const f = Number(ds.flow[timeIdx]);
                            if (!isNaN(f)) lines.push(`  ↳ Flow: ${f.toFixed(2)}`);
                        }
                        if (showTemp && ds.temp && ds.temp[timeIdx] !== undefined) {
                            const t = Number(ds.temp[timeIdx]);
                            if (!isNaN(t)) lines.push(`  ↳ Temp: ${t.toFixed(2)}`);
                        }
                        return lines.length ? lines : null;
                    }
                }
                return null;
            }
        }
    };

    let crosshairIndex = null;

    const verticalHoverLinePlugin = {
        id: 'verticalHoverLine',
        afterDraw: chart => {
            let activeIdx = null;

            if (chart.tooltip?._active && chart.tooltip._active.length) {
                activeIdx = chart.tooltip._active[0].element.$context?.dataIndex ?? chart.tooltip._active[0].index;
            } else if (crosshairIndex !== null) {
                activeIdx = crosshairIndex;
            }

            if (activeIdx !== null) {
                let x = null;
                for (let i = 0; i < chart.data.datasets.length; i++) {
                    const meta = chart.getDatasetMeta(i);
                    if (meta && meta.data && meta.data[activeIdx]) {
                        x = meta.data[activeIdx].x;
                        break;
                    }
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
        }
    };

    const onHoverSync = (e, elements, chart) => {
        const newIdx = elements.length ? (elements[0].element?.$context?.dataIndex ?? elements[0].index) : null;
        if (crosshairIndex !== newIdx) {
            crosshairIndex = newIdx;
            if (chart.canvas.id === 'weightChart' && flowTempChart) flowTempChart.draw();
            if (chart.canvas.id === 'flowTempChart' && weightChart) weightChart.draw();
        }
    };

    weightChart = new Chart(document.getElementById('weightChart').getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [] },
        plugins: [verticalHoverLinePlugin],
        options: {
            onHover: onHoverSync,
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: true, position: 'top' }, tooltip: commonTooltip },
            layout: { padding: 0 },
            scales: {
                x: { title: { display: false }, grid: { color: 'rgba(0,0,0,0.08)' } },
                y: { title: { display: true, text: 'Weight (g)' }, grid: { color: 'rgba(0,0,0,0.08)' } }
            }
        }
    });

    const flowTempTooltip = Object.assign({}, commonTooltip, {
        callbacks: Object.assign({}, commonTooltip.callbacks, {
            afterLabel: ctx => {
                const label = ctx.dataset.label || '';
                const dsId = ctx.dataset.datasetId;
                const ds = allDatasets[dsId];
                if (!ds) return null;
                const timeIdx = ctx.dataIndex;
                const showWeight = document.getElementById('showWeight') ? document.getElementById('showWeight').checked : true;
                const showFlow   = document.getElementById('showFlow')   ? document.getElementById('showFlow').checked   : true;
                const showTemp   = document.getElementById('showTemp')   ? document.getElementById('showTemp').checked   : true;
                let lines = [];
                if (showWeight && ds.weight && ds.weight[timeIdx] !== undefined) {
                    const w = Number(ds.weight[timeIdx]);
                    if (!isNaN(w)) lines.push(`  ↳ Weight: ${w.toFixed(2)}`);
                }
                if (showFlow && label.includes(' - Temp') && ds.flow && ds.flow[timeIdx] !== undefined) {
                    const f = Number(ds.flow[timeIdx]);
                    if (!isNaN(f)) lines.push(`  ↳ Flow: ${f.toFixed(2)}`);
                }
                if (showTemp && label.includes(' - Flow') && ds.temp && ds.temp[timeIdx] !== undefined) {
                    const t = Number(ds.temp[timeIdx]);
                    if (!isNaN(t)) lines.push(`  ↳ Temp: ${t.toFixed(2)}`);
                }
                return lines.length ? lines : null;
            }
        })
    });

    flowTempChart = new Chart(document.getElementById('flowTempChart').getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [] },
        plugins: [verticalHoverLinePlugin],
        options: {
            onHover: onHoverSync,
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: true, position: 'top' }, tooltip: flowTempTooltip },
            layout: { padding: 0 },
            scales: {
                x: { title: { display: true, text: 'Time (s)' }, grid: { color: 'rgba(0,0,0,0.08)' } },
                y: { title: { display: true, text: 'Flow / Temp' }, grid: { color: 'rgba(0,0,0,0.08)' } }
            }
        }
    });

    const handleMouseOut = () => {
        crosshairIndex = null;
        if (weightChart) weightChart.draw();
        if (flowTempChart) flowTempChart.draw();
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

    const maxLen = visible.reduce((m, d) => Math.max(m, d.time.length), 0);
    const labels = Array.from({ length: maxLen }, (_, i) => i);

    weightChart.data.labels = labels;
    weightChart.data.datasets = showWeight ? visible.map(d => ({
        datasetId: d.id,
        label: `${d.name} - Weight`, data: d.weight,
        borderColor: d.color, backgroundColor: `${d.color}20`,
        borderWidth: 2.5, fill: false, tension: 0.1, pointRadius: 0
    })) : [];
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
    flowTempChart.update();
}
