/**
 * Coffee Force Campus — Unit Tests
 * Pure function tests (no DOM, no CDN required)
 * Tests: utils.js functions
 * Run via: tests/runner.html
 *
 * NOTE: describe / test / expect are provided by runner.html before this
 * script loads.  Do NOT re-declare them here.
 */

/* ═══════════════════════════════════════════════════
   Shared test fixtures — mirroring the real CSV files
   in Coffee_Force_Campus/data/ (all 6-row raw format)
═══════════════════════════════════════════════════ */

/** 5-point slice that mirrors Dripbagsimulate-profilling.csv */
const RAW_ROWS_5PT = [
    ['Date', 'Name', 'Second', '1', '2', '3', '4', '5'],
    ['2025/12/26', 'Dripbagsimulate-profilling', 'Pouring water cumulative(g)', '1.2', '1.9', '2.8', '3.5', '4.1'],
    ['Time', 'Bean Weight', 'Pour water flow rate(g/s)', '0', '0.7', '0.9', '0.7', '0.6'],
    ['17:13', '10.2', 'Brewing cumulative(g)', '0.0', '0.0', '0.1', '0.3', '0.7'],
    ['', '', 'Brewing flow rate(g/s)', '0', '0.0', '0.1', '0.2', '0.4'],
    ['', '', 'Temperature(\u2103)', '94.1', '93.8', '93.2', '92.8', '92.5']
];

/** 4-point slice that mirrors 0501final.csv metadata */
const RAW_ROWS_0501 = [
    ['Date', 'Name', 'Second', '1', '2', '3', '4'],
    ['2026/05/01', '0501final', 'Pouring water cumulative(g)', '2.0', '4.5', '7.3', '10.1'],
    ['Time', 'Bean Weight', 'Pour water flow rate(g/s)', '0', '2.5', '2.8', '2.8'],
    ['09:30', '23.2', 'Brewing cumulative(g)', '0.0', '0.0', '0.5', '1.5'],
    ['', '', 'Brewing flow rate(g/s)', '0', '0.0', '0.5', '1.0'],
    ['', '', 'Temperature(\u2103)', '95.0', '94.5', '94.0', '93.5']
];

/** Row with the "Tempearture" typo found in some CSV files */
const RAW_ROWS_TYPO = [
    ['Date', 'Name', 'Second', '1', '2', '3'],
    ['2025/12/25', 'Dripbagsimulate-samanthalv1', 'Pouring water cumulative(g)', '1.0', '2.0', '3.5'],
    ['Time', 'Bean Weight', 'Pour water flow rate(g/s)', '0', '1.0', '1.5'],
    ['08:00', '10', 'Brewing cumulative(g)', '0.0', '0.0', '0.2'],
    ['', '', 'Brewing flow rate(g/s)', '0', '0.0', '0.2'],
    ['', '', 'Tempearture(\u2103)', '93.0', '92.5', '92.0']
];

/* ─── Tests: detectCSVFormat ─────────────────────────────────── */
describe('detectCSVFormat', () => {
    test('returns "akirakoki" for null input', () => {
        expect(detectCSVFormat(null)).toBe('akirakoki');
    });

    test('returns "akirakoki" for empty array', () => {
        expect(detectCSVFormat([])).toBe('akirakoki');
    });

    test('returns "akirakoki" when fewer than 2 rows', () => {
        expect(detectCSVFormat([[]])).toBe('akirakoki');
    });

    test('returns "raw" for real 6-row CSV structure (many columns)', () => {
        expect(detectCSVFormat(RAW_ROWS_5PT)).toBe('raw');
    });

    test('returns "raw" for 0501final.csv structure', () => {
        expect(detectCSVFormat(RAW_ROWS_0501)).toBe('raw');
    });

    test('returns "raw" when both row[0] and row[1] have >3 columns', () => {
        const rows = [
            ['h1', 'h2', 'h3', 'h4', 'h5'],
            ['d1', 'd2', 'd3', 'd4', 'd5']
        ];
        expect(detectCSVFormat(rows)).toBe('raw');
    });

    test('returns "akirakoki" when row[0] has exactly 3 columns', () => {
        const rows = [['Second', '0', '1'], ['Flow', '0.5', '0.8']];
        expect(detectCSVFormat(rows)).toBe('akirakoki');
    });

    test('returns "akirakoki" when row[1] has only 1 column', () => {
        const rows = [['a', 'b', 'c', 'd'], ['only']];
        expect(detectCSVFormat(rows)).toBe('akirakoki');
    });
});

