# Tasks
## 實作流程
1. 完成實作的流程
2. 進行測試，確保功能正常運作
3. 並針對該功能實作一個測試案例，確保未來的修改不會破壞這個功能
4. 針對測試問題，重新修理，直到測試通過為止，測試失敗超過三次，則停止修理，並且回報給專案負責人，讓專案負責人來決定下一步的行動
5. 完成後，進行commit，並且在 commit message 中說明這次的修改內容，並且標註這次修改的類型（feature / fix / refactor）
6. 更新這個文件，將帶實作的資料複製到已完成，將這次的修改內容加入到已完成的部分

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

### [多資料集分區著色模式切換]
**類型**: feature
**完成日期**: 2026-05-22
**變更檔案**: `js/view/distributionView.js`, `tests/unit.test.js`

- **1 個資料集**：維持現行效果，每根長條直接以區間色著色
- **2 個以上資料集**：自動切換為「背景帶」模式
  - 長條圖恢復資料集顏色，確保可區分不同資料集
  - 新增 `zoneBandPlugin`（`beforeDatasetsDraw`）：依各資料集累積 % 的平均值計算每個 bin 所屬區間，將連續同區間 bin 合併為一個半透明背景矩形帶（~16% 不透明度）
  - 區間邊界以細虛線標示
- 模式切換完全自動，無需用戶操作
- 新增 7 個 `buildZoneBands` 單元測試（全數通過）

### [粒徑分布分區著色]
**類型**: feature
**完成日期**: 2026-05-22
**變更檔案**: `tabs/tab-distribution.html`, `js/view/distributionView.js`, `js/controller/distributionController.js`, `tests/unit.test.js`

- 右側面板新增「分區著色」區塊，預設三個區間（0–25%、25–75%、75–100%），以累積分布百分比為分界依據
- 每個區間可編輯上界（%）、選擇顏色、或刪除；最後一個區間的上界固定為 100%
- `[+ 新增]` 按鈕：對最後一個區間取中點，自動插入新區間
- 長條圖每根 bar 的顏色依其累積分布中點（midCum = (prev + curr) / 2）落在哪個區間自動著色；無區間定義時退回資料集原色
- 所有邊界修改、顏色變更、新增/刪除皆即時重繪（無需 Apply）
- 新增 6 個 `getZoneColor` 單元測試（全數通過）

### [粒徑分布顯示切換]
**類型**: feature
**完成日期**: 2026-05-22
**變更檔案**: `tabs/tab-distribution.html`, `js/view/distributionView.js`, `js/controller/distributionController.js`, `js/utils.js`, `tests/unit.test.js`

- 粒徑分布右側控制面板新增「數據顯示」區塊，包含兩個 checkbox：「顯示每單位分布」與「顯示累積分布」，預設皆勾選
- 取消「顯示每單位分布」→ 隱藏所有長條圖（bar datasets）；取消「顯示累積分布」→ 隱藏所有折線圖（line datasets）；可單獨或同時切換
- `updateDistributionChart` 新增 `showBars` / `showCumulative` 參數，控制是否將對應類型 dataset 加入圖表
- `getBinSettings()` 讀取兩個新 checkbox 的狀態，傳入 `updateDistributionChart`
- 將 `parseTxt` 的純函式邏輯移至 `utils.js` 命名為 `parseParticleDiameters`（全域可測試），`distributionController.js` 改為直接呼叫全域函式
- 新增 9 個 `parseParticleDiameters` 單元測試（全數通過）

### [即時水粉比]
**類型**: feature
**完成日期**: 2026-05-22
**變更檔案**: `js/view/chartView.js`

- weight 圖右側新增 `yRatio` 第二 Y 軸，範圍 `[0, yMax / minBeanWeight]`，僅在有 beanWeight 的資料集時自動顯示
- 新增 `horizontalRatioLinePlugin`：滑鼠 hover 時在 weight 圖繪製水平虛線，並在右側顯示即時水粉比（`weight / beanWeight`，小數一位，每個資料集各自計算）
- `updateCharts` 在每個 weight dataset 物件上附加 `beanWeight` 欄位，供 plugin 讀取；不再新增額外的 ratio dataset（消除第二條折線）
- 水粉比數值 = 當前游標位置的 weight ÷ 對應資料集的 beanWeight（不依賴 `extra.ratio`）

