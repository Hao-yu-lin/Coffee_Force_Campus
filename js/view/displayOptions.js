// Single source of truth for the "顯示選項" checkboxes shared by the
// chart, dataset, import and persist controllers.

export const DISPLAY_OPTION_IDS = [
  'showWeight', 'showFlow', 'showBrewFlow', 'showTemp',
  'showAdc1', 'showAdc2', 'showThermometer', 'showEC'
];

export function getDisplayOptions() {
  const opts = {};
  DISPLAY_OPTION_IDS.forEach(id => {
    opts[id] = document.getElementById(id)?.checked ?? true;
  });
  return opts;
}

export function setDisplayOptions(opts) {
  if (!opts) return;
  DISPLAY_OPTION_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && opts[id] !== undefined) el.checked = opts[id];
  });
}
