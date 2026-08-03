// Uses globals: Chart (CDN)

let weightChart   = null;
let flowTempChart = null;

const externalTooltipHandler = (context) => {
  const { chart, tooltip } = context;
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
        const allLines = [...bodyItem.lines, ...(bodyItem.after || [])];
        const lines = allLines.join('<br/>').replace(/  - /g, '&nbsp;&nbsp;&nbsp;&nbsp;- ');
        innerHtml += `<div style="margin-bottom:6px; display:flex; align-items:flex-start;"><span style="${spanStyle}"></span><div style="flex:1;">${lines}</div></div>`;
      });
      innerHtml += '</div>';
      tooltipEl.innerHTML = innerHtml;
    }
    const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;
    tooltipEl.style.opacity = 1;
    tooltipEl.style.pointerEvents = 'auto';
    tooltipEl.style.left = positionX + tooltip.caretX + 20 + 'px';
    let top = positionY + tooltip.caretY - tooltipEl.offsetHeight / 2;
    if (top < positionY) top = positionY;
    if (top + tooltipEl.offsetHeight > positionY + chart.canvas.offsetHeight)
      top = positionY + chart.canvas.offsetHeight - tooltipEl.offsetHeight;
    tooltipEl.style.top = top + 'px';
  } else {
    const tooltipEl = document.getElementById('leftTooltipPanel');
    if (!tooltipEl) return;
    let mobileTooltip = chart.canvas.parentNode.querySelector('div.chartjs-tooltip');
    if (mobileTooltip) { mobileTooltip.style.opacity = 0; mobileTooltip.style.pointerEvents = 'none'; }
    if (tooltip.opacity === 0) {
      return; // Panel cleared by mouseleave handler
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
        const allLines = [...bodyItem.lines, ...(bodyItem.after || [])];
        const lines = allLines.join('<br/>').replace(/  - /g, '&nbsp;&nbsp;&nbsp;&nbsp;- ');
        innerHtml += `<div style="margin-bottom:6px; display:flex; align-items:flex-start;"><span style="${spanStyle}"></span><div style="flex:1;">${lines}</div></div>`;
      });
      innerHtml += '</div>';
      tooltipEl.innerHTML = innerHtml;
    }
  }
};

