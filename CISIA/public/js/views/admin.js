/* Painel administrativo */
/* ---------- Admin ---------- */
function renderAdmin() {
  if (!state.isAdmin) {
    return `
    <div class="auth-wrap">
      <div class="auth-card">
        <h1>Área restrita</h1>
        <p class="sub">O painel de administração só aparece para contas marcadas como administradoras no banco (<b>profiles.is_admin</b>).</p>
        <div class="switch-link"><a data-nav="${state.user ? 'feed' : 'login'}">← voltar</a></div>
      </div>
    </div>`;
  }

  const totalQ = cache.perguntas.length;
  const totalA = cache.respostas.length;
  const totalU = cache.usuarios.length;
  const totalP = cache.projetos.length;

  const usersRows = cache.usuarios.map(u => {
    const email = cache.emails[u.id] || '';
    const canBan = u.id !== state.user.id && !u.isAdmin; // o banco também recusa banir a si mesmo ou outro admin
    return `
    <div class="admin-row">
      <div class="info"><b>${escapeHtml(u.nome)} ${u.banido ? '<span class="pill-banned">banido</span>' : ''}</b><span>${escapeHtml(email)}${email ? ' · ' : ''}${escapeHtml(u.papel||'Aluno')} · ${escapeHtml(u.nivel||'')}</span></div>
      ${canBan ? `<button class="btn ${u.banido ? 'ghost' : 'danger'} small" data-toggle-ban="${escapeHtml(u.id)}">${u.banido ? 'Desbanir' : 'Banir'}</button>` : ''}
    </div>`;
  }).join('') || `<p style="color:var(--muted); font-size:13.5px;">Nenhum usuário cadastrado ainda.</p>`;

  const questionRows = cache.perguntas.slice().sort((a,b)=>(b.criadoEm||0)-(a.criadoEm||0)).map(q => `
    <div class="admin-row">
      <div class="info"><b>${escapeHtml(q.titulo)}</b><span>${escapeHtml(q.disciplina)} · ${escapeHtml(q.autorNome)}</span></div>
      <button class="btn danger small" data-remove-question="${q.id}">Remover</button>
    </div>`).join('') || `<p style="color:var(--muted); font-size:13.5px;">Nenhuma pergunta publicada ainda.</p>`;

  const projectRows = cache.projetos.slice().sort((a,b)=>(b.criadoEm||0)-(a.criadoEm||0)).map(p => `
    <div class="admin-row">
      <div class="info"><b>${escapeHtml(p.titulo)}</b><span>${escapeHtml(p.autorNome)}</span></div>
      <button class="btn danger small" data-remove-project="${p.id}">Remover</button>
    </div>`).join('') || `<p style="color:var(--muted); font-size:13.5px;">Nenhum projeto publicado ainda.</p>`;

  return `
  <h1 style="font-family:var(--font-display); font-size:28px; margin:0 0 20px;">Painel administrativo</h1>
  <div class="stat-row">
    <div class="stat"><b>${totalU}</b><span>usuários</span></div>
    <div class="stat"><b>${totalQ}</b><span>perguntas ativas</span></div>
    <div class="stat"><b>${totalA}</b><span>respostas</span></div>
    <div class="stat"><b>${totalP}</b><span>projetos</span></div>
  </div>
  <div class="admin-grid">
    <div class="admin-section"><h2>Usuários e moderação</h2>${usersRows}</div>
    <div class="admin-section"><h2>Perguntas publicadas</h2>${questionRows}</div>
  </div>
  <div class="admin-section" style="margin-top:24px;"><h2>Projetos extracurriculares</h2>${projectRows}</div>
  `;
}

