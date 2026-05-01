/* ═══════════════════════════════════════════════════
   CVA — Descriptive & Affective UI logic
   Depends on: state.js, constants.js, utils.js
═══════════════════════════════════════════════════ */

/* ── Build UI ─────────────────────────────────── */

function buildIntensityButtons() {
    document.querySelectorAll('.intensity-grid').forEach(grid => {
        for (let i = 1; i <= 15; i++) {
            const btn = document.createElement('div');
            btn.className = 'intensity-btn';
            btn.textContent = i;
            btn.dataset.value = i;
            btn.addEventListener('click', function() {
                const parent = this.closest('.intensity-grid');
                parent.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            });
            grid.appendChild(btn);
        }
    });
}

function buildAffectiveGrid() {
    const grid = document.getElementById('affectiveGrid');
    grid.innerHTML = '';
    AFFECTIVE_SECTIONS.forEach(sec => {
        const div = document.createElement('div');
        div.className = 'affective-section';
        let btnsHtml = '';
        for (let i = 1; i <= 9; i++) {
            btnsHtml += `<button class="score-btn" data-score="${i}" onclick="selectScore('${sec}',${i})">${i}</button>`;
        }
        div.innerHTML = `
            <h3>${sec.charAt(0).toUpperCase() + sec.slice(1)}</h3>
            <div class="score-buttons" data-affective="${sec}">${btnsHtml}</div>
            <textarea class="cva-notes" placeholder="Notes..." style="height:40px;"></textarea>
        `;
        grid.appendChild(div);
    });
}

function initOverallSelects() {
    function updateColor(sel) {
        sel.style.color      = sel.value === '0' ? '#e53935' : '#333';
        sel.style.fontWeight = sel.value === '0' ? 'bold'    : 'normal';
    }
    document.querySelectorAll('select[id$="-overall"]').forEach(sel => {
        updateColor(sel);
        sel.addEventListener('change', () => updateColor(sel));
    });
}

function initializeCATAPanels() {
    ['fragrance','flavor','aftertaste'].forEach(section => {
        const container = document.getElementById(`${section}-cata-grid`);
        if (!container) return;
        let html = '<div style="display:grid;gap:8px;">';
        Object.keys(CATA_DATA).forEach(mainCat => {
            const subs = CATA_DATA[mainCat];
            html += `<div style="border-bottom:1px solid #eee;padding:6px 0;">`;
            html += `<label class="check-label"><input type="checkbox" name="${section}-cata" value="${mainCat}"> <strong>${mainCat}</strong></label>`;
            subs.forEach(sub => {
                if (sub !== mainCat) html += `<label class="check-label"><input type="checkbox" name="${section}-cata" value="${sub}"> ${sub}</label>`;
            });
            html += `</div>`;
        });
        html += '</div>';
        container.innerHTML = html;
        container.addEventListener('change', () => updateSelectionSummary(section));
    });
    // Bind change to static Main Tastes checkboxes
    ['fragrance','flavor','aftertaste'].forEach(section => {
        const cataPanel = document.getElementById(`${section}-cata`);
        if (!cataPanel) return;
        cataPanel.querySelectorAll(`[name="${section}-mt"]`).forEach(cb => {
            cb.addEventListener('change', () => updateSelectionSummary(section));
        });
    });
}

