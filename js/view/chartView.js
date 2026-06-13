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
    callbacks: {
      title: ctx => `時間: ${ctx[0].label} 秒`,
      label: ctx => {
        const label = ctx.dataset.label || '';
        return label.replace(' - Weight', '').replace(' - Pour Water Flow', '').replace(' - Brew Flow', '').replace(' - Temp', '').replace(' - adc1 下壺', ' - 下壺').replace(' - adc2 濾杯', ' - 濾杯');
      },
      afterLabel: ctx => {
        const dsId = ctx.dataset.datasetId;
        const ds = datasetModel.get(dsId);
        if (!ds) return null;
        const timeIdx = ctx.dataIndex;
        const opts = getCheckboxValues();
        const lines = [];
        if (opts.showWeight && ds.weight?.[timeIdx] !== undefined) {
          const w = Number(ds.weight[timeIdx]);
          if (!isNaN(w)) {
            lines.push(`  - weight: ${w.toFixed(2)}`);
            const bw = parseFloat(ds.beanWeight);
            if (bw && isFinite(bw)) lines.push(`  - 水粉比: ${(w / bw).toFixed(2)}`);
          }
        }
        if (opts.showFlow && ds.flow?.[timeIdx] !== undefined) {
          const f = Number(ds.flow[timeIdx]);
          if (!isNaN(f)) lines.push(`  - pour water flow: ${f.toFixed(2)}`);
        }
        if (opts.showBrewFlow && ds.bflow?.[timeIdx] !== undefined) {
          const bf = Number(ds.bflow[timeIdx]);
          if (!isNaN(bf)) lines.push(`  - brew flow: ${bf.toFixed(2)}`);
        }
        if (opts.showTemp && ds.temp?.[timeIdx] !== undefined) {
          const t = Number(ds.temp[timeIdx]);
          if (!isNaN(t)) lines.push(`  - tmp: ${t.toFixed(2)}`);
        }
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

      // First pass: collect values per dataset type for right-side stacking
      // Order: adc1, adc2 at their y positions; weight separately, adc2 right badge below weight
      const weightEntries = [];   // { value, y, bw }
      const adc2Entries   = [];   // { value, y }

      chart.data.datasets.forEach((ds, i) => {
        if (!chart.isDatasetVisible(i)) return;
        const value = ds.data?.[activeIdx];
        if (value == null || !isFinite(value)) return;
        const isWeight = !ds.label?.includes('adc1') && !ds.label?.includes('adc2');
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
        } else if (ds.label?.includes('adc2')) {
          // Use rawData for badge value when adc2 is stacked on top of adc1
          const rawValue = ds.rawData ? (ds.rawData[activeIdx] ?? value) : value;
          adc2Entries.push({ value: rawValue, y, badgeColor, isStacked: !!ds.isStacked });
        } else {
          // adc1 — right badge at actual y position
          if (bw && isFinite(bw)) drawBadge((value / bw).toFixed(1), labelAreaLeft, y, badgeColor, false);
        }

        ctx.restore();
      });

      // Check if any adc1 dataset is visible (determines adc2 right-badge placement)
      const hasVisibleAdc1 = chart.data.datasets.some((ds, i) =>
        chart.isDatasetVisible(i) && ds.label?.includes('adc1')
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
      const yScale = chart.scales.y;
      const xLeft  = chart.chartArea.left;
      const BH = 16, PH = 4;

      chart.data.datasets.forEach((ds, i) => {
        if (!chart.isDatasetVisible(i)) return;
        const value = ds.data?.[activeIdx];
        if (value == null || !isFinite(value)) return;
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

  // Draws a color legend for adc1 / adc2 in the top-right of the weight chart
  const adcLegendPlugin = {
    id: 'adcLegend',
    afterDraw: chart => {
      const adcDs = chart.data.datasets.filter(ds =>
        ds.label?.includes('adc1') || ds.label?.includes('adc2')
      );
      if (!adcDs.length) return;

      const ctx  = chart.ctx;
      const area = chart.chartArea;
      const lineW = 20, ph = 6, bh = 18, gap = 4;
      ctx.save();
      ctx.font = 'bold 11px sans-serif';

      let x = area.right - ph;
      let y = area.top + ph;

      // Draw entries right-aligned, newest first
      [...adcDs].reverse().forEach(ds => {
        const label = ds.label?.includes('adc1') ? '下壺' : '濾杯';
        const tw = ctx.measureText(label).width;
        const entryW = lineW + gap + tw + ph * 2;
        x -= entryW;

        // Background chip
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x, y, entryW, bh);

        // Color line sample (dashed for adc1)
        ctx.beginPath();
        ctx.strokeStyle = ds.borderColor;
        ctx.lineWidth = ds.borderWidth || 2;
        if (ds.borderDash?.length) ctx.setLineDash(ds.borderDash);
        else ctx.setLineDash([]);
        ctx.moveTo(x + ph, y + bh / 2);
        ctx.lineTo(x + ph + lineW, y + bh / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label text
        ctx.fillStyle = '#333';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + ph + lineW + gap, y + bh / 2);

        x -= gap;
      });

      ctx.restore();
    }
  };

  weightChart = new Chart(document.getElementById('weightChart').getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [] },
    plugins: [verticalHoverLinePlugin, freezeInteractionPlugin, pinnedMarkerPlugin, horizontalRatioLinePlugin, adcLegendPlugin],
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
    plugins: [verticalHoverLinePlugin, freezeInteractionPlugin, pinnedMarkerPlugin, flowLeftBadgePlugin],
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

export function updateCharts(datasetModel, { showWeight, showFlow, showBrewFlow = true, showTemp, showAdc2 = true, showAdc1 = true }) {
  if (!weightChart || !flowTempChart) return;

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

  weightChart.data.labels = labels;

  const isSingleDs = visible.length === 1;
  const weightDatasets = showWeight ? visible.map(d => ({
    datasetId: d.id, label: `${d.name} - Weight`, data: d.weight,
    beanWeight: parseFloat(d.beanWeight) || null,
    borderColor: isSingleDs ? '#222' : d.color,
    backgroundColor: isSingleDs ? 'rgba(0,0,0,0.08)' : d.color + '18',
    borderWidth: 2.5, fill: false, tension: 0.1, pointRadius: 0,
    yAxisID: 'y'
  })) : [];

  // ── adc1 / adc2 stacked area ──────────────────────────────────────────────
  // Single dataset: adc1 = blue, adc2 = orange (classic solo colors)
  // Multiple datasets: all series share d.color, distinguished by line style & opacity
  const ADC1_SOLO = '#1565C0';
  const ADC2_SOLO = '#E65100';
  const adcDatasets = [];
  visible.forEach(d => {
    const hasAdc1 = showAdc1 && d.adc1?.length;
    const hasAdc2 = showAdc2 && d.adc2?.length;
    const c1 = isSingleDs ? ADC1_SOLO : d.color;
    const c2 = isSingleDs ? ADC2_SOLO : d.color;

    if (hasAdc1) {
      adcDatasets.push({
        datasetId: d.id, label: `${d.name} - adc1 下壺`, data: d.adc1,
        borderColor: c1,
        backgroundColor: c1 + '40',
        borderWidth: 2,
        borderDash: [6, 3],          // 下壺 always dashed
        fill: 'origin', tension: 0.2, pointRadius: 0,
        yAxisID: 'y', order: 2
      });
    }
    if (hasAdc2) {
      // Stacked: adc2 data = adc1[i] + adc2[i] so top edge = total; fill down to adc1 line
      const isStacked = !!(hasAdc1 && d.adc1);
      const stackedData = isStacked
        ? d.adc2.map((v, i) => (d.adc1[i] ?? 0) + v)
        : d.adc2;
      adcDatasets.push({
        datasetId: d.id, label: `${d.name} - adc2 濾杯`, data: stackedData,
        // rawData: raw adc2 values for badge calculation (stacked data includes adc1 offset)
        rawData: isStacked ? d.adc2 : null,
        isStacked,
        borderColor: isSingleDs ? c2 + '99' : d.color + '99',
        backgroundColor: isSingleDs ? c2 + '33' : d.color + '22',
        borderWidth: 1.5,
        fill: isStacked ? '-1' : 'origin',
        tension: 0.2, pointRadius: 0,
        yAxisID: 'y', order: 3
      });
    }
  });

  weightChart.data.datasets = [...adcDatasets, ...weightDatasets];

  const allW = (showWeight ? visible.flatMap(d => d.weight || []) : [])
    .filter(v => typeof v === 'number' && isFinite(v));
  weightChart.options.scales.y.min = 0;
  let yMax;
  if (allW.length >= 4) {
    const sortedW = [...allW].sort((a, b) => a - b);
    const p99 = sortedW[Math.min(sortedW.length - 1, Math.floor(sortedW.length * 0.99))];
    yMax = p99 * 1.08;
    weightChart.options.scales.y.max = yMax;
  } else {
    delete weightChart.options.scales.y.max;
    yMax = null;
  }

  // yRatio always displayed to keep right axis area reserved for hover badges
  const beanWeights = visible.map(d => parseFloat(d.beanWeight)).filter(bw => bw > 0 && isFinite(bw));
  weightChart.options.scales.yRatio.display = true;
  const yMaxForRatio = yMax || (visible.flatMap(d => [...(d.adc1||[]), ...(d.adc2||[]), ...(d.weight||[])]).filter(v => isFinite(v)).reduce((a,b)=>Math.max(a,b), 0)) || null;
  if (beanWeights.length && yMaxForRatio) {
    const minBW = Math.min(...beanWeights);
    weightChart.options.scales.yRatio.min = 0;
    weightChart.options.scales.yRatio.max = yMaxForRatio / minBW;
    weightChart.options.scales.yRatio.ticks = { display: true };
    weightChart.options.scales.yRatio.title = { display: true, text: '水粉比' };
  } else {
    delete weightChart.options.scales.yRatio.min;
    delete weightChart.options.scales.yRatio.max;
    weightChart.options.scales.yRatio.ticks = { display: false };
    weightChart.options.scales.yRatio.title = { display: false };
  }

  weightChart.update();

  const ftDatasets = [];
  if (showFlow) visible.forEach(d => {
    ftDatasets.push({
      datasetId: d.id, label: `${d.name} - Pour Water Flow`, data: d.flow,
      borderColor: d.color, backgroundColor: `${d.color}20`,
      borderWidth: 1.5, fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
    });
  });
  if (showBrewFlow) visible.forEach(d => {
    if (!d.bflow?.length) return;
    ftDatasets.push({
      datasetId: d.id, label: `${d.name} - Brew Flow`, data: d.bflow,
      borderColor: d.color, backgroundColor: `${d.color}20`,
      borderWidth: 1.5, borderDash: [2, 3], fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
    });
  });
  if (showTemp) visible.forEach(d => ftDatasets.push({
    datasetId: d.id, label: `${d.name} - Temp`, data: d.temp,
    borderColor: d.color, backgroundColor: `${d.color}20`,
    borderWidth: 1.5, borderDash: [2, 3], fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
  }));
  flowTempChart.data.labels   = labels;
  flowTempChart.data.datasets = ftDatasets;
  flowTempChart.options.scales.y.min = -5;
  flowTempChart.options.scales.y.max = (showBrewFlow && !showFlow) ? 10 : 15;
  flowTempChart.update();
}

export function getChartInstances() { return { weightChart, flowTempChart }; }