export function initCharts(datasetModel, getCheckboxValues) {
  const commonTooltip = {
    enabled: false,
    external: externalTooltipHandler,
    // One entry per dataset — afterLabel already lists every series for it,
    // so without this the whole block repeats once per drawn series.
    filter: (item, index, array) =>
      array.findIndex(i => i.dataset.datasetId === item.dataset.datasetId) === index,
    callbacks: {
      title: ctx => `時間: ${ctx[0].label} 秒`,
      label: ctx => ctx.dataset.dsName || ctx.dataset.label || '',
      afterLabel: ctx => {
        const ds = datasetModel.get(ctx.dataset.datasetId);
        if (!ds) return null;
        const timeIdx = ctx.dataIndex;
        const opts = getCheckboxValues();
        const lines = [];
        Object.values(SERIES_TYPES).forEach(spec => {
          if (!opts[spec.option]) return;
          const v = ds[spec.field]?.[timeIdx];
          if (v == null || isNaN(Number(v))) return;
          lines.push(`  - ${spec.label} (${spec.zh}): ${Number(v).toFixed(2)}`);
          if (spec.field === 'weight') {
            const bw = parseFloat(ds.beanWeight);
            if (bw && isFinite(bw)) lines.push(`  - 水粉比: ${(Number(v) / bw).toFixed(2)}`);
          }
        });
        return lines.length ? lines : null;
      }
    }
  };

  let crosshairIndex   = null;
  let isTooltipPinned  = false;
  let pinnedIndex      = null;

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
          ctx.fillStyle = ds.borderColor; ctx.fill();
        } else {
          ctx.fillStyle = 'white'; ctx.strokeStyle = ds.borderColor; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      });
    }
  };

  const freezeInteractionPlugin = {
    id: 'freezeInteraction',
    beforeEvent(chart, args) {
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
      if (activeIdx === null || !chart.scales.x) return;
      const lbl = chart.data.labels?.[activeIdx];
      if (lbl === undefined) return;
      const x = chart.scales.x.getPixelForValue(lbl);
      const ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, chart.scales.y.top);
      ctx.lineTo(x, chart.scales.y.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    }
  };

  // Badge color: use the dataset's own borderColor (strip alpha suffix)
  const getBadgeColor = (label, ds) => {
    const c = ds?.borderColor;
    if (typeof c === 'string' && c.startsWith('#')) return c.slice(0, 7);
    return '#555';
  };

  // Draws horizontal dashed lines + badges on both Y-axes for all visible datasets on hover
  const horizontalRatioLinePlugin = {
    id: 'horizontalRatioLine',
    afterDraw: chart => {
      const activeIdx = isTooltipPinned ? pinnedIndex : crosshairIndex;
      if (activeIdx === null || !chart.scales.y) return;

      const ctx    = chart.ctx;
      const yScale = chart.scales.y;
      const xLeft  = chart.chartArea.left;
      const xRight = chart.chartArea.right;
      const yRatioScale   = chart.scales.yRatio;
      const labelAreaLeft = yRatioScale ? yRatioScale.left : xRight + 2;
      const BH = 16, PH = 4, GAP = 2;

      const drawBadge = (text, x, y, bgColor, alignRight = false) => {
        ctx.font = 'bold 11px sans-serif';
        const tw = ctx.measureText(text).width;
        const bx = alignRight ? x - tw - PH * 2 - 2 : x + 2;
        ctx.fillStyle = bgColor;
        ctx.fillRect(bx, y - BH / 2, tw + PH * 2, BH);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bx + PH, y);
      };

      // First pass: collect values per series type for right-side stacking.
      // Weight-C/Weight-D get badges at their own y; Weight-W separately.
      const weightEntries = [];   // { value, y, bw }
      const adc2Entries   = [];   // { value, y }

      chart.data.datasets.forEach((ds, i) => {
        if (!chart.isDatasetVisible(i)) return;
        const value = ds.data?.[activeIdx];
        if (value == null || !isFinite(value)) return;
        const isWeight = ds.seriesKey === 'weight';
        const bw = parseFloat(ds.beanWeight) ||
          parseFloat(datasetModel.get?.(ds.datasetId)?.beanWeight) || 0;
        const y = yScale.getPixelForValue(value);
        const badgeColor = getBadgeColor(ds.label, ds);
        const lineColor  = ds.borderColor || badgeColor;

        ctx.save();

        // Horizontal dashed line (same color as the line itself)
        ctx.beginPath();
        ctx.moveTo(xLeft, y);
        ctx.lineTo(xRight, y);
        ctx.lineWidth = 1;
        ctx.strokeStyle = lineColor;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Left axis badge
        drawBadge(`${value.toFixed(1)}g`, xLeft, y, badgeColor, true);

        if (isWeight) {
          weightEntries.push({ value, y, bw, badgeColor });
        } else if (ds.seriesKey === 'adc2') {
          adc2Entries.push({ value, y, badgeColor });
        } else {
          // Weight-C — right badge at actual y position
          if (bw && isFinite(bw)) drawBadge((value / bw).toFixed(1), labelAreaLeft, y, badgeColor, false);
        }

        ctx.restore();
      });

      // Whether Weight-C is visible determines where the Weight-D badge sits
      const hasVisibleAdc1 = chart.data.datasets.some((ds, i) =>
        chart.isDatasetVisible(i) && ds.seriesKey === 'adc1'
      );

      // Right-axis: weight badges at their y positions
      weightEntries.forEach(({ value, y, bw, badgeColor }) => {
        ctx.save();
        if (bw && isFinite(bw)) drawBadge((value / bw).toFixed(1), labelAreaLeft, y, badgeColor, false);
        ctx.restore();
      });

      // Right-axis: adc2 badges
      // If adc1 is also visible → stack below weight badge
      // If no adc1 (adc2 alone with weight) → draw at actual y position like adc1
      if (adc2Entries.length) {
        const bw = parseFloat(datasetModel.getVisible?.()?.find(d => d.adc2)?.beanWeight) || 0;
        if (hasVisibleAdc1 && weightEntries.length) {
          const baseY = weightEntries[0].y + BH / 2 + GAP;
          adc2Entries.forEach(({ value, badgeColor }, idx) => {
            const ry = baseY + idx * (BH + GAP) + BH / 2;
            ctx.save();
            if (bw && isFinite(bw)) drawBadge((value / bw).toFixed(1), labelAreaLeft, ry, badgeColor, false);
            else drawBadge(value.toFixed(1), labelAreaLeft, ry, badgeColor, false);
            ctx.restore();
          });
        } else {
          // No adc1 → same as adc1 logic: badge at actual y position
          adc2Entries.forEach(({ value, y, badgeColor }) => {
            ctx.save();
            if (bw && isFinite(bw)) drawBadge((value / bw).toFixed(1), labelAreaLeft, y, badgeColor, false);
            else drawBadge(value.toFixed(1), labelAreaLeft, y, badgeColor, false);
            ctx.restore();
          });
        }
      }
    }
  };

  // Left Y-axis value badge for flowTempChart (no horizontal line)
  const flowLeftBadgePlugin = {
    id: 'flowLeftBadge',
    afterDraw: chart => {
      const activeIdx = isTooltipPinned ? pinnedIndex : crosshairIndex;
      if (activeIdx === null || !chart.scales.y) return;
      const ctx    = chart.ctx;
      const xLeft  = chart.chartArea.left;
      const BH = 16, PH = 4;

      chart.data.datasets.forEach((ds, i) => {
        if (!chart.isDatasetVisible(i)) return;
        const value = ds.data?.[activeIdx];
        if (value == null || !isFinite(value)) return;
        // Temperature series live on the right-hand axis — read the pixel from
        // the scale the dataset is actually plotted against.
        const yScale = chart.scales[ds.yAxisID] || chart.scales.y;
        const y = yScale.getPixelForValue(value);
        const color = ds.borderColor || '#555';
        ctx.save();
        ctx.font = 'bold 11px sans-serif';
        const text = value.toFixed(2);
        const tw = ctx.measureText(text).width;
        const bx = xLeft - tw - PH * 2 - 2;
        ctx.fillStyle = color;
        ctx.fillRect(bx, y - BH / 2, tw + PH * 2, BH);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bx + PH, y);
        ctx.restore();
      });
    }
  };

  const syncBothCharts = (newIdx, sourceChart, pos) => {
    [weightChart, flowTempChart].forEach(chart => {
      if (!chart) return;
      const elements = [];
      if (newIdx !== null) {
        chart.data.datasets.forEach((ds, i) => {
          if (!chart.isDatasetVisible(i)) return;
          if (ds.data && ds.data[newIdx] !== undefined && ds.data[newIdx] !== null)
            elements.push({ datasetIndex: i, index: newIdx });
        });
      }
      chart.setActiveElements(elements);
      if (chart === sourceChart) {
        chart.tooltip.setActiveElements(elements, pos || { x: 0, y: 0 });
      } else {
        chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      }
      chart.update('none');
    });
  };

  const handleChartMouseMove = (e, chart) => {
    if (isTooltipPinned) return;
    const rect = chart.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartArea = chart.chartArea;
    const labels = chart.data.labels;
    if (!labels || !labels.length || !chartArea) return;
    if (mouseX < chartArea.left || mouseX > chartArea.right) {
      if (crosshairIndex !== null) { crosshairIndex = null; syncBothCharts(null, chart, null); }
      return;
    }
    const ratio = (mouseX - chartArea.left) / (chartArea.right - chartArea.left);
    const newIdx = Math.min(labels.length - 1, Math.max(0, Math.round(ratio * (labels.length - 1))));
    if (crosshairIndex !== newIdx) {
      crosshairIndex = newIdx;
      syncBothCharts(newIdx, chart, { x: mouseX, y: e.clientY - rect.top });
    }
  };

  const handleChartMouseLeave = () => {
    if (isTooltipPinned) return;
    crosshairIndex = null;
    [weightChart, flowTempChart].forEach(chart => {
      if (!chart) return;
      chart.setActiveElements([]);
      chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      chart.update('none');
    });
    const tooltipEl = document.getElementById('leftTooltipPanel');
    if (tooltipEl) tooltipEl.innerHTML = '<div style="color:#888;text-align:center;margin-top:20px;">游標移至圖表以顯示詳細數據</div>';
  };

  // Top-right legend: one entry per data type on this chart, drawn with that
  // type's line style. Colour is reserved for dataset identity, so the samples
  // are neutral — the style is what tells the types apart.
  const seriesLegendPlugin = {
    id: 'seriesLegend',
    afterDraw: chart => {
      const seen = new Map();
      chart.data.datasets.forEach((ds, i) => {
        if (!chart.isDatasetVisible(i) || !ds.seriesKey) return;
        if (!seen.has(ds.seriesKey)) seen.set(ds.seriesKey, ds);
      });
      if (!seen.size) return;

      const ctx  = chart.ctx;
      const area = chart.chartArea;
      const lineW = 18, ph = 5, bh = 16, gap = 4, rowGap = 3;
      ctx.save();
      ctx.font = 'bold 11px sans-serif';

      // Lay entries out right-to-left, wrapping onto a new row when needed
      const entries = [...seen.values()].map(ds => {
        const label = ds.seriesLabel || ds.seriesKey;
        return { ds, label, width: lineW + gap + ctx.measureText(label).width + ph * 2 };
      });

      const maxRowW = area.right - area.left;
      const rows = [[]];
      let rowW = 0;
      entries.forEach(e => {
        if (rowW + e.width + gap > maxRowW && rows[rows.length - 1].length) {
          rows.push([]); rowW = 0;
        }
        rows[rows.length - 1].push(e);
        rowW += e.width + gap;
      });

      let y = area.top + ph;
      rows.forEach(row => {
        let x = area.right - ph;
        [...row].reverse().forEach(({ ds, label, width }) => {
          x -= width;
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillRect(x, y, width, bh);

          ctx.beginPath();
          ctx.strokeStyle = '#444';
          ctx.lineWidth = ds.borderWidth || 2;
          ctx.setLineDash(ds.borderDash?.length ? ds.borderDash : []);
          ctx.moveTo(x + ph, y + bh / 2);
          ctx.lineTo(x + ph + lineW, y + bh / 2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#333';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, x + ph + lineW + gap, y + bh / 2);
          x -= gap;
        });
        y += bh + rowGap;
      });

      ctx.restore();
    }
  };

  weightChart = new Chart(document.getElementById('weightChart').getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [] },
    plugins: [verticalHoverLinePlugin, freezeInteractionPlugin, pinnedMarkerPlugin, horizontalRatioLinePlugin, seriesLegendPlugin],
    options: {
      events: ['click'],
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: commonTooltip },
      layout: { padding: { right: 10 } },
      scales: {
        x: { title: { display: false }, grid: { color: 'rgba(0,0,0,0.08)' } },
        y: { afterFit(s) { s.width = 60; }, title: { display: true, text: 'Weight (g)' }, grid: { color: 'rgba(0,0,0,0.08)' } },
        yRatio: {
          type: 'linear',
          position: 'right',
          display: false,
          title: { display: true, text: '水粉比' },
          grid: { drawOnChartArea: false },
          afterFit(s) { s.width = 55; }
        }
      }
    }
  });

  flowTempChart = new Chart(document.getElementById('flowTempChart').getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [] },
    plugins: [verticalHoverLinePlugin, freezeInteractionPlugin, pinnedMarkerPlugin, flowLeftBadgePlugin, seriesLegendPlugin],
    options: {
      events: ['click'],
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: commonTooltip },
      layout: { padding: 0 },
      scales: {
        x: { title: { display: true, text: 'Time (s)' }, grid: { color: 'rgba(0,0,0,0.08)' } },
        y: { min: -5, max: 15, afterFit(s) { s.width = 60; }, title: { display: true, text: 'Flow / Temp' }, grid: { color: 'rgba(0,0,0,0.08)' } },
        yRight: {
          type: 'linear', position: 'right', display: true,
          ticks: { display: false }, grid: { drawOnChartArea: false },
          afterFit(s) { s.width = 55; }
        }
      }
    }
  });

  document.getElementById('weightChart').addEventListener('mousemove', e => handleChartMouseMove(e, weightChart));
  document.getElementById('flowTempChart').addEventListener('mousemove', e => handleChartMouseMove(e, flowTempChart));
  document.getElementById('weightChart').addEventListener('mouseleave', handleChartMouseLeave);
  document.getElementById('flowTempChart').addEventListener('mouseleave', handleChartMouseLeave);
}

