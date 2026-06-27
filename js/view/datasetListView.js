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
    color.onclick = e => { e.stopPropagation(); callbacks.onLoad(id); };

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
