/**
 * Coffee Force Campus — Unit Tests
 * Pure function tests (no DOM, no CDN required)
 * Tests: utils.js functions
 * Run via: tests/runner.html
 */

/* ─── Minimal Test Framework ─────────────────── */
const results = [];

function describe(name, fn) {
    console.group(`📦 ${name}`);
    fn();
    console.groupEnd();
}

function test(name, fn) {
    try {
        fn();
        results.push({ pass: true, name });
        console.log(`  ✅ ${name}`);
    } catch (err) {
        results.push({ pass: false, name, error: err.message });
        console.error(`  ❌ ${name}: ${err.message}`);
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected)
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        },
        toEqual(expected) {
            const a = JSON.stringify(actual), b = JSON.stringify(expected);
            if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
        },
        toBeNull() {
            if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
        },
        toContain(item) {
            if (!actual.includes(item))
                throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
        },
        toHaveLength(len) {
            if (actual.length !== len)
                throw new Error(`Expected length ${len}, got ${actual.length}`);
        },
        toBeGreaterThan(n) {
            if (actual <= n) throw new Error(`Expected ${actual} > ${n}`);
        }
    };
}

/* ─── Tests: detectCSVFormat ─────────────────── */
describe('detectCSVFormat', () => {
    test('returns "akirakoki" for null/empty input', () => {
        expect(detectCSVFormat(null)).toBe('akirakoki');
        expect(detectCSVFormat([])).toBe('akirakoki');
        expect(detectCSVFormat([[]])).toBe('akirakoki');
    });

    test('returns "raw" when both row[0] and row[1] have >3 columns', () => {
        const rows = [
            ['h1','h2','h3','1','2','3','4'],
            ['d1','d2','d3','1','2','3','4']
        ];
        expect(detectCSVFormat(rows)).toBe('raw');
    });

    test('returns "akirakoki" when rows have ≤3 columns', () => {
        const rows = [
            ['Second', '0', '1', '2'],
            ['Temp',   '90','88','86']
        ];
        expect(detectCSVFormat(rows)).toBe('akirakoki');
    });
});

/* ─── Tests: parseAkirakokiRows ──────────────── */
describe('parseAkirakokiRows', () => {
    test('correctly identifies time row by "Second"', () => {
        const rows = [
            ['Second','0','1','2','3','4'],
            ['Flow Rate','0.5','0.8','1.0','0.9','0.7'],
            ['Water Weight','0','5','12','20','28'],
            ['Temperature','92','91','90','89','88']
        ];
        const pd = parseAkirakokiRows(rows);
        expect(pd.time).toEqual([0,1,2,3,4]);
        expect(pd.flow).toEqual([0.5,0.8,1.0,0.9,0.7]);
        expect(pd.weight).toEqual([0,5,12,20,28]);
        expect(pd.temp).toEqual([92,91,90,89,88]);
    });

    test('correctly identifies time row by "time"', () => {
        const rows = [['time','0','5','10'], ['Flow Rate','1','2','3'], ['cumulative','0','10','20']];
        const pd = parseAkirakokiRows(rows);
        expect(pd.time).toEqual([0,5,10]);
        expect(pd.weight).toEqual([0,10,20]);
    });

    test('ignores rows that do not match any keyword', () => {
        const rows = [['SomeUnknownHeader','1','2','3']];
        const pd = parseAkirakokiRows(rows);
        expect(pd.time).toHaveLength(0);
        expect(pd.weight).toHaveLength(0);
    });

    test('skips empty rows gracefully', () => {
        const rows = [null, [], ['Second','0','1','2'], undefined];
        const pd = parseAkirakokiRows(rows);
        expect(pd.time).toEqual([0,1,2]);
    });

    test('filters out non-numeric values from rows', () => {
        const rows = [['Second','start','0','1','2','end']];
        const pd = parseAkirakokiRows(rows);
        expect(pd.time).toEqual([0,1,2]);
    });
});

/* ─── Tests: parseRawDataRows ────────────────── */
describe('parseRawDataRows', () => {
    test('returns null for empty/short rows', () => {
        expect(parseRawDataRows([])).toBeNull();
        expect(parseRawDataRows([[]])).toBeNull();
    });

    test('extracts metadata correctly', () => {
        const rows = [
            ['','','',1,2,3],                  // row[0]: time labels (slice 3)
            ['2025-01-01','MyBean','',10,20,30], // row[1]: date, name, ...
            ['','','',0.5,0.8,1.0],             // row[2]: pWF
            ['180','15','',5,15,25],             // row[3]: brewTime, beanWeight, bC
            ['','','',0.3,0.5,0.4],             // row[4]: bF
            ['','','',92,91,90]                  // row[5]: temp
        ];
        const result = parseRawDataRows(rows);
        expect(result.date).toBe('2025-01-01');
        expect(result.name).toBe('MyBean');
        expect(result.beanWeight).toBe('15');
        expect(result.timeLabels).toEqual([1,2,3]);
        expect(result.pWC).toEqual([10,20,30]);
        expect(result.temp).toEqual([92,91,90]);
    });

    test('returns null when no time labels', () => {
        const rows = [['','',''], ['date','name',''], [], [], [], []];
        expect(parseRawDataRows(rows)).toBeNull();
    });
});

