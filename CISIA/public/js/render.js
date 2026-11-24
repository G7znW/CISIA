/* Desenha a página inteira a partir de `state` e `cache` */
const app = document.getElementById('app');

function render() {
  const nav = state.user ? `
    <div class="nav">
      <button class="theme-btn" data-action="theme-toggle" title="Personalizar aparência">🎨</button>
      <span class="who">${escapeHtml(state.user.nome)} · ${escapeHtml(state.user.nivel)} ${userScore(state.user.id) ? `<span class="score-chip">★ ${userScore(state.user.id)}</span>` : ''} ${(() => { const uu = cache.usuarios.find(x=>x.id===state.user.id); return uu && uu.sequencia >= 2 ? `<span class="score-chip">🔥 ${uu.sequencia}</span>` : ''; })()}</span>
      <button data-nav="feed" class="${state.view==='feed'?'active':''}">Comunidade</button>
      <button data-profile="${escapeHtml(state.user.id)}" class="${state.view==='perfil'?'active':''}">Meu perfil</button>
      <button data-nav="mensagens" class="${state.view==='mensagens'||state.view==='conversa'?'active':''}">Mensagens${unreadCount(state.user.id) ? ` (${unreadCount(state.user.id)})` : ''}</button>
      <button data-nav="novaPergunta" class="primary">Nova pergunta</button>
      ${state.isAdmin ? `<button data-nav="admin" class="${state.view==='admin'?'active':''}">Painel admin</button>` : ''}
      <button data-action="logout">Sair</button>
    </div>` : `
    <div class="nav">
      <button class="theme-btn" data-action="theme-toggle" title="Personalizar aparência">🎨</button>
      <button data-nav="login" class="primary ${state.view==='login'?'active':''}">Entrar</button>
    </div>`;

  let body = '';
  if (state.view === 'login') body = renderLogin();
  else if (state.view === 'cadastro') body = renderCadastro();
  else if (state.view === 'feed') body = renderFeed();
  else if (state.view === 'novaPergunta') body = renderNovaPergunta();
  else if (state.view === 'novoProjeto') body = renderNovoProjeto();
  else if (state.view === 'pergunta') body = renderPergunta();
  else if (state.view === 'admin') body = renderAdmin();
  else if (state.view === 'perfil') body = renderPerfil();
  else if (state.view === 'mensagens') body = renderMensagens();
  else if (state.view === 'conversa') body = renderConversa();
  else if (state.view === 'setup') body = renderSetup();
  else body = renderLogin();

  const sync = {
    online: ['', '<b>tempo real</b> — conectado ao Supabase, dados compartilhados com todos os visitantes'],
    connecting: ['local', 'conectando ao Supabase…'],
    offline: ['local', 'sem conexão com o Supabase — verifique sua internet e o SUPABASE_URL do .env'],
    unconfigured: ['local', 'Supabase não configurado — preencha o .env'],
  }[Api.status];

  app.innerHTML = `
    <div class="syncbar ${sync[0]}">${sync[1]}</div>
    <div class="topbar">
      <div class="brand" data-nav="${state.user ? 'feed' : 'login'}">
        <span class="brand-mark"><img src="${LOGO_URL}" alt="CISIA" />CISIA<span class="dot">.</span></span>
        <span class="brand-tag">estudo colaborativo, com qualidade</span>
      </div>
      ${nav}
    </div>
    <main class="view">${body}</main>
    <footer class="foot">Protótipo do TCC CISIA — Etec Jacinto Ferreira de Sá.</footer>
  `;
  renderAiWidget();
  renderNotifButton();
  renderThemeWidget();
  bindEvents();
}