export function updateCharts(datasetModel, displayOptions = {}) {
  if (!weightChart || !flowTempChart) return;

  // Any option left unspecified defaults to visible
  const opts = {};
  Object.values(SERIES_TYPES).forEach(spec => {
    opts[spec.option] = displayOptions[spec.option] ?? true;
  });

  const visible = datasetModel.getVisible();

  if (visible.length === 0) {
    weightChart.data.labels = [];   weightChart.data.datasets = [];
    flowTempChart.data.labels = []; flowTempChart.data.datasets = [];
    weightChart.update(); flowTempChart.update();
    return;
  }

  const longestDs = visible.reduce((best, d) => d.time.length > best.time.length ? d : best, visible[0]);
  const labels = longestDs.time;
  const maxTime = labels.length > 0 ? labels[labels.length - 1] : 0;

  weightChart.options.scales.x.min = 0; weightChart.options.scales.x.max = maxTime;
  flowTempChart.options.scales.x.min = 0; flowTempChart.options.scales.x.max = maxTime;

  // Build one Chart.js dataset per (dataset × series type).
  // Colour = which brew it is; line style/width = which measurement it is.
  const buildSeries = (keys) => {
    const out = [];
    keys.forEach(key => {
      const spec = SERIES_TYPES[key];
      if (!spec || !opts[spec.option]) return;
      visible.forEach(d => {
        const data = d[spec.field];
        if (!data?.length) return;
        out.push({
          datasetId: d.id,
          dsName:    d.name,
          seriesKey: key,
          seriesLabel: spec.label,
          label: `${d.name} - ${spec.label}`,
          data,
          beanWeight: parseFloat(d.beanWeight) || null,
          borderColor: d.color,
          backgroundColor: spec.fill ? `${d.color}22` : `${d.color}20`,
          borderWidth: spec.width,
          borderDash: spec.dash,
          fill: spec.fill ? 'origin' : false,
          tension: 0.1,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: spec.axis
        });
      });
    });
    return out;
  };

  const axisValues = (datasets, axisId) =>
    datasets.filter(ds => ds.yAxisID === axisId).flatMap(ds => ds.data || []);

  const applyRange = (scale, values) => {
    const range = fitAxisRange(values, AXIS_FILL_RATIO);
    if (range) { scale.min = range.min; scale.max = range.max; }
    else { delete scale.min; delete scale.max; }
    return range;
  };

  // ── Weight chart ──────────────────────────────────────────────────────────
  const weightDatasets = buildSeries(WEIGHT_CHART_SERIES);
  weightChart.data.labels   = labels;
  weightChart.data.datasets = weightDatasets;

  const wRange = applyRange(weightChart.options.scales.y, axisValues(weightDatasets, 'y'));

  // yRatio stays displayed to reserve the gutter the hover badges draw into
  const beanWeights = visible.map(d => parseFloat(d.beanWeight)).filter(bw => bw > 0 && isFinite(bw));
  const yRatio = weightChart.options.scales.yRatio;
  yRatio.display = true;
  if (beanWeights.length && wRange) {
    const minBW = Math.min(...beanWeights);
    yRatio.min = wRange.min / minBW;
    yRatio.max = wRange.max / minBW;
    yRatio.ticks = { display: true };
    yRatio.title = { display: true, text: '水粉比' };
  } else {
    delete yRatio.min; delete yRatio.max;
    yRatio.ticks = { display: false };
    yRatio.title = { display: false };
  }
  weightChart.update();

  // ── Flow / temperature chart ──────────────────────────────────────────────
  const ftDatasets = buildSeries(FLOW_CHART_SERIES);
  flowTempChart.data.labels   = labels;
  flowTempChart.data.datasets = ftDatasets;

  applyRange(flowTempChart.options.scales.y, axisValues(ftDatasets, 'y'));

  // Right axis carries ℃ only while a temperature series is drawn; otherwise it
  // stays blank and merely reserves the gutter used by the hover badges.
  const tempValues = axisValues(ftDatasets, 'yRight');
  const yRight = flowTempChart.options.scales.yRight;
  if (tempValues.length) {
    applyRange(yRight, tempValues);
    yRight.ticks = { display: true };
    yRight.title = { display: true, text: 'Temp (℃)' };
  } else {
    delete yRight.min; delete yRight.max;
    yRight.ticks = { display: false };
    yRight.title = { display: false };
  }
  flowTempChart.update();
}

export function getChartInstances() { return { weightChart, flowTempChart }; }
