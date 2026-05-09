const PARAM_KEYS = ['beanWeight','totalWater','grindSize','waterTemp','bloomTime','tds','totalTime'];

export function getFormValues() {
  const result = {};
  [...PARAM_KEYS, 'coffeeName', 'brewingTarget', 'recordTime'].forEach(k => {
    const el = document.getElementById(k);
    if (el) result[k] = el.value;
  });
  return result;
}

export function setFormValues(params) {
  Object.entries(params).forEach(([k, v]) => {
    const el = document.getElementById(k);
    if (el && v !== undefined) el.value = v;
  });
}

export function clearFormValues(keys = PARAM_KEYS) {
  keys.forEach(k => {
    const el = document.getElementById(k);
    if (el) el.value = '';
  });
}

export function showDatasetBanner(name) {
  const banner = document.getElementById('currentDatasetBanner');
  const nameEl = document.getElementById('currentDatasetName');
  if (banner) banner.style.display = 'block';
  if (nameEl) nameEl.textContent = name;
}

export function hideDatasetBanner() {
  const banner = document.getElementById('currentDatasetBanner');
  if (banner) banner.style.display = 'none';
}

export function bindParamInputs(onChange) {
  PARAM_KEYS.forEach(key => {
    const el = document.getElementById(key);
    if (!el) return;
    el.addEventListener('input', () => onChange(key, el.value));
  });
}
