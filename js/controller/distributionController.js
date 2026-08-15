// ES Module — Particle Size Distribution controller
// Accesses global: DATASET_COLORS (from constants.js plain script)

import { ParticleModel } from '../model/particleModel.js';
import {
  initDistributionChart,
  updateDistributionChart,
  renderDistDatasetList,
  downloadDistributionChart
} from '../view/distributionView.js';

const particleModel = new ParticleModel();

// ── Zone state ────────────────────────────────────────────────────────────────

// Default palette for new zones (cycles when user keeps adding)
const ZONE_PALETTE = ['#57bb5e', '#e8a838', '#d95f5f', '#6b9bd2', '#a07cc5', '#e8826a'];

// Two independent zone sets, one per colouring mode. Switching the dropdown
// only swaps which set is active — each keeps its own boundaries and colours.
//
// percent  → { from, to } are cumulative % (0–100); zones[last].to === 100
// diameter → { from, to } are µm; zones[last].to === Infinity (open-ended)
// Both must stay sorted with zones[0].from === 0.
const zoneSets = {
  percent: [
    { from: 0,  to: 25,  color: '#57bb5e' },
    { from: 25, to: 75,  color: '#e8a838' },
    { from: 75, to: 100, color: '#d95f5f' },
  ],
  diameter: [
    { from: 0,   to: 400,      color: '#57bb5e' },
    { from: 400, to: 800,      color: '#e8a838' },
    { from: 800, to: Infinity, color: '#d95f5f' },
  ],
};

let zoneMode = 'percent';

function activeZones() {
  return zoneSets[zoneMode];
}

/** Upper bound of the whole scale — 100 for %, open-ended for diameter. */
function zoneScaleMax() {
  return zoneMode === 'diameter' ? Infinity : 100;
}

/** Step used when splitting the last zone to create a new one. */
function zoneSplitStep() {
  return zoneMode === 'diameter'
    ? (parseFloat(document.getElementById('distInterval')?.value) || 100)
    : 0;
}