function initializeSCAPanels() {
    ['fragrance','flavor','aftertaste'].forEach(section => {
        const container = document.getElementById(`${section}-sca-content`);
        if (!container) return;
        let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
        Object.keys(SCA_DATA).forEach(tier1 => {
            const tier2Data = SCA_DATA[tier1];
            html += `<div style="border-left:3px solid #1A237E;padding-left:12px;">`;
            html += `<label class="check-label"><input type="checkbox" name="${section}-sca1" value="${tier1}"> <strong style="color:#1A237E">${tier1}</strong></label>`;
            html += `<div style="margin-left:20px;margin-top:6px;">`;
            Object.keys(tier2Data).forEach(tier2 => {
                html += `<div style="margin-bottom:6px;">`;
                html += `<label class="check-label"><input type="checkbox" name="${section}-sca2" value="${tier2}"> <strong>${tier2}</strong></label>`;
                tier2Data[tier2].forEach(tier3 => {
                    html += `<label class="check-label" style="font-size:0.82em;"><input type="checkbox" name="${section}-sca3" value="${tier3}"> ${tier3}</label>`;
                });
                html += `</div>`;
            });
            html += `</div></div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    });

    // Mouthfeel CATA
    const mfContainer = document.getElementById('mouthfeel-cata-grid');
    if (!mfContainer) return;
    let mfHtml = '<div style="display:grid;gap:8px;">';
    Object.keys(MOUTHFEEL_DATA).forEach(mainCat => {
        mfHtml += `<div style="border-bottom:1px solid #eee;padding:6px 0;">`;
        mfHtml += `<label class="check-label"><input type="checkbox" name="mouthfeel-cata" value="${mainCat}"> <strong>${mainCat}</strong></label>`;
        MOUTHFEEL_DATA[mainCat].forEach(sub => {
            mfHtml += `<label class="check-label"><input type="checkbox" name="mouthfeel-cata" value="${sub}"> ${sub}</label>`;
        });
        mfHtml += `</div>`;
    });
    mfHtml += '</div>';
    mfContainer.innerHTML = mfHtml;
    mfContainer.addEventListener('change', () => updateSelectionSummary('mouthfeel'));

    // Bind SCA panel change events
    ['fragrance','flavor','aftertaste'].forEach(section => {
        const scaPanel = document.getElementById(`${section}-sca`);
        if (!scaPanel) return;
        scaPanel.addEventListener('change', () => updateSelectionSummary(section));
    });
}

/* ── Selection Summary ────────────────────────── */

function updateSelectionSummary(section) {
    const summaryEl = document.getElementById(`${section}-summary`);
    if (!summaryEl) return;

    const cataChecked = [];
    document.querySelectorAll(`[name="${section}-mt"]:checked,
        [name="${section}-cata"]:checked`).forEach(cb => cataChecked.push(cb.value));

    const scaChecked = [];
    document.querySelectorAll(`[name="${section}-sca1"]:checked,
        [name="${section}-sca2"]:checked,
        [name="${section}-sca3"]:checked`).forEach(cb => scaChecked.push(cb.value));

    const html = buildSummaryHTML(cataChecked, scaChecked);
    summaryEl.classList.toggle('has-items', html !== '');
    summaryEl.innerHTML = html;
}

/* ── CVA Panel Toggle ─────────────────────────── */

function toggleCVAPanel(section, type) {
    const cataPanel = document.getElementById(`${section}-cata`);
    const scaPanel  = document.getElementById(`${section}-sca`);
    if (type === 'cata') {
        if (!cataPanel) return;
        const open = cataPanel.style.display === 'block';
        cataPanel.style.display = open ? 'none' : 'block';
        if (scaPanel) scaPanel.style.display = 'none';
    } else {
        if (!scaPanel) return;
        const open = scaPanel.style.display === 'block';
        scaPanel.style.display = open ? 'none' : 'block';
        if (cataPanel) cataPanel.style.display = 'none';
    }
}

/* ── Affective Scores ─────────────────────────── */

function selectScore(section, score) {
    const container = document.querySelector(`[data-affective="${section}"]`);
    if (!container) return;
    container.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
    const target = container.querySelector(`[data-score="${score}"]`);
    if (target) target.classList.add('selected');
    affectiveScores[section] = score;
    updateAffectiveScores();
}

function updateAffectiveScores() {
    const total = calcWBrCTotal(affectiveScores, AFFECTIVE_SECTIONS);
    document.getElementById('wbrcScore').innerHTML = `WBrC Coffee Eva. Score: <b>${total.toFixed(1)}</b>`;
    document.getElementById('cvaScore').textContent = `CVA 100-pt Score: ${calcCVAScore(total).toFixed(1)}`;
}
