import { buildAkirakokiDataset, buildRawDataset } from '../model/csvParser.js';
import { renderDatasetList } from '../view/datasetListView.js';
import { updateCharts } from '../view/chartView.js';
import { loadDatasetParams, toggleDataset, deleteDataset, refreshViews } from './datasetController.js';

let _appState, _datasetModel;

export function init(appState, datasetModel) {
  _appState = appState;
  _datasetModel = datasetModel;

  document.getElementById('fileInput')?.addEventListener('change', handleFileSelect);
  document.getElementById('folderInput')?.addEventListener('change', handleFolderSelect);
  document.getElementById('fileInputMobile')?.addEventListener('change', handleFileSelect);
  document.getElementById('folderInputMobile')?.addEventListener('change', handleFolderSelect);

  document.getElementById('importCsvBtn')?.addEventListener('click', () =>
    document.getElementById('fileInput').click());
  document.getElementById('importFolderBtn')?.addEventListener('click', () =>
    document.getElementById('folderInput').click());
}

function getDisplayOptions() {
  return {
    showWeight: document.getElementById('showWeight')?.checked ?? true,
    showFlow:   document.getElementById('showFlow')?.checked ?? true,
    showTemp:   document.getElementById('showTemp')?.checked ?? true,
  };
}

function addDatasetToModel(ds) {
  _datasetModel.add(ds.id, ds);
  const coffeeName = document.getElementById('coffeeName');
  if (_datasetModel.count() === 1 && coffeeName && !coffeeName.value)
    coffeeName.value = ds.name;
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  let loaded = 0, failed = 0, pending = files.length;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const ok = parseAkirakokiCSV(e.target.result, file.name, true);
      ok ? loaded++ : failed++;
      if (--pending === 0) {
        alert(`✅ 匯入完成！\n成功：${loaded} 個檔案　失敗：${failed} 個檔案`);
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      failed++;
      if (--pending === 0) {
        alert(`✅ 匯入完成！\n成功：${loaded} 個檔案　失敗：${failed} 個檔案`);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  });
}

function parseAkirakokiCSV(csvText, filename, silent = false) {
  let success = false;
  try {
    Papa.parse(csvText, {
      complete(results) {
        const pd = parseAkirakokiRows(results.data);
        let ds;
        try {
          const id    = _appState.nextDatasetId();
          const color = getDatasetColor(_datasetModel.count());
          ds = buildAkirakokiDataset(id, filename.replace('.csv', ''), color, pd);
        } catch {
          if (!silent) alert('無法解析 CSV 格式');
          return;
        }
        addDatasetToModel(ds);
        refreshViews();
        loadDatasetParams(ds.id);
        success = true;
        if (!silent) alert(`✅ 成功導入：${filename}\n資料點數：${ds.time.length}`);
      },
      error: e => { if (!silent) alert('CSV 解析錯誤: ' + e.message); }
    });
  } catch (e) { if (!silent) alert('檔案讀取失敗: ' + e.message); }
  return success;
}

function parseRawDataCSV(rows, filename) {
  try {
    const parsed = parseRawDataRows(rows);
    const id     = _appState.nextDatasetId();
    const color  = getDatasetColor(_datasetModel.count());
    const ds = buildRawDataset(id, filename.replace('.csv', ''), color, parsed);
    if (!ds) return null;
    addDatasetToModel(ds);
    if (ds.beanWeight) {
      const bwEl = document.getElementById('beanWeight');
      if (bwEl && !bwEl.value) bwEl.value = ds.beanWeight;
    }
    return true;
  } catch (e) { console.error(e); return null; }
}

function handleFolderSelect(event) {
  const files = Array.from(event.target.files).filter(f => f.name.toLowerCase().endsWith('.csv'));
  if (!files.length) { alert('資料夾內找不到 CSV 檔案'); return; }
  let loaded = 0, failed = 0, pending = files.length;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      Papa.parse(e.target.result, {
        complete: results => {
          const rows = results.data;
          const fmt  = detectCSVFormat(rows);
          let ok = false;
          if (fmt === 'raw') ok = parseRawDataCSV(rows, file.name);
          if (!ok) ok = parseAkirakokiCSV(e.target.result, file.name, true);
          ok ? loaded++ : failed++;
          if (--pending === 0) {
            const ids = _datasetModel.getIds();
            refreshViews();
            if (ids.length) loadDatasetParams(ids[ids.length - 1]);
            alert(`資料夾載入完成！\n成功：${loaded}　失敗：${failed}`);
            event.target.value = '';
          }
        },
        error: () => { failed++; pending--; }
      });
    };
    reader.readAsText(file);
  });
}
