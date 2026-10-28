/* =====================================================================
   Camada de dados — todo acesso ao Supabase passa por aqui.
   - Leituras: baixa cada tabela, converte para o formato que as views
     usam (nomes em português) e guarda em `cache`.
   - Escritas: insert/update/rpc; depois da escrita a tabela é relida.
   - Tempo real: Supabase Realtime avisa quando uma tabela muda e o
     cache é atualizado sozinho.
   ===================================================================== */

/* ---------- Conversores banco (inglês/snake_case) → interface ---------- */
function ratingsToArray(obj) {
  return Object.entries(obj || {}).map(([email, value]) => ({ email, value: Number(value) }));
}

const Mappers = {
  profile: r => ({
    id: r.email, uid: r.id, email: r.email, nome: r.name, nivel: r.level || '', papel: r.role || 'Aluno',
    bio: r.bio || '', empresaAtual: r.company || '', escolaAtual: r.school || '',
    idade: r.age || '', estadoCivil: r.marital_status || '',
    sequencia: r.streak || 0, ultimoAcesso: r.last_access_date,
    criadoEm: Date.parse(r.created_at), isAdmin: !!r.is_admin, banido: !!r.banned,
  }),
  question: r => ({
    id: r.id, titulo: r.title, corpo: r.body, nivel: r.level, disciplina: r.discipline,
    autorNome: r.author_name, autorEmail: r.author_email,
    criadoEm: Date.parse(r.created_at), ratings: ratingsToArray(r.ratings),
  }),
  answer: r => ({
    id: r.id, perguntaId: r.question_id, corpo: r.body,
    autorNome: r.author_name, autorEmail: r.author_email,
    criadoEm: Date.parse(r.created_at), ratings: ratingsToArray(r.ratings),
  }),
  project: r => ({
    id: r.id, tipo: r.kind, titulo: r.title, descricao: r.description,
    link: r.link || '', documento: r.document || '', reacoes: r.reactions || [],
    autorNome: r.author_name, autorEmail: r.author_email, criadoEm: Date.parse(r.created_at),
  }),
  message: r => ({
    id: r.id, de: r.from_email, deNome: r.from_name, para: r.to_email, paraNome: r.to_name,
    texto: r.body, lida: !!r.is_read, criadoEm: Date.parse(r.created_at),
  }),
};

