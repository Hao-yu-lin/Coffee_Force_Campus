# Tasks
## 實作流程
1. 完成實作的流程
2. 進行測試，確保功能正常運作
3. 並針對該功能實作一個測試案例，確保未來的修改不會破壞這個功能
4. 針對測試問題，重新修理，直到測試通過為止，測試失敗超過三次，則停止修理，並且回報給專案負責人，讓專案負責人來決定下一步的行動
5. 完成後，進行commit，並且在 commit message 中說明這次的修改內容，並且標註這次修改的類型（feature / fix / refactor）
6. 更新這個文件，將這次的修改內容加入到已完成的部分，並且將待實作的部分移除

## 待實作

<!-- 在這裡新增你的需求，格式如下：

### [功能名稱]
**類型**: feature / fix / refactor
**描述**: 你想要做什麼

**細節**:
- 具體需求 1
- 具體需求 2

-->

## 已完成

### [資料修正] (Round 2 — zero-inflated fix)
**類型**: fix
**完成日期**: 2026-05-09
**變更檔案**: `js/utils.js`, `js/charts.js`, `tests/unit.test.js`
- `robustYRange`: 在計算 IQR 前先過濾 |v| ≤ 0.1 的近零值，解決 flow rate 零值過多導致 IQR 崩塌的問題
- weight chart 改用 99th percentile 上限取代 IQR（單調累積資料 IQR 失效）
- flow/temp scale 重設改用 `delete` 取代 `= undefined`，確保 Chart.js 正確還原預設自動縮放
- 新增 zero-inflated 場景 unit test（73/73 通過）

### [資料修正]
**類型**: fix
**完成日期**: 2026-05-09
**變更檔案**: `js/utils.js`, `js/charts.js`, `tests/unit.test.js`
- 新增 `robustYRange(values)` 純函式（IQR 方法）：計算排除極值後的合理 Y 軸範圍
- `updateCharts()` 在 weight chart 套用 robustYRange，min 固定為 0，max 依非極值資料決定
- `updateCharts()` 在 flow/temp chart 套用 robustYRange，min/max 均依非極值資料決定（允許負值）
- 極值資料點仍會被繪製，但 Y 軸不因極值而被撐開
- 新增 8 個 `robustYRange` unit tests，全部通過（總計 72/72）

### [擴展儲存功能]
**類型**: feature
**完成日期**: 2026-05-09
**變更檔案**: `js/main.js`, `js/persist.js`
- CVA Descriptive / Affective 已逐一儲存到各 dataset 物件中，讀取歷史檔後切換資料集可正確還原
- 咖啡名稱、沖煮目標在儲存與讀取時均正確處理
- 記錄時間欄位改為只在按下「完成並儲存同步」時更新（移除 init 時的自動填入）
- 讀取歷史檔時同步還原記錄時間欄位
- CVA fallback 邏輯修正：僅在舊格式（無 per-dataset CVA）時才套用 top-level CVA，避免覆蓋已正確還原的資料
