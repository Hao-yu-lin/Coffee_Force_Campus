import { AppState } from '../model/appState.js';
import { DatasetModel } from '../model/datasetModel.js';
import { initCharts, updateCharts, getChartInstances } from '../view/chartView.js';
import { exportBrewingCharts } from '../view/chartExport.js';
import { AXIS_RANGE_INPUT_IDS, resetAxisRanges } from '../view/axisRange.js';
import { buildIntensityButtons, buildAffectiveGrid, initOverallSelects,
         initializeCATAPanels, initializeSCAPanels, toggleCVAPanel } from '../view/cvaView.js';
import { bindTabButtons, toggleMobileDrawer } from '../view/tabView.js';
import { DISPLAY_OPTION_IDS, getDisplayOptions } from '../view/displayOptions.js';

import { init as initDatasetController, toggleAllDatasets, clearSelectedDatasets,
         addEmptyCVADataset, toggleSortMode } from './datasetController.js';
import { init as initImportController } from './importController.js';
import { init as initPersistController } from './persistController.js';
import { init as initCvaController } from './cvaController.js';
import { init as initDistributionController } from './distributionController.js';
import { init as initPlaybackController } from './playbackController.js';
import { init as initAutosaveController } from './autosaveController.js';

const appState    = new AppState();
const datasetModel = new DatasetModel();

async function loadTab(containerId, url) {
  const html = await fetch(url).then(r => r.text());
  document.getElementById(containerId).innerHTML = html;
}

