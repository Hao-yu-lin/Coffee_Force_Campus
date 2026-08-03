export function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-mobile-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('tab-' + tabName)?.classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`)?.classList.add('active');
  document.querySelector(`.tab-mobile-btn[data-tab="${tabName}"]`)?.classList.add('active');
}

export function bindTabButtons(desktopBtns, mobileBtns, onTabSwitch) {
  desktopBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      onTabSwitch?.(btn.dataset.tab);
    });
  });
  mobileBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      onTabSwitch?.(btn.dataset.tab);
    });
  });
}

// Where the control panel lives when the drawer is closed, so it can go back.
let panelHome = null;

export function toggleMobileDrawer() {
  const drawer = document.getElementById('mobileControlDrawer');
  const toggle = document.querySelector('.mobile-control-toggle');
  if (!drawer) return;
  const isOpen = drawer.style.display !== 'none';
  if (!isOpen) {
    renderMobileDrawer();
    drawer.style.display = 'block';
    if (toggle) toggle.textContent = '⚙️ 資料集管理 / 圖表控制 ▴';
  } else {
    restoreControlPanel();
    drawer.style.display = 'none';
    if (toggle) toggle.textContent = '⚙️ 資料集管理 / 圖表控制 ▾';
  }
}

/**
 * Move — not clone — the control panel into the drawer.
 * Cloning innerHTML used to leave two copies of every id (#datasetList,
 * #showEC, …) in the document, so getElementById resolved to the drawer's
 * copy and the desktop controls silently stopped driving the charts.
 * Moving the live node keeps ids unique and listeners intact.
 */
export function renderMobileDrawer() {
  const drawer = document.getElementById('mobileControlDrawer');
  const panel  = document.getElementById('desktopControlPanel');
  if (!drawer || !panel || panel.parentNode === drawer) return;
  panelHome = { parent: panel.parentNode, next: panel.nextSibling };
  panel.classList.add('in-drawer');
  drawer.appendChild(panel);
}

export function restoreControlPanel() {
  const panel = document.getElementById('desktopControlPanel');
  if (!panel || !panelHome) return;
  panel.classList.remove('in-drawer');
  panelHome.parent.insertBefore(panel, panelHome.next);
  panelHome = null;
}
