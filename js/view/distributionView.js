// ES Module — Distribution chart view
// Uses globals: Chart (CDN)

let distributionChart = null;

// ── Private helpers ──────────────────────────────────────────────────────────

function filterByStd(diameters, n = 2) {
  if (!diameters.length) return [];
  const sorted = [...diameters].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  const mean = diameters.reduce((s, v) => s + v, 0) / diameters.length;
  const variance = diameters.reduce((s, v) => s + (v - mean) ** 2, 0) / diameters.length;
  const std = Math.sqrt(variance);

  const lower = median - n * std;
  const upper = median + n * std;
  return diameters.filter(d => d >= lower && d <= upper);
}

function makeBins(xMin, xMax, interval) {
  const edges = [];
  let v = xMin;
  while (v <= xMax + 1e-9) {
    edges.push(v);
    v = Math.round((v + interval) * 1e10) / 1e10;
  }

  const labels = [`<${xMin}`];
  for (let i = 0; i < edges.length - 1; i++) {
    labels.push(`${edges[i]}-${edges[i + 1]}`);
  }
  labels.push(`>${xMax}`);

  return { edges, labels };
}

function computeBinsDiameter(diameters, edges) {
  const xMin = edges[0];
  const xMax = edges[edges.length - 1];
  const interval = edges[1] - edges[0];
  const numBins = edges.length + 1; // includes <min and >max overflow bins

  const counts = new Array(numBins).fill(0);
  for (const d of diameters) {
    if (d < xMin) {
      counts[0]++;
    } else if (d >= xMax) {
      counts[numBins - 1]++;
    } else {
      let idx = Math.floor((d - xMin) / interval) + 1;
      idx = Math.min(idx, numBins - 2);
      counts[idx]++;
    }
  }

  const total = counts.reduce((s, c) => s + c, 0) || 1;
  const percents = counts.map(c => (c / total) * 100);

  const cumPercents = [];
  let acc = 0;
  for (const p of percents) {
    acc += p;
    cumPercents.push(Math.round(acc * 100) / 100);
  }

  return { percents, cumPercents };
}

function computeBinsWeight(diameters, edges) {
  const xMin = edges[0];
  const xMax = edges[edges.length - 1];
  const interval = edges[1] - edges[0];
  const numBins = edges.length + 1;

  const weightPerBin = new Array(numBins).fill(0);
  for (const d of diameters) {
    const w = d ** 3;
    if (d < xMin) {
      weightPerBin[0] += w;
    } else if (d >= xMax) {
      weightPerBin[numBins - 1] += w;
    } else {
      let idx = Math.floor((d - xMin) / interval) + 1;
      idx = Math.min(idx, numBins - 2);
      weightPerBin[idx] += w;
    }
  }

  const totalWeight = weightPerBin.reduce((s, w) => s + w, 0) || 1;
  const percents = weightPerBin.map(w => (w / totalWeight) * 100);

  const cumPercents = [];
  let acc = 0;
  for (const p of percents) {
    acc += p;
    cumPercents.push(Math.round(acc * 100) / 100);
  }

  return { percents, cumPercents };
}

// ── Exported functions ────────────────────────────────────────────────────────

export function initDistributionChart() {
  if (distributionChart) {
    distributionChart.destroy();
    distributionChart = null;
  }

  const canvas = document.getElementById('distributionChart');
  if (!canvas) return;

  distributionChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          title: { display: true, text: 'Diameter (µm)' },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Percent (%)' },
          grid: { color: 'rgba(0,0,0,0.06)' },
          beginAtZero: true
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Cumulative (%)' },
          min: 0,
          max: 115,
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

export function updateDistributionChart(
  particleModel,
  { mode = 'diameter', xMin = 200, xMax = 1200, interval = 100 } = {}
) {
  if (!distributionChart) return;

  const visible = particleModel.getVisible();
  const { edges, labels } = makeBins(xMin, xMax, interval);

  const chartDatasets = [];
  let maxPercent = 0;

  for (const ds of visible) {
    const filtered = filterByStd(ds.diameters);
    const { percents, cumPercents } =
      mode === 'weight'
        ? computeBinsWeight(filtered, edges)
        : computeBinsDiameter(filtered, edges);

    const peak = Math.max(...percents);
    if (peak > maxPercent) maxPercent = peak;

    const barColor = ds.color + '99';

    chartDatasets.push({
      type: 'bar',
      label: `${ds.name} %`,
      data: percents,
      backgroundColor: barColor,
      borderColor: ds.color,
      borderWidth: 1,
      yAxisID: 'y',
      order: 2
    });

    chartDatasets.push({
      type: 'line',
      label: `${ds.name} cum%`,
      data: cumPercents,
      borderColor: ds.color,
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.1,
      yAxisID: 'y1',
      order: 1
    });
  }

  distributionChart.data.labels = labels;
  distributionChart.data.datasets = chartDatasets;
  distributionChart.options.scales.y.max = maxPercent * 1.3 + 2;
  distributionChart.update();
}

export function renderDistDatasetList(particleModel, callbacks) {
  const container = document.getElementById('distDatasetList');
  if (!container) return;
  container.innerHTML = '';

  const ids = particleModel.getIds().slice().reverse();
  for (const id of ids) {
    const ds = particleModel.get(id);
    const isVisible = particleModel.isVisible(id);

    const item = document.createElement('div');
    item.className = `dataset-item${isVisible ? '' : ' disabled'}`;
    item.style.borderLeftColor = ds.color;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'dataset-checkbox';
    cb.checked = isVisible;
    cb.dataset.distToggle = id;
    cb.addEventListener('change', e => {
      e.stopPropagation();
      callbacks.onToggle(id);
    });

    const dot = document.createElement('div');
    dot.className = 'dataset-color';
    dot.style.backgroundColor = ds.color;

    const lbl = document.createElement('div');
    lbl.className = 'dataset-label';
    lbl.textContent = ds.name;
    lbl.style.overflow = 'hidden';
    lbl.style.textOverflow = 'ellipsis';
    lbl.style.whiteSpace = 'nowrap';

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.innerHTML = '🗑';
    del.title = '刪除';
    del.dataset.distDelete = id;
    del.addEventListener('click', e => {
      e.stopPropagation();
      callbacks.onDelete(id);
    });

    item.appendChild(cb);
    item.appendChild(dot);
    item.appendChild(lbl);
    item.appendChild(del);
    container.appendChild(item);
  }
}

export function downloadDistributionChart(filename = 'distribution.png') {
  if (!distributionChart) return;
  const url = distributionChart.toBase64Image();
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
