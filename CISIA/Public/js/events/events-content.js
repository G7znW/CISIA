/* Eventos de perguntas, respostas, publicações, filtros e avaliações */
function bindContentEvents() {
  const novaPerguntaForm = document.getElementById('novaPerguntaForm');
  if (novaPerguntaForm) novaPerguntaForm.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(novaPerguntaForm);
    const id = await Api.createQuestion({
      titulo: fd.get('titulo').trim(), corpo: fd.get('corpo').trim(),
      nivel: fd.get('nivel'), disciplina: fd.get('disciplina'),
    });
    if (id) { state.activeQuestionId = id; state.view = 'pergunta'; render(); }
  });

  const novoProjetoForm = document.getElementById('novoProjetoForm');
  if (novoProjetoForm) novoProjetoForm.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(novoProjetoForm);
    const ok = await Api.createProject({
      tipo: fd.get('tipo'), titulo: fd.get('titulo').trim(), descricao: fd.get('descricao').trim(),
      link: (fd.get('link') || '').trim(), documento: (fd.get('documento') || '').trim(),
    });
    if (ok) { state.feedTab = 'projetos'; state.view = 'feed'; render(); }
  });

  const answerForm = document.getElementById('answerForm');
  if (answerForm) answerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(answerForm);
    const ok = await Api.createAnswer({ perguntaId: state.activeQuestionId, corpo: fd.get('corpo').trim() });
    if (ok) render();
  });

  app.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', () => {
      state.activeQuestionId = el.getAttribute('data-open');
      state.view = 'pergunta'; render();
    });
  });

  const fNivel = document.getElementById('fNivel');
  if (fNivel) fNivel.addEventListener('change', () => { state.filterNivel = fNivel.value; render(); });
  const fDisciplina = document.getElementById('fDisciplina');
  if (fDisciplina) fDisciplina.addEventListener('change', () => { state.filterDisciplina = fDisciplina.value; render(); });
  const fSearch = document.getElementById('fSearch');
  if (fSearch) fSearch.addEventListener('input', () => {
    state.search = fSearch.value; render();
    const el2 = document.getElementById('fSearch');
    if (el2) { el2.focus(); el2.setSelectionRange(el2.value.length, el2.value.length); }
  });

  /* Estrelas: a nota é gravada por funções do banco (rate_answer / rate_question) */
  const bindStars = (selector, attr, rate) => {
    app.querySelectorAll(selector).forEach(row => {
      row.querySelectorAll('.star').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!state.user) { state.view = 'login'; render(); return; }
          await rate(row.getAttribute(attr), parseInt(btn.getAttribute('data-star'), 10));
        });
      });
    });
  };
  bindStars('[data-answer]', 'data-answer', (id, v) => Api.rateAnswer(id, v));
  bindStars('[data-question]', 'data-question', (id, v) => Api.rateQuestion(id, v));

  app.querySelectorAll('[data-react]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!state.user) { state.view = 'login'; render(); return; }
      await Api.toggleReaction(btn.getAttribute('data-react'));
    });
  });

  const aiDraftBtn = app.querySelector('[data-ai-draft]');
  if (aiDraftBtn) aiDraftBtn.addEventListener('click', () => {
    aiContextQuestion = cache.perguntas.find(x => x.id === state.activeQuestionId) || null;
    aiTurns = [];
    aiOpen = true;
    renderAiWidget();
  });
}
