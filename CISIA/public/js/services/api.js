/* =====================================================================
   Camada de dados — todo acesso ao Supabase passa por aqui.
   - Leituras: baixa cada tabela (já com o nome do autor e as notas
     juntos), converte para o formato das telas e guarda em `cache`.
   - Escritas: insert/update/delete/rpc; depois a tabela é relida.
   - Tempo real: o Supabase avisa quando uma tabela muda e o cache
     se atualiza sozinho.
   Quem manda no que pode ser lido/gravado é o banco (RLS + GRANT por
   coluna); o navegador nunca decide quem é o autor de nada.
   ===================================================================== */

/* ---------- Conversores banco (inglês/snake_case) → telas ---------- */
const ratingsList = list => (list || []).map(x => ({ userId: x.user_id, value: Number(x.value) }));
const authorName = r => (r.author && r.author.name) || 'Usuário';

const Mappers = {
  profile: r => ({
    id: r.id, nome: r.name, nivel: r.level, papel: r.role,
    bio: r.bio || '', empresaAtual: r.company || '', escolaAtual: r.school || '',
    sequencia: r.streak || 0, criadoEm: Date.parse(r.created_at),
    isAdmin: !!r.is_admin, banido: !!r.banned,
  }),
  question: r => ({
    id: r.id, titulo: r.title, corpo: r.body, nivel: r.level, disciplina: r.discipline,
    autorId: r.author_id, autorNome: authorName(r),
    criadoEm: Date.parse(r.created_at), ratings: ratingsList(r.ratings),
  }),
  answer: r => ({
    id: r.id, perguntaId: r.question_id, corpo: r.body,
    autorId: r.author_id, autorNome: authorName(r),
    criadoEm: Date.parse(r.created_at), ratings: ratingsList(r.ratings),
  }),
  project: r => ({
    id: r.id, tipo: r.kind, titulo: r.title, descricao: r.description,
    link: r.link || '', documento: r.document || '',
    reacoes: (r.reactions || []).map(x => x.user_id),
    autorId: r.author_id, autorNome: authorName(r), criadoEm: Date.parse(r.created_at),
  }),
  message: r => ({
    id: r.id, de: r.from_id, deNome: (r.sender && r.sender.name) || '',
    para: r.to_id, paraNome: (r.recipient && r.recipient.name) || '',
    texto: r.body, lida: !!r.is_read, criadoEm: Date.parse(r.created_at),
  }),
};

/* tabela do banco → onde fica no cache, como ler e como converter */
const TABLES = {
  profiles:  { cache: 'usuarios',  map: Mappers.profile,  select: '*' },
  questions: { cache: 'perguntas', map: Mappers.question, select: '*, author:profiles!author_id(name), ratings:question_ratings(user_id, value)' },
  answers:   { cache: 'respostas', map: Mappers.answer,   select: '*, author:profiles!author_id(name), ratings:answer_ratings(user_id, value)' },
  projects:  { cache: 'projetos',  map: Mappers.project,  select: '*, author:profiles!author_id(name), reactions:project_reactions(user_id)' },
  messages:  { cache: 'mensagens', map: Mappers.message,  select: '*, sender:profiles!from_id(name), recipient:profiles!to_id(name)' },
};

/* tabela que mudou no banco → qual leitura precisa ser refeita */
const WATCH = {
  profiles: 'profiles', questions: 'questions', answers: 'answers', projects: 'projects', messages: 'messages',
  question_ratings: 'questions', answer_ratings: 'answers', project_reactions: 'projects',
};

