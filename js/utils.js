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
 * Convert HSL to a #rrggbb hex string.
 * @param {number} h hue in degrees (any real number, wrapped)
 * @param {number} s saturation 0–100
 * @param {number} l lightness 0–100
 * @returns {string}
 */
function hslToHex(h, s, l) {
    const hue = ((h % 360) + 360) % 360;
    const sat = Math.min(100, Math.max(0, s)) / 100;
    const lum = Math.min(100, Math.max(0, l)) / 100;
    const c = (1 - Math.abs(2 * lum - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lum - c / 2;
    const seg = Math.floor(hue / 60) % 6;
    const [r, g, b] = [
        [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]
    ][seg];
    const to255 = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${to255(r)}${to255(g)}${to255(b)}`;
}

/**
 * Build `count` maximally-separated dataset colors by spreading hues evenly
 * around the wheel — two datasets come out complementary (180° apart), three
 * 120° apart, and so on. Lightness alternates slightly so neighbouring hues
 * stay distinguishable at higher counts.
 * @param {number} count
 * @param {number} [startHue=210] hue of the first dataset (default: blue)
 * @returns {string[]}
 */
function buildDistinctColors(count, startHue = 210) {
    const n = Math.max(0, Math.floor(count));
    const step = n > 0 ? 360 / n : 0;
    return Array.from({ length: n }, (_, i) =>
        hslToHex(startHue + i * step, 68, i % 2 === 0 ? 45 : 33)
    );
}

/**
 * Pick an axis range so the plotted values fill `fillRatio` of the axis.
 * Series that sit on a natural zero baseline (cumulative weights, flow rates)
 * keep 0 as the floor and take all the slack at the top; ranges that live far
 * from zero (temperature) get padded on both sides instead.
 * @param {number[]} values
 * @param {number} [fillRatio=0.9] share of the axis the data should occupy
 * @returns {{ min: number, max: number } | null} null when there is no data
 */
function fitAxisRange(values, fillRatio = 0.9) {
    const nums = (values || []).filter(v => typeof v === 'number' && isFinite(v));
    if (!nums.length) return null;

    const lo = Math.min(...nums);
    const hi = Math.max(...nums);
    const ratio = fillRatio > 0 && fillRatio < 1 ? fillRatio : 0.9;

    if (hi === lo) {
        const pad = Math.abs(hi) * 0.1 || 1;
        return { min: lo >= 0 && lo <= pad ? 0 : lo - pad, max: hi + pad };
    }

    const range = hi - lo;
    // Zero-anchored only when the data genuinely starts at zero (cumulative
    // weights, flow rates). A series that merely runs low — temperature from a
    // cold start — gets padded instead, so it still fills the plot.
    if (lo >= 0 && lo <= range * 0.05) return { min: 0, max: hi / ratio };

    const extra = range * (1 / ratio - 1);
    return { min: lo - extra / 2, max: hi + extra / 2 };
}

/**
 * Calculate a robust Y-axis range by excluding IQR-based outliers.
 * Points outside the returned range are still drawn but the axis won't be
 * stretched to accommodate them.
 * @param {number[]} values - all data values across visible datasets
 * @returns {{ min: number, max: number } | null} null when < 4 values
 */
/**
 * Parse a brewing-log TXT file (single-line JSON exported by the app).
 * Returns the same shape as parseRawDataRows so buildRawDataset can consume it.
 *
 * Mapping  TXT brewingLog → CSV row label
 *   log.total       → Pouring water cumulative(g)   (pWC)
 *   log.size        → Pour water flow rate(g/s)      (pWF)
 *   log.adc1        → Brewing cumulative(g)          (bC)
 *   log.bsize       → Brewing flow rate(g/s)         (bF)
 *   log.temperature → Temperature(℃)                (temp)
 *
 * Belka-merged files additionally carry per-second thermometer / EC series,
 * returned as top-level `thermometer` and `ec` (null when absent).
 *
 * Extra fields present in TXT but absent from CSV are stored under `extra`:
 *   thermometer, EC, percent, coffeePowerWeight, ratio, scale,
 *   beanRatioArray, totalBeanRatioArray,
 *   tds, extractionRate, waterPowderRatio, stars, fwjl,
 *   beanMoDouJi, beanKeDu, extraNote
 *
 * @param {string} jsonText - raw text content of the .txt file
 * @returns {object|null} parsed object or null on failure
 */
function parseTxtBrewingLog(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        const meta = data.json;
        const log  = meta && meta.brewingLog;
        if (!log) return null;

        const len = (log.adc1 || log.total || []).length;
        if (!len) return null;

        // Time labels: 1-indexed seconds (same as CSV column headers)
        const timeLabels = Array.from({ length: len }, (_, i) => i + 1);

        // Bean weight — prefer singleBean, fall back to sum of mixedBean slots
        let beanWeight = '';
        if (meta.singleBean && meta.singleBean.weight) {
            beanWeight = String(meta.singleBean.weight);
        } else if (meta.mixedBean) {
            const slots = [meta.mixedBean.bean1, meta.mixedBean.bean2,
                           meta.mixedBean.bean3, meta.mixedBean.bean4];
            const total = slots.reduce((s, b) => s + (parseFloat(b && b.weight) || 0), 0);
            if (total > 0) beanWeight = String(total);
        }

        const toNum = arr => (arr || []).map(v => (v == null ? 0 : Number(v)));
        // Belka-merged series may contain gaps — keep null so charts break the
        // line instead of dropping to a fake zero.
        const toNumOrNull = arr => (arr || []).map(v => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v)));
        const hasNumbers  = arr => Array.isArray(arr) && arr.some(v => v != null && v !== '' && !isNaN(Number(v)));

        return {
            date:       data.id ? new Date(data.id).toLocaleDateString() : '',
            name:       meta.cupFactory || '',
            brewTime:   '',            // not stored in TXT
            beanWeight,
            timeLabels,
            pWC:  toNum(log.total  || log.adc2),   // Pouring water cumulative
            pWF:  toNum(log.size),                  // Pour water flow rate
            bC:   toNum(log.adc1),                  // Brewing cumulative
            bF:   toNum(log.bsize),                 // Brewing flow rate
            temp: toNum(log.temperature),            // Temperature
            adc1: log.adc1 ? toNum(log.adc1) : null, // Brewing cumulative (coffee liquid)
            adc2: log.adc2 ? toNum(log.adc2) : null, // Second injection sensor raw values

            // ── Belka-merged series (only present after 資料整合) ──────────
            thermometer: hasNumbers(log.thermometer) ? toNumOrNull(log.thermometer) : null,
            ec:          hasNumbers(log.EC)          ? toNumOrNull(log.EC)          : null,

            // ── Extra fields not present in CSV ──────────────────────────
            extra: {
                thermometer:         log.thermometer,        // actual thermometer (vs scale sensor)
                EC:                  log.EC,                 // Belka conductivity per second
                percent:             log.percent,            // extraction percent per second
                coffeePowerWeight:   log.coffeePowerWeight,  // coffee powder weight per second
                ratio:               log.ratio,              // water/coffee ratio (numeric) per second
                scale:               log.scale,              // water/coffee ratio (string) per second
                beanRatioArray:      log.beanRatioArray,     // bean ratio per second
                totalBeanRatioArray: log.totalBeanRatioArray,// cumulative ratio (string) per second
                tds:                 meta.tds,               // TDS value
                extractionRate:      meta.extractionRate,    // extraction rate (%)
                waterPowderRatio:    meta.waterPowderRatio,  // total water/powder ratio
                stars:               meta.stars,             // user rating
                fwjl:                meta.fwjl,              // sensory scores {fw,sw,tw,chd,yy,ph}
                beanMoDouJi:         meta.beanMoDouJi,       // grinder model
                beanKeDu:            meta.beanKeDu,          // grind size
                extraNote:           meta.extraNote,         // free-text note
                totalWaterInjection: meta.totalWaterInjection, // total water injected (g)
                jugTemperature:      meta.jugTemperature,    // water temperature
                beanBoilDuration:    meta.beanBoilDuration   // bloom duration (MM:SS)
            }
        };
    } catch (_) {
        return null;
    }
}

/* ═══════════════════════════════════════════════════
   記錄時間 — the header field is an <input type="datetime-local">,
   which only accepts the exact form "YYYY-MM-DDTHH:mm".
═══════════════════════════════════════════════════ */

/**
 * Format a Date as a datetime-local input value (local time, minute precision).
 * @param {Date} date
 * @returns {string} "YYYY-MM-DDTHH:mm", or '' for an invalid date
 */
function toDatetimeLocalValue(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    const p = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
           `T${p(date.getHours())}:${p(date.getMinutes())}`;
}

/**
 * Coerce a stored 記錄時間 into a datetime-local input value.
 * Handles the three shapes that can appear in saved files:
 *   1. already "YYYY-MM-DDTHH:mm[:ss]"        → truncated to minutes
 *   2. legacy zh-TW string "2026/8/1 上午10:27:06" (written by older versions,
 *      which the input would otherwise silently reject)
 *   3. anything else Date can parse (e.g. an ISO timestamp)
 * @param {string} value
 * @returns {string} "YYYY-MM-DDTHH:mm", or '' when unparsable
 */
function normalizeRecordTime(value) {
    if (!value) return '';
    const s = String(value).trim();
    const p = n => String(n).padStart(2, '0');

    // Naive (timezone-less) form only — a "Z"/"+08:00" suffix means UTC-anchored,
    // which must go through Date so it lands on the right local time.
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]}:${iso[5]}`;

    const zh = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(上午|下午)?\s*(\d{1,2}):(\d{2})/);
    if (zh) {
        let h = parseInt(zh[5], 10);
        if (zh[4] === '上午' && h === 12) h = 0;
        if (zh[4] === '下午' && h < 12)   h += 12;
        return `${zh[1]}-${p(zh[2])}-${p(zh[3])}T${p(h)}:${zh[6]}`;
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? '' : toDatetimeLocalValue(d);
}

/* ═══════════════════════════════════════════════════
   BELKA × coffeeSecret 資料整合
   Merges a Belka refractometer CSV (Time / Temp / EC) into a coffeeSecret
   brewing-log TXT: the CSV is resampled to 1 Hz, written over
   brewingLog.thermometer and added as brewingLog.EC.
═══════════════════════════════════════════════════ */

/**
 * Parse a Belka time cell into seconds.
 * Accepts "59.0s", "59", "1:01.0" (M:SS).
 * @param {string} timeStr
 * @returns {number} seconds, or NaN when unparsable
 */
function parseBelkaTime(timeStr) {
    if (timeStr == null) return NaN;
    const clean = String(timeStr).trim().replace(/s$/i, '').trim();
    if (!clean) return NaN;
    if (clean.includes(':')) {
        const [mStr, sStr] = clean.split(':');
        const m = parseFloat(mStr), s = parseFloat(sStr);
        if (isNaN(m) || isNaN(s)) return NaN;
        return m * 60 + s;
    }
    const n = parseFloat(clean);
    return isNaN(n) ? NaN : n;
}

/**
 * Parse a Belka refractometer CSV into measurement points.
 * The header row must contain Time, Temp and EC columns (case-insensitive).
 * @param {string} text - raw CSV text
 * @returns {{ sec: number, temp: number, ec: number }[] | null} null when the
 *          required columns are missing or no row is usable
 */
function parseBelkaCSV(text) {
    if (!text) return null;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return null;

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const timeIdx = headers.indexOf('time');
    const tempIdx = headers.indexOf('temp');
    const ecIdx   = headers.indexOf('ec');
    if (timeIdx === -1 || tempIdx === -1 || ecIdx === -1) return null;

    const maxIdx = Math.max(timeIdx, tempIdx, ecIdx);
    const points = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length <= maxIdx) continue;
        const sec  = Math.round(parseBelkaTime(cols[timeIdx]));
        const temp = parseFloat(cols[tempIdx]);
        const ec   = parseFloat(cols[ecIdx]);
        if (!isNaN(sec) && !isNaN(temp) && !isNaN(ec)) points.push({ sec, temp, ec });
    }
    return points.length ? points : null;
}

