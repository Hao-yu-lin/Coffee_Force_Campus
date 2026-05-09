# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

```bash
cd /path/to/Coffee_Force_Campus
python -m http.server 8000
# Then open http://localhost:8000/main.html
```

The app requires a local server because it uses `fetch`/PapaParse CSV imports that are blocked by browser CORS restrictions when opened as `file://`.

## Running tests

Open `http://localhost:8000/tests/runner.html` in the browser. There is no CLI test runner — all tests execute in-browser via the custom harness in `runner.html`.

Tests only cover pure functions in `utils.js` (no DOM). `constants.js` and `utils.js` are loaded by `runner.html` directly before `unit.test.js` so that `describe`/`test`/`expect` are available globally.

## Architecture

This is a zero-build pure front-end app: no npm, no bundler, no transpilation. JavaScript is loaded as plain `<script>` tags in `main.html`, and **load order is critical** — each module depends on globals defined by earlier scripts:

```
constants.js → state.js → utils.js → charts.js → cva.js → ui.js → dataset.js → import.js → persist.js → main.js
```

### Global state (`state.js`)

All mutable state is global:
- `allDatasets` — object keyed by integer dataset ID; each entry holds parsed CSV arrays plus CVA sub-state (`cva_descriptive`, `cva_affective`, and brewing params)
- `datasetVisibility` — per-ID boolean toggle for chart rendering
- `activeDatasetId` — which dataset the CVA tabs currently display/edit
- `weightChart`, `flowTempChart` — Chart.js instances

### CSV parsing (`utils.js`, `import.js`)

Two CSV formats are supported, detected by `detectCSVFormat()`:
- **raw** (Wang Weber): 6-row transposed structure — metadata in rows 1–3, five metric arrays across columns. Parsed by `parseRawDataRows()`.
- **akirakoki**: column-per-second layout, identified by row headers (`Second`, `Flow Rate`, `cumulative`, `Temperature`). Parsed by `parseAkirakokiRows()`.

`utils.js` contains only pure functions (no DOM) and is the sole unit-tested module.

### CVA system (`cva.js`, `persist.js`)

The three tabs share data through `activeDatasetId`:
- **CVA Descriptive** — per-section intensity buttons, CATA checkboxes, SCA Wheel checkboxes, and free-text notes. State collected/restored by `collectDescriptiveState()` / `restoreDescriptiveState()` in `persist.js`.
- **CVA Affective** — 8 scored sections (`AFFECTIVE_SECTIONS` in `constants.js`); scores drive WBrC total and CVA 100-pt conversion via `calcWBrCTotal()` / `calcCVAScore()` in `utils.js`.

Saving (`saveData()`) downloads a JSON file (version 3 schema). Loading (`loadHistory()`) reads that JSON back and restores full state.

### Responsive layout

Desktop and mobile share the same HTML but show different elements via CSS (`display:none` toggling). Mobile has a bottom `<nav class="tabs-mobile">` and a collapsible drawer (`#mobileControlDrawer`) that clones the desktop control panel content at runtime.
