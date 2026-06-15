import { AppState } from '../model/appState.js';
import { DatasetModel } from '../model/datasetModel.js';
import { initCharts, updateCharts, getChartInstances } from '../view/chartView.js';
import { buildIntensityButtons, buildAffectiveGrid, initOverallSelects,
         initializeCATAPanels, initializeSCAPanels, toggleCVAPanel } from '../view/cvaView.js';
import { bindTabButtons, toggleMobileDrawer } from '../view/tabView.js';

import { init as initDatasetController, toggleAllDatasets, clearSelectedDatasets } from './datasetController.js';
import { init as initImportController } from './importController.js';
import { init as initPersistController } from './persistController.js';
import { init as initCvaController } from './cvaController.js';
import { init as initDistributionController } from './distributionController.js';

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
    document.querySelectorAll('.tab-mobile-btn')
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
  const getDisplayOpts = () => ({
    showWeight:   document.getElementById('showWeight')?.checked   ?? true,
    showFlow:     document.getElementById('showFlow')?.checked     ?? true,
    showBrewFlow: document.getElementById('showBrewFlow')?.checked ?? true,
    showTemp:     document.getElementById('showTemp')?.checked     ?? true,
    showAdc1:     document.getElementById('showAdc1')?.checked     ?? true,
    showAdc2:     document.getElementById('showAdc2')?.checked     ?? true,
  });
  const refreshCharts = () => updateCharts(datasetModel, getDisplayOpts());
  ['showWeight','showFlow','showBrewFlow','showTemp','showAdc1','showAdc2'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', refreshCharts)
  );

  // 5. Dataset control buttons
  document.querySelector('[data-action="select-all"]')
    ?.addEventListener('click', () => toggleAllDatasets(true));
  document.querySelector('[data-action="deselect-all"]')
    ?.addEventListener('click', () => toggleAllDatasets(false));
  document.querySelector('[data-action="clear-selected"]')
    ?.addEventListener('click', clearSelectedDatasets);

  // 6. Init charts
  initCharts(datasetModel, getDisplayOpts);

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

  // 10. CVA panel toggle buttons
  document.querySelectorAll('[data-toggle-panel]').forEach(btn =>
    btn.addEventListener('click', () =>
      toggleCVAPanel(btn.dataset.togglePanel, btn.dataset.panelType)
    )
  );
}

init();