/* tabela do banco → onde fica no cache + conversor */
const TABLES = {
  profiles:  { cache: 'usuarios',  map: Mappers.profile },
  questions: { cache: 'perguntas', map: Mappers.question },
  answers:   { cache: 'respostas', map: Mappers.answer },
  projects:  { cache: 'projetos',  map: Mappers.project },
  messages:  { cache: 'mensagens', map: Mappers.message },
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
    const t = TABLES[table];
    const { data, error } = await this.client.from(table).select('*').order('created_at', { ascending: true });
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

  async loadAll() {
    await Promise.all(Object.keys(TABLES).map(t => this.refresh(t)));
  },

  /* ---------- Tempo real ---------- */
  subscribe() {
    const channel = this.client.channel('cisia-changes');
    Object.keys(TABLES).forEach(table => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => this.scheduleRefresh(table));
    });
    channel.subscribe();
  },

  scheduleRefresh(table) {
    clearTimeout(this._timers[table]);
    this._timers[table] = setTimeout(() => this.refresh(table), 150);
  },

  /* ---------- Escrita ---------- */
  /* Executa uma operação do Supabase; em caso de erro mostra aviso e devolve null. */
  async run(promise, friendlyMessage) {
    const { data, error } = await promise;
    if (error) {
      console.error(error);
      let msg = friendlyMessage || 'Não foi possível concluir a ação.';
      if (/row-level security/i.test(error.message)) msg = 'Você não tem permissão para esta ação (conta removida ou sem acesso).';
      else if (/[ãçé]/.test(error.message)) msg = error.message; // mensagens em português vindas das funções do banco
      showToast(msg);
      return { ok: false, data: null };
    }
    return { ok: true, data };
  },

  async fetchOwnProfile(uid) {
    const read = () => this.client.from('profiles').select('*').eq('id', uid).maybeSingle();
    let { data, error } = await read();
    if (error) { console.error(error); return null; }
    if (!data) {
      // gatilho do banco não criou o perfil: pede para o banco criar agora
      const rpc = await this.client.rpc('ensure_my_profile');
      if (rpc.error) { console.error(rpc.error); return null; }
      ({ data, error } = await read());
      if (error) { console.error(error); return null; }
    }
    return data ? Mappers.profile(data) : null;
  },

  async createQuestion({ titulo, corpo, nivel, disciplina }) {
    const res = await this.run(this.client.from('questions').insert({
      title: titulo, body: corpo, level: nivel, discipline: disciplina,
      author_name: state.user.nome, author_email: state.user.email,
    }).select('id').single(), 'Não foi possível publicar a pergunta.');
    if (res.ok) await this.refresh('questions');
    return res.ok ? res.data.id : null;
  },

  async createAnswer({ perguntaId, corpo }) {
    const res = await this.run(this.client.from('answers').insert({
      question_id: perguntaId, body: corpo,
      author_name: state.user.nome, author_email: state.user.email,
    }), 'Não foi possível publicar a resposta.');
    if (res.ok) await this.refresh('answers');
    return res.ok;
  },

  async createProject({ tipo, titulo, descricao, link, documento }) {
    const res = await this.run(this.client.from('projects').insert({
      kind: tipo, title: titulo, description: descricao,
      link: link || null, document: documento || null,
      author_name: state.user.nome, author_email: state.user.email,
    }), 'Não foi possível publicar.');
    if (res.ok) await this.refresh('projects');
    return res.ok;
  },

  async rateAnswer(answerId, value) {
    const res = await this.run(this.client.rpc('rate_answer', { p_answer_id: answerId, p_value: value }));
    if (res.ok) await this.refresh('answers');
  },

  async rateQuestion(questionId, value) {
    const res = await this.run(this.client.rpc('rate_question', { p_question_id: questionId, p_value: value }));
    if (res.ok) await this.refresh('questions');
  },

  async toggleReaction(projectId) {
    const res = await this.run(this.client.rpc('toggle_project_reaction', { p_project_id: projectId }));
    if (res.ok) await this.refresh('projects');
  },

  async sendMessage({ para, paraNome, texto }) {
    const res = await this.run(this.client.from('messages').insert({
      from_email: state.user.email, from_name: state.user.nome,
      to_email: para, to_name: paraNome || '', body: texto,
    }), 'Não foi possível enviar a mensagem.');
    if (res.ok) await this.refresh('messages');
    return res.ok;
  },

  async markMessagesRead(fromEmail) {
    const res = await this.run(this.client.rpc('mark_messages_read', { p_from: fromEmail }));
    if (res.ok) await this.refresh('messages');
  },

  async updateOwnProfile(fields) {
    const res = await this.run(this.client.from('profiles').update({
      bio: fields.bio, company: fields.empresaAtual, school: fields.escolaAtual,
      age: fields.idade, marital_status: fields.estadoCivil,
    }).eq('id', state.user.uid), 'Não foi possível salvar o perfil.');
    if (res.ok) await this.refresh('profiles');
    return res.ok;
  },

  async updateStreak(streak, today) {
    const res = await this.client.from('profiles').update({ streak, last_access_date: today }).eq('id', state.user.uid);
    if (res.error) console.error(res.error);
    else await this.refresh('profiles');
  },

  /* ---------- Administração (o RLS garante que só admin consegue) ---------- */
  async setBanned(email, banned) {
    const res = await this.run(this.client.from('profiles').update({
      banned, banned_at: banned ? new Date().toISOString() : null,
    }).eq('email', email), 'Não foi possível alterar o banimento.');
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