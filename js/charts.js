/* ═══════════════════════════════════════════════════
   CHARTS — Chart.js initialization and update
   Depends on: state.js, constants.js
═══════════════════════════════════════════════════ */

function initCharts() {
    const commonTooltip = {
        enabled: true,
        backgroundColor: 'rgba(0,0,0,0.88)',
        titleFont: { size: 14 },
        bodyFont:  { size: 12 },
        padding: 12,
        displayColors: true,
        callbacks: {
            title: ctx => `時間: ${ctx[0].label} 秒`,
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}`
        }
    };

    weightChart = new Chart(document.getElementById('weightChart').getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: true, position: 'top' }, tooltip: commonTooltip },
            scales: {
                x: { title: { display: false }, grid: { color: 'rgba(0,0,0,0.08)' } },
                y: { title: { display: true, text: 'Weight (g)' }, grid: { color: 'rgba(0,0,0,0.08)' } }
            }
        }
    });

    flowTempChart = new Chart(document.getElementById('flowTempChart').getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: true, position: 'top' }, tooltip: commonTooltip },
            scales: {
                x: { title: { display: true, text: 'Time (s)' }, grid: { color: 'rgba(0,0,0,0.08)' } },
                y: { title: { display: true, text: 'Flow / Temp' }, grid: { color: 'rgba(0,0,0,0.08)' } }
            }
        }
    });
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
        label: `${d.name} - Weight`, data: d.weight,
        borderColor: d.color, backgroundColor: `${d.color}20`,
        borderWidth: 2.5, fill: false, tension: 0.1, pointRadius: 0
    })) : [];
    weightChart.update();

    const ftDatasets = [];
    if (showFlow) visible.forEach(d => ftDatasets.push({
        label: `${d.name} - Flow`, data: d.flow,
        borderColor: d.color, backgroundColor: `${d.color}20`,
        borderWidth: 1.5, fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
    }));
    if (showTemp) visible.forEach(d => ftDatasets.push({
        label: `${d.name} - Temp`, data: d.temp,
        borderColor: d.color, backgroundColor: `${d.color}20`,
        borderWidth: 1.5, borderDash: [5,5], fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
    }));
    flowTempChart.data.labels   = labels;
    flowTempChart.data.datasets = ftDatasets;
    flowTempChart.update();
}
