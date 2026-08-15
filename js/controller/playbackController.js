// ES Module — Brewing chart playback
//
// Sweeps the x axis from the first to the last time step over the duration the
// user types in, revealing the curves as it goes. The chart view is told how
// far the sweep has got; it does the masking and the hover clamping.

import { setPlaybackCutoff, getPlaybackFrameCount } from '../view/chartView.js';

const DEFAULT_DURATION_SEC = 10;

let playing       = false;
let rafId         = null;
let progress      = 0;    // 0–1 across the whole time axis
let startTs       = 0;    // performance.now() when the current run began
let startProgress = 0;    // progress the current run resumed from

function durationMs() {
  const v = parseFloat(document.getElementById('playbackDuration')?.value);
  return (isFinite(v) && v > 0 ? v : DEFAULT_DURATION_SEC) * 1000;
}

function isLooping() {
  return document.getElementById('playbackLoop')?.checked ?? false;
}

function updateButton() {
  const btn = document.getElementById('playbackBtn');
  if (!btn) return;
  btn.textContent = playing ? '⏸ 暫停'
                  : (progress > 0 && progress < 1 ? '▶ 繼續' : '▶ 播放');
  btn.classList.toggle('playing', playing);
}

/** Playback reached the end (or ran out of data) — hand the full curve back. */
function finish() {
  playing  = false;
  progress = 1;
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  setPlaybackCutoff(null);
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

export function init() {
  const btn = document.getElementById('playbackBtn');
  btn?.addEventListener('click', () => (playing ? pause() : play()));

  // Retyping the duration mid-run rescales only the remaining time — without
  // rebasing, the part already played would jump to a new position.
  document.getElementById('playbackDuration')?.addEventListener('input', () => {
    if (!playing) return;
    startProgress = progress;
    startTs       = performance.now();
  });

  updateButton();
}
