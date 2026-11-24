/* Ponto de entrada: liga tudo e carrega os dados */
Api.onChange = (table) => {
  if (table === 'answers') checkNewAnswerNotifications();
  if (table === 'messages') checkNewMessageNotifications();
  if (table === 'profiles') Session.syncFromCache();
  render();
};

async function boot() {
  loadTheme();

  if (!Api.isConfigured()) {
    Api.status = 'unconfigured';
    state.view = 'setup';
    render();
    return;
  }

  Api.init();
  Api.client.auth.onAuthStateChange((event) => {
    // logout feito em outra aba
    if (event === 'SIGNED_OUT' && state.user) {
      Session.leave();
      state.view = 'login';
      setTimeout(render, 0);
    }
  });

  render();                 // desenha já; os dados aparecem conforme chegam
  checkAiAvailability();    // não bloqueia
  Api.status = 'online';    // passa a 'offline' se uma leitura falhar
  await Session.restore();
  if (state.user) await Api.loadAll();   // sem login o banco não entrega nada
  Api.subscribe();
  render();
}
boot();
