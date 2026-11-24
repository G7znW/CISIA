/* Perfil do usuário */
/* ---------- Perfil ---------- */
function renderPerfil() {
  const id = state.profileId || (state.user && state.user.id);
  const u = cache.usuarios.find(x => x.id === id);
  if (!u) return `<p style="color:var(--muted);">Perfil não encontrado. <span class="back" data-nav="feed">Voltar</span></p>`;
  const isSelf = state.user && state.user.id === id;
  const pts = totalPoints(id);
  const qtd = { p: cache.perguntas.filter(q => q.autorId === id).length, r: cache.respostas.filter(a => a.autorId === id).length };

  if (isSelf && state.profileEdit) {
    return `
    <span class="back" data-nav="feed">← voltar</span>
    <div class="panel">
      <h1>Editar perfil</h1>
      <form id="perfilForm">
        <div class="dark-field"><label>Sobre você (bio)</label><textarea name="bio" maxlength="500" placeholder="Conte um pouco sobre você...">${escapeHtml(u.bio||'')}</textarea></div>
        <div class="grid2">
          <div class="dark-field"><label>Trabalha em / trabalhou em</label><input name="empresaAtual" maxlength="100" value="${escapeHtml(u.empresaAtual||'')}" placeholder="Ex: Empresa X (2023–atual)"></div>
          <div class="dark-field"><label>Estuda em / estudou em</label><input name="escolaAtual" maxlength="100" value="${escapeHtml(u.escolaAtual||'')}" placeholder="Ex: Etec Jacinto Ferreira de Sá"></div>
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
    ${isSelf ? `<button class="btn ghost small" data-edit-profile="1">Editar perfil</button>` : `<button class="btn small" data-open-chat="${escapeHtml(u.id)}">✉ Enviar mensagem</button>`}
  </div>
  ${u.bio ? `<p style="color:#cbd1e0; font-size:14.5px; line-height:1.6; max-width:60ch;">${escapeHtml(u.bio)}</p>` : ''}
  ${computeBadges(u, id).length ? `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">${computeBadges(u, id).map(b => `<span class="tag" title="${escapeHtml(b.nome)}" style="font-size:12.5px; padding:5px 11px;">${b.icon} ${escapeHtml(b.nome)}</span>`).join('')}</div>` : ''}
  <div class="profile-grid">
    <div class="pfield"><label>Trabalha em</label><div class="val">${escapeHtml(u.empresaAtual) || '—'}</div></div>
    <div class="pfield"><label>Formação</label><div class="val">${escapeHtml(u.escolaAtual) || '—'}</div></div>
    <div class="pfield"><label>Perguntas publicadas</label><div class="val">${qtd.p}</div></div>
    <div class="pfield"><label>Respostas dadas</label><div class="val">${qtd.r}</div></div>
    <div class="pfield"><label>Sequência de dias ativos</label><div class="val">${u.sequencia ? '🔥 ' + u.sequencia : '—'}</div></div>
  </div>`;
}