function renderZoneList() {
  const container = document.getElementById('zoneList');
  if (!container) return;
  container.innerHTML = '';

  const zones = activeZones();
  const unit  = zoneMode === 'diameter' ? 'µm' : '%';

  zones.forEach((zone, i) => {
    const isLast = i === zones.length - 1;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:4px;margin:3px 0;font-size:12px;';

    // "from" label — always read-only
    const fromSpan = document.createElement('span');
    fromSpan.textContent = zone.from + unit;
    fromSpan.style.cssText = 'min-width:38px;text-align:right;color:#888;flex-shrink:0;';
    row.appendChild(fromSpan);

    const arrow = document.createElement('span');
    arrow.textContent = '→';
    arrow.style.cssText = 'color:#aaa;flex-shrink:0;';
    row.appendChild(arrow);

    // "to" — input for all zones except the last (100% / open-ended)
    if (isLast) {
      const toSpan = document.createElement('span');
      toSpan.textContent = Number.isFinite(zone.to) ? zone.to + unit : '∞';
      toSpan.style.cssText = 'min-width:44px;color:#888;flex-shrink:0;';
      row.appendChild(toSpan);
    } else {
      // Upper limit: next boundary, or the scale max for the second-to-last row
      const nextTo = Number.isFinite(zones[i + 1].to) ? zones[i + 1].to : zoneScaleMax();
      const upper  = Number.isFinite(nextTo) ? nextTo - 1 : Infinity;

      const toInput = document.createElement('input');
      toInput.type = 'number';
      toInput.value = zone.to;
      toInput.min = zone.from + 1;
      if (Number.isFinite(upper)) toInput.max = upper;
      toInput.step = zoneMode === 'diameter' ? 10 : 1;
      toInput.style.cssText = 'width:52px;padding:1px 3px;font-size:12px;text-align:center;';
      toInput.addEventListener('change', () => {
        let val = Math.round(parseFloat(toInput.value));
        if (!Number.isFinite(val)) val = zone.to;
        val = Math.max(zone.from + 1, Math.min(upper, val));
        toInput.value = val;
        zones[i].to       = val;
        zones[i + 1].from = val;
        renderZoneList();
        refreshChart();
      });
      row.appendChild(toInput);

      const unitSpan = document.createElement('span');
      unitSpan.textContent = unit;
      unitSpan.style.cssText = 'color:#888;flex-shrink:0;';
      row.appendChild(unitSpan);
    }

    // Color picker
    const colorInput = document.createElement('input');
    colorInput.type  = 'color';
    colorInput.value = zone.color;
    colorInput.style.cssText = 'width:26px;height:22px;padding:1px;border:1px solid #ddd;border-radius:3px;cursor:pointer;flex-shrink:0;';
    colorInput.addEventListener('input', () => {
      zones[i].color = colorInput.value;
      refreshChart();
    });
    row.appendChild(colorInput);

    // Delete button — hidden when only 1 zone remains
    if (zones.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.title = '刪除此區間';
      delBtn.style.cssText = 'padding:1px 6px;font-size:12px;border:1px solid #ddd;border-radius:3px;background:#fff;color:#888;cursor:pointer;flex-shrink:0;';
      delBtn.addEventListener('click', () => {
        if (i < zones.length - 1) {
          zones[i + 1].from = zones[i].from;      // next zone absorbs this one's start
        } else {
          zones[i - 1].to = zoneScaleMax();       // previous zone extends to end
        }
        zones.splice(i, 1);
        renderZoneList();
        refreshChart();
      });
      row.appendChild(delBtn);
    }

    container.appendChild(row);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBinSettings() {
  const mode         = document.getElementById('distMode')?.value     ?? 'diameter';
  const xMin         = parseFloat(document.getElementById('distXMin')?.value)     || 200;
  const xMax         = parseFloat(document.getElementById('distXMax')?.value)     || 1200;
  const interval     = parseFloat(document.getElementById('distInterval')?.value) || 100;
  const showBars     = document.getElementById('showDistBars')?.checked ?? true;
  const showCumulative = document.getElementById('showDistCumulative')?.checked ?? true;
  return { mode, xMin, xMax, interval, showBars, showCumulative,
           zones: activeZones(), zoneMode };
}

function refreshChart() {
  updateDistributionChart(particleModel, getBinSettings());
  renderDistDatasetList(particleModel, {
    onToggle(id) {
      particleModel.setVisibility(id, !particleModel.isVisible(id));
      refreshChart();
    },
    onDelete(id) {
      particleModel.remove(id);
      refreshChart();
    }
  });
}

// ── Persist helpers (called by persistController) ────────────────────────────

// JSON has no Infinity — the open-ended diameter bound round-trips as null.
const serializeZones   = zs => zs.map(z => ({ ...z, to: Number.isFinite(z.to) ? z.to : null }));
const deserializeZones = zs => zs.map(z => ({ ...z, to: z.to === null || z.to === undefined ? Infinity : z.to }));

/**
 * Snapshot the full distribution state for saving.
 * Returns a plain-object safe for JSON serialisation.
 */
export function getDistributionState() {
  return {
    datasets:   particleModel.getAll(),
    visibility: particleModel.getAllVisibility(),
    zoneMode,
    zoneSets: {
      percent:  serializeZones(zoneSets.percent),
      diameter: serializeZones(zoneSets.diameter),
    },
    zones: serializeZones(zoneSets.percent),   // legacy field, read by older builds
    settings: {
      mode:            document.getElementById('distMode')?.value              ?? 'diameter',
      xMin:            parseFloat(document.getElementById('distXMin')?.value)  || 200,
      xMax:            parseFloat(document.getElementById('distXMax')?.value)  || 1200,
      interval:        parseFloat(document.getElementById('distInterval')?.value) || 100,
      showBars:        document.getElementById('showDistBars')?.checked        ?? true,
      showCumulative:  document.getElementById('showDistCumulative')?.checked  ?? true,
    }
  };
}

/**
 * Restore the full distribution state from a saved snapshot.
 * Called by persistController after loading a history file.
 */
export function loadDistributionState(state) {
  if (!state) return;

  // 1. Restore particle datasets
  if (state.datasets) {
    particleModel.replaceAll(state.datasets, state.visibility || {});
  }

  // 2. Restore zone definitions (mutate in-place so renderZoneList sees the update)
  const restoreSet = (key, saved) => {
    if (!Array.isArray(saved) || !saved.length) return;
    zoneSets[key].length = 0;
    deserializeZones(saved).forEach(z => zoneSets[key].push(z));
  };
  restoreSet('percent',  state.zoneSets?.percent ?? state.zones);   // pre-zoneSets files
  restoreSet('diameter', state.zoneSets?.diameter);

  // Files saved before the mode dropdown existed are always percent-based
  zoneMode = state.zoneMode === 'diameter' ? 'diameter' : 'percent';
  const modeSel = document.getElementById('zoneMode');
  if (modeSel) modeSel.value = zoneMode;
  renderZoneList();

  // 3. Restore UI settings
  const s = state.settings;
  if (s) {
    const setVal = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value   = v; };
    const setChk = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.checked = v; };
    setVal('distMode',     s.mode);
    setVal('distXMin',     s.xMin);
    setVal('distXMax',     s.xMax);
    setVal('distInterval', s.interval);
    setChk('showDistBars',        s.showBars);
    setChk('showDistCumulative',  s.showCumulative);
  }

  // 4. Re-render
  refreshChart();
}

// ── TXT / CSV parser ──────────────────────────────────────────────────────────
// Delegates to parseParticleDiameters() defined in utils.js (plain global script)

export function parseTxt(text, filename) {
  return parseParticleDiameters(text);
}

// ── File handling ─────────────────────────────────────────────────────────────

function handleFiles(files) {
  const failed = [];
  let pending = files.length;

  if (pending === 0) return;

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const diameters = parseTxt(e.target.result, file.name);
      if (diameters) {
        const id = particleModel.nextId();
        const color = DATASET_COLORS[particleModel.count() % DATASET_COLORS.length];
        const name = file.name.replace(/\.[^.]+$/, '');
        particleModel.add(id, { name, color, diameters });
      } else {
        failed.push(file.name);
      }
      pending--;
      if (pending === 0) {
        refreshChart();
        if (failed.length > 0) {
          alert(`以下檔案無法解析（缺少 diameter 欄位）：\n${failed.join('\n')}`);
        }
      }
    };
    reader.readAsText(file);
  });
}