/* ─── Tests: parseRawDataRows — real CSV structure ───────────── */
describe('parseRawDataRows \u2014 real CSV structure', () => {
    test('returns null for empty rows', () => {
        expect(parseRawDataRows([])).toBeNull();
    });

    test('returns null when row[0] has no columns after index 2', () => {
        const rows = [['Date', 'Name', 'Second'], ['2025/01/01', 'X', 'pWC'], [], [], [], []];
        expect(parseRawDataRows(rows)).toBeNull();
    });

    test('extracts date from row[1][0] (Dripbagsimulate-profilling)', () => {
        expect(parseRawDataRows(RAW_ROWS_5PT).date).toBe('2025/12/26');
    });

    test('extracts name from row[1][1] (Dripbagsimulate-profilling)', () => {
        expect(parseRawDataRows(RAW_ROWS_5PT).name).toBe('Dripbagsimulate-profilling');
    });

    test('extracts brewTime from row[3][0]', () => {
        expect(parseRawDataRows(RAW_ROWS_5PT).brewTime).toBe('17:13');
    });

    test('extracts beanWeight as string from row[3][1] (10.2g)', () => {
        const result = parseRawDataRows(RAW_ROWS_5PT);
        expect(result.beanWeight).toBe('10.2');
    });

    test('beanWeight for 0501final is "23.2"', () => {
        expect(parseRawDataRows(RAW_ROWS_0501).beanWeight).toBe('23.2');
    });

    test('timeLabels are 1-based sequential integers', () => {
        expect(parseRawDataRows(RAW_ROWS_5PT).timeLabels).toEqual([1, 2, 3, 4, 5]);
    });

    test('timeLabels length matches number of data columns in row[0]', () => {
        const result = parseRawDataRows(RAW_ROWS_5PT);
        // row[0] has 8 total cols; slice(3) = 5 items
        expect(result.timeLabels).toHaveLength(5);
    });

    test('pWC extracted as floats from row[1] slice(3)', () => {
        expect(parseRawDataRows(RAW_ROWS_5PT).pWC).toEqual([1.2, 1.9, 2.8, 3.5, 4.1]);
    });

    test('pWF extracted as floats from row[2] slice(3)', () => {
        expect(parseRawDataRows(RAW_ROWS_5PT).pWF).toEqual([0, 0.7, 0.9, 0.7, 0.6]);
    });

    test('bC extracted as floats from row[3] slice(3)', () => {
        expect(parseRawDataRows(RAW_ROWS_5PT).bC).toEqual([0.0, 0.0, 0.1, 0.3, 0.7]);
    });

    test('bF extracted as floats from row[4] slice(3)', () => {
        expect(parseRawDataRows(RAW_ROWS_5PT).bF).toEqual([0, 0.0, 0.1, 0.2, 0.4]);
    });

    test('temp extracted as floats from row[5] slice(3)', () => {
        expect(parseRawDataRows(RAW_ROWS_5PT).temp).toEqual([94.1, 93.8, 93.2, 92.8, 92.5]);
    });

    test('all data arrays have same length as timeLabels', () => {
        const r = parseRawDataRows(RAW_ROWS_5PT);
        const n = r.timeLabels.length;
        expect(r.pWC.length).toBe(n);
        expect(r.pWF.length).toBe(n);
        expect(r.bC.length).toBe(n);
        expect(r.bF.length).toBe(n);
        expect(r.temp.length).toBe(n);
    });

    test('handles "Tempearture" typo in row[5] label (samanthalv1 format)', () => {
        const r = parseRawDataRows(RAW_ROWS_TYPO);
        expect(r.temp).toEqual([93.0, 92.5, 92.0]);
    });

    test('invalid numeric strings become 0 via parseFloat fallback', () => {
        const rows = [
            ['Date', 'Name', 'Second', '1', '2'],
            ['2025/01/01', 'Test', 'pWC', 'N/A', '5.0'],
            ['Time', 'BW', 'pWF', '', '0.5'],
            ['12:00', '10', 'bC', '0', '1.0'],
            ['', '', 'bF', '', '0.5'],
            ['', '', 'Temp', 'bad', '90.0']
        ];
        const r = parseRawDataRows(rows);
        expect(r.pWC[0]).toBe(0);   // 'N/A' → 0
        expect(r.pWF[0]).toBe(0);   // '' → 0
        expect(r.temp[0]).toBe(0);  // 'bad' → 0
        expect(r.temp[1]).toBe(90.0);
    });

    test('handles missing row[5] (no temp row) gracefully', () => {
        const rows = RAW_ROWS_5PT.slice(0, 5);  // only 5 rows
        const r = parseRawDataRows(rows);
        expect(r).toBeTruthy();
        expect(r.temp).toEqual([]);
    });
});

