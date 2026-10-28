/* Perfil do usuário */
/* ---------- Perfil ---------- */
function renderPerfil() {
  const email = state.profileEmail || (state.user && state.user.email);
  const u = cache.usuarios.find(x => x.email === email);
  if (!u) return `<p style="color:var(--muted);">Perfil não encontrado. <span class="back" data-nav="feed">Voltar</span></p>`;
  const isSelf = state.user && state.user.email === email;
  const pts = totalPoints(email);
  const qtd = { p: cache.perguntas.filter(q => q.autorEmail === email).length, r: cache.respostas.filter(a => a.autorEmail === email).length };

  if (isSelf && state.profileEdit) {
    return `
    <span class="back" data-nav="feed">← voltar</span>
    <div class="panel">
      <h1>Editar perfil</h1>
      <form id="perfilForm">
        <div class="dark-field"><label>Sobre você (bio)</label><textarea name="bio" placeholder="Conte um pouco sobre você...">${escapeHtml(u.bio||'')}</textarea></div>
        <div class="grid2">
          <div class="dark-field"><label>Trabalha em / trabalhou em</label><input name="empresaAtual" value="${escapeHtml(u.empresaAtual||'')}" placeholder="Ex: Empresa X (2023–atual)"></div>
          <div class="dark-field"><label>Estuda em / estudou em</label><input name="escolaAtual" value="${escapeHtml(u.escolaAtual||'')}" placeholder="Ex: Etec Jacinto Ferreira de Sá"></div>
          <div class="dark-field"><label>Idade</label><input name="idade" value="${escapeHtml(u.idade||'')}" placeholder="Ex: 17"></div>
          <div class="dark-field"><label>Estado civil</label><input name="estadoCivil" value="${escapeHtml(u.estadoCivil||'')}" placeholder="Ex: Solteiro(a)"></div>
        </div>
        <button class="btn" type="submit">Salvar perfil</button>
        <button class="btn ghost" type="button" data-cancel-edit="1" style="margin-left:8px;">Cancelar</button>
      </form>
    </div>`;
  }

  return `
  <span class="back" data-nav="feed">← voltar</span>
  <div class="profile-head">
    <div>
      <h1>${escapeHtml(u.nome)}</h1>
      <div class="sub2">${escapeHtml(u.papel||'Aluno')} · ${escapeHtml(u.nivel||'')} · <span class="score-chip">★ ${pts} pts</span></div>
    </div>
    ${isSelf ? `<button class="btn ghost small" data-edit-profile="1">Editar perfil</button>` : `<button class="btn small" data-open-chat="${escapeHtml(u.email)}" data-open-chat-nome="${escapeHtml(u.nome)}">✉ Enviar mensagem</button>`}
  </div>
  ${u.bio ? `<p style="color:#cbd1e0; font-size:14.5px; line-height:1.6; max-width:60ch;">${escapeHtml(u.bio)}</p>` : ''}
  ${computeBadges(u, email).length ? `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">${computeBadges(u, email).map(b => `<span class="tag" title="${escapeHtml(b.nome)}" style="font-size:12.5px; padding:5px 11px;">${b.icon} ${escapeHtml(b.nome)}</span>`).join('')}</div>` : ''}
  <div class="profile-grid">
    <div class="pfield"><label>Trabalha em</label><div class="val">${escapeHtml(u.empresaAtual) || '—'}</div></div>
    <div class="pfield"><label>Formação</label><div class="val">${escapeHtml(u.escolaAtual) || '—'}</div></div>
    <div class="pfield"><label>Idade</label><div class="val">${escapeHtml(u.idade) || '—'}</div></div>
    <div class="pfield"><label>Estado civil</label><div class="val">${escapeHtml(u.estadoCivil) || '—'}</div></div>
    <div class="pfield"><label>Perguntas publicadas</label><div class="val">${qtd.p}</div></div>
    <div class="pfield"><label>Respostas dadas</label><div class="val">${qtd.r}</div></div>
    <div class="pfield"><label>Sequência de dias ativos</label><div class="val">${u.sequencia ? '🔥 ' + u.sequencia : '—'}</div></div>
  </div>`;
}

