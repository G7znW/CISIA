/* Estado da interface + cache local dos dados vindos do Supabase */
const state = {
  view: 'login',
  user: null,          // { uid, nome, email, nivel, papel }
  isAdmin: false,
  activeQuestionId: null,
  feedTab: 'perguntas', // perguntas | projetos | ranking
  profileEmail: null,
  profileEdit: false,
  chatWith: null,
  themeOpen: false,
  filterNivel: '',
  filterDisciplina: '',
  search: '',
  authError: '',
  authBusy: false,
};

/* Preenchido por Api.refresh(); as views só leem daqui. */
const cache = { perguntas: [], respostas: [], projetos: [], usuarios: [], mensagens: [] };

/* ---------- Helpers derivados (pontuação, selos, conversas) ---------- */
function avgRating(a) {
  if (!a.ratings || !a.ratings.length) return 0;
  return a.ratings.reduce((s,r) => s + r.value, 0) / a.ratings.length;
}
function questionStats(q) {
  const ans = cache.respostas.filter(a => a.perguntaId === q.id);
  const avg = ans.length ? ans.reduce((s,a) => s + avgRating(a), 0) / ans.length : 0;
  return { count: ans.length, avg };
}
function totalPoints(email) {
  const fromAnswers = cache.respostas.filter(a => a.autorEmail === email)
    .reduce((s,a) => s + (a.ratings||[]).reduce((x,r)=>x+r.value,0), 0);
  const fromQuestions = cache.perguntas.filter(q => q.autorEmail === email)
    .reduce((s,q) => s + (q.ratings||[]).reduce((x,r)=>x+r.value,0), 0);
  return fromAnswers + fromQuestions;
}
function userScore(email) {
  const mine = cache.respostas.filter(a => a.autorEmail === email && a.ratings && a.ratings.length);
  if (!mine.length) return null;
  const total = mine.reduce((s,a) => s + avgRating(a), 0);
  return (total / mine.length).toFixed(1);
}
function computeBadges(u, email) {
  const badges = [];
  const qCount = cache.perguntas.filter(q => q.autorEmail === email).length;
  const aCount = cache.respostas.filter(a => a.autorEmail === email).length;
  const pts = totalPoints(email);
  if (qCount >= 1) badges.push({ icon: '🙋', nome: 'Primeira pergunta' });
  if (aCount >= 1) badges.push({ icon: '💡', nome: 'Primeira resposta' });
  if (aCount >= 10) badges.push({ icon: '🏅', nome: '10 respostas dadas' });
  if (pts >= 20) badges.push({ icon: '⭐', nome: '20 pontos de qualidade' });
  if (pts >= 50) badges.push({ icon: '🌟', nome: '50 pontos de qualidade' });
  if ((u.sequencia||0) >= 3) badges.push({ icon: '🔥', nome: (u.sequencia||0) + ' dias seguidos' });
  return badges;
}
function conversationsFor(email) {
  const others = new Map();
  cache.mensagens.forEach(m => {
    if (m.de !== email && m.para !== email) return;
    const other = m.de === email ? m.para : m.de;
    const otherNome = m.de === email ? m.paraNome : m.deNome;
    const cur = others.get(other);
    if (!cur || m.criadoEm > cur.ultimoEm) others.set(other, { email: other, nome: otherNome, ultimoTexto: m.texto, ultimoEm: m.criadoEm });
  });
  return Array.from(others.values()).sort((a,b) => b.ultimoEm - a.ultimoEm);
}
function unreadCount(email) {
  return cache.mensagens.filter(m => m.para === email && !m.lida).length;
}

function isBanned(email) {
  const key = emailKey(email);
  return cache.usuarios.some(u => u.email === key && u.banido);
}