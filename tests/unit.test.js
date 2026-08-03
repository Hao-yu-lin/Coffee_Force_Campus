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

/* ─── Tests: parseTxtBrewingLog ─────────────────────────────── */

/** Minimal valid TXT fixture (3 data points) */
const MINIMAL_TXT = JSON.stringify({
    id: 1700000000000,
    json: {
        filterCupModel: 2,
        cupFactory: 'TestCup_ABC',
        beanTypeSelected: 'single',
        singleBean: { name: 'Ethiopia', weight: 18.5, bakeDate: '', bakeDegree: 0 },
        mixedBean: { bean1: { weight: 0 }, bean2: { weight: 0 },
                     bean3: { weight: 0 }, bean4: { weight: 0 } },
        tds: '1.35',
        extractionRate: '18.5',
        waterPowderRatio: '1 : 15',
        stars: 4,
        fwjl: { fw: 4, sw: 5, tw: 5, chd: 4, yy: 5, ph: 4 },
        beanMoDouJi: 'EG1',
        beanKeDu: '3.0',
        extraNote: 'test note',
        brewingLog: {
            adc1:        [0, 1.2, 3.5],
            adc2:        [2.0, 5.0, 9.0],
            total:       [2.0, 5.0, 9.0],
            size:        [2.0, 3.0, 4.0],
            bsize:       [0,   1.2, 2.3],
            temperature: [93, 92.5, 92.0],
            thermometer: [null, null, null],
            percent:     [0, 0.5, 1.0],
            coffeePowerWeight: [18.5, 18.5, 18.5],
            ratio:       [0, 1, 2],
            scale:       ['1:0', '1:0.3', '1:0.5'],
            beanRatioArray:      [0, 0.1, 0.2],
            totalBeanRatioArray: ['1:0', '1:0.1', '1:0.2'],
            period: 2
        }
    }
});

/** TXT with mixedBean only (no singleBean weight) */
const MIXED_BEAN_TXT = JSON.stringify({
    id: 1700000001000,
    json: {
        cupFactory: 'MixCup',
        beanTypeSelected: 'mixed',
        singleBean: { weight: 0 },
        mixedBean: {
            bean1: { weight: '14' }, bean2: { weight: '6' },
            bean3: { weight: 0 },   bean4: { weight: 0 }
        },
        brewingLog: {
            adc1: [0, 1], total: [1, 2], size: [1, 1],
            bsize: [0, 1], temperature: [90, 89], period: 1
        }
    }
});

/** Belka-merged TXT — thermometer overwritten, EC added (3 seconds) */
const MERGED_TXT = JSON.stringify({
    id: 1700000003000,
    json: {
        cupFactory: 'MergedCup',
        singleBean: { weight: 15 },
        brewingLog: {
            adc1: [0, 1, 2], adc2: [1, 2, 3], total: [1, 3, 5],
            size: [1, 2, 2], bsize: [0, 1, 1], temperature: [90, 91, 92],
            thermometer: [56.2, 57.4, 58.1],
            EC:          [0.4, 1.9, 2.9],
            period: 2
        }
    }
});

