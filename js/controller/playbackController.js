// ES Module — Brewing chart playback
//
// Sweeps the x axis from the first to the last time step over the duration the
// user types in, revealing the curves as it goes. The chart view is told how
// far the sweep has got; it does the masking and the hover clamping.

import { setPlaybackCutoff, getPlaybackFrameCount, getChartInstances } from '../view/chartView.js';
import { canRecordVideo, startPlaybackRecording } from '../view/videoExport.js';

const DEFAULT_DURATION_SEC = 10;

let playing       = false;
let rafId         = null;
let progress      = 0;    // 0–1 across the whole time axis
let startTs       = 0;    // performance.now() when the current run began
let startProgress = 0;    // progress the current run resumed from

let recorder      = null; // active recording, or null
let _datasetModel = null;

function durationMs() {
  const v = parseFloat(document.getElementById('playbackDuration')?.value);
  return (isFinite(v) && v > 0 ? v : DEFAULT_DURATION_SEC) * 1000;
}

// A recording always captures exactly one lap, whatever the loop box says.
function isLooping() {
  return !recorder && (document.getElementById('playbackLoop')?.checked ?? false);
}

function updateButton() {
  const btn = document.getElementById('playbackBtn');
  const rec = document.getElementById('recordVideoBtn');
  if (btn) {
    btn.textContent = recorder ? '⏺ 錄製中…'
                    : playing  ? '⏸ 暫停'
                    : (progress > 0 && progress < 1 ? '▶ 繼續' : '▶ 播放');
    btn.classList.toggle('playing', playing);
    btn.disabled = !!recorder;
  }
  if (rec) {
    rec.textContent = recorder ? '⏹ 取消錄製' : '⬇ 下載影片';
    rec.disabled    = playing && !recorder;
  }
}

/** Playback reached the end (or ran out of data) — hand the full curve back. */
function finish() {
  playing  = false;
  progress = 1;
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  setPlaybackCutoff(null);

  if (recorder) {
    const r = recorder;
    recorder = null;
    r.finish().catch(e => alert(`影片儲存失敗：${e.message}`)).finally(updateButton);
  }
  updateButton();
}

function tick(now) {
  const frames = getPlaybackFrameCount();
  if (frames < 2) { finish(); return; }

  let raw = startProgress + (now - startTs) / durationMs();
  if (raw >= 1) {
    if (!isLooping()) { finish(); return; }
    // Carry the overshoot into the next lap so looping doesn't drift slower
    raw = raw % 1;
    startProgress = raw;
    startTs       = now;
  }
  progress = raw;

  setPlaybackCutoff(Math.round(progress * (frames - 1)));
  // update('none') repaints synchronously, so the chart canvases already hold
  // this frame by the time the compositor reads them.
  recorder?.frame();
  rafId = requestAnimationFrame(tick);
}

function play() {
  if (getPlaybackFrameCount() < 2) return;   // nothing plotted yet
  if (progress >= 1) progress = 0;           // finished → start over
  playing       = true;
  startProgress = progress;
  startTs       = performance.now();
  setPlaybackCutoff(Math.round(progress * (getPlaybackFrameCount() - 1)));
  rafId = requestAnimationFrame(tick);
  updateButton();
}

function pause() {
  playing = false;
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  updateButton();
}

/**
 * Which chart canvases go into the video — driven by the 輸出項目 checkboxes so
 * the clip matches what the PNG export would produce. Nothing ticked = both.
 */
function recordingSources() {
  const { weightChart, flowTempChart } = getChartInstances();
  const combined = document.getElementById('exportCombinedChart')?.checked;
  const wantW = combined || document.getElementById('exportWeightChart')?.checked;
  const wantF = combined || document.getElementById('exportFlowChart')?.checked;

  const picked = [];
  if (wantW && weightChart)   picked.push(weightChart.canvas);
  if (wantF && flowTempChart) picked.push(flowTempChart.canvas);
  if (picked.length) return picked;

  return [weightChart?.canvas, flowTempChart?.canvas].filter(Boolean);
}

function startRecording() {
  if (recorder) return;
  if (getPlaybackFrameCount() < 2) { alert('⚠️ 目前沒有可播放的資料'); return; }
  if (!canRecordVideo()) { alert('⚠️ 這個瀏覽器不支援錄製影片'); return; }

  const sources = recordingSources();
  if (!sources.length) { alert('⚠️ 沒有可錄製的圖表'); return; }

  const entries = (_datasetModel?.getVisible() ?? []).map(d => ({
    name:  d.name || `Dataset ${d.id}`,
    color: d.color,
  }));

  if (playing) pause();
  progress = 0;                 // always capture a full lap from the start

  try {
    recorder = startPlaybackRecording(sources, entries);
  } catch (e) {
    alert(`⚠️ 無法開始錄製：${e.message}`);
    return;
  }
  play();                       // isLooping() is suppressed while recording
}

function cancelRecording() {
  if (!recorder) return;
  recorder.cancel();
  recorder = null;
  pause();
  setPlaybackCutoff(null);
  progress = 0;
  updateButton();
}

export function init(datasetModel) {
  _datasetModel = datasetModel;

  const btn = document.getElementById('playbackBtn');
  btn?.addEventListener('click', () => (playing ? pause() : play()));

  document.getElementById('recordVideoBtn')
    ?.addEventListener('click', () => (recorder ? cancelRecording() : startRecording()));

  // Retyping the duration mid-run rescales only the remaining time — without
  // rebasing, the part already played would jump to a new position.
  document.getElementById('playbackDuration')?.addEventListener('input', () => {
    if (!playing) return;
    startProgress = progress;
    startTs       = performance.now();
  });

  updateButton();
}
