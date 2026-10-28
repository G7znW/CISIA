/* =====================================================================
   Assistente de IA — chama o proxy local POST /api/ai (server.js).
   A chave da Anthropic fica só no servidor (.env), nunca no navegador.
   ===================================================================== */
let aiOpen = false;
let aiTurns = [];
let aiAvailable = null; // null = ainda não sabemos, true/false depois do teste
let aiBusy = false;
let aiContextQuestion = null;
let aiLastAnswerText = '';

async function checkAiAvailability() {
  try {
    const res = await fetch('/api/ai/status', { cache: 'no-store' });
    const data = await res.json();
    aiAvailable = Boolean(data.enabled);
  } catch (e) {
    aiAvailable = false; // página aberta sem o server.js
  }
  render();
}

function buildAiSystemPrompt() {
  return `Você é o assistente de estudos da plataforma educacional CISIA. ` +
    `Responda em português, de forma didática e organizada, adequada a um estudante do ${state.user ? state.user.nivel : 'Ensino Médio'}. ` +
    `Explique o raciocínio passo a passo — nunca dê apenas o resultado final sem explicação. Seja claro, direto e acolhedor.` +
    (aiContextQuestion ? `\n\nContexto: o estudante está ajudando a responder a seguinte pergunta de um colega, intitulada "${aiContextQuestion.titulo}", com o seguinte enunciado: "${aiContextQuestion.corpo}". Ajude a estruturar uma explicação clara e completa que o estudante pode adaptar e publicar como resposta.` : '');
}

async function sendToAi(userText) {
  aiTurns.push({ role: 'user', content: userText });
  aiBusy = true;
  renderAiWidget();

  // O servidor aceita no máximo 12 mensagens, e a primeira precisa ser do usuário
  let messages = aiTurns.slice(-12).map(t => ({ role: t.role, content: String(t.content).slice(0, 6000) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: buildAiSystemPrompt().slice(0, 10000), messages, max_tokens: 700 }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao consultar o assistente.');
    const idx = aiTurns.length;
    aiTurns.push({ role: 'assistant', content: data.text || '(sem resposta)', insertable: !!aiContextQuestion, idx });
  } catch (err) {
    aiTurns.push({ role: 'assistant', content: 'Não foi possível obter uma resposta agora: ' + err.message });
  }
  aiBusy = false;
  renderAiWidget();
}
