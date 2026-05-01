/* ═══════════════════════════════════════════════════
   IMPORT — CSV file import handlers
   Depends on: state.js, constants.js, utils.js, ui.js, charts.js, dataset.js
═══════════════════════════════════════════════════ */

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    let loaded = 0, failed = 0, pending = files.length;
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
            const ok = parseAkirakokiCSV(e.target.result, file.name, true);
            ok ? loaded++ : failed++;
            pending--;
            if (pending === 0) {
                alert(`✅ 匯入完成！\n成功：${loaded} 個檔案　失敗：${failed} 個檔案`);
                event.target.value = '';
            }
        };
        reader.onerror = () => {
            failed++; pending--;
            if (pending === 0) {
                alert(`✅ 匯入完成！\n成功：${loaded} 個檔案　失敗：${failed} 個檔案`);
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    });
}

function parseAkirakokiCSV(csvText, filename, silent = false) {
    let success = false;
    try {
        Papa.parse(csvText, {
            complete: function(results) {
                const pd = parseAkirakokiRows(results.data);
                const minLen = getAkirakokiMinLen(pd);
                if (!minLen) {
                    if (!silent) alert('無法解析 CSV 格式');
                    return;
                }

                const id    = `dataset_${datasetCounter++}`;
                const name  = filename.replace('.csv', '');
                const color = getDatasetColor(Object.keys(allDatasets).length);
                allDatasets[id] = {
                    id, name, color,
                    totalTime: pd.time[minLen - 1] || '',
                    time:   pd.time.slice(0, minLen),
                    weight: pd.weight.slice(0, minLen),
                    flow:   pd.flow.slice(0, minLen),
                    temp:   pd.temp.length ? pd.temp.slice(0, minLen) : new Array(minLen).fill(0)
                };
                datasetVisibility[id] = true;
                if (Object.keys(allDatasets).length === 1 && !document.getElementById('coffeeName').value)
                    document.getElementById('coffeeName').value = name;
                updateDatasetList(); updateCharts(); loadDatasetParams(id);
                success = true;
                if (!silent) alert(`✅ 成功導入：${filename}\n資料點數：${minLen}`);
            },
            error: e => { if (!silent) alert('CSV 解析錯誤: ' + e.message); }
        });
    } catch (e) { if (!silent) alert('檔案讀取失敗: ' + e.message); }
    return success;
}

function parseRawDataCSV(rows, filename) {
    try {
        const parsed = parseRawDataRows(rows);
        if (!parsed) return null;

        const { date, beanWeight, timeLabels, pWC, pWF, bC, bF, temp } = parsed;
        const id    = `dataset_${datasetCounter++}`;
        const name  = filename.replace('.csv', '');
        const color = getDatasetColor(Object.keys(allDatasets).length);
        allDatasets[id] = {
            id, name, color, date, beanWeight,
            totalTime: timeLabels[timeLabels.length - 1] || '',
            time: timeLabels, weight: pWC, flow: pWF, temp,
            metrics: {
                'Pouring water cumulative(g)': pWC,
                'Pour water flow rate(g/s)':   pWF,
                'Brewing cumulative(g)':        bC,
                'Brewing flow rate(g/s)':       bF,
                'Temperature(℃)':              temp
            }
        };
        datasetVisibility[id] = true;
        if (Object.keys(allDatasets).length === 1 && !document.getElementById('coffeeName').value)
            document.getElementById('coffeeName').value = name;
        if (beanWeight && !document.getElementById('beanWeight').value)
            document.getElementById('beanWeight').value = beanWeight;
        return true;
    } catch (e) { console.error(e); return null; }
}

function handleFolderSelect(event) {
    const files = Array.from(event.target.files).filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (!files.length) { alert('資料夾內找不到 CSV 檔案'); return; }
    let loaded = 0, failed = 0, pending = files.length;
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
            Papa.parse(e.target.result, {
                complete: results => {
                    const rows = results.data;
                    const fmt  = detectCSVFormat(rows);
                    let ok = false;
                    if (fmt === 'raw') ok = parseRawDataCSV(rows, file.name);
                    if (!ok) ok = parseAkirakokiCSV(e.target.result, file.name, true);
                    ok ? loaded++ : failed++;
                    pending--;
                    updateDatasetList(); updateCharts();
                    if (pending === 0) {
                        const latestId = Object.keys(allDatasets).slice(-1)[0];
                        if (latestId) loadDatasetParams(latestId);
                        alert(`資料夾載入完成！\n成功：${loaded}　失敗：${failed}`);
                        event.target.value = '';
                    }
                },
                error: () => { failed++; pending--; }
            });
        };
        reader.readAsText(file);
    });
}
