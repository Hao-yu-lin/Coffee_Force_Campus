// Uses globals: AFFECTIVE_SECTIONS, CVA_DESCRIPTIVE_SECTIONS, CATA_DATA, SCA_DATA,
//               MOUTHFEEL_DATA, calcWBrCTotal, calcCVAScore, buildSummaryHTML

/* ── Build UI ─────────────────────────────────── */

export function buildIntensityButtons() {
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

export function buildAffectiveGrid(sections) {
  const grid = document.getElementById('affectiveGrid');
  if (!grid) return;
  grid.innerHTML = '';
  sections.forEach(sec => {
    const div = document.createElement('div');
    div.className = 'affective-section';
    let btnsHtml = '';
    for (let i = 1; i <= 9; i++) {
      btnsHtml += `<button class="score-btn" data-score="${i}" data-affective="${sec}">${i}</button>`;
    }
    div.innerHTML = `
      <h3>${sec.charAt(0).toUpperCase() + sec.slice(1)}</h3>
      <div class="score-buttons" data-affective="${sec}">${btnsHtml}</div>
      <textarea class="cva-notes" placeholder="Notes..." style="height:40px;"></textarea>
    `;
    grid.appendChild(div);
  });
}

export function initOverallSelects() {
  function updateColor(sel) {
    sel.style.color      = sel.value === '0' ? '#e53935' : '#333';
    sel.style.fontWeight = sel.value === '0' ? 'bold'    : 'normal';
  }
  document.querySelectorAll('select[id$="-overall"]').forEach(sel => {
    updateColor(sel);
    sel.addEventListener('change', () => updateColor(sel));
  });
}

export function initializeCATAPanels() {
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
  ['fragrance','flavor','aftertaste'].forEach(section => {
    const cataPanel = document.getElementById(`${section}-cata`);
    if (!cataPanel) return;
    cataPanel.querySelectorAll(`[name="${section}-mt"]`).forEach(cb => {
      cb.addEventListener('change', () => updateSelectionSummary(section));
    });
  });
}

export function initializeSCAPanels() {
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

  const mfContainer = document.getElementById('mouthfeel-cata-grid');
  if (mfContainer) {
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
  }

  ['fragrance','flavor','aftertaste'].forEach(section => {
    const scaPanel = document.getElementById(`${section}-sca`);
    if (!scaPanel) return;
    scaPanel.addEventListener('change', () => updateSelectionSummary(section));
  });
}

export function updateSelectionSummary(section) {
  const summaryEl = document.getElementById(`${section}-summary`);
  if (!summaryEl) return;
  const cataChecked = [];
  document.querySelectorAll(`[name="${section}-mt"]:checked, [name="${section}-cata"]:checked`)
    .forEach(cb => cataChecked.push(cb.value));
  const scaChecked = [];
  document.querySelectorAll(`[name="${section}-sca1"]:checked, [name="${section}-sca2"]:checked, [name="${section}-sca3"]:checked`)
    .forEach(cb => scaChecked.push(cb.value));
  const html = buildSummaryHTML(cataChecked, scaChecked);
  summaryEl.classList.toggle('has-items', html !== '');
  summaryEl.innerHTML = html;
}

export function toggleCVAPanel(section, type) {
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

export function updateAffectiveScoreDisplay(scores, sections) {
  const total = calcWBrCTotal(scores, sections);
  const wbrc = document.getElementById('wbrcScore');
  const cva  = document.getElementById('cvaScore');
  if (wbrc) wbrc.innerHTML = `WBrC Coffee Eva. Score: <b>${total.toFixed(1)}</b>`;
  if (cva)  cva.textContent = `CVA 100-pt Score: ${calcCVAScore(total).toFixed(1)}`;
}

/* ── Clear ────────────────────────────────────── */

export function clearDescriptiveState() {
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

export function clearAffectiveState(appState) {
  appState.clearAffectiveScores();
  AFFECTIVE_SECTIONS.forEach(sec => {
    const c = document.querySelector(`[data-affective="${sec}"]`);
    if (c) c.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
  });
  updateAffectiveScoreDisplay({}, AFFECTIVE_SECTIONS);
  document.querySelectorAll('#tab-affective textarea').forEach(ta => ta.value = '');
}

/* ── Collect ──────────────────────────────────── */

export function collectDescriptiveState() {
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
    const mt   = [...document.querySelectorAll(`input[name="${sec}-mt"]:checked`)].map(e => e.value);
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

export function collectAffectiveState(appState) {
  const state = { scores: appState.getAffectiveScores(), notes: {} };
  const areas = document.querySelectorAll('#tab-affective textarea');
  AFFECTIVE_SECTIONS.forEach((sec, i) => { if (areas[i]) state.notes[sec] = areas[i].value; });
  return state;
}

/* ── Restore ──────────────────────────────────── */

export function restoreDescriptiveState(state) {
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
    if (s.cata)       document.querySelectorAll(`input[name="${sec}-cata"]`).forEach(el => el.checked = s.cata.includes(el.value));
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

export function restoreAffectiveState(state, appState) {
  if (!state) return;
  if (state.scores) {
    appState.replaceAffectiveScores(state.scores);
    Object.keys(state.scores).forEach(sec => {
      const score = state.scores[sec];
      const container = document.querySelector(`[data-affective="${sec}"]`);
      if (!container) return;
      container.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
      const target = container.querySelector(`[data-score="${score}"]`);
      if (target) target.classList.add('selected');
    });
    updateAffectiveScoreDisplay(state.scores, AFFECTIVE_SECTIONS);
  }
  if (state.notes) {
    const areas = document.querySelectorAll('#tab-affective textarea');
    AFFECTIVE_SECTIONS.forEach((sec, i) => {
      if (areas[i] && state.notes[sec] !== undefined) areas[i].value = state.notes[sec];
    });
  }
}
