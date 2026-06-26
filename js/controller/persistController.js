import { getFormValues, setFormValues } from '../view/formView.js';
import { updateCharts } from '../view/chartView.js';
import { collectDescriptiveState, collectAffectiveState,
         restoreDescriptiveState, restoreAffectiveState,
         collectCVAHeaderState } from '../view/cvaView.js';
import { loadDatasetParams, refreshViews } from './datasetController.js';
import { buildEmptyDataset } from '../model/csvParser.js';
import { getDistributionState, loadDistributionState } from './distributionController.js';

let _appState, _datasetModel;

export function init(appState, datasetModel) {
  _appState = appState;
  _datasetModel = datasetModel;

  document.querySelector('.btn-save')?.addEventListener('click', saveData);
  document.querySelector('.btn-load')?.addEventListener('click', loadHistory);
  document.querySelector('.btn-load-folder')?.addEventListener('click', loadHistoryFolder);
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

function setDisplayOptions(opts) {
  if (!opts) return;
  ['showWeight','showFlow','showBrewFlow','showTemp','showAdc1','showAdc2'].forEach(k => {
    const el = document.getElementById(k);
    if (el && opts[k] !== undefined) el.checked = opts[k];
  });
}

function makeTimestamp(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${mm}${dd}${hh}${mi}`;
}

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function saveData() {
  const now = new Date();
  setFormValues({ recordTime: now.toLocaleString('zh-TW') });

  // Sync active dataset CVA state before saving
  const activeId = _appState.getActiveId();
  if (activeId && _datasetModel.get(activeId)) {
    const { name, note } = collectCVAHeaderState();
    const ds = _datasetModel.get(activeId);
    if (name) ds.name = name;
    ds.cvaNote = note;
    _datasetModel.saveCVAState(activeId, collectDescriptiveState(), collectAffectiveState(_appState));
  }

  const formVals      = getFormValues();
  const allDatasets   = _datasetModel.getAll();
  const allVisibility = _datasetModel.getAllVisibility();
  const displayOpts   = getDisplayOptions();
  const distState     = getDistributionState();
  const timestamp     = makeTimestamp(now);

  const ids = Object.keys(allDatasets);
  if (ids.length === 0) { alert('⚠️ 沒有資料集可儲存'); return; }

  ids.forEach(id => {
    const ds   = allDatasets[id];
    const name = (ds.name || 'brewing').replace(/[/\\?%*:|"<>]/g, '_');
    const file = {
      version:          5,
      schema:           'per-dataset',
      timestamp:        now.toISOString(),
      datasetId:        id,
      dataset:          ds,
      visibility:       allVisibility[id] ?? true,
      formVals: {
        coffeeName:    formVals.coffeeName,
        brewingTarget: formVals.brewingTarget,
        recordTime:    formVals.recordTime,
      },
      displayOptions:   displayOpts,
      distributionState: distState,
    };
    downloadJSON(file, `${name}_${timestamp}.json`);
  });

  alert(`✅ 已儲存 ${ids.length} 個資料集！`);
}

function importJSONData(data) {
  if (data.schema === 'per-dataset') {
    const ds = data.dataset;
    if (!ds) throw new Error('無效的 per-dataset 格式');
    const newId = _appState.nextDatasetId();
    _datasetModel.add(newId, ds);
    _datasetModel.setVisibility(newId, data.visibility ?? true);
    loadDatasetParams(newId);
    if (data.displayOptions)    setDisplayOptions(data.displayOptions);
    if (data.distributionState) loadDistributionState(data.distributionState);

  } else {
    if (data.name      !== undefined) setFormValues({ coffeeName:    data.name });
    if (data.target    !== undefined) setFormValues({ brewingTarget: data.target });
    if (data.timestamp !== undefined) setFormValues({ recordTime:    data.timestamp });

    const visibility = data.dataset_visibility || {};
    let lastAddedId = null;

    Object.entries(data.datasets || {}).forEach(([, ds]) => {
      const newId = _appState.nextDatasetId();
      _datasetModel.add(newId, ds);
      _datasetModel.setVisibility(newId, visibility[newId] ?? true);
      lastAddedId = newId;
    });

    if (!lastAddedId && (data.cva_descriptive || data.cva_affective)) {
      const newId = _appState.nextDatasetId();
      const ds = buildEmptyDataset(newId, data.name || 'Imported', '#1A237E');
      if (data.cva_descriptive) ds.cva_descriptive = data.cva_descriptive;
      if (data.cva_affective)   ds.cva_affective   = data.cva_affective;
      _datasetModel.add(newId, ds);
      _datasetModel.setVisibility(newId, true);
      lastAddedId = newId;
    }

    if (lastAddedId) {
      loadDatasetParams(lastAddedId);
      const targetDs = _datasetModel.get(lastAddedId);
      if (!targetDs?.cva_descriptive && data.cva_descriptive) restoreDescriptiveState(data.cva_descriptive);
      if (!targetDs?.cva_affective   && data.cva_affective)   restoreAffectiveState(data.cva_affective, _appState);
    } else {
      refreshViews();
    }

    if (data.displayOptions)    setDisplayOptions(data.displayOptions);
    if (data.distributionState) loadDistributionState(data.distributionState);
  }
}

function readFilesSequentially(files, onDone) {
  let idx = 0;
  const errors = [];
  function next() {
    if (idx >= files.length) { onDone(errors); return; }
    const file = files[idx++];
    if (!file.name.toLowerCase().endsWith('.json')) { next(); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      try { importJSONData(JSON.parse(ev.target.result)); }
      catch (err) { errors.push(`${file.name}: ${err.message}`); }
      next();
    };
    reader.readAsText(file);
  }
  next();
}

function loadHistory() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json'; input.multiple = true;
  input.onchange = e => {
    const files = [...e.target.files]; if (!files.length) return;
    readFilesSequentially(files, errors => {
      if (errors.length) alert(`⚠️ 部分檔案讀取失敗：\n${errors.join('\n')}`);
      else alert(`✅ 成功載入 ${files.length} 個檔案！`);
    });
  };
  input.click();
}

function loadHistoryFolder() {
  const input = document.createElement('input');
  input.type = 'file'; input.webkitdirectory = true;
  input.onchange = e => {
    const files = [...e.target.files].filter(f => f.name.toLowerCase().endsWith('.json'));
    if (!files.length) { alert('⚠️ 資料夾內沒有 JSON 檔案'); return; }
    readFilesSequentially(files, errors => {
      const ok = files.length - errors.length;
      if (errors.length) alert(`✅ 載入 ${ok} 個、失敗 ${errors.length} 個：\n${errors.join('\n')}`);
      else alert(`✅ 成功載入資料夾內 ${ok} 個檔案！`);
    });
  };
  input.click();
}