/* ─── Tests: parseAkirakokiRows ──────────────────────────────── */
describe('parseAkirakokiRows', () => {
    test('correctly identifies time row by "Second"', () => {
        const rows = [
            ['Second', '0', '1', '2', '3', '4'],
            ['Flow Rate', '0.5', '0.8', '1.0', '0.9', '0.7'],
            ['Water Weight', '0', '5', '12', '20', '28'],
            ['Temperature', '92', '91', '90', '89', '88']
        ];
        const pd = parseAkirakokiRows(rows);
        expect(pd.time).toEqual([0, 1, 2, 3, 4]);
        expect(pd.flow).toEqual([0.5, 0.8, 1.0, 0.9, 0.7]);
        expect(pd.weight).toEqual([0, 5, 12, 20, 28]);
        expect(pd.temp).toEqual([92, 91, 90, 89, 88]);
    });

    test('correctly identifies time row by "time" (case-insensitive)', () => {
        const rows = [
            ['time', '0', '5', '10'],
            ['Flow Rate', '1', '2', '3'],
            ['cumulative', '0', '10', '20']
        ];
        const pd = parseAkirakokiRows(rows);
        expect(pd.time).toEqual([0, 5, 10]);
        expect(pd.weight).toEqual([0, 10, 20]);
    });

    test('ignores rows that do not match any keyword', () => {
        const rows = [['SomeUnknownHeader', '1', '2', '3']];
        const pd = parseAkirakokiRows(rows);
        expect(pd.time).toHaveLength(0);
        expect(pd.weight).toHaveLength(0);
    });

    test('skips null/empty/undefined rows gracefully', () => {
        const rows = [null, [], ['Second', '0', '1', '2'], undefined];
        const pd = parseAkirakokiRows(rows);
        expect(pd.time).toEqual([0, 1, 2]);
    });

    test('filters out non-numeric values from rows', () => {
        const rows = [['Second', 'start', '0', '1', '2', 'end']];
        const pd = parseAkirakokiRows(rows);
        expect(pd.time).toEqual([0, 1, 2]);
    });

    test('identifies "Temperature" keyword (case-insensitive)', () => {
        const rows = [['TEMPERATURE', '90', '88', '86']];
        const pd = parseAkirakokiRows(rows);
        expect(pd.temp).toEqual([90, 88, 86]);
    });

    test('identifies "flow" keyword in "flow rate"', () => {
        const rows = [['Pour water flow rate(g/s)', '0', '0.5', '1.0']];
        const pd = parseAkirakokiRows(rows);
        expect(pd.flow).toEqual([0, 0.5, 1.0]);
    });

    test('identifies "cumulative" keyword for weight', () => {
        const rows = [['Brewing cumulative(g)', '0', '5', '15', '30']];
        const pd = parseAkirakokiRows(rows);
        expect(pd.weight).toEqual([0, 5, 15, 30]);
    });
});

/* ─── Tests: getAkirakokiMinLen ──────────────────────────────── */
describe('getAkirakokiMinLen', () => {
    test('returns minimum of time/weight/flow lengths', () => {
        const pd = { time: [1, 2, 3, 4, 5], weight: [1, 2, 3], flow: [1, 2, 3, 4] };
        expect(getAkirakokiMinLen(pd)).toBe(3);
    });

    test('returns 0 when time is empty', () => {
        expect(getAkirakokiMinLen({ time: [], weight: [1, 2], flow: [1, 2] })).toBe(0);
    });

    test('returns 0 when weight is empty', () => {
        expect(getAkirakokiMinLen({ time: [1, 2], weight: [], flow: [1, 2] })).toBe(0);
    });

    test('returns 0 when flow is empty', () => {
        expect(getAkirakokiMinLen({ time: [1, 2], weight: [1, 2], flow: [] })).toBe(0);
    });

    test('returns common length when all arrays are equal length', () => {
        expect(getAkirakokiMinLen({ time: [1, 2, 3], weight: [1, 2, 3], flow: [1, 2, 3] })).toBe(3);
    });
});

