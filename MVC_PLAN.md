# MVC 架構重構 — 事前調查報告

## 一、現況問題

目前 9 個 JS 檔案以「全域函式 + 全域變數」串接，問題集中在三點：

| 問題 | 具體表現 |
|------|---------|
| **職責混雜** | `dataset.js` 同時寫 DOM、改 state、呼叫 charts；`persist.js` 同時讀 DOM、做序列化、寫 state |
| **State 任何人都可以改** | `allDatasets`、`datasetVisibility` 等全域變數在 6 個檔案中被直接讀寫，追蹤狀態流向困難 |
| **View 邏輯散落各處** | DOM 操作分散在 `dataset.js`、`persist.js`、`cva.js`、`ui.js`、`charts.js` 五個檔案 |

---

## 二、現況模組職責對應表

| 檔案 | 現有職責 | 問題 |
|------|---------|------|
| `constants.js` | 常數定義 | ✅ 乾淨，無需改動 |
| `state.js` | 全域變數宣告 | 只有宣告，沒有封裝 |
| `utils.js` | 純函式（計算、解析） | ✅ 乾淨，無需改動 |
| `charts.js` | Chart 初始化、更新、滑鼠互動 | 渲染邏輯與互動邏輯混在一起 |
| `cva.js` | DOM 生成、事件綁定、分數計算 | View 生成、Controller 事件、計算全混 |
| `ui.js` | Tab 切換、dataset 清單渲染 | 基本上是 View，但直接呼叫 Controller 層函式 |
| `dataset.js` | Dataset CRUD、表單填寫 | Model 操作 + View 更新混在同一函式裡 |
| `import.js` | 檔案讀取、CSV 解析、狀態寫入 | I/O + 解析 + state 寫入三合一 |
| `persist.js` | 存檔、讀檔、表單 collect/restore | 序列化邏輯 + DOM 讀寫 + state 更新全混 |
| `main.js` | 初始化、事件綁定 | 合理，但過度依賴全域函式 |

---

## 三、MVC 分層建議

### Model（資料 + 業務邏輯，完全不碰 DOM）

| 新檔案 | 來源 | 職責 |
|--------|------|------|
| `model/DatasetModel.js` | `state.js` + `dataset.js` | 管理 `allDatasets`、`datasetVisibility`；提供 `add / remove / toggle / getVisible` 等方法 |
| `model/AppState.js` | `state.js` | `activeDatasetId`、`affectiveScores`；提供 `setActive / getActive` |
| `model/CsvParser.js` | `utils.js` + `import.js` | `parseAkirakokiCSV`、`parseRawDataCSV`、`detectCSVFormat`（已是純函式，直接搬） |
| `model/Serializer.js` | `persist.js` | `toJSON`（allDatasets → JSON schema）、`fromJSON`（JSON → allDatasets），無 DOM |
| `constants.js` | 不變 | 保持原位 |
| `utils.js` | 不變 | 保持原位（已是純函式） |

### View（DOM 渲染 + 讀取，不含業務邏輯）

| 新檔案 | 來源 | 職責 |
|--------|------|------|
| `view/ChartView.js` | `charts.js` | 建立 Chart 實例、plugins、`updateCharts(datasets)` |
| `view/CrosshairView.js` | `charts.js` (mouse 互動部分) | 滑鼠追蹤、`syncBothCharts`、tooltip 更新 |
| `view/DatasetListView.js` | `ui.js` | `renderDatasetList(datasets, visibility)` |
| `view/CvaView.js` | `cva.js` | 建構 intensity buttons、affective grid、CATA/SCA panels |
| `view/FormView.js` | `dataset.js` + `persist.js` | 讀寫所有 `<input>` 欄位（beanWeight, tds…）；不存取 allDatasets |
| `view/TabView.js` | `ui.js` | tab 切換、mobile drawer |
| `view/TooltipView.js` | `charts.js` (externalTooltipHandler) | 左側面板 HTML 渲染邏輯 |

### Controller（事件處理，協調 Model ↔ View）

| 新檔案 | 來源 | 職責 |
|--------|------|------|
| `controller/DatasetController.js` | `dataset.js` | `onToggleDataset`, `onDeleteDataset`, `onLoadDataset` — 呼叫 Model，再通知 View 更新 |
| `controller/ImportController.js` | `import.js` | 監聽 file input、呼叫 CsvParser、寫入 DatasetModel |
| `controller/PersistController.js` | `persist.js` | save（收集 → Serializer.toJSON → 下載）、load（上傳 → Serializer.fromJSON → 更新 View） |
| `controller/CvaController.js` | `cva.js` | `selectScore`、`onOverallChange` 等事件，更新 AppState 並通知 CvaView |
| `controller/AppController.js` | `main.js` | 應用初始化，串接所有 Controller |

---

## 四、Tab HTML 分離設計

### 動機

目前三個 Tab 的 HTML 全部寫在 `main.html`，總計約 380 行。要修改 CVA Descriptive 的欄位或新增 Tab，就必須在一個大型 HTML 檔案裡定位，容易誤改到其他 Tab 的結構。

### 建議方案：`fetch()` 動態載入

> 不需要 build tool、不需要 iframe，純瀏覽器原生 API。

每個 Tab 內容獨立成一份 HTML 片段檔（只包含 Tab 內部的 HTML，不是完整頁面）。`AppController.js` 在初始化時 `fetch` 這些檔案，注入對應的容器 `<div>`，所有 DOM 依賴的 JS 初始化在注入完成後才執行。

```
tabs/
├── tab-brewing.html       ← #tab-brewing 的內部 HTML
├── tab-descriptive.html   ← #tab-descriptive 的內部 HTML
└── tab-affective.html     ← #tab-affective 的內部 HTML
```

