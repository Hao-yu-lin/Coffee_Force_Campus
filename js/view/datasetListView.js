/** input[type=color] only accepts #rrggbb — fall back rather than silently reset. */
function toPickerHex(color) {
  return /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#888888';
}

/**
 * Open a colour input's picker.
 * `.click()` is the usual trick for hidden inputs, but Chromium only honours it
 * for type=file — for type=color a programmatic click is ignored outright, so
 * showPicker() is the only thing that actually opens the dialog. It needs
 * transient user activation, hence "call this straight from a click handler".
 */
function openColorPicker(input) {
  try {
    if (typeof input.showPicker === 'function') { input.showPicker(); return; }
  } catch { /* no user activation — fall through */ }
  input.click();
}

export function renderDatasetList(datasets, visibility, activeId, callbacks) {
  const container = document.getElementById('datasetList');
  if (!container) return;
  container.innerHTML = '';

  const order = Object.keys(datasets).reverse();

  order.forEach((id, index) => {
    const ds = datasets[id];
    const isVisible = visibility[id];

    const item = document.createElement('div');
    item.className = `dataset-item ${!isVisible ? 'disabled' : ''}`;
    item.style.borderLeftColor = ds.color;
    if (id === activeId) {
      item.style.background = '#e8eaf6';
      item.style.outline    = '2px solid #667eea';
    }

    // ── 排序模式：只留顏色、名稱與上下移動按鈕 ──
    if (callbacks.sortMode) {
      item.classList.add('sorting');

      const color = document.createElement('div');
      color.className = 'dataset-color';
      color.style.backgroundColor = ds.color;

      const lbl = document.createElement('div');
      lbl.className = 'dataset-label';
      lbl.textContent = ds.name;

      const up = document.createElement('button');
      up.className = 'dataset-move-btn'; up.innerHTML = '▲'; up.title = '上移';
      up.disabled = index === 0;
      up.onclick = e => { e.stopPropagation(); callbacks.onMove?.(id, -1); };

      const down = document.createElement('button');
      down.className = 'dataset-move-btn'; down.innerHTML = '▼'; down.title = '下移';
      down.disabled = index === order.length - 1;
      down.onclick = e => { e.stopPropagation(); callbacks.onMove?.(id, 1); };

      item.appendChild(color); item.appendChild(lbl);
      item.appendChild(up); item.appendChild(down);
      container.appendChild(item);
      return;
    }

    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.className = 'dataset-checkbox'; cb.checked = isVisible;
    cb.onchange = e => { e.stopPropagation(); callbacks.onToggle(id); };

    // The swatch is the colour control: one click opens the picker. Selecting
    // the dataset lives on the name next to it, so there is no timing race
    // between "load" and "edit colour" on the same element.
    const color = document.createElement('div');
    color.className = 'dataset-color';
    color.style.backgroundColor = ds.color;
    color.style.cursor = 'pointer';
    color.style.position = 'relative';
    color.title = '點一下改顏色';

    // Native picker, anchored to the swatch but invisible. It must stay in the
    // DOM while the dialog is open, so the colour callbacks below deliberately
    // avoid re-rendering this list.
    const picker = document.createElement('input');
    picker.type  = 'color';
    picker.value = toPickerHex(ds.color);
    picker.style.cssText = 'position:absolute;left:0;top:100%;width:0;height:0;padding:0;border:0;opacity:0;pointer-events:none;';
    picker.onclick = e => e.stopPropagation();
    picker.oninput = () => {
      color.style.backgroundColor = picker.value;
      item.style.borderLeftColor  = picker.value;
      callbacks.onColorPreview?.(id, picker.value);
    };
    picker.onchange = () => callbacks.onColorCommit?.(id, picker.value);
    color.appendChild(picker);

    // Runs straight from the real click, so showPicker() still has the
    // transient user activation it requires.
    color.onclick = e => { e.stopPropagation(); openColorPicker(picker); };

    const lbl = document.createElement('div');
    lbl.className = 'dataset-label';
    lbl.textContent = ds.name;
    lbl.style.cursor = 'pointer';
    lbl.onclick = e => { e.stopPropagation(); callbacks.onLoad(id); };

    const del = document.createElement('button');
    del.className = 'delete-btn'; del.innerHTML = '🗑'; del.title = '刪除';
    del.onclick = e => { e.stopPropagation(); callbacks.onDelete(id); };

    item.appendChild(cb); item.appendChild(color); item.appendChild(lbl); item.appendChild(del);
    container.appendChild(item);
  });
}