/* ─── Tests: calcWBrCTotal ───────────────────────────────────── */
describe('calcWBrCTotal', () => {
    const SECTIONS = ['fragrance', 'aroma', 'flavor', 'aftertaste', 'acidity', 'sweetness', 'mouthfeel', 'overall'];

    test('sums all 8 section scores correctly', () => {
        const scores = { fragrance: 7, aroma: 6, flavor: 8, aftertaste: 7, acidity: 5, sweetness: 6, mouthfeel: 6, overall: 7 };
        expect(calcWBrCTotal(scores, SECTIONS)).toBe(52);
    });

    test('treats missing sections as 0', () => {
        expect(calcWBrCTotal({}, SECTIONS)).toBe(0);
        expect(calcWBrCTotal({ fragrance: 5 }, SECTIONS)).toBe(5);
    });

    test('returns 0 for empty sections array', () => {
        expect(calcWBrCTotal({ fragrance: 9 }, [])).toBe(0);
    });

    test('minimum: all sections score 1 → total 8', () => {
        const scores = {};
        SECTIONS.forEach(s => { scores[s] = 1; });
        expect(calcWBrCTotal(scores, SECTIONS)).toBe(8);
    });

    test('maximum: all sections score 9 → total 72', () => {
        const scores = {};
        SECTIONS.forEach(s => { scores[s] = 9; });
        expect(calcWBrCTotal(scores, SECTIONS)).toBe(72);
    });
});

/* ─── Tests: calcCVAScore ────────────────────────────────────── */
describe('calcCVAScore', () => {
    test('wbrcTotal=0 → CVA score 10 (floor)', () => {
        expect(calcCVAScore(0)).toBe(10);
    });

    test('wbrcTotal=8 (all 1s) → CVA score 20', () => {
        expect(calcCVAScore(8)).toBe(20);
    });

    test('wbrcTotal=72 (all 9s) → CVA score 100 (ceiling)', () => {
        expect(calcCVAScore(72)).toBe(100);
    });

    test('wbrcTotal=40 → CVA score 60', () => {
        expect(calcCVAScore(40)).toBe(60);
    });

    test('formula: ((total/8)*10)+10 for mid-range value', () => {
        // 32 → ((32/8)*10)+10 = 40+10 = 50
        expect(calcCVAScore(32)).toBe(50);
    });

    test('formula produces float for non-multiple-of-8 total', () => {
        // 10 → ((10/8)*10)+10 = 12.5+10 = 22.5
        expect(calcCVAScore(10)).toBeCloseTo(22.5, 1);
    });
});

/* ─── Tests: buildSummaryHTML ────────────────────────────────── */
describe('buildSummaryHTML', () => {
    test('returns empty string when both arrays are empty', () => {
        expect(buildSummaryHTML([], [])).toBe('');
    });

    test('includes CVA CATA label when cataChecked is non-empty', () => {
        const html = buildSummaryHTML(['Floral', 'Berry'], []);
        expect(html).toContain('cva-summary-label cata');
    });

    test('includes each CATA item as cva-summary-tag span', () => {
        const html = buildSummaryHTML(['Floral', 'Berry'], []);
        expect(html).toContain('<span class="cva-summary-tag">Floral</span>');
        expect(html).toContain('<span class="cva-summary-tag">Berry</span>');
    });

    test('includes SCA Wheel label when scaChecked is non-empty', () => {
        const html = buildSummaryHTML([], ['Fruity', 'Citrus']);
        expect(html).toContain('cva-summary-label sca');
    });

    test('includes each SCA item as cva-summary-tag span', () => {
        const html = buildSummaryHTML([], ['Fruity']);
        expect(html).toContain('<span class="cva-summary-tag">Fruity</span>');
    });

    test('includes both CATA and SCA blocks when both are non-empty', () => {
        const html = buildSummaryHTML(['Floral'], ['Citrus Fruit']);
        expect(html).toContain('cva-summary-label cata');
        expect(html).toContain('cva-summary-label sca');
    });

    test('does NOT include CATA block when cataChecked is empty', () => {
        const html = buildSummaryHTML([], ['Fruity']);
        if (html.includes('cva-summary-label cata'))
            throw new Error('Should not contain CATA block');
    });

    test('does NOT include SCA block when scaChecked is empty', () => {
        const html = buildSummaryHTML(['Floral'], []);
        if (html.includes('cva-summary-label sca'))
            throw new Error('Should not contain SCA block');
    });
});

