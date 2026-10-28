/* Eventos de login, cadastro e logout */
function bindAuthEvents() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    state.authBusy = true; render();
    const result = await Session.signIn(emailKey(fd.get('email')), fd.get('senha'));
    state.authBusy = false;
    if (result.error) state.authError = result.error;
    else { state.authError = ''; state.view = 'feed'; }
    render();
  });

  const cadastroForm = document.getElementById('cadastroForm');
  if (cadastroForm) cadastroForm.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(cadastroForm);
    state.authBusy = true; render();
    const result = await Session.signUp({
      nome: fd.get('nome').trim(), email: emailKey(fd.get('email')), senha: fd.get('senha'),
      nivel: fd.get('nivel'), papel: fd.get('papel'),
    });
    state.authBusy = false;
    if (result.error) state.authError = result.error;
    else { state.authError = ''; state.view = 'feed'; }
    render();
  });

  const logoutBtn = app.querySelector('[data-action="logout"]');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    await Session.signOut();
    state.view = 'login';
    render();
  });
}
