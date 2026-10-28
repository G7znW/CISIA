/* Telas de nova pergunta e nova publicação */
/* ---------- Nova pergunta ---------- */
function renderNovaPergunta() {
  return `
  <span class="back" data-nav="feed">← voltar para perguntas</span>
  <div class="panel">
    <h1>Publicar uma dúvida</h1>
    <form id="novaPerguntaForm">
      <div class="dark-field"><label>Título</label><input required name="titulo" placeholder="Resuma sua dúvida em uma frase"></div>
      <div class="grid2">
        <div class="dark-field"><label>Nível de ensino</label>
          <select name="nivel">${NIVEIS.map(n => `<option ${n===state.user.nivel?'selected':''}>${n}</option>`).join('')}</select>
        </div>
        <div class="dark-field"><label>Disciplina</label>
          <select name="disciplina">${DISCIPLINAS.map(d => `<option>${d}</option>`).join('')}</select>
        </div>
      </div>
      <div class="dark-field"><label>Descreva sua dúvida</label><textarea required name="corpo" placeholder="Explique o que você já tentou e onde travou — quanto mais contexto, melhores as respostas."></textarea></div>
      <button class="btn" type="submit">Publicar pergunta</button>
    </form>
  </div>`;
}

function renderNovoProjeto() {
  return `
  <span class="back" data-nav="feed">← voltar</span>
  <div class="panel">
    <h1>Nova publicação</h1>
    <form id="novoProjetoForm">
      <div class="dark-field"><label>Tipo</label>
        <select name="tipo"><option>Projeto extracurricular</option><option>Artigo científico</option><option>TCC</option><option>Pesquisa</option></select>
      </div>
      <div class="dark-field"><label>Título</label><input required name="titulo" placeholder="Ex: App de estudos para Enem"></div>
      <div class="dark-field"><label>Descrição</label><textarea required name="descricao" placeholder="Do que se trata, o que você aprendeu, quem pode participar..."></textarea></div>
      <div class="grid2">
        <div class="dark-field"><label>Link (opcional)</label><input type="url" name="link" placeholder="https://..."></div>
        <div class="dark-field"><label>Documento anexo (link)</label><input type="url" name="documento" placeholder="https://..."></div>
      </div>
      <button class="btn" type="submit">Publicar</button>
    </form>
  </div>`;
}

