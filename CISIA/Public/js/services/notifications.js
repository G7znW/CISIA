/* Notificações do navegador (nova resposta / nova mensagem) */
let notifiedAnswerIds = new Set();
let notifBaselineSet = false;

function checkNewAnswerNotifications() {
  if (!notifBaselineSet) {
    // don't notify retroactively for answers that already existed when this view loaded
    cache.respostas.forEach(a => notifiedAnswerIds.add(a.id));
    notifBaselineSet = true;
    return;
  }
  if (!state.user || !('Notification' in window) || Notification.permission !== 'granted') return;
  const myQuestionIds = new Set(cache.perguntas.filter(q => q.autorEmail === state.user.email).map(q => q.id));
  cache.respostas.forEach(a => {
    if (a.autorEmail === state.user.email) return;
    if (!myQuestionIds.has(a.perguntaId)) return;
    if (notifiedAnswerIds.has(a.id)) return;
    notifiedAnswerIds.add(a.id);
    try {
      const q = cache.perguntas.find(qq => qq.id === a.perguntaId);
      new Notification('Nova resposta na CISIA', { body: `${a.autorNome} respondeu "${q ? q.titulo : 'sua pergunta'}"` });
    } catch (e) {}
  });
}

let notifMsgBaselineSet = false;
let notifiedMsgIds = new Set();
function checkNewMessageNotifications() {
  if (!notifMsgBaselineSet) {
    cache.mensagens.forEach(m => notifiedMsgIds.add(m.id));
    notifMsgBaselineSet = true;
    return;
  }
  if (!state.user || !('Notification' in window) || Notification.permission !== 'granted') return;
  cache.mensagens.forEach(m => {
    if (m.para !== state.user.email || notifiedMsgIds.has(m.id)) return;
    notifiedMsgIds.add(m.id);
    try { new Notification('Nova mensagem na CISIA', { body: `${m.deNome}: ${m.texto.slice(0,80)}` }); } catch (e) {}
  });
}


/* Ao entrar/sair, a próxima carga de mensagens vira a nova "linha de base" (não notifica o histórico) */
function resetMessageNotifications() {
  notifMsgBaselineSet = false;
  notifiedMsgIds = new Set();
}