describe('parseTxtBrewingLog', () => {
    test('returns null for invalid JSON', () => {
        expect(parseTxtBrewingLog('not json')).toBeNull();
    });

    test('returns null when brewingLog is missing', () => {
        expect(parseTxtBrewingLog(JSON.stringify({ id: 1, json: {} }))).toBeNull();
    });

    test('returns null when brewingLog arrays are empty', () => {
        const txt = JSON.stringify({ id: 1, json: { brewingLog: { adc1: [], total: [] } } });
        expect(parseTxtBrewingLog(txt)).toBeNull();
    });

    test('parses timeLabels as 1-indexed seconds', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.timeLabels).toEqual([1, 2, 3]);
    });

    test('maps log.total to pWC (pouring water cumulative)', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.pWC).toEqual([2.0, 5.0, 9.0]);
    });

    test('maps log.size to pWF (pour water flow rate)', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.pWF).toEqual([2.0, 3.0, 4.0]);
    });

    test('maps log.adc1 to bC (brewing cumulative)', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.bC).toEqual([0, 1.2, 3.5]);
    });

    test('maps log.bsize to bF (brewing flow rate)', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.bF).toEqual([0, 1.2, 2.3]);
    });

    test('maps log.temperature to temp', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.temp).toEqual([93, 92.5, 92.0]);
    });

    test('reads singleBean weight as beanWeight string', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.beanWeight).toBe('18.5');
    });

    test('sums mixedBean weights when singleBean weight is 0', () => {
        const result = parseTxtBrewingLog(MIXED_BEAN_TXT);
        expect(result.beanWeight).toBe('20');
    });

    test('reads cupFactory as name', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.name).toBe('TestCup_ABC');
    });

    test('extra.tds is present', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.extra.tds).toBe('1.35');
    });

    test('extra.extractionRate is present', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.extra.extractionRate).toBe('18.5');
    });

    test('extra.stars is present', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.extra.stars).toBe(4);
    });

    test('extra.fwjl is present', () => {
        const result = parseTxtBrewingLog(MINIMAL_TXT);
        expect(result.extra.fwjl).toEqual({ fw: 4, sw: 5, tw: 5, chd: 4, yy: 5, ph: 4 });
    });

    test('null values in arrays are converted to 0', () => {
        const txt = JSON.stringify({
            id: 1,
            json: {
                cupFactory: 'X',
                singleBean: { weight: 10 },
                brewingLog: {
                    adc1: [null, 1], total: [null, 2],
                    size: [null, 1], bsize: [null, 0],
                    temperature: [null, 90], period: 1
                }
            }
        });
        const result = parseTxtBrewingLog(txt);
        expect(result.pWC[0]).toBe(0);
        expect(result.temp[0]).toBe(0);
    });

    test('thermometer is null when the array holds only nulls', () => {
        // MINIMAL_TXT mirrors an un-merged export: thermometer = [null,null,null]
        expect(parseTxtBrewingLog(MINIMAL_TXT).thermometer).toBeNull();
    });

    test('ec is null when brewingLog has no EC array', () => {
        expect(parseTxtBrewingLog(MINIMAL_TXT).ec).toBeNull();
    });

    test('thermometer and ec are returned for a Belka-merged log', () => {
        const result = parseTxtBrewingLog(MERGED_TXT);
        expect(result.thermometer).toEqual([56.2, 57.4, 58.1]);
        expect(result.ec).toEqual([0.4, 1.9, 2.9]);
    });

    test('gaps in merged series stay null instead of becoming 0', () => {
        const txt = JSON.stringify({
            id: 1,
            json: {
                cupFactory: 'X',
                brewingLog: {
                    adc1: [0, 1, 2], total: [1, 2, 3], size: [1, 1, 1],
                    bsize: [0, 1, 1], temperature: [90, 90, 90],
                    thermometer: [50, null, 52], EC: [1, null, 3], period: 2
                }
            }
        });
        const result = parseTxtBrewingLog(txt);
        expect(result.thermometer).toEqual([50, null, 52]);
        expect(result.ec).toEqual([1, null, 3]);
    });

    test('extra.EC exposes the raw merged array', () => {
        expect(parseTxtBrewingLog(MERGED_TXT).extra.EC).toEqual([0.4, 1.9, 2.9]);
    });
});

/* ═══════════════════════════════════════════════════
   Chart colours & axis fitting
═══════════════════════════════════════════════════ */

/** Pull the hue back out of a #rrggbb string, for separation checks */
function hueOf(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d === 0) return 0;
    let h;
    if (max === r)      h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else                h = (r - g) / d + 4;
    return ((h * 60) % 360 + 360) % 360;
}

describe('hslToHex', () => {
    test('converts pure red', () => {
        expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    });

    test('converts pure green', () => {
        expect(hslToHex(120, 100, 50)).toBe('#00ff00');
    });

    test('converts pure blue', () => {
        expect(hslToHex(240, 100, 50)).toBe('#0000ff');
    });

    test('zero saturation gives grey', () => {
        expect(hslToHex(200, 0, 50)).toBe('#808080');
    });

    test('wraps hues past 360', () => {
        expect(hslToHex(480, 100, 50)).toBe(hslToHex(120, 100, 50));
    });

    test('wraps negative hues', () => {
        expect(hslToHex(-120, 100, 50)).toBe(hslToHex(240, 100, 50));
    });

    test('always returns a 7-char hex string', () => {
        expect(hslToHex(37, 68, 45).length).toBe(7);
    });
});

