import { getFormValues, setFormValues } from '../view/formView.js';
import { updateCharts } from '../view/chartView.js';
import { collectDescriptiveState, collectAffectiveState,
         restoreDescriptiveState, restoreAffectiveState } from '../view/cvaView.js';
import { loadDatasetParams, refreshViews } from './datasetController.js';

let _appState, _datasetModel;

export function init(appState, datasetModel) {
  _appState = appState;
  _datasetModel = datasetModel;

  document.querySelector('.btn-save')?.addEventListener('click', saveData);
  document.querySelector('.btn-load')?.addEventListener('click', loadHistory);
}

function getDisplayOptions() {
  return {
    showWeight: document.getElementById('showWeight')?.checked ?? true,
    showFlow:   document.getElementById('showFlow')?.checked ?? true,
    showTemp:   document.getElementById('showTemp')?.checked ?? true,
  };
}

function saveData() {
  const now = new Date().toLocaleString('zh-TW');
  setFormValues({ recordTime: now });

  const activeId = _appState.getActiveId();
  if (activeId && _datasetModel.get(activeId)) {
    const formVals = getFormValues();
    ['beanWeight','totalWater','grindSize','waterTemp','bloomTime','tds','totalTime'].forEach(k => {
      _datasetModel.setParam(activeId, k, formVals[k]);
    });
    _datasetModel.saveCVAState(activeId, collectDescriptiveState(), collectAffectiveState(_appState));
  }

  const formVals = getFormValues();
  const data = {
    version: 3,
    name:      formVals.coffeeName,
    target:    formVals.brewingTarget,
    timestamp: formVals.recordTime,
    activeDatasetId: _appState.getActiveId(),
    datasets:           _datasetModel.getAll(),
    dataset_visibility: _datasetModel.getAllVisibility(),
    cva_descriptive: collectDescriptiveState(),
    cva_affective:   collectAffectiveState(_appState)
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${data.name || 'brewing'}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  alert('✅ 資料已完整儲存！');
}

function loadHistory() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.name      !== undefined) setFormValues({ coffeeName:    data.name });
        if (data.target    !== undefined) setFormValues({ brewingTarget: data.target });
        if (data.timestamp !== undefined) setFormValues({ recordTime:    data.timestamp });
        if (data.datasets) {
          _datasetModel.replaceAll(data.datasets, data.dataset_visibility || {});
          _appState.setCounter(Object.keys(data.datasets).length);
          refreshViews();
          const targetId = (data.activeDatasetId && _datasetModel.get(data.activeDatasetId))
            ? data.activeDatasetId : _datasetModel.getIds()[0];
          if (targetId) loadDatasetParams(targetId);
          const targetDs = _datasetModel.get(targetId);
          if (!targetDs?.cva_descriptive && data.cva_descriptive) restoreDescriptiveState(data.cva_descriptive);
          if (!targetDs?.cva_affective   && data.cva_affective)   restoreAffectiveState(data.cva_affective, _appState);
        }
        alert(`✅ 歷史檔案「${file.name}」讀取成功！`);
      } catch (err) { alert('❌ 讀取失敗：' + err.message); }
    };
    reader.readAsText(file);
  };
  input.click();
}