/* ─── Tests: getAkirakokiMinLen ──────────────── */
describe('getAkirakokiMinLen', () => {
    test('returns minimum of time/weight/flow lengths', () => {
        const pd = { time: [1,2,3,4,5], weight: [1,2,3], flow: [1,2,3,4] };
        expect(getAkirakokiMinLen(pd)).toBe(3);
    });

    test('returns 0 when any array is empty', () => {
        expect(getAkirakokiMinLen({ time: [], weight: [1,2], flow: [1,2] })).toBe(0);
        expect(getAkirakokiMinLen({ time: [1,2], weight: [], flow: [1,2] })).toBe(0);
    });
});

/* ─── Tests: calcWBrCTotal ───────────────────── */
describe('calcWBrCTotal', () => {
    const SECTIONS = ['fragrance','aroma','flavor','aftertaste','acidity','sweetness','mouthfeel','overall'];

    test('sums all section scores', () => {
        const scores = {
            fragrance: 7, aroma: 6, flavor: 8, aftertaste: 7,
            acidity: 5, sweetness: 6, mouthfeel: 6, overall: 7
        };
        expect(calcWBrCTotal(scores, SECTIONS)).toBe(52);
    });

    test('treats missing sections as 0', () => {
        expect(calcWBrCTotal({}, SECTIONS)).toBe(0);
        expect(calcWBrCTotal({ fragrance: 5 }, SECTIONS)).toBe(5);
    });

    test('returns 0 for empty scores and empty sections', () => {
        expect(calcWBrCTotal({}, [])).toBe(0);
    });
});

/* ─── Tests: calcCVAScore ────────────────────── */
describe('calcCVAScore', () => {
    test('formula: ((total/8)*10)+10', () => {
        // total=0 → ((0/8)*10)+10 = 10
        expect(calcCVAScore(0)).toBe(10);
        // total=8 → ((8/8)*10)+10 = 20
        expect(calcCVAScore(8)).toBe(20);
        // total=72 (max 8 sections × 9) → ((72/8)*10)+10 = 100
        expect(calcCVAScore(72)).toBe(100);
        // total=40 → ((40/8)*10)+10 = 60
        expect(calcCVAScore(40)).toBe(60);
    });
});

/* ─── Tests: buildSummaryHTML ────────────────── */
describe('buildSummaryHTML', () => {
    test('returns empty string when both arrays are empty', () => {
        expect(buildSummaryHTML([], [])).toBe('');
    });

    test('includes CVA CATA block when cataChecked is not empty', () => {
        const html = buildSummaryHTML(['Floral','Berry'], []);
        if (!html.includes('cva-summary-label cata'))
            throw new Error('Missing CATA label');
        if (!html.includes('Floral'))
            throw new Error('Missing Floral tag');
        if (!html.includes('Berry'))
            throw new Error('Missing Berry tag');
    });

    test('includes SCA Wheel block when scaChecked is not empty', () => {
        const html = buildSummaryHTML([], ['Fruity','Berry']);
        if (!html.includes('cva-summary-label sca'))
            throw new Error('Missing SCA label');
        if (!html.includes('Fruity'))
            throw new Error('Missing Fruity tag');
    });

    test('includes both blocks when both arrays are non-empty', () => {
        const html = buildSummaryHTML(['Floral'], ['Citrus Fruit']);
        if (!html.includes('cva-summary-label cata')) throw new Error('Missing CATA label');
        if (!html.includes('cva-summary-label sca'))  throw new Error('Missing SCA label');
    });

    test('does NOT include CATA block when cataChecked is empty', () => {
        const html = buildSummaryHTML([], ['Fruity']);
        if (html.includes('cva-summary-label cata'))
            throw new Error('Should not contain CATA block');
    });

    test('wraps each item in cva-summary-tag span', () => {
        const html = buildSummaryHTML(['Rose'], []);
        if (!html.includes('<span class="cva-summary-tag">Rose</span>'))
            throw new Error('Item not wrapped in cva-summary-tag');
    });
});

/* ─── Tests: getDatasetColor ─────────────────── */
describe('getDatasetColor', () => {
    test('returns first color for index 0', () => {
        expect(getDatasetColor(0)).toBe('#1976D2');
    });

    test('wraps around using modulo', () => {
        const len = DATASET_COLORS.length;
        expect(getDatasetColor(len)).toBe(getDatasetColor(0));
        expect(getDatasetColor(len + 1)).toBe(getDatasetColor(1));
    });
});

/* ─── Results Summary ────────────────────────── */
function printSummary() {
    const pass = results.filter(r => r.pass).length;
    const fail = results.filter(r => !r.pass).length;
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📊 Results: ${pass} passed, ${fail} failed, ${results.length} total`);
    if (fail > 0) {
        console.log('\nFailed tests:');
        results.filter(r => !r.pass).forEach(r => console.error(`  ❌ ${r.name}: ${r.error}`));
    }
    return { pass, fail, total: results.length };
}

// Expose for runner.html
if (typeof window !== 'undefined') window.__testSummary = printSummary;
