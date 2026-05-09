/**
 * Coffee Force Campus — Integration Tests
 * Fetches real CSV files from ./data/ and tests the full parse pipeline.
 * Requires: runner.html (async-capable), PapaParse loaded globally
 * Run via: http://localhost:8000/tests/runner.html
 */

async function fetchAndParseCSV(relativePath) {
    const res = await fetch(relativePath);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${relativePath}`);
    const text = await res.text();
    return new Promise(resolve => {
        Papa.parse(text, { complete: r => resolve(r.data), skipEmptyLines: false });
    });
}

// Ground-truth values derived from the actual CSV files in ./data/
const REAL_FILES = [
    { file: '0501compulsary-rightratio.csv', date: '2026/05/01', name: '0501compulsary-rightratio', brewTime: '16:15', bw: '23',   ncols: 222, pWC0: 2.6, bC0: 0.0 },
    { file: '0501final.csv',                 date: '2026/05/01', name: '0501final',                 brewTime: '17:22', bw: '23.2', ncols: 185, pWC0: 3.0, bC0: 0.1 },
    { file: 'Dripbagsimulate-profilling.csv',    date: '2025/12/26', name: 'Dripbagsimulate-profilling',    brewTime: '17:13', bw: '10.2', ncols: 105, pWC0: 1.2, bC0: 0.0 },
    { file: 'Dripbagsimulate-profillinglv1.csv', date: '2025/12/27', name: 'Dripbagsimulate-profillinglv1', brewTime: '09:35', bw: '10.2', ncols: 128, pWC0: 1.3, bC0: 0.1 },
    { file: 'Dripbagsimulate-profillinglv2.csv', date: '2025/12/27', name: 'Dripbagsimulate-profillinglv2', brewTime: '01:04', bw: '10.1', ncols: 117, pWC0: 1.3, bC0: 0.1 },
    { file: 'Dripbagsimulate-profillinglv5.csv', date: '2025/12/26', name: 'Dripbagsimulate-profillinglv5', brewTime: '23:03', bw: '10.2', ncols: 104, pWC0: 1.8, bC0: 0.0 },
    { file: 'Dripbagsimulate-samanthalv1.csv',   date: '2025/12/25', name: 'Dripbagsimulate-samanthalv1',   brewTime: '00:44', bw: '10',   ncols: 110, pWC0: 1.0, bC0: 0.1 },
    { file: 'Dripbagsimulate-samanthalv2.csv',   date: '2025/12/25', name: 'Dripbagsimulate-samanthalv2',   brewTime: '00:24', bw: '10',   ncols: 86,  pWC0: 1.4, bC0: 0.1 },
    { file: 'Dripbagsimulate-samanthalv3.csv',   date: '2025/12/24', name: 'Dripbagsimulate-samanthalv3',   brewTime: '23:59', bw: '10',   ncols: 86,  pWC0: 1.4, bC0: 0.1 },
];

/* ─── Suite 1: format detection ─────────────────────────────── */
describe('Integration — format detection (all files → "raw")', () => {
    for (const spec of REAL_FILES) {
        test(spec.name, async () => {
            const rows = await fetchAndParseCSV(`../data/${spec.file}`);
            expect(detectCSVFormat(rows)).toBe('raw');
        });
    }
});

/* ─── Suite 2: metadata (date, name, brewTime, beanWeight) ──── */
describe('Integration — metadata extraction', () => {
    for (const spec of REAL_FILES) {
        test(spec.name, async () => {
            const rows = await fetchAndParseCSV(`../data/${spec.file}`);
            const r = parseRawDataRows(rows);
            expect(r.date).toBe(spec.date);
            expect(r.name).toBe(spec.name);
            expect(r.brewTime).toBe(spec.brewTime);
            expect(r.beanWeight).toBe(spec.bw);
        });
    }
});

/* ─── Suite 3: data column count (timeLabels length) ────────── */
describe('Integration — data column count (timeLabels)', () => {
    for (const spec of REAL_FILES) {
        test(`${spec.name} → ${spec.ncols} columns`, async () => {
            const rows = await fetchAndParseCSV(`../data/${spec.file}`);
            const r = parseRawDataRows(rows);
            expect(r.timeLabels).toHaveLength(spec.ncols);
        });
    }
});

/* ─── Suite 4: first data-point spot-check (pWC[0], bC[0]) ─── */
describe('Integration — first data point values', () => {
    for (const spec of REAL_FILES) {
        test(spec.name, async () => {
            const rows = await fetchAndParseCSV(`../data/${spec.file}`);
            const r = parseRawDataRows(rows);
            expect(r.pWC[0]).toBeCloseTo(spec.pWC0, 1);
            expect(r.bC[0]).toBeCloseTo(spec.bC0, 1);
        });
    }
});

/* ─── Suite 5: all metric arrays same length as timeLabels ──── */
describe('Integration — metric arrays length consistency', () => {
    for (const spec of REAL_FILES) {
        test(spec.name, async () => {
            const rows = await fetchAndParseCSV(`../data/${spec.file}`);
            const r = parseRawDataRows(rows);
            const n = r.timeLabels.length;
            expect(r.pWC).toHaveLength(n);
            expect(r.pWF).toHaveLength(n);
            expect(r.bC).toHaveLength(n);
            expect(r.bF).toHaveLength(n);
        });
    }
});

/* ─── Suite 6: temp array is empty (hardware records no data) ── */
describe('Integration — temp array is empty for all real files', () => {
    for (const spec of REAL_FILES) {
        test(spec.name, async () => {
            const rows = await fetchAndParseCSV(`../data/${spec.file}`);
            const r = parseRawDataRows(rows);
            expect(r.temp).toHaveLength(0);
        });
    }
});
