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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBinSettings() {
  const mode         = document.getElementById('distMode')?.value     ?? 'diameter';
  const xMin         = parseFloat(document.getElementById('distXMin')?.value)     || 200;
  const xMax         = parseFloat(document.getElementById('distXMax')?.value)     || 1200;
  const interval     = parseFloat(document.getElementById('distInterval')?.value) || 100;
  const showBars     = document.getElementById('showDistBars')?.checked ?? true;
  const showCumulative = document.getElementById('showDistCumulative')?.checked ?? true;
  return { mode, xMin, xMax, interval, showBars, showCumulative };
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

  // 9. Initial render
  refreshChart();
}
