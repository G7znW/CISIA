/* Funções utilitárias sem dependência do resto do app */
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - (ts || Date.now()));
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora mesmo';
  if (m < 60) return m + ' min atrás';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h atrás';
  const d = Math.floor(h / 24);
  return d + 'd atrás';
}

function emailKey(email) { return String(email || '').trim().toLowerCase(); }

/* Aviso rápido no canto da tela (erros de rede, permissões etc.) */
function showToast(message) {
  document.querySelectorAll('.toast').forEach(el => el.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}