/* ─── Tests: getDatasetColor ─────────────────────────────────── */
describe('getDatasetColor', () => {
    test('returns first color for index 0', () => {
        expect(getDatasetColor(0)).toBe(DATASET_COLORS[0]);
    });

    test('returns second color for index 1', () => {
        expect(getDatasetColor(1)).toBe(DATASET_COLORS[1]);
    });

    test('wraps around at DATASET_COLORS.length (index = len → first color)', () => {
        const len = DATASET_COLORS.length;
        expect(getDatasetColor(len)).toBe(getDatasetColor(0));
    });

    test('wraps around correctly for len+1', () => {
        const len = DATASET_COLORS.length;
        expect(getDatasetColor(len + 1)).toBe(getDatasetColor(1));
    });

    test('all 12 DATASET_COLORS indices return distinct values', () => {
        const colors = DATASET_COLORS.map((_, i) => getDatasetColor(i));
        const unique = new Set(colors);
        expect(unique.size).toBe(DATASET_COLORS.length);
    });

    test('index 11 returns last color in DATASET_COLORS', () => {
        const last = DATASET_COLORS.length - 1;
        expect(getDatasetColor(last)).toBe(DATASET_COLORS[last]);
    });
});

/* ─── Tests: robustYRange ────────────────────────────────────── */
describe('robustYRange', () => {
    test('returns null for empty array', () => {
        expect(robustYRange([])).toBeNull();
    });

    test('returns null for fewer than 4 values', () => {
        expect(robustYRange([1, 2, 3])).toBeNull();
    });

    test('min is 0 when all values are non-negative', () => {
        const r = robustYRange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100]);
        expect(r.min).toBe(0);
    });

    test('max excludes positive spike outlier', () => {
        // normal range 1-10, spike at 100 → max should be ~10.9, not ~110
        const r = robustYRange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100]);
        expect(r.max).toBeCloseTo(10.9, 0);
    });

    test('min is negative when inlier floor is below zero', () => {
        // flow-rate-like data: normal -2 to 6, spikes at -50 and 100
        const r = robustYRange([-2, -1, 0, 1, 2, 3, 4, 5, 6, -50, 100]);
        expect(r.min).toBeLessThan(0);
    });

    test('max excludes negative spike too, keeps reasonable upper bound', () => {
        const r = robustYRange([-2, -1, 0, 1, 2, 3, 4, 5, 6, -50, 100]);
        expect(r.max).toBeCloseTo(6.8, 0);
    });

    test('handles constant values — min is 0, max has padding', () => {
        const r = robustYRange([5, 5, 5, 5, 5, 5]);
        expect(r.min).toBe(0);
        expect(r.max).toBeCloseTo(5.5, 1);
    });

    test('ignores non-finite values (NaN, Infinity)', () => {
        const r = robustYRange([1, 2, 3, 4, 5, NaN, Infinity, -Infinity]);
        expect(r).toBeTruthy();
        expect(r.min).toBe(0);
    });

    test('zero-inflated flow data: max excludes spike, uses non-zero IQR', () => {
        // ~70% zeros (between pours), normal flow 1-8 g/s, spikes at 30 and 65
        const zeros = Array(70).fill(0);
        const normal = [1, 2, 3, 4, 5, 6, 7, 8, 2, 4, 6, 8, 1, 3, 5, 7, 2, 4, 6, 3];
        const spikes = [30, 65];
        const r = robustYRange([...zeros, ...normal, ...spikes]);
        expect(r).toBeTruthy();
        expect(r.max).toBeLessThan(15);
        expect(r.min).toBe(0);
    });
});
