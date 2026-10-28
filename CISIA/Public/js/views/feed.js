/* Feed: perguntas, publicações e ranking */
/* ---------- Feed ---------- */
function renderFeed() {
  const tabs = `
  <div class="subnav">
    <button data-tab="perguntas" class="${state.feedTab==='perguntas'?'active':''}">Perguntas</button>
    <button data-tab="projetos" class="${state.feedTab==='projetos'?'active':''}">Publicações</button>
    <button data-tab="ranking" class="${state.feedTab==='ranking'?'active':''}">Ranking</button>
  </div>`;
  if (state.feedTab === 'ranking') return tabs + renderRanking();

  if (state.feedTab === 'projetos') return tabs + renderProjetosFeed();

  let list = cache.perguntas.slice();
  if (state.filterNivel) list = list.filter(q => q.nivel === state.filterNivel);
  if (state.filterDisciplina) list = list.filter(q => q.disciplina === state.filterDisciplina);
  if (state.search.trim()) {
    const s = state.search.toLowerCase();
    list = list.filter(q => (q.titulo||'').toLowerCase().includes(s) || (q.corpo||'').toLowerCase().includes(s));
  }
  list.sort((a,b) => (b.criadoEm||0) - (a.criadoEm||0));

  const cards = list.map(q => {
    const { count, avg } = questionStats(q);
    return `
    <div class="qcard" data-open="${q.id}">
      <div class="tags">
        <span class="tag level">${escapeHtml(q.nivel)}</span>
        <span class="tag subject">${escapeHtml(q.disciplina)}</span>
      </div>
      <h3>${escapeHtml(q.titulo)}</h3>
      <p class="excerpt">${escapeHtml((q.corpo||'').slice(0, 140))}${(q.corpo||'').length > 140 ? '…' : ''}</p>
      <div class="meta">
        <span><b>${count}</b> resposta${count === 1 ? '' : 's'}</span>
        ${avg > 0 ? `<span>qualidade média <b>${avg.toFixed(1)}★</b></span>` : ''}
        <span class="author-link" data-profile="${escapeHtml(q.autorEmail)}" data-stop="1">${escapeHtml(q.autorNome)}</span> · ${timeAgo(q.criadoEm)}
      </div>
    </div>`;
  }).join('');

  return tabs + `
  <div class="feed-head">
    <div>
      <h1>Perguntas da comunidade</h1>
      <p>Organizadas por nível de ensino e disciplina, avaliadas pela qualidade das respostas — não pela quantidade.</p>
    </div>
  </div>
  <div class="filters">
    <select id="fNivel"><option value="">Todos os níveis</option>${NIVEIS.map(n => `<option ${state.filterNivel===n?'selected':''}>${n}</option>`).join('')}</select>
    <select id="fDisciplina"><option value="">Todas as disciplinas</option>${DISCIPLINAS.map(d => `<option ${state.filterDisciplina===d?'selected':''}>${d}</option>`).join('')}</select>
    <input id="fSearch" type="search" placeholder="Buscar por palavra-chave..." value="${escapeHtml(state.search)}">
  </div>
  <div class="qlist">
    ${cards || `<div class="empty"><h3>Nenhuma pergunta por aqui ainda</h3><p>Seja a primeira pessoa a publicar uma dúvida.</p></div>`}
  </div>`;
}

function renderProjetosFeed() {
  const list = cache.projetos.slice().sort((a,b) => (b.criadoEm||0) - (a.criadoEm||0));
  const cards = list.map(p => `
    <div class="pcard">
      <span class="tag project">${escapeHtml(p.tipo || 'Projeto extracurricular')}</span>
      <h3>${escapeHtml(p.titulo)}</h3>
      <p>${escapeHtml(p.descricao)}</p>
      ${p.link ? `<a class="link" href="${escapeHtml(p.link)}" target="_blank" rel="noopener">Ver publicação →</a>` : ''}
      ${p.documento ? `<a class="link" href="${escapeHtml(p.documento)}" target="_blank" rel="noopener">📎 Documento anexo</a>` : ''}
      <div class="meta">
        <span>por <span class="author-link" data-profile="${escapeHtml(p.autorEmail)}">${escapeHtml(p.autorNome)}</span> · ${timeAgo(p.criadoEm)}</span>
        <button class="btn ghost small" data-react="${p.id}" style="margin-left:auto;">${(p.reacoes||[]).includes(state.user?state.user.email:'') ? '❤️' : '🤍'} ${(p.reacoes||[]).length || ''}</button>
      </div>
    </div>`).join('');

  return `
  <div class="feed-head">
    <div>
      <h1>Publicações</h1>
      <p>Projetos extracurriculares, artigos científicos, TCCs e pesquisas da comunidade CISIA.</p>
    </div>
    ${state.user ? `<button class="btn" data-nav="novoProjeto">Nova publicação</button>` : ''}
  </div>
  <div class="qlist">
    ${cards || `<div class="empty"><h3>Nenhuma publicação ainda</h3><p>${state.user ? 'Compartilhe a primeira!' : 'Entre para publicar.'}</p></div>`}
  </div>`;
}

function renderRanking() {
  const rows = cache.usuarios.map(u => ({ u, pts: totalPoints(u.email) })).sort((a,b) => b.pts - a.pts);
  const list = rows.map((r, i) => `
    <div class="admin-row">
      <div class="info"><b>${i+1}º · <span class="author-link" data-profile="${escapeHtml(r.u.email)}">${escapeHtml(r.u.nome)}</span></b><span>${escapeHtml(r.u.papel||'Aluno')} · ${escapeHtml(r.u.nivel||'')}</span></div>
      <span class="score-chip">★ ${r.pts} pts</span>
    </div>`).join('');
  return `
  <div class="feed-head"><div><h1>Ranking da comunidade</h1><p>Pontos vêm das avaliações que suas perguntas e respostas recebem — quanto melhor o feedback, mais pontos.</p></div></div>
  ${list || `<p style="color:var(--muted); font-size:13.5px;">Ainda sem pontuações.</p>`}`;
}

