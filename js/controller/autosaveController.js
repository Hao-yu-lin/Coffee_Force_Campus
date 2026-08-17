// ES Module — 自動備份 + 離開前警告
//
// 兩層保護，避免重新整理／關掉分頁時資料消失：
//   1. 每次變動後把整個工作階段寫進 localStorage，下次開啟時詢問是否復原。
//   2. 距離上次「完成並儲存同步」之後若還有變動，離開頁面前跳出瀏覽器的確認對話框。
//
// 備份只留最新一份（單一 key），成功匯出 JSON/ZIP 後由 persistController 呼叫
// markSaved() 解除「未儲存」狀態。

import { getFormValues, setFormValues } from '../view/formView.js';
import { getDisplayOptions, setDisplayOptions } from '../view/displayOptions.js';
import { getAxisRangeValues, setAxisRangeValues } from '../view/axisRange.js';
import { collectDescriptiveState, collectAffectiveState,
         collectCVAHeaderState } from '../view/cvaView.js';
import { getDistributionState, loadDistributionState } from './distributionController.js';
import { loadDatasetParams, refreshViews } from './datasetController.js';

const STORAGE_KEY = 'cfc_autosave_v1';
const DEBOUNCE_MS = 800;      // 打字停下後多久寫入
const POLL_MS     = 3000;     // 沒有 input 事件的變動（匯入、刪除…）靠輪詢補抓
const MAX_BYTES   = 4 * 1024 * 1024;   // localStorage 一般上限約 5MB，留點餘裕

let _appState, _datasetModel;
let lastWritten     = null;   // 上次寫進 localStorage 的內容（避免重複寫）
let lastExported    = null;   // 上次按下儲存時的內容（比對是否有未儲存變動）
let dirtySinceExport = false;
let quotaWarned     = false;
let debounceTimer   = null;

// ── 快照 ──────────────────────────────────────────────────────────────────────

/** CVA 分頁的輸入還停在 DOM 裡，先同步回 model，備份才不會少一段。 */
function syncActiveCVA() {
  const activeId = _appState.getActiveId();
  const ds = activeId && _datasetModel.get(activeId);
  if (!ds) return;
  const { name, note } = collectCVAHeaderState();
  if (name) ds.name = name;
  ds.cvaNote = note;
  _datasetModel.saveCVAState(activeId,
    collectDescriptiveState(), collectAffectiveState(_appState));
}

function buildSnapshot() {
  syncActiveCVA();
  return {
    activeId:          _appState.getActiveId(),
    datasets:          _datasetModel.getAll(),
    visibility:        _datasetModel.getAllVisibility(),
    formVals:          getFormValues(),
    displayOptions:    getDisplayOptions(),
    axisRanges:        getAxisRangeValues(),
    distributionState: getDistributionState(),
  };
}

function snapshotHasContent(snap) {
  return Object.keys(snap.datasets || {}).length > 0
      || Object.keys(snap.distributionState?.datasets || {}).length > 0;
}

// ── 寫入 ──────────────────────────────────────────────────────────────────────

function setStatus(text, warn = false) {
  const el = document.getElementById('autosaveStatus');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('warn', warn);
}

function hhmm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** 建快照 → 和上次比對 → 有變才寫。也順便更新「未儲存」旗標。 */
export function flush() {
  let body;
  try { body = JSON.stringify(buildSnapshot()); }
  catch (err) { console.warn('[autosave] 無法序列化狀態', err); return; }

  dirtySinceExport = body !== lastExported;
  if (body === lastWritten) return;

  const snap = JSON.parse(body);
  if (!snapshotHasContent(snap)) {
    // 全空（例如剛清除所有資料集）→ 不要留下舊備份誤導下次開啟
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    lastWritten = body;
    return;
  }

  const now = new Date();
  const payload = `{"version":1,"savedAt":"${now.toISOString()}","snapshot":${body}}`;
  if (payload.length > MAX_BYTES) {
    if (!quotaWarned) {
      quotaWarned = true;
      console.warn('[autosave] 資料量超過備份上限，已略過自動備份');
      setStatus('⚠️ 資料過大，未自動備份', true);
    }
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, payload);
    lastWritten = body;
    quotaWarned = false;
    setStatus(`已自動備份 ${hhmm(now)}`);
  } catch (err) {
    if (!quotaWarned) {
      quotaWarned = true;
      console.warn('[autosave] 寫入 localStorage 失敗', err);
      setStatus('⚠️ 自動備份失敗，請手動儲存', true);
    }
  }
}

function schedule() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(flush, DEBOUNCE_MS);
}

