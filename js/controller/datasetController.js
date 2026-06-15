import { renderDatasetList, renderCVADatasetPanel } from '../view/datasetListView.js';
import { showDatasetBanner, hideDatasetBanner } from '../view/formView.js';
import { renderParamsCards } from '../view/paramsView.js';
import { updateCharts } from '../view/chartView.js';
import { collectDescriptiveState, collectAffectiveState,
         clearDescriptiveState, clearAffectiveState,
         restoreDescriptiveState, restoreAffectiveState } from '../view/cvaView.js';

let _appState, _datasetModel;

export function init(appState, datasetModel) {
  _appState = appState;
  _datasetModel = datasetModel;

  // Event delegation for params cards (input change + collapse toggle)
  document.getElementById('paramsContainer')?.addEventListener('input', e => {
    const input = e.target;
    const dsId = input.dataset.dsId;
    const field = input.dataset.field;
    if (dsId && field) _datasetModel.setParam(dsId, field, input.value);
  });
  document.getElementById('paramsContainer')?.addEventListener('click', e => {
    const btn = e.target.closest('.params-card-toggle');
    if (!btn) return;
    const card = document.querySelector(`.params-card[data-ds-id="${btn.dataset.dsId}"]`);
    if (card) {
      card.classList.toggle('collapsed');
      btn.textContent = card.classList.contains('collapsed') ? '▸' : '▾';
    }
  });
}

function getDisplayOptions() {
  return {
    showWeight:   document.getElementById('showWeight')?.checked   ?? true,
    showFlow:     document.getElementById('showFlow')?.checked     ?? true,
    showBrewFlow: document.getElementById('showBrewFlow')?.checked ?? true,
    showTemp:     document.getElementById('showTemp')?.checked     ?? true,
    showAdc1:     document.getElementById('showAdc1')?.checked     ?? true,
    showAdc2:     document.getElementById('showAdc2')?.checked     ?? true,
  };
}

export function refreshViews() {
  renderDatasetList(
    _datasetModel.getAll(), _datasetModel.getAllVisibility(),
    _appState.getActiveId(),
    { onToggle: toggleDataset, onLoad: loadDatasetParams, onDelete: deleteDataset }
  );
  renderCVADatasetPanel(_datasetModel.getAll(), _appState.getActiveId(), loadDatasetParams);
  renderParamsCards(_datasetModel.getAll(), _datasetModel.getAllVisibility());
  updateCharts(_datasetModel, getDisplayOptions());
}

export function loadDatasetParams(datasetId) {
  const ds = _datasetModel.get(datasetId);
  if (!ds) return;

  // Save current CVA state to old dataset before switching
  const prevId = _appState.getActiveId();
  if (prevId && _datasetModel.get(prevId) && prevId !== datasetId) {
    _datasetModel.saveCVAState(prevId, collectDescriptiveState(), collectAffectiveState(_appState));
  }

  _appState.setActiveId(datasetId);

  clearDescriptiveState();
  clearAffectiveState(_appState);
  if (ds.cva_descriptive) restoreDescriptiveState(ds.cva_descriptive);
  if (ds.cva_affective)   restoreAffectiveState(ds.cva_affective, _appState);

  showDatasetBanner(ds.name);
  refreshViews();
}

export function toggleDataset(id) {
  _datasetModel.setVisibility(id, !_datasetModel.isVisible(id));
  if (_datasetModel.isVisible(id)) loadDatasetParams(id);
  else refreshViews();
}

export function toggleAllDatasets(visible) {
  _datasetModel.setAllVisibility(visible);
  refreshViews();
}

export function deleteDataset(id) {
  const ds = _datasetModel.get(id);
  const name = ds?.name || id;
  if (!confirm(`確定要刪除「${name}」嗎？`)) return;
  _datasetModel.remove(id);
  if (_appState.isActive(id)) {
    _appState.setActiveId(null);
    hideDatasetBanner();
  }
  refreshViews();
}

export function clearSelectedDatasets() {
  const selected = _datasetModel.getIds().filter(id => _datasetModel.isVisible(id));
  if (!selected.length) { alert('目前沒有勾選任何資料集'); return; }
  if (!confirm(`確定要清除已勾選的 ${selected.length} 個資料集嗎？`)) return;

  const wasActive = selected.includes(_appState.getActiveId());
  selected.forEach(id => _datasetModel.remove(id));

  if (wasActive || _datasetModel.count() === 0) {
    _appState.setActiveId(null);
    hideDatasetBanner();
  }

  if (_datasetModel.count() > 0 && !_appState.getActiveId()) {
    const remaining = _datasetModel.getIds();
    loadDatasetParams(remaining[remaining.length - 1]);
  } else {
    refreshViews();
  }
}
