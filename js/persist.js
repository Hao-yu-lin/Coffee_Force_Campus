/* ═══════════════════════════════════════════════════
   PERSIST — CVA state collect/restore/clear + save/load JSON
   Depends on: state.js, constants.js, cva.js, ui.js, charts.js, dataset.js
═══════════════════════════════════════════════════ */

/* ── Clear ────────────────────────────────────── */

function clearDescriptiveState() {
    CVA_DESCRIPTIVE_SECTIONS.forEach(sec => {
        const ov = document.getElementById(`${sec}-overall`);
        if (ov) { ov.value = '0'; ov.style.color = '#e53935'; ov.style.fontWeight = 'bold'; }
        document.querySelectorAll(`.intensity-grid[data-section="${sec}"] .intensity-btn`)
            .forEach(b => b.classList.remove('selected'));
        ['mt','cata','sca1','sca2','sca3'].forEach(n =>
            document.querySelectorAll(`input[name="${sec}-${n}"]`).forEach(el => el.checked = false));
        document.querySelectorAll('input[name="mouthfeel-cata"]').forEach(el => el.checked = false);
        updateSelectionSummary(sec);
    });
    document.querySelectorAll('#tab-descriptive textarea').forEach(ta => ta.value = '');
}

function clearAffectiveState() {
    affectiveScores = {};
    AFFECTIVE_SECTIONS.forEach(sec => {
        const c = document.querySelector(`[data-affective="${sec}"]`);
        if (c) c.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
    });
    updateAffectiveScores();
    document.querySelectorAll('#tab-affective textarea').forEach(ta => ta.value = '');
}

/* ── Collect ──────────────────────────────────── */

function collectDescriptiveState() {
    const state = {};
    CVA_DESCRIPTIVE_SECTIONS.forEach(sec => {
        state[sec] = {};
        const ov = document.getElementById(`${sec}-overall`);
        if (ov) state[sec].overall = ov.value;
        state[sec].intensity = {};
        document.querySelectorAll(`.intensity-grid[data-section="${sec}"]`).forEach(grid => {
            const sel = grid.querySelector('.intensity-btn.selected');
            state[sec].intensity[grid.dataset.stage] = sel ? sel.dataset.value : null;
        });
        const mt = [...document.querySelectorAll(`input[name="${sec}-mt"]:checked`)].map(e => e.value);
        if (mt.length) state[sec].mainTastes = mt;
        const cata = [...document.querySelectorAll(`input[name="${sec}-cata"]:checked`)].map(e => e.value);
        if (cata.length) state[sec].cata = cata;
        ['sca1','sca2','sca3'].forEach(lvl => {
            const v = [...document.querySelectorAll(`input[name="${sec}-${lvl}"]:checked`)].map(e => e.value);
            if (v.length) state[sec][lvl] = v;
        });
        if (sec === 'mouthfeel') {
            const mf = [...document.querySelectorAll('input[name="mouthfeel-cata"]:checked')].map(e => e.value);
            if (mf.length) state[sec].mouthfeelCata = mf;
        }
    });
    const areas = document.querySelectorAll('#tab-descriptive textarea');
    CVA_DESCRIPTIVE_SECTIONS.forEach((k, i) => {
        if (areas[i]) { if (!state[k]) state[k] = {}; state[k].notes = areas[i].value; }
    });
    return state;
}

function collectAffectiveState() {
    const state = { scores: { ...affectiveScores }, notes: {} };
    const areas = document.querySelectorAll('#tab-affective textarea');
    AFFECTIVE_SECTIONS.forEach((sec, i) => { if (areas[i]) state.notes[sec] = areas[i].value; });
    return state;
}

/* ── Restore ──────────────────────────────────── */

