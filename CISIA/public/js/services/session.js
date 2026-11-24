/* =====================================================================
   Sessão e autenticação (Supabase Auth: e-mail + senha).
   O Supabase guarda a sessão no navegador; aqui só ligamos o login ao
   estado da interface. Mensagens para a pessoa são genéricas: detalhes
   técnicos vão só para o console.
   ===================================================================== */
const MIN_PASSWORD = 8;
const GENERIC_AUTH_ERROR = 'Não foi possível concluir agora. Tente novamente em instantes.';

const Session = {
  /* Coloca o perfil logado no estado da interface */
  async enter(profile) {
    state.user = { id: profile.id, nome: profile.nome, nivel: profile.nivel, papel: profile.papel };
    state.isAdmin = profile.isAdmin;
    resetMessageNotifications();
    Api.registerVisit();
    if (profile.isAdmin) Api.loadAdminEmails();
  },

  leave() {
    state.user = null;
    state.isAdmin = false;
    state.profileId = null;
    state.chatWith = null;
    Api.clearCache();
    resetMessageNotifications();
  },

  /* Chamado no carregamento da página: retoma a sessão salva, se houver */
  async restore() {
    const { data } = await Api.client.auth.getSession();
    const session = data && data.session;
    if (!session) return;
    const profile = await Api.fetchOwnProfile(session.user.id);
    if (!profile || profile.banido) {
      await Api.client.auth.signOut();
      if (profile && profile.banido) state.authError = 'Esta conta foi banida da plataforma.';
      return;
    }
    await Session.enter(profile);
    state.view = 'feed';
  },

  async signIn(email, senha) {
    const { data, error } = await Api.client.auth.signInWithPassword({ email, password: senha });
    if (error) {
      console.warn('signIn:', error.message);
      if (/invalid login/i.test(error.message)) return { error: 'E-mail ou senha incorretos.' };
      return { error: GENERIC_AUTH_ERROR };
    }
    const profile = await Api.fetchOwnProfile(data.user.id);
    if (!profile) { console.error('Perfil não encontrado: rode database/supabase-schema.sql.'); return { error: GENERIC_AUTH_ERROR }; }
    if (profile.banido) {
      await Api.client.auth.signOut();
      return { error: 'Esta conta foi banida da plataforma.' };
    }
    await Session.enter(profile);
    await Api.loadAll();
    return { ok: true };
  },

  async signUp({ nome, email, senha, nivel, papel }) {
    if (senha.length < MIN_PASSWORD) return { error: 'A senha precisa ter pelo menos ' + MIN_PASSWORD + ' caracteres.' };
    const { data, error } = await Api.client.auth.signUp({
      email, password: senha,
      options: { data: { nome, level: nivel, papel } },
    });
    if (error) {
      console.warn('signUp:', error.message);
      if (/already|registered/i.test(error.message)) return { error: 'Já existe uma conta com este e-mail.' };
      if (/password/i.test(error.message)) return { error: 'Senha fraca: use letras, números e pelo menos ' + MIN_PASSWORD + ' caracteres.' };
      return { error: GENERIC_AUTH_ERROR };
    }
    // E-mail já cadastrado: com confirmação ligada o Supabase devolve um usuário sem "identities"
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { error: 'Já existe uma conta com este e-mail.' };
    }
    // Sem sessão = o projeto exige confirmação de e-mail. Tenta entrar direto.
    let user = data.user;
    if (!data.session) {
      const login = await Api.client.auth.signInWithPassword({ email, password: senha });
      if (login.error) {
        console.warn('Confirmação de e-mail ligada no Supabase (Authentication > Providers > Email).');
        return { error: 'Conta criada. Confirme o e-mail que enviamos e depois entre.' };
      }
      user = login.data.user;
    }

    const profile = await Api.fetchOwnProfile(user.id);
    if (!profile) { console.error('Perfil não encontrado: rode database/supabase-schema.sql.'); return { error: GENERIC_AUTH_ERROR }; }
    await Session.enter(profile);
    await Api.loadAll();
    return { ok: true };
  },

  async signOut() {
    await Api.client.auth.signOut();
    Session.leave();
  },

  /* Mantém state.user/isAdmin em dia com o que está no banco (ex.: virou admin, foi banido) */
  syncFromCache() {
    if (!state.user) return;
    const me = cache.usuarios.find(u => u.id === state.user.id);
    if (!me) return;
    if (me.isAdmin && !state.isAdmin) Api.loadAdminEmails();
    state.isAdmin = me.isAdmin;
    state.user.nome = me.nome;
    state.user.nivel = me.nivel;
    state.user.papel = me.papel;
    if (me.banido) {
      state.authError = 'Esta conta foi banida da plataforma.';
      Session.signOut().then(() => { state.view = 'login'; render(); });
    }
  },
};
