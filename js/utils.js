/* ═══════════════════════════════════════════════════
   UTILS — Pure functions with NO DOM dependency.
   These functions are fully unit-testable.
   Depends on: constants.js (AFFECTIVE_SECTIONS)
═══════════════════════════════════════════════════ */

/**
 * Detect whether a parsed CSV rows array is "raw data" format
 * (Wang Weber format with multiple metric rows) or Akirakoki format.
 * @param {Array[]} rows - 2D array from PapaParse
 * @returns {'raw' | 'akirakoki'}
 */
function detectCSVFormat(rows) {
    if (!rows || rows.length < 2) return 'akirakoki';
    // Raw format: row[0] has >3 columns and row[1] also has >3 columns
    if (rows[0]?.length > 3 && rows[1]?.length > 3) return 'raw';
    return 'akirakoki';
}

/**
 * Parse Akirakoki CSV rows into time/weight/flow/temp arrays.
 * Pure function — no side effects, no DOM.
 * @param {Array[]} rows - 2D array from PapaParse
 * @returns {{ time: number[], weight: number[], flow: number[], temp: number[] }}
 */
function parseAkirakokiRows(rows) {
    const pd = { time: [], weight: [], flow: [], temp: [] };
    for (const row of rows) {
        if (!row || !row.length) continue;
        const rowText = row.join(',').toLowerCase();
        const nums = row
            .filter(x => x && x.trim() !== '' && !isNaN(Number(x)))
            .map(Number);
        if      (rowText.includes('second') || rowText.includes('time'))       pd.time   = nums;
        else if (rowText.includes('temperature') || rowText.includes('temp'))  pd.temp   = nums;
        else if (rowText.includes('flow rate') || rowText.includes('flow'))    pd.flow   = nums;
        else if ((rowText.includes('water') && rowText.includes('weight')) ||
                  rowText.includes('cumulative'))                               pd.weight = nums;
    }
    return pd;
}

/**
 * Parse raw data CSV rows into structured metrics.
 * Pure function — no side effects, no DOM.
 * @param {Array[]} rows - 2D array from PapaParse
 * @returns {{ date, name, brewTime, beanWeight, timeLabels, pWC, pWF, bC, bF, temp } | null}
 */
function parseRawDataRows(rows) {
    try {
        const meta = {
            date:       rows[1]?.[0] || '',
            name:       rows[1]?.[1] || '',
            brewTime:   rows[3]?.[0] || '',
            beanWeight: rows[3]?.[1] || ''
        };
        const timeLabels = rows[0]?.slice(3).map((_, i) => i + 1) || [];
        if (!timeLabels.length) return null;

        return {
            ...meta,
            timeLabels,
            pWC:  rows[1]?.slice(3).map(v => parseFloat(v) || 0) || [],
            pWF:  rows[2]?.slice(3).map(v => parseFloat(v) || 0) || [],
            bC:   rows[3]?.slice(3).map(v => parseFloat(v) || 0) || [],
            bF:   rows[4]?.slice(3).map(v => parseFloat(v) || 0) || [],
            temp: rows[5]?.slice(3).map(v => parseFloat(v) || 0) || []
        };
    } catch (e) {
        return null;
    }
}

/**
 * Calculate WBrC total score from affective scores object.
 * @param {Object} scores - { fragrance: 5, aroma: 7, ... }
 * @param {string[]} sections - AFFECTIVE_SECTIONS array
 * @returns {number}
 */
function calcWBrCTotal(scores, sections) {
    return sections.reduce((sum, sec) => sum + (scores[sec] || 0), 0);
}

/**
 * Calculate CVA 100-point score from WBrC total.
 * Formula: ((total / 8) * 10) + 10
 * @param {number} wbrcTotal
 * @returns {number}
 */
function calcCVAScore(wbrcTotal) {
    return ((wbrcTotal / 8) * 10) + 10;
}

/**
 * Build the HTML string for a selection summary block.
 * Pure function — returns a string, no DOM writes.
 * @param {string[]} cataChecked - checked CATA values
 * @param {string[]} scaChecked  - checked SCA values
 * @returns {string} HTML string (empty string if nothing checked)
 */
function buildSummaryHTML(cataChecked, scaChecked) {
    if (!cataChecked.length && !scaChecked.length) return '';
    let html = '';
    if (cataChecked.length > 0) {
        html += `<div class="cva-summary-group"><span class="cva-summary-label cata">CVA CATA</span>`;
        cataChecked.forEach(v => { html += `<span class="cva-summary-tag">${v}</span>`; });
        html += `</div>`;
    }
    if (scaChecked.length > 0) {
        html += `<div class="cva-summary-group"><span class="cva-summary-label sca">SCA Wheel</span>`;
        scaChecked.forEach(v => { html += `<span class="cva-summary-tag">${v}</span>`; });
        html += `</div>`;
    }
    return html;
}

/**
 * Get the minimum usable length from parsed Akirakoki data.
 * @param {{ time: number[], weight: number[], flow: number[] }} pd
 * @returns {number}
 */
function getAkirakokiMinLen(pd) {
    return Math.min(pd.time.length, pd.weight.length, pd.flow.length);
}

/**
 * Assign a dataset color by index.
 * @param {number} index
 * @returns {string} hex color
 */
function getDatasetColor(index) {
    return DATASET_COLORS[index % DATASET_COLORS.length];
}

/**
 * Calculate a robust Y-axis range by excluding IQR-based outliers.
 * Points outside the returned range are still drawn but the axis won't be
 * stretched to accommodate them.
 * @param {number[]} values - all data values across visible datasets
 * @returns {{ min: number, max: number } | null} null when < 4 values
 */
function robustYRange(values) {
    const nums = values.filter(v => typeof v === 'number' && isFinite(v));
    if (nums.length < 4) return null;
    // For zero-inflated data (e.g. flow rate), skip near-zero values when computing IQR
    // so the fence is based on actual signal values, not the zero-heavy baseline.
    const nonTrivial = nums.filter(v => Math.abs(v) > 0.1);
    const base = nonTrivial.length >= 4 ? nonTrivial : nums;
    const sorted = [...base].sort((a, b) => a - b);
    const n = sorted.length;
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const loFence = q1 - 1.5 * iqr;
    const hiFence = q3 + 1.5 * iqr;
    const inliers = sorted.filter(v => v >= loFence && v <= hiFence);
    const lo = inliers.length ? inliers[0]                    : q1;
    const hi = inliers.length ? inliers[inliers.length - 1]   : q3;
    const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
    return {
        min: lo >= 0 ? 0 : lo - pad,
        max: hi + pad
    };
}