function restoreDescriptiveState(state) {
    if (!state) return;
    CVA_DESCRIPTIVE_SECTIONS.forEach(sec => {
        const s = state[sec]; if (!s) return;
        const ov = document.getElementById(`${sec}-overall`);
        if (ov && s.overall !== undefined) {
            ov.value = s.overall;
            ov.style.color      = s.overall === '0' ? '#e53935' : '#333';
            ov.style.fontWeight = s.overall === '0' ? 'bold'    : 'normal';
        }
        if (s.intensity) {
            Object.keys(s.intensity).forEach(stage => {
                const val = s.intensity[stage]; if (!val) return;
                const grid = document.querySelector(`.intensity-grid[data-section="${sec}"][data-stage="${stage}"]`);
                if (!grid) return;
                grid.querySelectorAll('.intensity-btn').forEach(b =>
                    b.classList.toggle('selected', b.dataset.value === val));
            });
        }
        if (s.mainTastes) document.querySelectorAll(`input[name="${sec}-mt"]`).forEach(el => el.checked = s.mainTastes.includes(el.value));
        if (s.cata)        document.querySelectorAll(`input[name="${sec}-cata"]`).forEach(el => el.checked = s.cata.includes(el.value));
        if (s.mouthfeelCata) document.querySelectorAll('input[name="mouthfeel-cata"]').forEach(el => el.checked = s.mouthfeelCata.includes(el.value));
        ['sca1','sca2','sca3'].forEach(lvl => {
            if (s[lvl]) document.querySelectorAll(`input[name="${sec}-${lvl}"]`).forEach(el => el.checked = s[lvl].includes(el.value));
        });
        updateSelectionSummary(sec);
    });
    const areas = document.querySelectorAll('#tab-descriptive textarea');
    CVA_DESCRIPTIVE_SECTIONS.forEach((k, i) => {
        if (areas[i] && state[k]?.notes !== undefined) areas[i].value = state[k].notes;
    });
}

function restoreAffectiveState(state) {
    if (!state) return;
    if (state.scores) {
        affectiveScores = { ...state.scores };
        Object.keys(affectiveScores).forEach(sec => selectScore(sec, affectiveScores[sec]));
    }
    if (state.notes) {
        const areas = document.querySelectorAll('#tab-affective textarea');
        AFFECTIVE_SECTIONS.forEach((sec, i) => {
            if (areas[i] && state.notes[sec] !== undefined) areas[i].value = state.notes[sec];
        });
    }
}

/* ── Save / Load JSON ─────────────────────────── */

function saveData() {
    if (activeDatasetId && allDatasets[activeDatasetId]) {
        ['beanWeight','totalWater','grindSize','waterTemp','bloomTime','tds','totalTime'].forEach(k => {
            const el = document.getElementById(k);
            if (el) allDatasets[activeDatasetId][k] = el.value;
        });
        allDatasets[activeDatasetId].cva_descriptive = collectDescriptiveState();
        allDatasets[activeDatasetId].cva_affective   = collectAffectiveState();
    }
    const data = {
        version: 3,
        name:      document.getElementById('coffeeName').value,
        target:    document.getElementById('brewingTarget').value,
        timestamp: document.getElementById('recordTime').value,
        activeDatasetId,
        datasets:           allDatasets,
        dataset_visibility: datasetVisibility,
        cva_descriptive:    collectDescriptiveState(),
        cva_affective:      collectAffectiveState()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${data.name || 'brewing'}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('✅ 資料已完整儲存！');
}

function loadHistory() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.name   !== undefined) document.getElementById('coffeeName').value    = data.name;
                if (data.target !== undefined) document.getElementById('brewingTarget').value = data.target;
                if (data.datasets) {
                    allDatasets       = data.datasets;
                    datasetVisibility = data.dataset_visibility || {};
                    Object.keys(allDatasets).forEach(id => {
                        if (datasetVisibility[id] === undefined) datasetVisibility[id] = true;
                    });
                    datasetCounter = Object.keys(allDatasets).length;
                    updateDatasetList(); updateCharts();
                    const targetId = (data.activeDatasetId && allDatasets[data.activeDatasetId])
                        ? data.activeDatasetId : Object.keys(allDatasets)[0];
                    if (targetId) loadDatasetParams(targetId);
                    if (data.brewing_params) {
                        const bp = data.brewing_params;
                        ['beanWeight','totalWater','grindSize','waterTemp','bloomTime','tds','totalTime'].forEach(k => {
                            const el = document.getElementById(k);
                            if (el && !el.value && bp[k] !== undefined) el.value = bp[k];
                        });
                    }
                }
                if (data.cva_descriptive) restoreDescriptiveState(data.cva_descriptive);
                if (data.cva_affective)   restoreAffectiveState(data.cva_affective);
                alert(`✅ 歷史檔案「${file.name}」讀取成功！`);
            } catch (err) { alert('❌ 讀取失敗：' + err.message); }
        };
        reader.readAsText(file);
    };
    input.click();
}
