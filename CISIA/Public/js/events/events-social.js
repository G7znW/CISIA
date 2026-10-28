/* Eventos de perfil e mensagens diretas */
let markingRead = false;

function bindSocialEvents() {
  const editProfileBtn = app.querySelector('[data-edit-profile]');
  if (editProfileBtn) editProfileBtn.addEventListener('click', () => { state.profileEdit = true; render(); });
  const cancelEditBtn = app.querySelector('[data-cancel-edit]');
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => { state.profileEdit = false; render(); });

  const perfilForm = document.getElementById('perfilForm');
  if (perfilForm) perfilForm.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(perfilForm);
    const ok = await Api.updateOwnProfile({
      bio: fd.get('bio').trim(), empresaAtual: fd.get('empresaAtual').trim(),
      escolaAtual: fd.get('escolaAtual').trim(), idade: fd.get('idade').trim(), estadoCivil: fd.get('estadoCivil').trim(),
    });
    if (ok) { state.profileEdit = false; render(); }
  });

  app.querySelectorAll('[data-open-chat]').forEach(el => {
    el.addEventListener('click', () => {
      if (!state.user) { state.view = 'login'; render(); return; }
      state.chatWith = el.getAttribute('data-open-chat');
      state.view = 'conversa'; render();
    });
  });

  const chatForm = document.getElementById('chatForm');
  if (chatForm) chatForm.addEventListener('submit', async e => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const texto = input.value.trim();
    if (!texto) return;
    const other = cache.usuarios.find(u => u.email === state.chatWith);
    const ok = await Api.sendMessage({ para: state.chatWith, paraNome: other ? other.nome : '', texto });
    if (!ok) return;
    render();
    const body = document.getElementById('chatBody');
    if (body) body.scrollTop = body.scrollHeight;
  });

  if (state.view === 'conversa') {
    const body = document.getElementById('chatBody');
    if (body) body.scrollTop = body.scrollHeight;
    const hasUnread = state.user && cache.mensagens.some(m => m.para === state.user.email && m.de === state.chatWith && !m.lida);
    if (hasUnread && !markingRead) {
      markingRead = true;
      Api.markMessagesRead(state.chatWith).finally(() => { markingRead = false; });
    }
  }
}