export function renderCVADatasetPanel(datasets, activeId, onLoadCallback, onAddCallback, onDeleteCallback, options = {}) {
  const { sortMode = false, onMove } = options;
  const order = Object.keys(datasets).reverse();

  /** 排序模式下取代刪除鈕的兩顆搬動按鈕。 */
  const buildMoveButtons = (id, index, cls, [prev, next]) => {
    const mk = (label, dir, disabled, title) => {
      const b = document.createElement('button');
      b.className = cls; b.innerHTML = label; b.title = title;
      b.disabled = disabled;
      b.onclick = e => { e.stopPropagation(); onMove?.(id, dir); };
      return b;
    };
    return [
      mk(prev, -1, index === 0,               '往前移'),
      mk(next,  1, index === order.length - 1, '往後移')
    ];
  };

  const targets = [
    { list: 'cva-desc-dataset-list', mobile: 'cva-desc-mobile-list' },
    { list: 'cva-aff-dataset-list',  mobile: 'cva-aff-mobile-list'  }
  ];
  targets.forEach(({ list, mobile }) => {
    const container = document.getElementById(list);
    if (container) {
      container.innerHTML = '';
      // 排序模式下不顯示「新增資料集」，避免搬動時誤按
      if (onAddCallback && !sortMode) {
        const addBtn = document.createElement('div');
        addBtn.className = 'cva-ds-item cva-ds-add';
        addBtn.onclick = onAddCallback;
        addBtn.innerHTML = '<span style="font-size:1.2em;font-weight:bold;">＋</span><div class="cva-ds-name">新增資料集</div>';
        container.appendChild(addBtn);
      }
      order.forEach((id, index) => {
        const ds = datasets[id];
        const isActive = id === activeId;
        const div = document.createElement('div');
        div.className = `cva-ds-item${isActive ? ' active' : ''}${sortMode ? ' sorting' : ''}`;
        div.style.borderLeftColor = ds.color;
        if (!sortMode) div.onclick = () => onLoadCallback(id);
        const dot = document.createElement('div');
        dot.className = 'cva-ds-dot';
        dot.style.background = ds.color;
        const name = document.createElement('div');
        name.className = 'cva-ds-name';
        name.textContent = ds.name;
        if (isActive) name.style.fontWeight = 'bold';
        div.appendChild(dot); div.appendChild(name);
        if (sortMode) {
          buildMoveButtons(id, index, 'cva-ds-move-btn', ['▲', '▼'])
            .forEach(b => div.appendChild(b));
          container.appendChild(div);
          return;
        }
        if (onDeleteCallback) {
          const del = document.createElement('button');
          del.className = 'cva-ds-delete-btn';
          del.innerHTML = '🗑';
          del.title = '刪除';
          del.onclick = e => { e.stopPropagation(); onDeleteCallback(id); };
          div.appendChild(del);
        }
        container.appendChild(div);
      });
    }
    const mobileContainer = document.getElementById(mobile);
    if (mobileContainer) {
      mobileContainer.innerHTML = '';
      // 手機看不到側邊的「資料集切換」面板，排序開關要放進 chip 列
      // （data-action 交給 appController 的事件委派，重繪後仍然有效）
      const sortChip = document.createElement('span');
      sortChip.className = `cva-mobile-ds-chip cva-mobile-ds-sort${sortMode ? ' active' : ''}`;
      sortChip.dataset.action = 'sort-mode';
      sortChip.textContent = sortMode ? '✓ 完成' : '↕ 排序';
      mobileContainer.appendChild(sortChip);

      if (onAddCallback && !sortMode) {
        const addChip = document.createElement('span');
        addChip.className = 'cva-mobile-ds-chip cva-mobile-ds-add';
        addChip.onclick = onAddCallback;
        addChip.textContent = '＋';
        mobileContainer.appendChild(addChip);
      }
      order.forEach((id, index) => {
        const ds = datasets[id];
        const isActive = id === activeId;
        const wrap = document.createElement('span');
        wrap.style.position = 'relative';
        wrap.style.display  = 'inline-flex';
        wrap.style.alignItems = 'center';
        const chip = document.createElement('span');
        chip.className = `cva-mobile-ds-chip${isActive ? ' active' : ''}`;
        if (!sortMode) chip.onclick = () => onLoadCallback(id);
        chip.innerHTML = `<span class="cva-mobile-ds-dot" style="background:${ds.color}"></span>${ds.name}`;
        wrap.appendChild(chip);
        // 手機是橫向排列，所以用左右箭頭而不是上下
        if (sortMode) {
          buildMoveButtons(id, index, 'cva-mobile-ds-move-btn', ['◀', '▶'])
            .forEach(b => wrap.appendChild(b));
          mobileContainer.appendChild(wrap);
          return;
        }
        if (onDeleteCallback) {
          const del = document.createElement('button');
          del.className = 'cva-mobile-ds-delete-btn';
          del.innerHTML = '✕';
          del.title = '刪除';
          del.onclick = e => { e.stopPropagation(); onDeleteCallback(id); };
          wrap.appendChild(del);
        }
        mobileContainer.appendChild(wrap);
      });
    }
  });
}
