// ES Module — Distribution chart view
// Uses globals: Chart (CDN)

let distributionChart = null;

// ── Zone band state (shared between plugin and updateDistributionChart) ────────
// Each entry: { color: string, fromIdx: number, toIdx: number }
let _zoneBands = [];

/**
 * Plugin: draws semi-transparent zone background bands BEFORE bars are painted.
 * Active only in multi-dataset mode (when _zoneBands is populated).
 * Also draws a subtle dashed vertical line at each zone boundary.
 */
const zoneBandPlugin = {
  id: 'zoneBand',
  beforeDatasetsDraw(chart) {
    if (!_zoneBands.length) return;
    const labels = chart.data.labels;
    if (!labels || !labels.length) return;

    const { left, top, bottom, width } = chart.chartArea;
    const binW = width / labels.length;
    const ctx  = chart.ctx;

    // 1. Coloured background fills
    _zoneBands.forEach(({ color, fromIdx, toIdx }) => {
      ctx.save();
      ctx.fillStyle = color + '28';   // ~16 % opacity — subtle background
      ctx.fillRect(left + fromIdx * binW, top, (toIdx - fromIdx + 1) * binW, bottom - top);
      ctx.restore();
    });

    // 2. Dashed vertical line at each zone boundary (skip the first band)
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    _zoneBands.forEach(({ fromIdx }, i) => {
      if (i === 0) return;
      const x = left + fromIdx * binW;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
  }
};

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

/**
 * Return the zone color for a given bin based on its cumulative % midpoint.
 * Zones are sorted ascending; we iterate until midCum < zone.to.
 * The last zone is always the catch-all.
 * @param {number} binIndex
 * @param {number[]} cumPercents  - cumulative % array (same length as bins)
 * @param {Array<{from,to,color}>} zones
 * @returns {string|null}  hex color, or null if zones is empty
 */
function getZoneColor(binIndex, cumPercents, zones) {
  if (!zones || !zones.length) return null;
  const prev   = binIndex === 0 ? 0 : cumPercents[binIndex - 1];
  const curr   = cumPercents[binIndex];
  const midCum = (prev + curr) / 2;
  for (let j = 0; j < zones.length - 1; j++) {
    if (midCum < zones[j].to) return zones[j].color;
  }
  return zones[zones.length - 1].color;
}

// ── Exported functions ────────────────────────────────────────────────────────

export function initDistributionChart() {
  if (distributionChart) {
    distributionChart.destroy();
    distributionChart = null;
  }
  _zoneBands = [];   // reset bands when chart is recreated

  const canvas = document.getElementById('distributionChart');
  if (!canvas) return;

  distributionChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels: [], datasets: [] },
    plugins: [zoneBandPlugin],
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
  { mode = 'diameter', xMin = 200, xMax = 1200, interval = 100,
    showBars = true, showCumulative = true, zones = [] } = {}
) {
  if (!distributionChart) return;

  const visible = particleModel.getVisible();
  const { edges, labels } = makeBins(xMin, xMax, interval);

  // ── Mode: single dataset vs. multiple ──────────────────────────────────────
  // Single  → bars coloured by zone (current behaviour)
  // Multiple → bars coloured by dataset; zone bands drawn in background by plugin
  const isMulti = visible.length >= 2;

  // ── Pre-compute cumPercents for all datasets (needed for band calculation) ──
  const allCumPercents = visible.map(ds => {
    const filtered = filterByStd(ds.diameters);
    return (mode === 'weight'
      ? computeBinsWeight(filtered, edges)
      : computeBinsDiameter(filtered, edges)
    ).cumPercents;
  });

  // ── Build zone bands for multi-dataset mode ─────────────────────────────────
  if (isMulti && zones.length && allCumPercents.length) {
    const numBins = allCumPercents[0].length;
    // Average cumulative % across all visible datasets
    const avgCum = Array.from({ length: numBins }, (_, i) =>
      allCumPercents.reduce((s, c) => s + (c[i] ?? 0), 0) / allCumPercents.length
    );
    // Group consecutive same-zone bins into bands
    _zoneBands = [];
    let bandColor = getZoneColor(0, avgCum, zones);
    let bandStart = 0;
    for (let i = 1; i < numBins; i++) {
      const zc = getZoneColor(i, avgCum, zones);
      if (zc !== bandColor) {
        _zoneBands.push({ color: bandColor, fromIdx: bandStart, toIdx: i - 1 });
        bandColor = zc;
        bandStart = i;
      }
    }
    _zoneBands.push({ color: bandColor, fromIdx: bandStart, toIdx: numBins - 1 });
  } else {
    _zoneBands = [];
  }

  // ── Build chart datasets ────────────────────────────────────────────────────
  const chartDatasets = [];
  let maxPercent = 0;

  visible.forEach((ds, di) => {
    const filtered = filterByStd(ds.diameters);
    const { percents } = mode === 'weight'
      ? computeBinsWeight(filtered, edges)
      : computeBinsDiameter(filtered, edges);
    const cumPercents = allCumPercents[di];

    const peak = Math.max(...percents);
    if (peak > maxPercent) maxPercent = peak;

    if (showBars) {
      let bgColors, borderColors;

      if (!isMulti && zones.length) {
        // Single dataset: each bar takes its zone colour
        bgColors     = percents.map((_, i) => (getZoneColor(i, cumPercents, zones) ?? ds.color) + 'AA');
        borderColors = percents.map((_, i) =>  getZoneColor(i, cumPercents, zones) ?? ds.color);
      } else {
        // Multiple datasets: use dataset colour so each series is identifiable
        bgColors     = ds.color + '99';
        borderColors = ds.color;
      }

      chartDatasets.push({
        type: 'bar',
        label: `${ds.name} %`,
        data: percents,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1,
        yAxisID: 'y',
        order: 2
      });
    }

    if (showCumulative) {
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
  });

  distributionChart.data.labels   = labels;
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
