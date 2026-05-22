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

// Each zone: { from: number (0–100), to: number (0–100), color: string }
// zones must be sorted, zones[0].from === 0, zones[last].to === 100
let zones = [
  { from: 0,  to: 25,  color: '#57bb5e' },
  { from: 25, to: 75,  color: '#e8a838' },
  { from: 75, to: 100, color: '#d95f5f' },
];

function renderZoneList() {
  const container = document.getElementById('zoneList');
  if (!container) return;
  container.innerHTML = '';

  zones.forEach((zone, i) => {
    const isLast = i === zones.length - 1;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:4px;margin:3px 0;font-size:12px;';

    // "from%" label — always read-only
    const fromSpan = document.createElement('span');
    fromSpan.textContent = zone.from + '%';
    fromSpan.style.cssText = 'min-width:28px;text-align:right;color:#888;flex-shrink:0;';
    row.appendChild(fromSpan);

    const arrow = document.createElement('span');
    arrow.textContent = '→';
    arrow.style.cssText = 'color:#aaa;flex-shrink:0;';
    row.appendChild(arrow);

    // "to" — input for all zones except the last (always 100%)
    if (isLast) {
      const toSpan = document.createElement('span');
      toSpan.textContent = '100%';
      toSpan.style.cssText = 'min-width:42px;color:#888;flex-shrink:0;';
      row.appendChild(toSpan);
    } else {
      const toInput = document.createElement('input');
      toInput.type = 'number';
      toInput.value = zone.to;
      toInput.min = zone.from + 1;
      toInput.max = zones[i + 1].to - 1;
      toInput.style.cssText = 'width:44px;padding:1px 3px;font-size:12px;text-align:center;';
      toInput.addEventListener('change', () => {
        let val = Math.round(parseFloat(toInput.value));
        val = Math.max(zone.from + 1, Math.min(zones[i + 1].to - 1, val));
        toInput.value = val;
        zones[i].to       = val;
        zones[i + 1].from = val;
        renderZoneList();
        refreshChart();
      });
      row.appendChild(toInput);

      const pctSpan = document.createElement('span');
      pctSpan.textContent = '%';
      pctSpan.style.cssText = 'color:#888;flex-shrink:0;';
      row.appendChild(pctSpan);
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
          zones[i + 1].from = zones[i].from;   // next zone absorbs this one's start
        } else {
          zones[i - 1].to = 100;                // previous zone extends to end
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
  return { mode, xMin, xMax, interval, showBars, showCumulative, zones };
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

/**
 * Snapshot the full distribution state for saving.
 * Returns a plain-object safe for JSON serialisation.
 */
export function getDistributionState() {
  return {
    datasets:   particleModel.getAll(),
    visibility: particleModel.getAllVisibility(),
    zones:      JSON.parse(JSON.stringify(zones)),   // deep copy
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
  if (Array.isArray(state.zones) && state.zones.length) {
    zones.length = 0;
    state.zones.forEach(z => zones.push({ ...z }));
    renderZoneList();
  }

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

  // 9. Zone list + add-zone button
  renderZoneList();
  document.getElementById('addZoneBtn')?.addEventListener('click', () => {
    // Split the last zone at its midpoint to create a new zone
    const last = zones[zones.length - 1];
    const mid  = Math.round((last.from + last.to) / 2);
    if (mid <= last.from || mid >= last.to) return;   // zone too narrow to split
    const newColor = ZONE_PALETTE[zones.length % ZONE_PALETTE.length];
    zones.splice(zones.length - 1, 0, { from: last.from, to: mid, color: newColor });
    zones[zones.length - 1].from = mid;
    renderZoneList();
    refreshChart();
  });

  // 10. Initial render
  refreshChart();
}