/**
 * Resample Belka points onto a 1-second grid covering seconds 1…maxSec.
 * Gaps between two known points are linearly interpolated; the head is
 * back-filled and the tail forward-filled from the nearest known point.
 * Duplicate seconds keep the first occurrence.
 * @param {{ sec: number, temp: number, ec: number }[]} points
 * @param {number} maxSec
 * @returns {{ temp: number[], ec: number[] }} arrays of length maxSec (index 0 = second 1)
 */
function interpolateBelkaPoints(points, maxSec) {
    const temp = [], ec = [];
    if (!points || !points.length || !(maxSec > 0)) return { temp, ec };

    const bySec = new Map();
    [...points].sort((a, b) => a.sec - b.sec)
               .forEach(p => { if (!bySec.has(p.sec)) bySec.set(p.sec, p); });
    const known = [...bySec.values()];

    const round2 = v => Number(v.toFixed(2));
    let i = 0;   // index of the last known point at or before `s`
    for (let s = 1; s <= maxSec; s++) {
        while (i + 1 < known.length && known[i + 1].sec <= s) i++;
        const cur  = known[i];
        const next = known[i + 1];
        let t, e;
        if (cur.sec === s || cur.sec > s || !next) {
            // exact hit, head back-fill, or tail forward-fill
            t = cur.temp; e = cur.ec;
        } else {
            const ratio = (s - cur.sec) / (next.sec - cur.sec);
            t = cur.temp + (next.temp - cur.temp) * ratio;
            e = cur.ec   + (next.ec   - cur.ec)   * ratio;
        }
        temp.push(round2(t));
        ec.push(round2(e));
    }
    return { temp, ec };
}

