/* =====================================================================
   Sessão e autenticação (Supabase Auth: e-mail + senha).
   O Supabase guarda a sessão no navegador; aqui só ligamos o login ao
   estado da interface.
   ===================================================================== */
const CONFIRM_EMAIL_HINT = 'O Supabase ainda exige confirmação de e-mail. Desative em Authentication → Providers → Email → "Confirm email" e tente de novo.';

const Session = {
  /* Coloca o perfil logado no estado da interface */
  async enter(profile) {
    state.user = { uid: profile.uid, nome: profile.nome, email: profile.email, nivel: profile.nivel, papel: profile.papel };
    state.isAdmin = profile.isAdmin;
    resetMessageNotifications();
    await Session.bumpStreak(profile);
  },

  leave() {
    state.user = null;
    state.isAdmin = false;
    state.profileEmail = null;
    state.chatWith = null;
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
      if (/confirm/i.test(error.message)) return { error: CONFIRM_EMAIL_HINT };
      if (/invalid login/i.test(error.message)) return { error: 'E-mail ou senha incorretos.' };
      return { error: 'Não foi possível entrar agora. Tente novamente.' };
    }
    const profile = await Api.fetchOwnProfile(data.user.id);
    if (!profile) return { error: 'Perfil não encontrado. Rode o database/supabase-schema.sql no Supabase.' };
    if (profile.banido) {
      await Api.client.auth.signOut();
      return { error: 'Esta conta foi banida da plataforma.' };
    }
    await Session.enter(profile);
    await Api.refresh('messages');
    return { ok: true };
  },

  async signUp({ nome, email, senha, nivel, papel }) {
    const { data, error } = await Api.client.auth.signUp({
      email, password: senha,
      options: { data: { nome, level: nivel, papel } },
    });
    if (error) {
      if (/already|registered/i.test(error.message)) return { error: 'Já existe uma conta com este e-mail.' };
      if (/password/i.test(error.message)) return { error: 'Senha fraca ou curta demais (mínimo 6 caracteres).' };
      return { error: 'Não foi possível criar a conta agora. Tente novamente.' };
    }
    // E-mail já cadastrado: com confirmação ligada o Supabase devolve um usuário sem "identities"
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { error: 'Já existe uma conta com este e-mail.' };
    }
    // Sem sessão = o projeto Supabase ainda está com "Confirm email" ligado.
    // Tenta entrar direto; se não der, avisa onde desligar.
    let user = data.user;
    if (!data.session) {
      const login = await Api.client.auth.signInWithPassword({ email, password: senha });
      if (login.error) return { error: CONFIRM_EMAIL_HINT };
      user = login.data.user;
    }

    const profile = await Api.fetchOwnProfile(user.id);
    if (!profile) return { error: 'Conta criada, mas o perfil não foi encontrado. Rode o database/supabase-schema.sql no Supabase.' };
    await Session.enter(profile);
    await Api.loadAll();
    return { ok: true };
  },

  async signOut() {
    await Api.client.auth.signOut();
    Session.leave();
    await Api.refresh('messages');
  },

  /* Sequência de dias ativos: +1 se entrou ontem, volta a 1 se pulou um dia */
  async bumpStreak(profile) {
    const today = new Date().toISOString().slice(0, 10);
    if (profile.ultimoAcesso === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const next = profile.ultimoAcesso === yesterday ? (profile.sequencia || 0) + 1 : 1;
    await Api.updateStreak(next, today);
  },

  /* Mantém state.user/isAdmin em dia com o que está no banco (ex.: virou admin, foi banido) */
  syncFromCache() {
    if (!state.user) return;
    const me = cache.usuarios.find(u => u.email === state.user.email);
    if (!me) return;
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