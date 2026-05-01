/* ═══════════════════════════════════════════════════
   MAIN — Application entry point
   Depends on: all other modules
═══════════════════════════════════════════════════ */

function init() {
    document.getElementById('recordTime').value = new Date().toLocaleString('zh-TW');

    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    document.getElementById('folderInput').addEventListener('change', handleFolderSelect);
    document.getElementById('fileInputMobile').addEventListener('change', handleFileSelect);
    document.getElementById('folderInputMobile').addEventListener('change', handleFolderSelect);

    // Param real-time writeback to active dataset
    ['beanWeight','totalWater','grindSize','waterTemp','bloomTime','tds','totalTime'].forEach(key => {
        const el = document.getElementById(key);
        if (!el) return;
        el.addEventListener('input', () => {
            if (activeDatasetId && allDatasets[activeDatasetId]) {
                allDatasets[activeDatasetId][key] = el.value;
            }
        });
    });

    initCharts();
    buildAffectiveGrid();
    buildIntensityButtons();
    initializeCATAPanels();
    initializeSCAPanels();
    initOverallSelects();
}

init();
