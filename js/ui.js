/* ═══════════════════════════════════════════════════
   UI — Tab switching, mobile drawer, dataset list
   Depends on: state.js, constants.js, dataset.js
═══════════════════════════════════════════════════ */

function switchTab(tabName, clickedBtn, isMobile = false) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-mobile-btn').forEach(b => b.classList.remove('active'));

    document.getElementById('tab-' + tabName).classList.add('active');

    if (isMobile) {
        clickedBtn.classList.add('active');
        document.querySelectorAll('.tab-btn').forEach(b => {
            if (b.getAttribute('onclick').includes(`'${tabName}'`)) b.classList.add('active');
        });
    } else {
        clickedBtn.classList.add('active');
        const mbtn = document.getElementById(`mbtn-${tabName}`);
        if (mbtn) mbtn.classList.add('active');
    }
}

function toggleMobileDrawer() {
    const drawer = document.getElementById('mobileControlDrawer');
    const isOpen = drawer.style.display !== 'none';
    if (!isOpen) {
        renderMobileDrawer();
        drawer.style.display = 'block';
        document.querySelector('.mobile-control-toggle').textContent = '⚙️ 資料集管理 / 圖表控制 ▴';
    } else {
        drawer.style.display = 'none';
        document.querySelector('.mobile-control-toggle').textContent = '⚙️ 資料集管理 / 圖表控制 ▾';
    }
}

function renderMobileDrawer() {
    const drawer  = document.getElementById('mobileControlDrawer');
    const desktop = document.getElementById('desktopControlPanel');
    drawer.innerHTML = desktop.innerHTML;

    const importBtn = drawer.querySelector('.import-btn');
    const folderBtn = drawer.querySelector('.folder-btn');
    if (importBtn) {
        importBtn.removeAttribute('onclick');
        importBtn.addEventListener('click', () => document.getElementById('fileInputMobile').click());
    }
    if (folderBtn) {
        folderBtn.removeAttribute('onclick');
        folderBtn.addEventListener('click', () => document.getElementById('folderInputMobile').click());
    }
}

function updateDatasetList() {
    const container = document.getElementById('datasetList');
    container.innerHTML = '';

    Object.keys(allDatasets).reverse().forEach(id => {
        const ds = allDatasets[id];
        const isVisible = datasetVisibility[id];

        const item = document.createElement('div');
        item.className = `dataset-item ${!isVisible ? 'disabled' : ''}`;
        item.style.borderLeftColor = ds.color;
        if (id === activeDatasetId) {
            item.style.background = '#e8eaf6';
            item.style.outline    = '2px solid #667eea';
        }

        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.className = 'dataset-checkbox'; cb.checked = isVisible;
        cb.onchange = e => { e.stopPropagation(); toggleDataset(id); };

        const color = document.createElement('div');
        color.className = 'dataset-color';
        color.style.backgroundColor = ds.color;
        color.style.cursor = 'pointer';
        color.onclick = e => { e.stopPropagation(); loadDatasetParams(id); };

        const lbl = document.createElement('div');
        lbl.className = 'dataset-label';
        lbl.textContent = ds.name;
        lbl.style.cursor = 'pointer';
        lbl.onclick = e => { e.stopPropagation(); loadDatasetParams(id); };

        const del = document.createElement('button');
        del.className = 'delete-btn'; del.innerHTML = '🗑'; del.title = '刪除';
        del.onclick = e => { e.stopPropagation(); deleteDataset(id); };

        item.appendChild(cb); item.appendChild(color); item.appendChild(lbl); item.appendChild(del);
        container.appendChild(item);
    });

    updateCVADatasetPanel();
}

function updateCVADatasetPanel() {
    const targets = [
        { list: 'cva-desc-dataset-list', mobile: 'cva-desc-mobile-list' },
        { list: 'cva-aff-dataset-list',  mobile: 'cva-aff-mobile-list'  }
    ];
    targets.forEach(({ list, mobile }) => {
        const container = document.getElementById(list);
        if (container) {
            container.innerHTML = '';
            Object.keys(allDatasets).reverse().forEach(id => {
                const ds = allDatasets[id];
                const isActive = id === activeDatasetId;
                const div = document.createElement('div');
                div.className = `cva-ds-item${isActive ? ' active' : ''}`;
                div.style.borderLeftColor = ds.color;
                div.onclick = () => loadDatasetParams(id);

                const dot = document.createElement('div');
                dot.className = 'cva-ds-dot';
                dot.style.background = ds.color;

                const name = document.createElement('div');
                name.className = 'cva-ds-name';
                name.textContent = ds.name;
                if (isActive) name.style.fontWeight = 'bold';

                div.appendChild(dot); div.appendChild(name);
                container.appendChild(div);
            });
        }

        const mobileContainer = document.getElementById(mobile);
        if (mobileContainer) {
            mobileContainer.innerHTML = '';
            Object.keys(allDatasets).reverse().forEach(id => {
                const ds = allDatasets[id];
                const isActive = id === activeDatasetId;
                const chip = document.createElement('span');
                chip.className = `cva-mobile-ds-chip${isActive ? ' active' : ''}`;
                chip.onclick = () => loadDatasetParams(id);
                chip.innerHTML = `<span class="cva-mobile-ds-dot" style="background:${ds.color}"></span>${ds.name}`;
                mobileContainer.appendChild(chip);
            });
        }
    });
}