/**
 * Merge Belka points into a parsed coffeeSecret brewing-log object.
 * Overwrites brewingLog.thermometer and adds brewingLog.EC, resampled to the
 * length of the existing per-second arrays so every series stays aligned.
 * NOTE: mutates `root` in place (and returns it) so the original wrapper —
 * e.g. the outer { id, json } envelope — is preserved on re-export.
 * @param {object} root - parsed JSON, either { id, json: {...} } or bare
 * @param {{ sec: number, temp: number, ec: number }[]} points
 * @returns {{ root: object, length: number } | null} null when unmergeable
 */
function mergeBelkaIntoBrewingLog(root, points) {
    if (!root || typeof root !== 'object') return null;
    const meta = root.json ? root.json : root;
    const log  = meta && meta.brewingLog;
    if (!log) return null;

    // Align with the existing per-second arrays; totalDuration is only a fallback
    // because it can be one shorter than the recorded arrays.
    const refLen = Math.max(
        (log.temperature || []).length,
        (log.adc1        || []).length,
        (log.total       || []).length
    );
    const duration = refLen || Number(meta.totalDuration) || 0;
    if (!duration) return null;

    const { temp, ec } = interpolateBelkaPoints(points, duration);
    if (!temp.length) return null;

    log.thermometer = temp;
    log.EC = ec;
    return { root, length: temp.length };
}

/**
 * Parse a particle-size TXT or CSV file (format: idx,area,diameter or tab-separated).
 * Returns an array of diameter numbers, or null if the 'diameter' column is absent.
 * @param {string} text - Raw file text
 * @returns {number[] | null}
 */
function parseParticleDiameters(text) {
    if (!text) return null;
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = firstLine.includes('\t') ? '\t' : ',';

    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return null;

    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
    const colIdx = headers.indexOf('diameter');
    if (colIdx === -1) return null;

    const diameters = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(sep);
        const val = parseFloat(parts[colIdx]);
        if (!isNaN(val)) diameters.push(val);
    }

    return diameters.length > 0 ? diameters : null;
}

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