`main.html` 的 Tab 區塊縮減為空殼：

```html
<!-- 原本 ~380 行的 tab 內容，改成三個空容器 -->
<div id="tab-brewing"    class="tab-content active"></div>
<div id="tab-descriptive" class="tab-content"></div>
<div id="tab-affective"  class="tab-content"></div>
```

`AppController.js` 啟動序列：

```js
async function init() {
  // 1. 並行載入三個 tab 模板
  await Promise.all([
    loadTab('tab-brewing',     'tabs/tab-brewing.html'),
    loadTab('tab-descriptive', 'tabs/tab-descriptive.html'),
    loadTab('tab-affective',   'tabs/tab-affective.html'),
  ]);

  // 2. DOM 已就緒，才初始化依賴 DOM 的模組
  initCharts();
  buildIntensityButtons();
  buildAffectiveGrid();
  initializeCATAPanels();
  // ...
}

async function loadTab(containerId, url) {
  const html = await fetch(url).then(r => r.text());
  document.getElementById(containerId).innerHTML = html;
}
```

### 新增 Tab 的流程（重構後）

1. 建立 `tabs/tab-newname.html`（只寫內部 HTML）
2. 在 `main.html` 加一個空容器 `<div id="tab-newname" class="tab-content">`
3. 在 `main.html` 加 Desktop 按鈕 + Mobile nav 按鈕
4. 在 `AppController.js` 的 `Promise.all` 加一行 `loadTab(...)`
5. 在對應的 Controller/View JS 裡處理初始化邏輯

不需要動任何其他 Tab 的檔案。

### Tab 檔案內容邊界說明

| 檔案 | 包含 | 不包含 |
|------|------|--------|
| `main.html` | `<head>`, 共用 header panel, tab 按鈕, mobile nav, `<script>` | 任何 Tab 內部 HTML |
| `tabs/tab-brewing.html` | 參數面板、雙圖表、左側面板、控制面板（含 `#fileInput` 等） | `<html>/<body>/<head>` |
| `tabs/tab-descriptive.html` | 6 個 CVA section（fragrance…mouthfeel）、mobile switcher | 同上 |
| `tabs/tab-affective.html` | 分數摘要、`#affectiveGrid`、mobile switcher | 同上 |

---

## 五、建議完整檔案結構

```
Coffee_Force_Campus/
├── main.html              ← 只剩 shell：header, tab 按鈕, 空容器, <script>
├── tabs/
│   ├── tab-brewing.html
│   ├── tab-descriptive.html
│   └── tab-affective.html
└── js/
    ├── constants.js          ← 不動
    ├── utils.js              ← 不動
    ├── model/
    │   ├── AppState.js
    │   ├── DatasetModel.js
    │   ├── CsvParser.js
    │   └── Serializer.js
    ├── view/
    │   ├── ChartView.js
    │   ├── CrosshairView.js
    │   ├── CvaView.js
    │   ├── DatasetListView.js
    │   ├── FormView.js
    │   ├── TabView.js
    │   └── TooltipView.js
    └── controller/
        ├── AppController.js  ← 包含 loadTab() + init() 非同步序列
        ├── CvaController.js
        ├── DatasetController.js
        ├── ImportController.js
        └── PersistController.js
```

---

## 六、技術決策：模組系統

### 選項比較

| 方式 | 優點 | 缺點 |
|------|------|------|
| **Native ES Modules** (`type="module"`) | 原生支援、真正封裝、不污染全域 | 需調整 `main.html` script tags；部分舊行為需改寫 |
| **Namespace 物件** (`App.Model.DatasetModel`) | 最小改動、維持現有載入方式 | 仍是全域，封裝只靠命名約定 |

**建議：Native ES Modules**

- 瀏覽器原生支援（不需 bundler）
- 每個檔案只 `export` 公開 API，其餘私有
- 與現有 local server（`python -m http.server`）完全相容
- `main.html` 只需一個 `<script type="module" src="js/controller/AppController.js"></script>`

---

## 七、Data Flow（重構後）

```
使用者事件
    ↓
Controller (監聽 DOM events)
    ↓
Model (更新狀態，回傳新 state)
    ↓
Controller (拿到新 state)
    ↓
View (根據 state 重新渲染)
```

具體例子 — 載入 CSV：
```
ImportController.onFileSelect(file)
  → CsvParser.parse(text)           // Model：解析
  → DatasetModel.add(parsedData)    // Model：寫入狀態
  → DatasetListView.render(...)     // View：更新清單
  → ChartView.update(...)           // View：更新圖表
  → FormView.populate(activeDs)     // View：填入表單
```

---

## 八、遷移策略（建議順序）

因為是零 build，可以**漸進式**重構，每步都能在瀏覽器驗證：

1. **Tab HTML 分離（影響最小，立即可做）**：把三個 Tab 的 HTML 剪出到 `tabs/` 目錄；`main.html` 改為空容器；`main.js` 的 `init()` 改用 `fetch` 注入後再初始化。只動 HTML 結構，JS 邏輯不變，風險極低。
2. **Model 先行**：把 `DatasetModel.js` 和 `AppState.js` 抽出，讓現有程式繼續呼叫全域函式，只是底層改用 Model 方法。
3. **View 次之**：把各 View 的純渲染函式集中，不改事件邏輯。
4. **Controller 最後**：改寫事件綁定，移除散落各檔案的 `addEventListener`，集中到 Controller。
5. **切換 ES Modules**：所有分層穩定後，統一加 `import/export`，移除全域變數。

---

## 九、不建議的做法

- **一次全部重寫**：風險高，容易引入回歸。
- **保留全域 state + 只加 namespace**：治標不治本，`allDatasets` 仍可被任意修改。
- **引入 Vue/React**：超出需求，破壞零 build 原則。
