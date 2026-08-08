// Renders the brewing charts to a downloadable PNG.
// The on-screen charts reserve colour for dataset identity but never name the
// datasets on the canvas itself, so an exported image would be unreadable on
// its own — every export therefore carries a dataset colour legend below it.

import { getChartInstances } from './chartView.js';

const LEGEND_TITLE = '資料集 (Data items)';

function makeTimestamp(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${mm}${dd}${hh}${mi}`;
}

// Canvas pixels per CSS pixel — keeps the legend's text the same visual size as
// the text Chart.js already baked into the canvas.
function canvasScale(canvas) {
  const css = canvas.clientWidth || canvas.width;
  return css ? canvas.width / css : (window.devicePixelRatio || 1);
}

function legendFont(s, bold = false) {
  return `${bold ? 'bold ' : ''}${Math.round(13 * s)}px 'Segoe UI', Tahoma, sans-serif`;
}

// Pack entries into rows that fit maxWidth; returns rows of { name, color, w }.
function layoutLegend(ctx, entries, maxWidth, s) {
  const swatch = Math.round(14 * s);
  const gap    = Math.round(8 * s);
  const itemGap = Math.round(22 * s);
  ctx.font = legendFont(s);

  const rows = [[]];
  let rowW = 0;
  entries.forEach(e => {
    const w = swatch + gap + ctx.measureText(e.name).width;
    if (rowW + w > maxWidth && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
    rows[rows.length - 1].push({ ...e, w });
    rowW += w + itemGap;
  });
  return rows;
}

function drawLegend(ctx, rows, x, y, s, rowH) {
  const swatch  = Math.round(14 * s);
  const gap     = Math.round(8 * s);
  const itemGap = Math.round(22 * s);

  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';

  rows.forEach((row, ri) => {
    const cy = y + ri * rowH + rowH / 2;
    let cx = x;
    ctx.font = legendFont(s);
    row.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.fillRect(cx, cy - swatch / 2, swatch, swatch);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = Math.max(1, Math.round(s));
      ctx.strokeRect(cx, cy - swatch / 2, swatch, swatch);
      ctx.fillStyle = '#333';
      ctx.fillText(item.name, cx + swatch + gap, cy);
      cx += item.w + itemGap;
    });
  });
}

/**
 * Compose one or more chart canvases plus the dataset legend onto a new canvas.
 * @param {HTMLCanvasElement[]} sources
 * @param {{name:string,color:string}[]} entries
 */
function composeImage(sources, entries) {
  const s = canvasScale(sources[0]);
  const pad       = Math.round(20 * s);
  const chartGap  = Math.round(14 * s);
  const rowH      = Math.round(22 * s);
  const titleH    = Math.round(24 * s);
  const preRule   = Math.round(12 * s);
  const postRule  = Math.round(10 * s);

  const innerWidth = Math.max(...sources.map(c => c.width));
  const chartsH = sources.reduce((sum, c) => sum + c.height, 0)
                + chartGap * (sources.length - 1);

  const meas = document.createElement('canvas').getContext('2d');
  const rows = entries.length
    ? layoutLegend(meas, entries, innerWidth, s)
    : [];
  const legendH = rows.length
    ? preRule + postRule + titleH + rows.length * rowH
    : 0;

  const out = document.createElement('canvas');
  out.width  = innerWidth + pad * 2;
  out.height = chartsH + legendH + pad * 2;
  const ctx = out.getContext('2d');

  // Chart.js leaves the canvas transparent — without this the PNG shows as
  // black wherever it is pasted onto a dark background.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);

  let y = pad;
  sources.forEach(c => {
    ctx.drawImage(c, pad + (innerWidth - c.width) / 2, y);
    y += c.height + chartGap;
  });
  y -= chartGap;

  if (rows.length) {
    y += preRule;
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = Math.max(1, Math.round(s));
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(out.width - pad, y);
    ctx.stroke();
    y += postRule;

    ctx.font = legendFont(s, true);
    ctx.fillStyle = '#555';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(LEGEND_TITLE, pad, y + titleH / 2);
    y += titleH;

    drawLegend(ctx, rows, pad, y, s, rowH);
  }

  return out;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const toPngBlob = canvas =>
  new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

/**
 * Save the selected brewing charts as PNG file(s). One selection downloads the
 * PNG directly; several are bundled into a single ZIP, because browsers block
 * the second and later of a burst of programmatic downloads — the same reason
 * saveData() zips multi-dataset saves.
 * @param {{weight?:boolean, flow?:boolean, combined?:boolean}} selection
 * @param {import('../model/datasetModel.js').DatasetModel} datasetModel
 * @returns {number} how many charts were exported
 */
export function exportBrewingCharts(selection, datasetModel) {
  const { weightChart, flowTempChart } = getChartInstances();
  const ts = makeTimestamp(new Date());

  // updateCharts() animates, and the canvas holds whatever frame the animation
  // is on — exporting straight after loading data captured empty axes. Force an
  // immediate, animation-free repaint so the canvas is complete before capture.
  [weightChart, flowTempChart].forEach(c => c?.update('none'));

  const entries = datasetModel.getVisible().map(d => ({
    name:  d.name || `Dataset ${d.id}`,
    color: d.color
  }));

  const jobs = [];
  if (selection.weight && weightChart)
    jobs.push({ sources: [weightChart.canvas], filename: `brewing_weight_${ts}.png` });
  if (selection.flow && flowTempChart)
    jobs.push({ sources: [flowTempChart.canvas], filename: `brewing_flow_tds_${ts}.png` });
  if (selection.combined && weightChart && flowTempChart)
    jobs.push({ sources: [weightChart.canvas, flowTempChart.canvas], filename: `brewing_charts_${ts}.png` });

  if (!jobs.length) return 0;

  const blobs = Promise.all(
    jobs.map(job => toPngBlob(composeImage(job.sources, entries)))
  );

  if (jobs.length === 1) {
    blobs.then(([blob]) => downloadBlob(blob, jobs[0].filename));
  } else {
    blobs.then(list => {
      const zip = new JSZip();
      list.forEach((blob, i) => zip.file(jobs[i].filename, blob));
      return zip.generateAsync({ type: 'blob' });
    }).then(zipBlob => downloadBlob(zipBlob, `brewing_charts_${ts}.zip`));
  }

  return jobs.length;
}