### [支援匯入 TXT 沖煮紀錄]
**類型**: feature
**完成日期**: 2026-05-15
**變更檔案**: `js/utils.js`, `js/model/csvParser.js`, `js/controller/importController.js`, `tests/unit.test.js`

- 新增 `parseTxtBrewingLog(jsonText)` 純函式（`utils.js`）：解析單行 JSON 格式的 `.txt` 沖煮紀錄，回傳與 `parseRawDataRows` 相同的結構供 `buildRawDataset` 使用
- TXT → CSV 欄位對應：`log.total → pWC`、`log.size → pWF`、`log.adc1 → bC`、`log.bsize → bF`、`log.temperature → temp`
- `buildRawDataset`（`csvParser.js`）加入 `extra` 欄位傳遞，若 parsed 含 extra 則一併存入 dataset
- `importController.js` 新增 `parseTxtFile()`，並在 `handleFileSelect` / `handleFolderSelect` 以副檔名判斷路由；TXT 匯入成功後在 console 印出所有 extra 欄位
- 新增 18 個 `parseTxtBrewingLog` 單元測試，全數通過

**TXT 比 CSV 多出的欄位（已存入 `ds.extra`）：**
| 欄位 | 說明 |
|------|------|
| `thermometer` | 實際溫度計讀值（vs 秤上的溫度感測器） |
| `percent` | 每秒萃取率 |
| `coffeePowerWeight` | 每秒咖啡粉重 |
| `ratio` | 每秒水粉比（數值） |
| `scale` | 每秒水粉比（字串） |
| `beanRatioArray` | 每秒豆粉比 |
| `totalBeanRatioArray` | 累積豆粉比（字串） |
| `tds` | TDS 值 |
| `extractionRate` | 萃取率 (%) |
| `waterPowderRatio` | 總水粉比 |
| `stars` | 使用者星級評分 |
| `fwjl` | 感官評分 `{fw, sw, tw, chd, yy, ph}` |
| `beanMoDouJi` | 磨豆機型號 |
| `beanKeDu` | 研磨刻度 |
| `extraNote` | 自由文字備註 |

### [粒徑分布圖 Tab]
**類型**: feature
**完成日期**: 2026-05-15
**變更檔案**: `tabs/tab-distribution.html`, `js/model/particleModel.js`, `js/view/distributionView.js`, `js/controller/distributionController.js`, `js/controller/appController.js`, `main.html`, `css/style.css`
- 新增「📊 粒徑分布」Tab（第四個桌面 / 行動 Tab）
- 支援匯入多個 `.txt` / `.csv` 檔案（格式：`idx,area,diameter` 逗號分隔），自動解析 `diameter` 欄位
- 兩種分布模式：**粒徑計數**（每 bin 顆粒數比例）、**重量估算**（weight ∝ d³）
- 自動過濾離群值（保留 median ± 2σ 範圍內的資料點）
- Chart.js 混合圖：柱狀圖（左 y 軸 = 百分比）＋折線圖（右 y 軸 = 累積百分比 0–115%）
- 可調整 X 最小值、最大值、區間寬度，變更即時重繪
- 多資料集同圖顯示，顏色取自 `DATASET_COLORS`，半透明柱狀 + 實線累積
- 右側控制面板：全選/全不選切換、逐一顯示切換、清除全部、📥 下載圖表 PNG
- `css/style.css` 補上 `.param-item select` 樣式以統一外觀
- 所有事件以 `addEventListener` 綁定，無 `onclick` 屬性；127/127 測試全數通過

