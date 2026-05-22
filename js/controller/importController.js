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
      const isTxt = file.name.toLowerCase().endsWith('.txt');
      const finish = ok => {
        ok ? loaded++ : failed++;
        if (--pending === 0) {
          alert(`✅ 匯入完成！\n成功：${loaded} 個檔案　失敗：${failed} 個檔案`);
          event.target.value = '';
        }
      };
      if (isTxt) {
        finish(parseTxtFile(e.target.result, file.name, true));
      } else {
        // Detect raw vs Akirakoki format (same logic as handleFolderSelect)
        Papa.parse(e.target.result, {
          complete: results => {
            const rows = results.data;
            const fmt  = detectCSVFormat(rows);
            let ok = false;
            if (fmt === 'raw') ok = parseRawDataCSV(rows, file.name);
            if (!ok) ok = parseAkirakokiCSV(e.target.result, file.name, true);
            finish(ok);
          },
          error: () => finish(false)
        });
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

/**
 * Parse a .txt brewing-log file (single-line JSON format).
 * Uses parseTxtBrewingLog (utils.js) then buildRawDataset (csvParser.js).
 * Extra fields not in CSV are stored on ds.extra and printed to console.
 */
function parseTxtFile(text, filename, silent = false) {
  try {
    const parsed = parseTxtBrewingLog(text);
    if (!parsed) { if (!silent) alert('無法解析 TXT 格式'); return false; }

    const id    = _appState.nextDatasetId();
    const color = getDatasetColor(_datasetModel.count());
    // Use cupFactory name from JSON if available, otherwise use filename
    const name  = parsed.name || filename.replace('.txt', '');
    const ds    = buildRawDataset(id, name, color, parsed);
    if (!ds) { if (!silent) alert('無法建立資料集'); return false; }

    addDatasetToModel(ds);
    if (ds.beanWeight) {
      const bwEl = document.getElementById('beanWeight');
      if (bwEl && !bwEl.value) bwEl.value = ds.beanWeight;
    }
    refreshViews();
    loadDatasetParams(ds.id);

    // Log extra fields (present in TXT but absent from CSV)
    if (ds.extra) {
      console.group(`📋 ${name} — TXT 額外欄位（CSV 沒有）`);
      console.log('thermometer (實際溫度計):', ds.extra.thermometer);
      console.log('percent (萃取率/秒):', ds.extra.percent);
      console.log('coffeePowerWeight (咖啡粉重/秒):', ds.extra.coffeePowerWeight);
      console.log('ratio (水粉比數值/秒):', ds.extra.ratio);
      console.log('scale (水粉比字串/秒):', ds.extra.scale);
      console.log('beanRatioArray (豆粉比/秒):', ds.extra.beanRatioArray);
      console.log('totalBeanRatioArray (累積豆粉比字串/秒):', ds.extra.totalBeanRatioArray);
      console.log('tds:', ds.extra.tds);
      console.log('extractionRate (萃取率 %):', ds.extra.extractionRate);
      console.log('waterPowderRatio (總水粉比):', ds.extra.waterPowderRatio);
      console.log('stars (星級):', ds.extra.stars);
      console.log('fwjl (感官評分):', ds.extra.fwjl);
      console.log('beanMoDouJi (磨豆機):', ds.extra.beanMoDouJi);
      console.log('beanKeDu (研磨刻度):', ds.extra.beanKeDu);
      console.log('extraNote (備註):', ds.extra.extraNote);
      console.groupEnd();
    }

    if (!silent) alert(`✅ 成功導入：${filename}\n資料點數：${ds.time.length}`);
    return true;
  } catch (e) {
    if (!silent) alert('TXT 讀取失敗: ' + e.message);
    return false;
  }
}

function handleFolderSelect(event) {
  const files = Array.from(event.target.files).filter(f =>
    f.name.toLowerCase().endsWith('.csv') || f.name.toLowerCase().endsWith('.txt')
  );
  if (!files.length) { alert('資料夾內找不到 CSV / TXT 檔案'); return; }
  let loaded = 0, failed = 0, pending = files.length;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const isTxt = file.name.toLowerCase().endsWith('.txt');
      if (isTxt) {
        const ok = parseTxtFile(e.target.result, file.name, true);
        ok ? loaded++ : failed++;
        if (--pending === 0) {
          const ids = _datasetModel.getIds();
          refreshViews();
          if (ids.length) loadDatasetParams(ids[ids.length - 1]);
          alert(`資料夾載入完成！\n成功：${loaded}　失敗：${failed}`);
          event.target.value = '';
        }
      } else {
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
      }
    };
    reader.readAsText(file);
  });
}
