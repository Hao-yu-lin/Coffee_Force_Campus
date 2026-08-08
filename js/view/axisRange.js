// Manual axis bounds typed into the 座標軸範圍 panel.
// A blank field means "keep the automatic bound": fitAxisRange() for the time
// and value axes, TEMP_AXIS_RANGE for the temperature axis.

export const AXIS_RANGE_INPUT_IDS = [
  'axisXMin',      'axisXMax',
  'axisWeightMin', 'axisWeightMax',
  'axisFlowMin',   'axisFlowMax',
  'axisTempMin',   'axisTempMax'
];

function readNumber(id) {
  const el = document.getElementById(id);
  if (!el || el.value.trim() === '') return null;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : null;
}

/**
 * Read one min/max pair. An inverted pair is discarded rather than applied —
 * charts update on every keystroke, so a half-typed "10 ~ 2" would otherwise
 * collapse the axis while the user is still typing the second digit.
 */
function readPair(minId, maxId) {
  const min = readNumber(minId);
  const max = readNumber(maxId);
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min >= max) return null;
  return { min, max };
}

export function getAxisRanges() {
  return {
    x:      readPair('axisXMin',      'axisXMax'),
    weight: readPair('axisWeightMin', 'axisWeightMax'),
    flow:   readPair('axisFlowMin',   'axisFlowMax'),
    temp:   readPair('axisTempMin',   'axisTempMax')
  };
}

export function resetAxisRanges() {
  AXIS_RANGE_INPUT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// Which inputs back each saved axis key
const AXIS_FIELDS = {
  x:      ['axisXMin',      'axisXMax'],
  weight: ['axisWeightMin', 'axisWeightMax'],
  flow:   ['axisFlowMin',   'axisFlowMax'],
  temp:   ['axisTempMin',   'axisTempMax']
};

/**
 * Snapshot for saveData(). Unlike getAxisRanges() this reports the raw fields —
 * an inverted pair is stored as typed, and a blank stays null so loading it
 * back means "auto" rather than a bound of 0.
 */
export function getAxisRangeValues() {
  const out = {};
  Object.entries(AXIS_FIELDS).forEach(([key, [minId, maxId]]) => {
    out[key] = { min: readNumber(minId), max: readNumber(maxId) };
  });
  return out;
}

/** Restore a snapshot; a missing key or null bound clears that field to auto. */
export function setAxisRangeValues(values) {
  if (!values) return;
  Object.entries(AXIS_FIELDS).forEach(([key, [minId, maxId]]) => {
    const saved = values[key] || {};
    [[minId, saved.min], [maxId, saved.max]].forEach(([id, raw]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const n = Number(raw);
      el.value = (raw === null || raw === undefined || raw === '' || !Number.isFinite(n)) ? '' : n;
    });
  });
}
