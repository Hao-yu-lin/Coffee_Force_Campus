export function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-mobile-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('tab-' + tabName)?.classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`)?.classList.add('active');
  document.querySelector(`.tab-mobile-btn[data-tab="${tabName}"]`)?.classList.add('active');
}

export function bindTabButtons(desktopBtns, mobileBtns) {
  desktopBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  mobileBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

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
    drawer.style.display = 'none';
    if (toggle) toggle.textContent = '⚙️ 資料集管理 / 圖表控制 ▾';
  }
}

export function renderMobileDrawer() {
  const drawer  = document.getElementById('mobileControlDrawer');
  const desktop = document.getElementById('desktopControlPanel');
  if (!drawer || !desktop) return;
  drawer.innerHTML = desktop.innerHTML;

  const importBtn = drawer.querySelector('#importCsvBtn');
  const folderBtn = drawer.querySelector('#importFolderBtn');
  if (importBtn) importBtn.addEventListener('click', () => document.getElementById('fileInputMobile').click());
  if (folderBtn) folderBtn.addEventListener('click', () => document.getElementById('folderInputMobile').click());
}
