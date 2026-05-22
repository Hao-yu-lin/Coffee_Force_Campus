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
        return label.replace(' - Weight', '').replace(' - Flow', '').replace(' - Temp', '');
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
          if (!isNaN(w)) lines.push(`  - weight: ${w.toFixed(2)}`);
        }
        if (opts.showFlow && ds.flow?.[timeIdx] !== undefined) {
          const f = Number(ds.flow[timeIdx]);
          if (!isNaN(f)) lines.push(`  - flow: ${f.toFixed(2)}`);
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

  // Draws a horizontal dashed line + badge label on the right y-axis for each weight dataset on hover
  // ratio = weight[idx] / beanWeight  (computed on the fly — no separate ratio dataset)
  const horizontalRatioLinePlugin = {
    id: 'horizontalRatioLine',
    afterDraw: chart => {
      const activeIdx = isTooltipPinned ? pinnedIndex : crosshairIndex;
      if (activeIdx === null || !chart.scales.y) return;

      const ctx    = chart.ctx;
      const yScale = chart.scales.y;
      const xLeft  = chart.chartArea.left;
      const xRight = chart.chartArea.right;
      // Right axis label area starts just past the chart area
      const yRatioScale = chart.scales.yRatio;
      const labelAreaLeft = yRatioScale ? yRatioScale.left : xRight + 2;

      chart.data.datasets.forEach((ds, i) => {
        if (!chart.isDatasetVisible(i)) return;
        const bw = parseFloat(ds.beanWeight);
        if (!bw || !isFinite(bw)) return;
        const weight = ds.data?.[activeIdx];
        if (weight == null || !isFinite(weight)) return;

        const ratio = weight / bw;
        const y = yScale.getPixelForValue(weight);

        ctx.save();

        // Horizontal dashed line across the chart area
        ctx.beginPath();
        ctx.moveTo(xLeft, y);
        ctx.lineTo(xRight, y);
        ctx.lineWidth = 1;
        ctx.strokeStyle = ds.borderColor || 'rgba(100,100,100,0.5)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badge on the right axis
        const text = ratio.toFixed(1);
        ctx.font = 'bold 11px sans-serif';
        const tw  = ctx.measureText(text).width;
        const ph  = 4;   // horizontal padding
        const bh  = 16;  // badge height
        const bx  = labelAreaLeft + 2;
        const by  = y - bh / 2;

        ctx.fillStyle = ds.borderColor || '#555';
        ctx.fillRect(bx, by, tw + ph * 2, bh);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bx + ph, y);

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

  weightChart = new Chart(document.getElementById('weightChart').getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [] },
    plugins: [verticalHoverLinePlugin, freezeInteractionPlugin, pinnedMarkerPlugin, horizontalRatioLinePlugin],
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
    plugins: [verticalHoverLinePlugin, freezeInteractionPlugin, pinnedMarkerPlugin],
    options: {
      events: ['click'],
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: commonTooltip },
      layout: { padding: 0 },
      scales: {
        x: { title: { display: true, text: 'Time (s)' }, grid: { color: 'rgba(0,0,0,0.08)' } },
        y: { min: -20, max: 20, afterFit(s) { s.width = 60; }, title: { display: true, text: 'Flow / Temp' }, grid: { color: 'rgba(0,0,0,0.08)' } }
      }
    }
  });

  document.getElementById('weightChart').addEventListener('mousemove', e => handleChartMouseMove(e, weightChart));
  document.getElementById('flowTempChart').addEventListener('mousemove', e => handleChartMouseMove(e, flowTempChart));
  document.getElementById('weightChart').addEventListener('mouseleave', handleChartMouseLeave);
  document.getElementById('flowTempChart').addEventListener('mouseleave', handleChartMouseLeave);
}

export function updateCharts(datasetModel, { showWeight, showFlow, showTemp, showAdc2 = true, showAdc1 = true }) {
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

  const weightDatasets = showWeight ? visible.map(d => ({
    datasetId: d.id, label: `${d.name} - Weight`, data: d.weight,
    beanWeight: parseFloat(d.beanWeight) || null,
    borderColor: d.color, backgroundColor: `${d.color}20`,
    borderWidth: 2.5, fill: false, tension: 0.1, pointRadius: 0,
    yAxisID: 'y'
  })) : [];

  // adc1 line — brewing cumulative (coffee liquid in cup), TXT files only
  const adc1Datasets = showAdc1 ? visible
    .filter(d => d.adc1 && d.adc1.length)
    .map(d => ({
      datasetId: d.id, label: `${d.name} - adc1 咖啡液`, data: d.adc1,
      borderColor: d.color,
      backgroundColor: 'transparent',
      borderWidth: 2, fill: false, tension: 0.2, pointRadius: 0,
      yAxisID: 'y',
      order: 1
    })) : [];

  // adc2 area — second injection sensor (water in dripper), fills down to origin
  const adc2Datasets = showAdc2 ? visible
    .filter(d => d.adc2 && d.adc2.length)
    .map(d => ({
      datasetId: d.id, label: `${d.name} - adc2 注水感測`, data: d.adc2,
      borderColor: d.color + '66',
      backgroundColor: d.color + '28',
      borderWidth: 1.5, fill: 'origin', tension: 0.2, pointRadius: 0,
      borderDash: [4, 3],
      yAxisID: 'y',
      order: 2     // area behind adc1 line
    })) : [];

  weightChart.data.datasets = [...adc2Datasets, ...adc1Datasets, ...weightDatasets];

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

  // Configure yRatio axis — always visible so the right axis area is reserved for hover badges
  const beanWeights = visible.map(d => parseFloat(d.beanWeight)).filter(bw => bw > 0 && isFinite(bw));
  weightChart.options.scales.yRatio.display = true;
  if (beanWeights.length && yMax) {
    const minBW = Math.min(...beanWeights);
    weightChart.options.scales.yRatio.min = 0;
    weightChart.options.scales.yRatio.max = yMax / minBW;
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
  if (showFlow) visible.forEach(d => ftDatasets.push({
    datasetId: d.id, label: `${d.name} - Flow`, data: d.flow,
    borderColor: d.color, backgroundColor: `${d.color}20`,
    borderWidth: 1.5, fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
  }));
  if (showTemp) visible.forEach(d => ftDatasets.push({
    datasetId: d.id, label: `${d.name} - Temp`, data: d.temp,
    borderColor: d.color, backgroundColor: `${d.color}20`,
    borderWidth: 1.5, borderDash: [5,5], fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
  }));
  flowTempChart.data.labels   = labels;
  flowTempChart.data.datasets = ftDatasets;
  flowTempChart.options.scales.y.min = -20;
  flowTempChart.options.scales.y.max = 20;
  flowTempChart.update();
}

export function getChartInstances() { return { weightChart, flowTempChart }; }
