const PARAM_LABELS = {
  beanWeight: '豆量 (g)',
  totalWater: '總水量 (g)',
  grindSize:  '研磨刻度',
  waterTemp:  '水溫 (°C)',
  bloomTime:  '預浸時間 (s)',
  tds:        'TDS (%)',
  totalTime:  '總時間 (s)',
};
const READONLY_FIELDS = new Set(['totalTime']);

export function renderParamsCards(datasets, visibility) {
  const container = document.getElementById('paramsContainer');
  if (!container) return;

  const visible = Object.entries(datasets)
    .filter(([id]) => visibility[id])
    .map(([, ds]) => ds);

  if (visible.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Preserve per-card collapsed state across re-renders
  const collapsedIds = new Set(
    [...container.querySelectorAll('.params-card.collapsed')].map(el => el.dataset.dsId)
  );

  container.innerHTML = visible.map(ds => {
    const isCollapsed = collapsedIds.has(String(ds.id));
    const color = ds.color || '#888';
    const mainParams = Object.entries(PARAM_LABELS).map(([key, label]) => `
      <div class="param-item">
        <label>${label}:</label>
        <input type="text"
          data-ds-id="${ds.id}" data-field="${key}"
          value="${escapeHtml(ds[key] ?? '')}"
          ${READONLY_FIELDS.has(key) ? 'readonly' : ''}>
      </div>`).join('');

    return `
      <div class="params-card ${isCollapsed ? 'collapsed' : ''}" data-ds-id="${ds.id}">
        <div class="params-card-header" style="background:${color}22;border-left:4px solid ${color};">
          <span class="params-card-title" style="color:${color};">${escapeHtml(ds.name)}</span>
          <button class="params-card-toggle" data-ds-id="${ds.id}" title="收合/展開">${isCollapsed ? '▸' : '▾'}</button>
        </div>
        <div class="params-card-body">
          <div class="params-grid">${mainParams}</div>
          <div class="params-grid" style="margin-top:4px;">
            <div class="param-item" style="grid-column:1/-1;">
              <label>備註:</label>
              <input type="text"
                data-ds-id="${ds.id}" data-field="extraNote"
                value="${escapeHtml(ds.extraNote ?? '')}"
                style="width:100%;" placeholder="沖煮備註">
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
