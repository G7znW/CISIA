/* Ligações de eventos comuns (navegação) + chamada dos grupos de eventos */
function bindEvents() {
  app.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      state.view = el.getAttribute('data-nav');
      state.authError = '';
      aiContextQuestion = null;
      render();
    });
  });

  app.querySelectorAll('[data-profile]').forEach(el => {
    el.addEventListener('click', (ev) => {
      if (el.hasAttribute('data-stop')) ev.stopPropagation();
      if (!state.user) { state.view = 'login'; render(); return; }
      state.profileId = el.getAttribute('data-profile');
      state.profileEdit = false;
      state.view = 'perfil';
      render();
    });
  });

  app.querySelectorAll('[data-tab]').forEach(el => {
    el.addEventListener('click', () => { state.feedTab = el.getAttribute('data-tab'); render(); });
  });

  const themeToggleBtn = app.querySelector('[data-action="theme-toggle"]');
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', () => { state.themeOpen = !state.themeOpen; render(); });

  bindAuthEvents();
  bindContentEvents();
  bindSocialEvents();
  bindAdminEvents();
}