// ── Exported init ─────────────────────────────────────────────────────────────

export function init() {
  // 1. Init chart
  initDistributionChart();

  // 2. File input change
  const fileInput = document.getElementById('distFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', e => {
      handleFiles(e.target.files);
      e.target.value = '';
    });
  }

  // 3. Import button → trigger file input
  document.getElementById('importDistBtn')?.addEventListener('click', () => {
    document.getElementById('distFileInput')?.click();
  });

  // 4. Download button
  document.getElementById('downloadDistBtn')?.addEventListener('click', () => {
    downloadDistributionChart('particle_distribution.png');
  });

  // 5. Bulk selection buttons
  document.querySelector('[data-dist-action="select-all"]')?.addEventListener('click', () => {
    particleModel.setAllVisibility(true);
    refreshChart();
  });
  document.querySelector('[data-dist-action="deselect-all"]')?.addEventListener('click', () => {
    particleModel.setAllVisibility(false);
    refreshChart();
  });
  document.querySelector('[data-dist-action="clear-all"]')?.addEventListener('click', () => {
    particleModel.getIds().forEach(id => particleModel.remove(id));
    refreshChart();
  });

  // 6. Mode selector
  document.getElementById('distMode')?.addEventListener('change', refreshChart);

  // 7. Bin-range inputs
  ['distXMin', 'distXMax', 'distInterval'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', refreshChart);
  });

  // 8. Display toggles
  document.getElementById('showDistBars')?.addEventListener('change', refreshChart);
  document.getElementById('showDistCumulative')?.addEventListener('change', refreshChart);

  // 9. Zone mode selector
  document.getElementById('zoneMode')?.addEventListener('change', e => {
    zoneMode = e.target.value === 'diameter' ? 'diameter' : 'percent';
    renderZoneList();
    refreshChart();
  });

  // 10. Zone list + add-zone button
  renderZoneList();
  document.getElementById('addZoneBtn')?.addEventListener('click', () => {
    // Split the last zone to create a new one: at its midpoint when bounded
    // (percent), or one bin-interval past its start when open-ended (diameter).
    const zones = activeZones();
    const last  = zones[zones.length - 1];
    const cut   = Number.isFinite(last.to)
      ? Math.round((last.from + last.to) / 2)
      : Math.round(last.from + zoneSplitStep());
    if (cut <= last.from || cut >= last.to) return;   // zone too narrow to split
    const newColor = ZONE_PALETTE[zones.length % ZONE_PALETTE.length];
    zones.splice(zones.length - 1, 0, { from: last.from, to: cut, color: newColor });
    zones[zones.length - 1].from = cut;
    renderZoneList();
    refreshChart();
  });

  // 11. Initial render
  refreshChart();
}