async function init() {
  // 1. Load tab HTML fragments in parallel
  await Promise.all([
    loadTab('tab-brewing',      'tabs/tab-brewing.html'),
    loadTab('tab-descriptive',  'tabs/tab-descriptive.html'),
    loadTab('tab-affective',    'tabs/tab-affective.html'),
    loadTab('tab-distribution', 'tabs/tab-distribution.html'),
  ]);

  // 2. Bind tab buttons
  bindTabButtons(
    document.querySelectorAll('.tab-btn'),
    document.querySelectorAll('.tab-mobile-btn'),
    (tabName) => {
      if ((tabName === 'descriptive' || tabName === 'affective') && datasetModel.count() === 0) {
        addEmptyCVADataset();
      }
    }
  );

  // 3. Mobile drawer toggle
  document.querySelector('.mobile-control-toggle')
    ?.addEventListener('click', toggleMobileDrawer);

  // 4. Display help icon toggle
  document.getElementById('displayHelpIcon')?.addEventListener('click', () => {
    document.getElementById('displayHelpPopup')?.classList.toggle('visible');
  });

  // 4b. Panel collapse buttons
  const resizeCharts = () => {
    const { weightChart, flowTempChart } = getChartInstances();
    setTimeout(() => { weightChart?.resize(); flowTempChart?.resize(); }, 280);
  };
  document.getElementById('collapseLeftBtn')?.addEventListener('click', () => {
    const panel = document.getElementById('leftTooltipPanel');
    const btn   = document.getElementById('collapseLeftBtn');
    const collapsed = panel.classList.toggle('collapsed');
    btn.textContent = collapsed ? '›' : '‹';
    resizeCharts();
  });
  document.getElementById('collapseRightBtn')?.addEventListener('click', () => {
    const panel = document.getElementById('desktopControlPanel');
    const btn   = document.getElementById('collapseRightBtn');
    const collapsed = panel.classList.toggle('collapsed');
    btn.textContent = collapsed ? '‹' : '›';
    resizeCharts();
  });

  // 5. Display option checkboxes
  const refreshCharts = () => updateCharts(datasetModel, getDisplayOptions());
  DISPLAY_OPTION_IDS.forEach(id =>
    document.getElementById(id)?.addEventListener('change', refreshCharts)
  );

  // 5a. Axis range overrides — typing redraws immediately
  document.getElementById('axisRangeBtn')?.addEventListener('click', () => {
    const box = document.getElementById('axisRangePanel');
    const btn = document.getElementById('axisRangeBtn');
    if (!box) return;
    const open = box.style.display === 'none';
    box.style.display = open ? 'block' : 'none';
    btn.textContent = open ? '📐 座標軸範圍 ▴' : '📐 座標軸範圍 ▾';
  });
  // Placeholders spell out the temperature axis default so it stays in step
  // with TEMP_AXIS_RANGE rather than repeating the numbers in the markup.
  document.getElementById('axisTempMin')?.setAttribute('placeholder', TEMP_AXIS_RANGE.min);
  document.getElementById('axisTempMax')?.setAttribute('placeholder', TEMP_AXIS_RANGE.max);
  AXIS_RANGE_INPUT_IDS.forEach(id =>
    document.getElementById(id)?.addEventListener('input', refreshCharts)
  );
  document.getElementById('axisRangeResetBtn')?.addEventListener('click', () => {
    resetAxisRanges();
    refreshCharts();
  });

  // 5b. Chart export
  document.getElementById('exportChartBtn')?.addEventListener('click', () => {
    const box = document.getElementById('exportChartOptions');
    const btn = document.getElementById('exportChartBtn');
    if (!box) return;
    const open = box.style.display === 'none';
    box.style.display = open ? 'block' : 'none';
    btn.textContent = open ? '🖼 輸出項目 ▴' : '🖼 輸出項目 ▾';
  });
  document.getElementById('exportChartConfirmBtn')?.addEventListener('click', () => {
    if (datasetModel.getVisible().length === 0) {
      alert('⚠️ 目前沒有顯示中的資料集');
      return;
    }
    const count = exportBrewingCharts({
      weight:   document.getElementById('exportWeightChart')?.checked,
      flow:     document.getElementById('exportFlowChart')?.checked,
      combined: document.getElementById('exportCombinedChart')?.checked
    }, datasetModel);
    if (count === 0) alert('⚠️ 請至少勾選一項要儲存的圖表');
  });

  // 5. Dataset control buttons
  document.querySelector('[data-action="select-all"]')
    ?.addEventListener('click', () => toggleAllDatasets(true));
  document.querySelector('[data-action="deselect-all"]')
    ?.addEventListener('click', () => toggleAllDatasets(false));
  document.querySelector('[data-action="clear-selected"]')
    ?.addEventListener('click', clearSelectedDatasets);

  // 沖煮紀錄的「資料集管理」、兩個 CVA 分頁的「資料集切換」與手機的 chip 列
  // 共用同一個排序模式，所以按任何一顆，其他幾顆的文字都要一起換。手機的 chip
  // 每次重繪都是新節點，因此用事件委派而不是逐顆綁定。
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="sort-mode"]');
    if (!btn) return;
    const on = toggleSortMode();
    document.querySelectorAll('[data-action="sort-mode"]').forEach(b => {
      b.textContent = on ? '✓ 完成' : '↕ 排序';
      b.classList.toggle('active', on);
    });
  });

  // 6. Init charts
  initCharts(datasetModel, getDisplayOptions);

  // 7. Build CVA DOM
  buildIntensityButtons();
  buildAffectiveGrid(AFFECTIVE_SECTIONS);
  initializeCATAPanels();
  initializeSCAPanels();
  initOverallSelects();

  // 9. Sub-controllers
  initDatasetController(appState, datasetModel);
  initImportController(appState, datasetModel);
  initPersistController(appState, datasetModel);
  initCvaController(appState);
  initDistributionController();
  initPlaybackController(datasetModel);

  // 10. CVA panel toggle buttons
  document.querySelectorAll('[data-toggle-panel]').forEach(btn =>
    btn.addEventListener('click', () =>
      toggleCVAPanel(btn.dataset.togglePanel, btn.dataset.panelType)
    )
  );

  // 11. Autosave / unload guard — last, so it can snapshot a fully built UI
  initAutosaveController(appState, datasetModel);
}

init();
