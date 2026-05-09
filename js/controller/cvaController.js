import { updateAffectiveScoreDisplay } from '../view/cvaView.js';

let _appState;

export function init(appState) {
  _appState = appState;

  // Event delegation on #affectiveGrid
  const grid = document.getElementById('affectiveGrid');
  if (!grid) return;
  grid.addEventListener('click', e => {
    const btn = e.target.closest('.score-btn');
    if (!btn) return;
    const section = btn.dataset.affective;
    const score   = parseInt(btn.dataset.score, 10);
    if (!section || isNaN(score)) return;

    const container = document.querySelector(`.score-buttons[data-affective="${section}"]`);
    if (container) container.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    _appState.setAffectiveScore(section, score);
    updateAffectiveScoreDisplay(_appState.getAffectiveScores(), AFFECTIVE_SECTIONS);
  });
}