/** persistController 匯出成功後呼叫：此刻的狀態視為「已存檔」。 */
export function markSaved() {
  try { lastExported = JSON.stringify(buildSnapshot()); }
  catch { lastExported = null; }
  dirtySinceExport = false;
  setStatus(`已存檔 ${hhmm(new Date())}`);
}

/** 手動丟掉備份（例如使用者確認不需要復原）。 */
export function clearAutosave() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  lastWritten = null;
}

// ── 復原 ──────────────────────────────────────────────────────────────────────

function restore(snap) {
  _datasetModel.replaceAll(snap.datasets || {}, snap.visibility || {});

  // replaceAll() 會重新分配色相；把使用者自訂的顏色放回去
  Object.entries(snap.datasets || {}).forEach(([id, saved]) => {
    const live = _datasetModel.get(id);
    if (live && saved.color) live.color = saved.color;
  });

  // 新資料集的 ID 不能和復原回來的撞號
  const maxIdx = Object.keys(snap.datasets || {})
    .map(id => parseInt(String(id).replace('dataset_', ''), 10))
    .filter(Number.isFinite)
    .reduce((m, n) => Math.max(m, n), -1);
  _appState.setCounter(maxIdx + 1);

  if (snap.formVals)          setFormValues(snap.formVals);
  if (snap.displayOptions)    setDisplayOptions(snap.displayOptions);
  if (snap.axisRanges)        setAxisRangeValues(snap.axisRanges);
  if (snap.distributionState) loadDistributionState(snap.distributionState);

  if (snap.activeId && _datasetModel.get(snap.activeId)) loadDatasetParams(snap.activeId);
  else refreshViews();
}

/**
 * 開啟頁面時提示可以接續上次的資料。
 *
 * 用頁面內的橫幅而不是 confirm()：confirm 會擋住載入，而且手滑按到「取消」
 * 就再也叫不回來。橫幅按「先不要」只是收起來，備份仍留在 memory 裡，等使用者
 * 真的開始做新東西才被新的快照覆蓋。
 */
function offerRestore() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { return; }
  if (!raw) return;

  let payload;
  try { payload = JSON.parse(raw); } catch { clearAutosave(); return; }

  const snap = payload?.snapshot;
  if (!snap || !snapshotHasContent(snap)) { clearAutosave(); return; }

  const brewCount = Object.keys(snap.datasets || {}).length;
  const distCount = Object.keys(snap.distributionState?.datasets || {}).length;
  const when = payload.savedAt
    ? new Date(payload.savedAt).toLocaleString('zh-TW', { hour12: false })
    : '上次';

  const bar = document.createElement('div');
  bar.className = 'autosave-restore-bar';
  bar.innerHTML = `
    <span class="autosave-restore-text">
      🔄 偵測到未儲存的自動備份（${when}）：沖煮紀錄 ${brewCount} 筆、粒徑分布 ${distCount} 筆
    </span>
    <button type="button" class="autosave-restore-yes">復原</button>
    <button type="button" class="autosave-restore-no">先不要</button>`;

  bar.querySelector('.autosave-restore-yes').addEventListener('click', () => {
    if (_datasetModel.count() > 0 &&
        !confirm('復原會取代目前畫面上的資料集，確定嗎？')) return;
    restore(snap);
    lastExported = null;              // 復原的資料還沒匯出成檔案
    setStatus('已復原上次的自動備份');
    bar.remove();
  });
  bar.querySelector('.autosave-restore-no').addEventListener('click', () => bar.remove());

  document.body.appendChild(bar);
}

// ── init ──────────────────────────────────────────────────────────────────────

export function init(appState, datasetModel) {
  _appState = appState;
  _datasetModel = datasetModel;

  // 起始基準：一開始的空白畫面算「已存檔」，所以純瀏覽不會被離開警告打擾
  try { lastExported = JSON.stringify(buildSnapshot()); } catch { lastExported = null; }

  offerRestore();

  // 打字／勾選 → 立刻排程；匯入、刪除等不觸發 input 的變動 → 靠輪詢
  document.addEventListener('input',  schedule, true);
  document.addEventListener('change', schedule, true);
  setInterval(flush, POLL_MS);

  // 手機切到背景／關閉分頁時 beforeunload 不一定會跑，pagehide 比較可靠
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  window.addEventListener('beforeunload', e => {
    flush();                       // 離開前最後補一次備份
    if (!dirtySinceExport) return; // 已存過檔就不打擾
    // 文字由瀏覽器決定，這兩行只是「請顯示確認框」的通用寫法
    e.preventDefault();
    e.returnValue = '';
    return '';
  });
}