const Api = {
  client: null,
  status: 'connecting', // connecting | online | offline | unconfigured
  onChange: () => {},   // definido em main.js: chamado a cada tabela atualizada
  _timers: {},

  isConfigured() {
    return typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('SEU-PROJETO') &&
      typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 20 && !SUPABASE_ANON_KEY.includes('SUA-ANON-KEY') &&
      !!(window.supabase && typeof window.supabase.createClient === 'function');
  },

  init() {
    this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  },

  /* ---------- Leitura ---------- */
  async refresh(table) {
    if (!state.user) return true; // visitante não lê nada: o banco só atende contas logadas
    const t = TABLES[table];
    const { data, error } = await this.client.from(table).select(t.select).order('created_at', { ascending: true });
    if (error) {
      console.error('Supabase (' + table + '):', error.message);
      this.status = 'offline';
      this.onChange(table);
      return false;
    }
    cache[t.cache] = data.map(t.map);
    this.status = 'online';
    this.onChange(table);
    return true;
  },

  clearCache() {
    Object.keys(cache).forEach(k => { cache[k] = Array.isArray(cache[k]) ? [] : {}; });
  },

  async loadAll() {
    await Promise.all(Object.keys(TABLES).map(t => this.refresh(t)));
  },

  /* Lista de e-mails: só administradores recebem (o banco confere) */
  async loadAdminEmails() {
    const { data, error } = await this.client.rpc('admin_user_emails');
    if (error) { console.error(error.message); return; }
    cache.emails = Object.fromEntries((data || []).map(r => [r.id, r.email]));
    render();
  },

  /* ---------- Tempo real ---------- */
  subscribe() {
    const channel = this.client.channel('cisia-changes');
    Object.keys(WATCH).forEach(table => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => this.scheduleRefresh(WATCH[table]));
    });
    channel.subscribe();
  },

  scheduleRefresh(table) {
    clearTimeout(this._timers[table]);
    this._timers[table] = setTimeout(() => this.refresh(table), 150);
  },

  /* ---------- Escrita ---------- */
  /* Mensagem para a pessoa: nunca mostra texto técnico do banco (ele vai só para o console). */
  reportError(error, fallback) {
    console.error(error);
    let msg = fallback || 'Não foi possível concluir a ação.';
    if (error.code === '42501' || /row-level security|permission denied/i.test(error.message || '')) {
      msg = 'Você não tem permissão para esta ação.';
    } else if (error.code === '23514') {
      msg = 'Confira os dados: algum campo está vazio, grande demais ou em formato inválido.';
    } else if (error.code === '22023') {
      msg = error.message; // texto escrito por nós nas funções do banco
    }
    showToast(msg);
  },

  async run(promise, fallback) {
    const { data, error } = await promise;
    if (error) { this.reportError(error, fallback); return { ok: false, data: null }; }
    return { ok: true, data };
  },

  async fetchOwnProfile(uid) {
    const { data, error } = await this.client.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) { console.error(error); return null; }
    return data ? Mappers.profile(data) : null;
  },

  async createQuestion({ titulo, corpo, nivel, disciplina }) {
    const res = await this.run(this.client.from('questions').insert({
      title: titulo, body: corpo, level: nivel, discipline: disciplina,
    }).select('id').single(), 'Não foi possível publicar a pergunta.');
    if (res.ok) await this.refresh('questions');
    return res.ok ? res.data.id : null;
  },

  async createAnswer({ perguntaId, corpo }) {
    const res = await this.run(this.client.from('answers').insert({
      question_id: perguntaId, body: corpo,
    }), 'Não foi possível publicar a resposta.');
    if (res.ok) await this.refresh('answers');
    return res.ok;
  },

  async createProject({ tipo, titulo, descricao, link, documento }) {
    const res = await this.run(this.client.from('projects').insert({
      kind: tipo, title: titulo, description: descricao,
      link: link || null, document: documento || null,
    }), 'Não foi possível publicar.');
    if (res.ok) await this.refresh('projects');
    return res.ok;
  },

  /* Nota de 1 a 5: primeira vez insere; se já existe, atualiza a própria nota */
  async setRating(table, column, id, value, refreshTable) {
    let { error } = await this.client.from(table).insert({ [column]: id, value });
    if (error && error.code === '23505') {
      ({ error } = await this.client.from(table).update({ value }).eq(column, id).eq('user_id', state.user.id));
    }
    if (error) { this.reportError(error, 'Não foi possível registrar a nota.'); return; }
    await this.refresh(refreshTable);
  },
  rateAnswer(answerId, value) { return this.setRating('answer_ratings', 'answer_id', answerId, value, 'answers'); },
  rateQuestion(questionId, value) { return this.setRating('question_ratings', 'question_id', questionId, value, 'questions'); },

  async toggleReaction(projectId) {
    const project = cache.projetos.find(p => p.id === projectId);
    const mine = project && project.reacoes.includes(state.user.id);
    const query = mine
      ? this.client.from('project_reactions').delete().eq('project_id', projectId).eq('user_id', state.user.id)
      : this.client.from('project_reactions').insert({ project_id: projectId });
    const res = await this.run(query, 'Não foi possível registrar a curtida.');
    if (res.ok) await this.refresh('projects');
  },

  async sendMessage({ para, texto }) {
    const res = await this.run(this.client.from('messages').insert({ to_id: para, body: texto }), 'Não foi possível enviar a mensagem.');
    if (res.ok) await this.refresh('messages');
    return res.ok;
  },

  async markMessagesRead(fromId) {
    const res = await this.run(this.client.from('messages').update({ is_read: true }).eq('from_id', fromId).eq('is_read', false));
    if (res.ok) await this.refresh('messages');
  },

  async updateOwnProfile(fields) {
    const res = await this.run(this.client.from('profiles').update({
      bio: fields.bio, company: fields.empresaAtual, school: fields.escolaAtual,
    }).eq('id', state.user.id), 'Não foi possível salvar o perfil.');
    if (res.ok) await this.refresh('profiles');
    return res.ok;
  },

  /* A sequência de dias é calculada pelo banco (data do servidor) */
  async registerVisit() {
    const { error } = await this.client.rpc('register_visit');
    if (error) console.error(error.message);
    else await this.refresh('profiles');
  },

  /* ---------- Administração (o banco só aceita se a conta for admin) ---------- */
  async setBanned(userId, banned) {
    const res = await this.run(this.client.rpc('admin_set_banned', { p_user: userId, p_banned: banned }), 'Não foi possível alterar o banimento.');
    if (res.ok) await this.refresh('profiles');
  },

  async removeQuestion(id) {
    const res = await this.run(this.client.from('questions').delete().eq('id', id), 'Não foi possível remover a pergunta.');
    if (res.ok) await Promise.all([this.refresh('questions'), this.refresh('answers')]);
  },

  async removeProject(id) {
    const res = await this.run(this.client.from('projects').delete().eq('id', id), 'Não foi possível remover a publicação.');
    if (res.ok) await this.refresh('projects');
  },
};
