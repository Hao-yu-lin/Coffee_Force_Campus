// Belka × coffeeSecret 資料整合
// Port of the standalone "資料整合工具" HTML: merges a Belka refractometer CSV
// (Time / Temp / EC) into a coffeeSecret brewing-log TXT, then imports the
// merged log straight into the app (optionally downloading the merged file).
//
// Uses globals: parseBelkaCSV, mergeBelkaIntoBrewingLog (utils.js plain script)

import { parseTxtFile } from './importController.js';

let _bound = false;

export function init() {
  if (_bound) return;
  _bound = true;

  // Delegated so the cloned button inside the mobile drawer works too
  // (renderMobileDrawer copies the desktop panel's HTML, listeners included out).
  document.addEventListener('click', e => {
    if (e.target.closest('#belkaMergeBtn')) openMergeModal();
    if (e.target.closest('#belkaCloseBtn')) closeMergeModal();
    if (e.target.closest('#belkaRunBtn'))   runMerge();
  });

  document.getElementById('belkaModal')?.addEventListener('click', e => {
    if (e.target.id === 'belkaModal') closeMergeModal();   // click backdrop to close
  });
}

function openMergeModal() {
  const modal = document.getElementById('belkaModal');
  if (!modal) return;
  modal.style.display = 'flex';
  resetLog();
}

function closeMergeModal() {
  const modal = document.getElementById('belkaModal');
  if (modal) modal.style.display = 'none';
}

function resetLog() {
  const el = document.getElementById('belkaLog');
  if (el) el.innerHTML = '<span>等待操作…</span>';
}

function log(message, type = '') {
  const el = document.getElementById('belkaLog');
  if (!el) return;
  const span = document.createElement('span');
  span.className = type;
  span.textContent = message + '\n';
  el.appendChild(span);
  el.scrollTop = el.scrollHeight;
}

function clearLog() {
  const el = document.getElementById('belkaLog');
  if (el) el.innerHTML = '';
}

// FileReader rather than File.text() — matches the rest of the app and keeps
// older iOS Safari working.
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`無法讀取 ${file.name}`));
    reader.readAsText(file);
  });
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function runMerge() {
  const csvFile = document.getElementById('belkaCsvInput')?.files?.[0];
  const txtFile = document.getElementById('belkaTxtInput')?.files?.[0];

  clearLog();
  if (!csvFile || !txtFile) {
    log('錯誤：請同時選取 Belka CSV 與 coffeeSecret TXT 檔案。', 'error');
    return;
  }

  try {
    log('開始讀取檔案…');
    const [csvText, txtText] = await Promise.all([
      readFileAsText(csvFile), readFileAsText(txtFile)
    ]);

    log('正在解析 Belka CSV 資料…');
    const points = parseBelkaCSV(csvText);
    if (!points) throw new Error('CSV 欄位缺失或沒有可用資料列！請確認包含 Time, Temp, EC 欄位。');
    log(`CSV 解析成功，共讀取 ${points.length} 筆有效資料。`, 'success');

    log('正在解析 coffeeSecret TXT 結構…');
    let root;
    try { root = JSON.parse(txtText); }
    catch { throw new Error('TXT 不是有效的 JSON 格式。'); }

    log('執行時間對齊與線性內插運算…');
    const merged = mergeBelkaIntoBrewingLog(root, points);
    if (!merged) throw new Error('TXT 檔中找不到 brewingLog 結構（或沒有可對齊的秒數）。');
    log(`資料整合完畢！thermometer 已覆寫、EC 已新增，各 ${merged.length} 秒。`, 'success');

    const mergedText = JSON.stringify(merged.root);
    const baseName   = txtFile.name.replace(/\.txt$/i, '');

    if (document.getElementById('belkaDownload')?.checked) {
      const downloadName = `${baseName}_整合版.txt`;
      downloadText(mergedText, downloadName);
      log(`檔案已下載：${downloadName}`, 'success');
    }

    const ok = parseTxtFile(mergedText, `${baseName}_整合版.txt`, true);
    if (!ok) throw new Error('整合後的資料無法建立資料集。');
    log('已匯入為新的資料集，可在「沖煮紀錄」圖表中檢視。', 'success');
  } catch (error) {
    log(`處理失敗：${error.message}`, 'error');
    console.error(error);
  }
}
