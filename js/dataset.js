/* ═══════════════════════════════════════════════════
   DATASET — Dataset management (load, toggle, delete)
   Depends on: state.js, constants.js, persist.js, ui.js, charts.js, cva.js
═══════════════════════════════════════════════════ */

function loadDatasetParams(datasetId) {
    const ds = allDatasets[datasetId];
    if (!ds) return;

    // Save current CVA state to old dataset
    if (activeDatasetId && allDatasets[activeDatasetId] && activeDatasetId !== datasetId) {
        allDatasets[activeDatasetId].cva_descriptive = collectDescriptiveState();
        allDatasets[activeDatasetId].cva_affective   = collectAffectiveState();
    }

    activeDatasetId = datasetId;

    document.getElementById('beanWeight').value  = ds.beanWeight  || '';
    document.getElementById('totalTime').value   = ds.totalTime   || '';
    document.getElementById('totalWater').value  = ds.totalWater  || '';
    document.getElementById('grindSize').value   = ds.grindSize   || '';
    document.getElementById('waterTemp').value   = ds.waterTemp   || '';
    document.getElementById('bloomTime').value   = ds.bloomTime   || '';
    document.getElementById('tds').value         = ds.tds         || '';

    clearDescriptiveState();
    clearAffectiveState();
    if (ds.cva_descriptive) restoreDescriptiveState(ds.cva_descriptive);
    if (ds.cva_affective)   restoreAffectiveState(ds.cva_affective);

    document.getElementById('currentDatasetName').textContent = ds.name;
    document.getElementById('currentDatasetBanner').style.display = 'block';

    updateDatasetList();
    updateCVADatasetPanel();
}

function toggleDataset(id) {
    datasetVisibility[id] = !datasetVisibility[id];
    if (datasetVisibility[id]) loadDatasetParams(id);
    updateDatasetList(); updateCharts();
}

function toggleAllDatasets(visible) {
    Object.keys(allDatasets).forEach(id => datasetVisibility[id] = visible);
    updateDatasetList(); updateCharts();
}

function deleteDataset(id) {
    const name = allDatasets[id]?.name || id;
    if (!confirm(`確定要刪除「${name}」嗎？`)) return;
    delete allDatasets[id]; delete datasetVisibility[id];
    if (activeDatasetId === id) {
        activeDatasetId = null;
        document.getElementById('currentDatasetBanner').style.display = 'none';
    }
    updateDatasetList(); updateCharts();
}

function clearSelectedDatasets() {
    const selected = Object.keys(datasetVisibility).filter(id => datasetVisibility[id]);
    if (!selected.length) { alert('目前沒有勾選任何資料集'); return; }
    if (!confirm(`確定要清除已勾選的 ${selected.length} 個資料集嗎？`)) return;
    selected.forEach(id => { delete allDatasets[id]; delete datasetVisibility[id]; });

    const allGone = Object.keys(allDatasets).length === 0;
    if (allGone || selected.includes(activeDatasetId)) {
        activeDatasetId = null;
        document.getElementById('currentDatasetBanner').style.display = 'none';
        ['beanWeight','totalWater','grindSize','waterTemp','bloomTime','tds','totalTime'].forEach(k => {
            const el = document.getElementById(k);
            if (el) el.value = '';
        });
    }
    if (!allGone && !activeDatasetId) {
        const remaining = Object.keys(allDatasets);
        if (remaining.length) loadDatasetParams(remaining[remaining.length - 1]);
    }
    updateDatasetList(); updateCharts();
}
