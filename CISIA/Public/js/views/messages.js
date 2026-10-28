/* Mensagens diretas */
/* ---------- Mensagens ---------- */
function renderMensagens() {
  const list = conversationsFor(state.user.email);
  const rows = list.map(c => `
    <div class="admin-row" style="cursor:pointer;" data-open-chat="${escapeHtml(c.email)}" data-open-chat-nome="${escapeHtml(c.nome||'')}">
      <div class="info"><b>${escapeHtml(c.nome||c.email)}</b><span>${escapeHtml((c.ultimoTexto||'').slice(0,60))}</span></div>
      <span style="font-size:11.5px; color:var(--muted);">${timeAgo(c.ultimoEm)}</span>
    </div>`).join('');
  return `
  <div class="feed-head"><div><h1>Mensagens</h1><p>Converse diretamente com outros perfis da comunidade CISIA.</p></div></div>
  ${rows || `<p style="color:var(--muted); font-size:13.5px;">Nenhuma conversa ainda. Envie uma mensagem a partir do perfil de alguém.</p>`}`;
}

function renderConversa() {
  const other = cache.usuarios.find(u => u.email === state.chatWith);
  const msgs = cache.mensagens.filter(m =>
    (m.de === state.user.email && m.para === state.chatWith) || (m.de === state.chatWith && m.para === state.user.email)
  ).sort((a,b) => a.criadoEm - b.criadoEm);
  const bubbles = msgs.map(m => `
    <div class="chat-msg ${m.de === state.user.email ? 'me' : 'them'}">${escapeHtml(m.texto)}<span class="chat-time">${timeAgo(m.criadoEm)}</span></div>`).join('');
  return `
  <span class="back" data-nav="mensagens">← voltar para mensagens</span>
  <div class="chat-panel">
    <div class="chat-head"><span class="author-link" data-profile="${escapeHtml(state.chatWith)}">${escapeHtml(other ? other.nome : 'Usuário')}</span></div>
    <div class="chat-body" id="chatBody">${bubbles || `<p style="color:var(--muted); font-size:13px;">Diga oi 👋</p>`}</div>
    <form class="chat-foot" id="chatForm">
      <textarea id="chatInput" placeholder="Escreva uma mensagem..." required></textarea>
      <button class="btn" type="submit">Enviar</button>
    </form>
  </div>`;
}

