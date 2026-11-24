/* Tela de uma pergunta com suas respostas */
/* ---------- Pergunta detail ---------- */
function renderPergunta() {
  const q = cache.perguntas.find(x => x.id === state.activeQuestionId);
  if (!q) return `<p>Pergunta não encontrada. <span class="back" data-nav="feed">Voltar</span></p>`;
  const answers = cache.respostas.filter(a => a.perguntaId === q.id).slice().sort((a,b) => avgRating(b) - avgRating(a));
  const bestId = answers.length ? answers[0].id : null;
  const bestScore = answers.length ? avgRating(answers[0]) : 0;

  const answerCards = answers.map(a => {
    const score = avgRating(a);
    const isBest = a.id === bestId && bestScore > 0 && answers.length > 1;
    const myRating = state.user ? ((a.ratings||[]).find(r => r.userId === state.user.id)?.value || 0) : 0;
    const isMine = state.user && a.autorId === state.user.id; // o banco não deixa avaliar o próprio conteúdo
    return `
    <div class="acard ${isBest ? 'best' : ''}">
      ${isBest ? '<div class="best-flag">★ MELHOR RESPOSTA AVALIADA</div>' : ''}
      <div class="body">${escapeHtml(a.corpo)}</div>
      <div class="arow">
        <div class="byline"><span class="author-link" data-profile="${escapeHtml(a.autorId)}">${escapeHtml(a.autorNome)}</span> · ${timeAgo(a.criadoEm)}</div>
        <div class="rate" data-answer="${a.id}">
          ${isMine ? '' : `<div class="stars">
            ${[1,2,3,4,5].map(n => `<button class="star ${n<=myRating?'on':''}" data-star="${n}" title="Avaliar qualidade">★</button>`).join('')}
          </div>`}
          <span class="score">${score > 0 ? score.toFixed(1) + ' (' + (a.ratings||[]).length + ')' : 'sem avaliações'}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  return `
  <span class="back" data-nav="feed">← voltar para perguntas</span>
  <div class="qdetail">
    <div class="tags">
      <span class="tag level">${escapeHtml(q.nivel)}</span>
      <span class="tag subject">${escapeHtml(q.disciplina)}</span>
    </div>
    <h1>${escapeHtml(q.titulo)}</h1>
    <div class="body">${escapeHtml(q.corpo)}</div>
    <div class="byline">Publicado por <span class="author-link" data-profile="${escapeHtml(q.autorId)}">${escapeHtml(q.autorNome)}</span> · ${timeAgo(q.criadoEm)}</div>
    ${state.user && q.autorId !== state.user.id ? (() => { const myQ = (q.ratings||[]).find(r => r.userId === state.user.id)?.value || 0;
      return `<div class="rate" data-question="${q.id}" style="margin-top:12px;"><span style="font-size:12px; color:var(--muted);">avaliar pergunta:</span><div class="stars">${[1,2,3,4,5].map(n => `<button class="star ${n<=myQ?'on':''}" data-star="${n}" title="Avaliar pergunta">★</button>`).join('')}</div></div>`; })() : ''}
  </div>

  <div class="answers-head">
    <h2>${answers.length} resposta${answers.length===1?'':'s'}</h2>
    ${state.user ? `<button class="btn ai small" data-ai-draft="1">✦ Pedir ajuda da IA para rascunhar</button>` : ''}
  </div>
  ${answerCards || `<p style="color:var(--muted); font-size:14px;">Ainda sem respostas. Avalie explicações completas, não apenas o resultado final.</p>`}

  ${state.user ? `
  <div class="answer-form">
    <form id="answerForm">
      <textarea required maxlength="5000" name="corpo" id="answerBody" placeholder="Explique passo a passo, não só o resultado final..."></textarea>
      <div class="actions"><span></span><button class="btn" type="submit">Publicar resposta</button></div>
    </form>
  </div>` : `<p style="color:var(--muted); font-size:13.5px;"><span data-nav="login" style="text-decoration:underline; cursor:pointer;">Entre</span> para responder e avaliar.</p>`}
  `;
}