### [MVC架構]
**類型**: refactor
**完成日期**: 2026-05-09
**變更檔案**: `main.html`, `tabs/tab-brewing.html`, `tabs/tab-descriptive.html`, `tabs/tab-affective.html`, `js/model/appState.js`, `js/model/datasetModel.js`, `js/model/csvParser.js`, `js/view/chartView.js`, `js/view/cvaView.js`, `js/view/datasetListView.js`, `js/view/formView.js`, `js/view/tabView.js`, `js/controller/appController.js`, `js/controller/datasetController.js`, `js/controller/importController.js`, `js/controller/persistController.js`, `js/controller/cvaController.js`, `tests/runner.html`
- 全面改寫為 ES Module MVC 架構；舊 `js/state.js`, `charts.js`, `cva.js`, `ui.js`, `dataset.js`, `import.js`, `persist.js`, `main.js` 全部刪除
- Model 層：`AppState`（activeId / counter / affectiveScores）、`DatasetModel`（datasets / visibility）、`CsvParser`（buildAkirakokiDataset / buildRawDataset）
- View 層：`ChartView`（圖表初始化、滑鼠連動、tooltip）、`CvaView`（強度按鈕、CATA/SCA、收集/還原狀態）、`DatasetListView`、`FormView`、`TabView`
- Controller 層：`AppController`（入口，並行 fetch 三個 tab HTML）、`DatasetController`、`ImportController`、`PersistController`、`CvaController`
- 三個 Tab 內容獨立為 `tabs/tab-brewing.html`、`tabs/tab-descriptive.html`、`tabs/tab-affective.html`，由 `fetch()` + `Promise.all` 動態載入
- 移除所有 `onclick` 屬性，改用 `addEventListener`；按鈕以 `data-tab`、`data-action`、`data-toggle-panel` 識別
- `constants.js` / `utils.js` 維持 plain script（不加 export），確保測試環境相容
- 修復 `runner.html` 缺少 `toBeLessThan` matcher；測試 127/127 全部通過

### [修改滑鼠互動的邏輯]
**類型**: refactor
**完成日期**: 2026-05-09
**變更檔案**: `js/charts.js`
- 移除 Chart.js `afterEvent`/`onHover` 機制，改為直接監聽兩個 canvas 的 `mousemove`
- `handleChartMouseMove`：從像素位置計算 index（chartArea 邊界 + ratio），確保滑動即時對應
- `syncBothCharts(newIdx, sourceChart, pos)`：同時更新兩圖 `setActiveElements`；source chart 觸發 tooltip 更新左側面板，另一圖隱藏 tooltip 避免覆蓋
- `handleChartMouseLeave`：顯式清除游標狀態並重置左側面板文字
- 未包含該 x 點資料的 dataset 自動略過，不加入 active elements
- `events: ['click']` 關閉 Chart.js 自動 hover 偵測，避免與手動邏輯衝突

### [bug 修正] weight ↔ flow/temp 游標連動
**類型**: fix
**完成日期**: 2026-05-09
**變更檔案**: `js/charts.js`
- 移除 `options.onHover` 回呼（`onHoverSync`）與 `mouseleave` DOM 監聽器
- 新增 `crosshairSyncPlugin`（`afterEvent` hook）：`afterEvent` 在 Chart.js 更新 `getActiveElements()` 後才執行，確保 `crosshairIndex` 永遠拿到當前幀的正確 index，解決 `onHover` 在來源圖重繪後才觸發造成 flow/temp 垂直線延遲一幀的問題

### [圖表顯示修正]
**類型**: fix
**完成日期**: 2026-05-09
**變更檔案**: `js/charts.js`
- x 軸改用各資料集的 `d.time` 實際秒數作為 labels，並以兩圖最長資料集的時間範圍對齊，解決兩圖 x 軸顯示範圍不一致問題
- `verticalHoverLinePlugin` 改用 `crosshairIndex`／`pinnedIndex` 直接決定繪製位置，不再依賴 `chart.tooltip._active`，修正從 weight 圖移動時 flow/temp 垂直線未更新的問題
- 新增 fallback：無資料集時改從 `chart.scales.x.getPixelForValue(label)` 取得垂直線 x 座標
- `pinnedMarkerPlugin` 改為滑鼠懸停時顯示空心圓（白底＋彩色邊框），點擊固定後顯示實心圓
- `updateCharts()` 每次更新時明確設定 `flowTempChart.options.scales.y.min = -20`、`max = 20`，確保 y 軸範圍不被覆蓋

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