describe('buildDistinctColors', () => {
    test('returns an empty array for 0', () => {
        expect(buildDistinctColors(0)).toHaveLength(0);
    });

    test('returns one colour for a single dataset', () => {
        expect(buildDistinctColors(1)).toHaveLength(1);
    });

    test('two datasets get complementary hues (180° apart)', () => {
        const [a, b] = buildDistinctColors(2);
        const diff = Math.abs(hueOf(a) - hueOf(b));
        expect(Math.round(Math.min(diff, 360 - diff))).toBe(180);
    });

    test('three datasets are 120° apart', () => {
        const [a, b] = buildDistinctColors(3);
        const diff = Math.abs(hueOf(a) - hueOf(b));
        expect(Math.round(Math.min(diff, 360 - diff))).toBe(120);
    });

    test('produces the requested count', () => {
        expect(buildDistinctColors(7)).toHaveLength(7);
    });

    test('all colours are distinct', () => {
        const colors = buildDistinctColors(8);
        expect(new Set(colors).size).toBe(8);
    });

    test('every entry is a hex colour', () => {
        expect(buildDistinctColors(5).every(c => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
    });

    test('assignment is stable for the same count', () => {
        expect(buildDistinctColors(4)).toEqual(buildDistinctColors(4));
    });
});

describe('fitAxisRange', () => {
    test('returns null with no usable values', () => {
        expect(fitAxisRange([])).toBeNull();
    });

    test('ignores non-finite values', () => {
        expect(fitAxisRange([NaN, Infinity, null])).toBeNull();
    });

    test('zero-anchored data keeps 0 as the floor', () => {
        expect(fitAxisRange([0, 50, 100]).min).toBe(0);
    });

    test('zero-anchored data fills 90% of the axis', () => {
        const r = fitAxisRange([0, 50, 100]);
        expect(r.max).toBeCloseTo(100 / 0.9, 4);
        expect(100 / (r.max - r.min)).toBeCloseTo(0.9, 4);
    });

    test('data starting just above zero still anchors at 0', () => {
        // lo (3) is within 5% of the range (97) → treated as zero-based
        expect(fitAxisRange([3, 100]).min).toBe(0);
    });

    test('a low-but-not-zero series is padded, not anchored', () => {
        // a cold-start temperature trace should still fill the plot
        const r = fitAxisRange([13.8, 88.9]);
        expect(r.min).toBeGreaterThan(0);
        expect((88.9 - 13.8) / (r.max - r.min)).toBeCloseTo(0.9, 4);
    });

    test('data far from zero is padded on both sides', () => {
        const r = fitAxisRange([70, 95]);
        expect(r.min).toBeGreaterThan(0);
        expect(r.min).toBeLessThan(70);
        expect(r.max).toBeGreaterThan(95);
    });

    test('padded range gives the data 90% of the axis', () => {
        const r = fitAxisRange([70, 95]);
        expect((95 - 70) / (r.max - r.min)).toBeCloseTo(0.9, 4);
    });

    test('padding is symmetric when far from zero', () => {
        const r = fitAxisRange([70, 95]);
        expect(70 - r.min).toBeCloseTo(r.max - 95, 6);
    });

    test('a flat series still gets a usable range', () => {
        const r = fitAxisRange([80, 80, 80]);
        expect(r.max).toBeGreaterThan(r.min);
    });

    test('a flat zero series does not collapse', () => {
        const r = fitAxisRange([0, 0]);
        expect(r.max).toBeGreaterThan(r.min);
    });

    test('handles negative values', () => {
        const r = fitAxisRange([-20, -5]);
        expect(r.min).toBeLessThan(-20);
        expect(r.max).toBeGreaterThan(-5);
    });

    test('honours a custom fill ratio', () => {
        const r = fitAxisRange([0, 100], 0.5);
        expect(r.max).toBeCloseTo(200, 4);
    });

    test('falls back to 0.9 for a nonsense ratio', () => {
        expect(fitAxisRange([0, 100], 0).max).toBeCloseTo(100 / 0.9, 4);
    });
});

/* ═══════════════════════════════════════════════════
   記錄時間 (datetime-local field)
═══════════════════════════════════════════════════ */

describe('toDatetimeLocalValue', () => {
    test('returns "" for a non-Date', () => {
        expect(toDatetimeLocalValue('2026-08-01T10:30')).toBe('');
    });

    test('returns "" for an invalid Date', () => {
        expect(toDatetimeLocalValue(new Date('nope'))).toBe('');
    });

    test('formats as YYYY-MM-DDTHH:mm in local time', () => {
        expect(toDatetimeLocalValue(new Date(2026, 7, 1, 10, 27, 6))).toBe('2026-08-01T10:27');
    });

    test('zero-pads single-digit month, day, hour and minute', () => {
        expect(toDatetimeLocalValue(new Date(2026, 0, 5, 9, 3))).toBe('2026-01-05T09:03');
    });

    test('drops seconds', () => {
        expect(toDatetimeLocalValue(new Date(2026, 7, 1, 10, 27, 59))).toBe('2026-08-01T10:27');
    });
});

describe('normalizeRecordTime', () => {
    test('returns "" for empty input', () => {
        expect(normalizeRecordTime('')).toBe('');
    });

    test('returns "" for undefined', () => {
        expect(normalizeRecordTime(undefined)).toBe('');
    });

    test('returns "" for unparsable text', () => {
        expect(normalizeRecordTime('不是時間')).toBe('');
    });

    test('passes through an existing datetime-local value', () => {
        expect(normalizeRecordTime('2026-08-01T10:27')).toBe('2026-08-01T10:27');
    });

    test('truncates seconds from a datetime-local value', () => {
        expect(normalizeRecordTime('2026-08-01T10:27:06')).toBe('2026-08-01T10:27');
    });

    test('converts a legacy zh-TW morning string', () => {
        expect(normalizeRecordTime('2026/8/1 上午10:27:06')).toBe('2026-08-01T10:27');
    });

    test('converts a legacy zh-TW afternoon string to 24h', () => {
        expect(normalizeRecordTime('2026/8/1 下午3:05:00')).toBe('2026-08-01T15:05');
    });

    test('treats 上午12 as midnight', () => {
        expect(normalizeRecordTime('2026/8/1 上午12:30:00')).toBe('2026-08-01T00:30');
    });

    test('keeps 下午12 as noon', () => {
        expect(normalizeRecordTime('2026/8/1 下午12:30:00')).toBe('2026-08-01T12:30');
    });

    test('handles a slash date already in 24h form', () => {
        expect(normalizeRecordTime('2026/8/1 22:05:00')).toBe('2026-08-01T22:05');
    });

    test('zero-pads a legacy single-digit month and day', () => {
        expect(normalizeRecordTime('2026/1/5 上午9:03:00')).toBe('2026-01-05T09:03');
    });

    test('converts a UTC ISO timestamp to local time', () => {
        // toISOString() is UTC-anchored; it must not be read as a naive local value
        const d = new Date(2026, 7, 1, 10, 27);
        expect(normalizeRecordTime(d.toISOString())).toBe('2026-08-01T10:27');
    });

    test('respects an explicit timezone offset', () => {
        const d = new Date('2026-08-01T10:27:00+09:00');
        expect(normalizeRecordTime('2026-08-01T10:27:00+09:00')).toBe(toDatetimeLocalValue(d));
    });
});

/* ═══════════════════════════════════════════════════
   Belka × coffeeSecret 資料整合
═══════════════════════════════════════════════════ */

/** Belka refractometer CSV — the format exported by the 濃度計 */
const BELKA_CSV = [
    'Time,Temp,EC,TDS',
    '1.0s,56.20,0.40,0.21',
    '2.0s,57.40,1.90,0.98',
    '3.0s,58.10,2.90,1.50',
    '1:00.0,72.50,1.20,0.62'
].join('\n');

/* ─── Tests: parseBelkaTime ─────────────────────────────────── */
describe('parseBelkaTime', () => {
    test('returns NaN for null', () => {
        expect(isNaN(parseBelkaTime(null))).toBe(true);
    });

    test('returns NaN for an empty string', () => {
        expect(isNaN(parseBelkaTime('   '))).toBe(true);
    });

    test('returns NaN for non-numeric text', () => {
        expect(isNaN(parseBelkaTime('abc'))).toBe(true);
    });

    test('parses a bare number', () => {
        expect(parseBelkaTime('42')).toBe(42);
    });

    test('parses the "59.0s" suffix form', () => {
        expect(parseBelkaTime('59.0s')).toBe(59);
    });

    test('parses the "M:SS" form', () => {
        expect(parseBelkaTime('1:01.0')).toBe(61);
    });

    test('parses "M:SS" with a trailing s', () => {
        expect(parseBelkaTime('2:30.0s')).toBe(150);
    });
});

/* ─── Tests: parseBelkaCSV ──────────────────────────────────── */
describe('parseBelkaCSV', () => {
    test('returns null for empty text', () => {
        expect(parseBelkaCSV('')).toBeNull();
    });

    test('returns null when only a header row is present', () => {
        expect(parseBelkaCSV('Time,Temp,EC')).toBeNull();
    });

    test('returns null when the EC column is missing', () => {
        expect(parseBelkaCSV('Time,Temp\n1.0s,56.2')).toBeNull();
    });

    test('parses every valid row', () => {
        expect(parseBelkaCSV(BELKA_CSV)).toHaveLength(4);
    });

    test('maps columns to { sec, temp, ec }', () => {
        expect(parseBelkaCSV(BELKA_CSV)[0]).toEqual({ sec: 1, temp: 56.2, ec: 0.4 });
    });

    test('converts M:SS timestamps to seconds', () => {
        expect(parseBelkaCSV(BELKA_CSV)[3].sec).toBe(60);
    });

    test('header matching is case-insensitive', () => {
        const csv = 'time,temp,ec\n1.0s,50,1.0';
        expect(parseBelkaCSV(csv)[0]).toEqual({ sec: 1, temp: 50, ec: 1 });
    });

    test('skips rows with unparsable values', () => {
        const csv = 'Time,Temp,EC\n1.0s,50,1.0\n2.0s,,\n3.0s,52,1.4';
        expect(parseBelkaCSV(csv)).toHaveLength(2);
    });

    test('ignores extra columns and column order', () => {
        const csv = 'Serial,EC,Time,Temp\nA1,2.5,5.0s,61.0';
        expect(parseBelkaCSV(csv)[0]).toEqual({ sec: 5, temp: 61, ec: 2.5 });
    });
});

/* ─── Tests: interpolateBelkaPoints ─────────────────────────── */
describe('interpolateBelkaPoints', () => {
    const PTS = [{ sec: 2, temp: 50, ec: 1 }, { sec: 4, temp: 54, ec: 3 }];

    test('returns empty arrays for no points', () => {
        expect(interpolateBelkaPoints([], 5).temp).toHaveLength(0);
    });

    test('returns empty arrays when maxSec is 0', () => {
        expect(interpolateBelkaPoints(PTS, 0).ec).toHaveLength(0);
    });

    test('produces exactly maxSec samples', () => {
        expect(interpolateBelkaPoints(PTS, 6).temp).toHaveLength(6);
    });

    test('index 0 corresponds to second 1', () => {
        // second 1 precedes the first known point (sec 2) → back-filled
        expect(interpolateBelkaPoints(PTS, 6).temp[0]).toBe(50);
    });

    test('keeps known points untouched', () => {
        const { temp } = interpolateBelkaPoints(PTS, 6);
        expect(temp[1]).toBe(50);   // sec 2
        expect(temp[3]).toBe(54);   // sec 4
    });

    test('linearly interpolates gaps', () => {
        const { temp, ec } = interpolateBelkaPoints(PTS, 6);
        expect(temp[2]).toBe(52);   // sec 3, midway 50→54
        expect(ec[2]).toBe(2);      // sec 3, midway 1→3
    });

    test('forward-fills past the last known point', () => {
        const { temp, ec } = interpolateBelkaPoints(PTS, 6);
        expect(temp[5]).toBe(54);   // sec 6
        expect(ec[5]).toBe(3);
    });

    test('rounds interpolated values to 2 decimals', () => {
        const pts = [{ sec: 1, temp: 0, ec: 0 }, { sec: 4, temp: 1, ec: 1 }];
        expect(interpolateBelkaPoints(pts, 4).temp[1]).toBe(0.33);
    });

    test('unsorted input is handled', () => {
        const shuffled = [{ sec: 4, temp: 54, ec: 3 }, { sec: 2, temp: 50, ec: 1 }];
        expect(interpolateBelkaPoints(shuffled, 4).temp).toEqual([50, 50, 52, 54]);
    });

    test('duplicate seconds keep the first reading', () => {
        const dupes = [{ sec: 1, temp: 10, ec: 1 }, { sec: 1, temp: 99, ec: 9 }];
        expect(interpolateBelkaPoints(dupes, 2).temp).toEqual([10, 10]);
    });
});

/* ─── Tests: mergeBelkaIntoBrewingLog ───────────────────────── */

/** Fresh coffeeSecret export (4 s of data, thermometer unrecorded) */
function makeCoffeeSecretRoot() {
    return {
        id: 1700000002000,
        json: {
            cupFactory: 'MergeCup',
            totalDuration: 3,          // deliberately 1 shorter than the arrays
            singleBean: { weight: 15 },
            brewingLog: {
                adc1:        [0, 1, 2, 3],
                adc2:        [1, 2, 3, 4],
                total:       [1, 3, 5, 7],
                size:        [1, 2, 2, 2],
                bsize:       [0, 1, 1, 1],
                temperature: [90, 91, 92, 93],
                thermometer: [null, null, null, null],
                period: 3
            }
        }
    };
}

describe('mergeBelkaIntoBrewingLog', () => {
    const points = parseBelkaCSV(BELKA_CSV);

    test('returns null for a non-object root', () => {
        expect(mergeBelkaIntoBrewingLog(null, points)).toBeNull();
    });

    test('returns null when brewingLog is missing', () => {
        expect(mergeBelkaIntoBrewingLog({ id: 1, json: {} }, points)).toBeNull();
    });

    test('returns null when there is nothing to align against', () => {
        expect(mergeBelkaIntoBrewingLog({ json: { brewingLog: {} } }, points)).toBeNull();
    });

    test('overwrites thermometer with the Belka reading', () => {
        const root = makeCoffeeSecretRoot();
        mergeBelkaIntoBrewingLog(root, points);
        expect(root.json.brewingLog.thermometer).toEqual([56.2, 57.4, 58.1, 58.35]);
    });

    test('adds the EC array', () => {
        const root = makeCoffeeSecretRoot();
        mergeBelkaIntoBrewingLog(root, points);
        expect(root.json.brewingLog.EC).toEqual([0.4, 1.9, 2.9, 2.87]);
    });

    test('aligns to the per-second arrays, not the shorter totalDuration', () => {
        const root = makeCoffeeSecretRoot();
        const res  = mergeBelkaIntoBrewingLog(root, points);
        expect(res.length).toBe(4);
        expect(root.json.brewingLog.EC).toHaveLength(root.json.brewingLog.adc1.length);
    });

    test('falls back to totalDuration when no per-second array exists', () => {
        const root = { json: { totalDuration: 2, brewingLog: { size: [1, 1] } } };
        expect(mergeBelkaIntoBrewingLog(root, points).length).toBe(2);
    });

    test('accepts a bare brewing-log object (no { id, json } envelope)', () => {
        const bare = makeCoffeeSecretRoot().json;
        mergeBelkaIntoBrewingLog(bare, points);
        expect(bare.brewingLog.EC).toHaveLength(4);
    });

    test('preserves the outer envelope for re-export', () => {
        const root = makeCoffeeSecretRoot();
        const res  = mergeBelkaIntoBrewingLog(root, points);
        expect(res.root.id).toBe(1700000002000);
        expect(res.root.json.cupFactory).toBe('MergeCup');
    });

    test('merged output is consumable by parseTxtBrewingLog', () => {
        const root = makeCoffeeSecretRoot();
        mergeBelkaIntoBrewingLog(root, points);
        const parsed = parseTxtBrewingLog(JSON.stringify(root));
        expect(parsed.thermometer).toHaveLength(4);
        expect(parsed.ec).toHaveLength(4);
        expect(parsed.timeLabels).toHaveLength(4);
    });
});

/* ─── Tests: parseParticleDiameters ────────────────────────── */

describe('parseParticleDiameters', () => {
    test('returns null for empty string', () => {
        expect(parseParticleDiameters('')).toBeNull();
    });

    test('returns null when header row only (no data rows)', () => {
        expect(parseParticleDiameters('idx,area,diameter')).toBeNull();
    });

    test('returns null when diameter column is absent', () => {
        const csv = 'idx,area,radius\n1,100,50\n2,200,80';
        expect(parseParticleDiameters(csv)).toBeNull();
    });

    test('parses comma-separated file with diameter column', () => {
        const csv = 'idx,area,diameter\n1,100,250.5\n2,200,400.0\n3,150,600.3';
        const result = parseParticleDiameters(csv);
        expect(result).toHaveLength(3);
        expect(result[0]).toBe(250.5);
        expect(result[1]).toBe(400.0);
        expect(result[2]).toBe(600.3);
    });

    test('parses tab-separated file', () => {
        const tsv = 'idx\tarea\tdiameter\n1\t100\t350\n2\t200\t700';
        const result = parseParticleDiameters(tsv);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe(350);
        expect(result[1]).toBe(700);
    });

    test('skips non-numeric rows gracefully', () => {
        const csv = 'idx,area,diameter\n1,100,300\nbad,row,NaN\n3,200,500';
        const result = parseParticleDiameters(csv);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe(300);
        expect(result[1]).toBe(500);
    });

    test('header matching is case-insensitive', () => {
        const csv = 'IDX,AREA,DIAMETER\n1,100,250';
        const result = parseParticleDiameters(csv);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(250);
    });

    test('handles Windows CRLF line endings', () => {
        const csv = 'idx,area,diameter\r\n1,100,400\r\n2,200,600\r\n';
        const result = parseParticleDiameters(csv);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe(400);
        expect(result[1]).toBe(600);
    });

    test('diameter column need not be last', () => {
        const csv = 'diameter,idx,area\n250,1,100\n500,2,200';
        const result = parseParticleDiameters(csv);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe(250);
    });

    test('returns null when all data rows are non-numeric in diameter column', () => {
        const csv = 'idx,area,diameter\n1,100,bad\n2,200,also_bad';
        expect(parseParticleDiameters(csv)).toBeNull();
    });
});

/* ─── Tests: getZoneColor (distribution zone coloring) ──────── */

// Inline the pure function so it can be tested without ES module imports
function _getZoneColor(binIndex, cumPercents, zones) {
    if (!zones || !zones.length) return null;
    const prev   = binIndex === 0 ? 0 : cumPercents[binIndex - 1];
    const curr   = cumPercents[binIndex];
    const midCum = (prev + curr) / 2;
    for (let j = 0; j < zones.length - 1; j++) {
        if (midCum < zones[j].to) return zones[j].color;
    }
    return zones[zones.length - 1].color;
}

describe('getZoneColor', () => {
    const zones3 = [
        { from: 0,  to: 25,  color: '#57bb5e' },
        { from: 25, to: 75,  color: '#e8a838' },
        { from: 75, to: 100, color: '#d95f5f' },
    ];
    // cumPercents where each bin contributes 10%
    const cum10 = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    test('returns null for empty zones array', () => {
        expect(_getZoneColor(0, cum10, [])).toBeNull();
    });

    test('bin in first zone (midCum < 25) → first zone color', () => {
        // bin 0: mid = (0+10)/2 = 5 → zone 0
        expect(_getZoneColor(0, cum10, zones3)).toBe('#57bb5e');
        // bin 1: mid = (10+20)/2 = 15 → zone 0
        expect(_getZoneColor(1, cum10, zones3)).toBe('#57bb5e');
    });

    test('bin in middle zone (25 ≤ midCum < 75) → middle zone color', () => {
        // bin 3: mid = (30+40)/2 = 35 → zone 1
        expect(_getZoneColor(3, cum10, zones3)).toBe('#e8a838');
        // bin 5: mid = (50+60)/2 = 55 → zone 1
        expect(_getZoneColor(5, cum10, zones3)).toBe('#e8a838');
    });

    test('bin in last zone (midCum ≥ 75) → last zone color', () => {
        // bin 8: mid = (80+90)/2 = 85 → zone 2
        expect(_getZoneColor(8, cum10, zones3)).toBe('#d95f5f');
        // bin 9 (last): mid = (90+100)/2 = 95 → zone 2
        expect(_getZoneColor(9, cum10, zones3)).toBe('#d95f5f');
    });

    test('single zone always returns that zone color', () => {
        const singleZone = [{ from: 0, to: 100, color: '#aabbcc' }];
        expect(_getZoneColor(0, cum10, singleZone)).toBe('#aabbcc');
        expect(_getZoneColor(9, cum10, singleZone)).toBe('#aabbcc');
    });

    test('boundary bin (midCum exactly at breakpoint) assigned to lower zone', () => {
        // bin 2: mid = (20+30)/2 = 25 — equals zones3[0].to
        // midCum=25 is NOT < 25, so falls through to zone 1
        expect(_getZoneColor(2, cum10, zones3)).toBe('#e8a838');
    });
});

/* ─── Tests: buildZoneBands (multi-dataset background band logic) ─ */

// Inline the pure band-building logic for testing
function _buildZoneBands(avgCum, zones) {
    if (!zones || !zones.length || !avgCum.length) return [];
    const bands = [];
    let bandColor = _getZoneColor(0, avgCum, zones);
    let bandStart = 0;
    for (let i = 1; i < avgCum.length; i++) {
        const zc = _getZoneColor(i, avgCum, zones);
        if (zc !== bandColor) {
            bands.push({ color: bandColor, fromIdx: bandStart, toIdx: i - 1 });
            bandColor = zc;
            bandStart = i;
        }
    }
    bands.push({ color: bandColor, fromIdx: bandStart, toIdx: avgCum.length - 1 });
    return bands;
}

describe('buildZoneBands', () => {
    const zones3 = [
        { from: 0,  to: 25,  color: '#57bb5e' },
        { from: 25, to: 75,  color: '#e8a838' },
        { from: 75, to: 100, color: '#d95f5f' },
    ];
    // 10 bins each contributing 10%
    const cum10 = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    test('returns empty array when zones is empty', () => {
        expect(_buildZoneBands(cum10, [])).toHaveLength(0);
    });

    test('returns 3 bands for default 3-zone setup', () => {
        const bands = _buildZoneBands(cum10, zones3);
        expect(bands).toHaveLength(3);
    });

    test('first band starts at index 0', () => {
        const bands = _buildZoneBands(cum10, zones3);
        expect(bands[0].fromIdx).toBe(0);
    });

    test('last band ends at last bin index', () => {
        const bands = _buildZoneBands(cum10, zones3);
        expect(bands[bands.length - 1].toIdx).toBe(cum10.length - 1);
    });

    test('bands are contiguous (no gaps or overlaps)', () => {
        const bands = _buildZoneBands(cum10, zones3);
        for (let i = 1; i < bands.length; i++) {
            expect(bands[i].fromIdx).toBe(bands[i - 1].toIdx + 1);
        }
    });

    test('band colors match zone colors', () => {
        const bands = _buildZoneBands(cum10, zones3);
        // bins 0-1: midCum < 25 → zone 0 (green)
        // bins 2-6: midCum 25–75 → zone 1 (amber)
        // bins 7-9: midCum > 75 → zone 2 (red)
        expect(bands[0].color).toBe('#57bb5e');
        expect(bands[1].color).toBe('#e8a838');
        expect(bands[2].color).toBe('#d95f5f');
    });

    test('single zone produces exactly one band spanning all bins', () => {
        const oneZone = [{ from: 0, to: 100, color: '#112233' }];
        const bands = _buildZoneBands(cum10, oneZone);
        expect(bands).toHaveLength(1);
        expect(bands[0].fromIdx).toBe(0);
        expect(bands[0].toIdx).toBe(9);
        expect(bands[0].color).toBe('#112233');
    });
});
