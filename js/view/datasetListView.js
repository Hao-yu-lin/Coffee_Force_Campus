// How long a single click on the colour swatch waits before acting, so a
// second click can be recognised as "open the colour picker" instead.
const DBLCLICK_MS = 220;

/** input[type=color] only accepts #rrggbb — fall back rather than silently reset. */
function toPickerHex(color) {
  return /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#888888';
}

export function renderDatasetList(datasets, visibility, activeId, callbacks) {
  const container = document.getElementById('datasetList');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(datasets).reverse().forEach(id => {
    const ds = datasets[id];
    const isVisible = visibility[id];

    const item = document.createElement('div');
    item.className = `dataset-item ${!isVisible ? 'disabled' : ''}`;
    item.style.borderLeftColor = ds.color;
    if (id === activeId) {
      item.style.background = '#e8eaf6';
      item.style.outline    = '2px solid #667eea';
    }

    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.className = 'dataset-checkbox'; cb.checked = isVisible;
    cb.onchange = e => { e.stopPropagation(); callbacks.onToggle(id); };

    const color = document.createElement('div');
    color.className = 'dataset-color';
    color.style.backgroundColor = ds.color;
    color.style.cursor = 'pointer';
    color.style.position = 'relative';
    color.title = '點一下載入，連點兩下改顏色';

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

    // A single click reloads the dataset, which re-renders this list and throws
    // this node away — a native dblclick would never land on it. So hold the
    // load briefly and treat a second click as "edit colour" instead.
    let clickTimer = null;
    color.onclick = e => {
      e.stopPropagation();
      if (clickTimer !== null) {
        clearTimeout(clickTimer);
        clickTimer = null;
        picker.click();
        return;
      }
      clickTimer = setTimeout(() => {
        clickTimer = null;
        callbacks.onLoad(id);
      }, DBLCLICK_MS);
    };

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

export function renderCVADatasetPanel(datasets, activeId, onLoadCallback, onAddCallback, onDeleteCallback) {
  const targets = [
    { list: 'cva-desc-dataset-list', mobile: 'cva-desc-mobile-list' },
    { list: 'cva-aff-dataset-list',  mobile: 'cva-aff-mobile-list'  }
  ];
  targets.forEach(({ list, mobile }) => {
    const container = document.getElementById(list);
    if (container) {
      container.innerHTML = '';
      if (onAddCallback) {
        const addBtn = document.createElement('div');
        addBtn.className = 'cva-ds-item cva-ds-add';
        addBtn.onclick = onAddCallback;
        addBtn.innerHTML = '<span style="font-size:1.2em;font-weight:bold;">＋</span><div class="cva-ds-name">新增資料集</div>';
        container.appendChild(addBtn);
      }
      Object.keys(datasets).reverse().forEach(id => {
        const ds = datasets[id];
        const isActive = id === activeId;
        const div = document.createElement('div');
        div.className = `cva-ds-item${isActive ? ' active' : ''}`;
        div.style.borderLeftColor = ds.color;
        div.onclick = () => onLoadCallback(id);
        const dot = document.createElement('div');
        dot.className = 'cva-ds-dot';
        dot.style.background = ds.color;
        const name = document.createElement('div');
        name.className = 'cva-ds-name';
        name.textContent = ds.name;
        if (isActive) name.style.fontWeight = 'bold';
        div.appendChild(dot); div.appendChild(name);
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
      if (onAddCallback) {
        const addChip = document.createElement('span');
        addChip.className = 'cva-mobile-ds-chip cva-mobile-ds-add';
        addChip.onclick = onAddCallback;
        addChip.textContent = '＋';
        mobileContainer.appendChild(addChip);
      }
      Object.keys(datasets).reverse().forEach(id => {
        const ds = datasets[id];
        const isActive = id === activeId;
        const wrap = document.createElement('span');
        wrap.style.position = 'relative';
        wrap.style.display  = 'inline-flex';
        wrap.style.alignItems = 'center';
        const chip = document.createElement('span');
        chip.className = `cva-mobile-ds-chip${isActive ? ' active' : ''}`;
        chip.onclick = () => onLoadCallback(id);
        chip.innerHTML = `<span class="cva-mobile-ds-dot" style="background:${ds.color}"></span>${ds.name}`;
        wrap.appendChild(chip);
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
