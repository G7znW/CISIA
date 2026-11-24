/* Widgets flutuantes: assistente de IA, botão de notificações e painel de tema */

function renderAiWidget() {
  document.querySelectorAll('.ai-fab, .ai-panel').forEach(el => el.remove());
  if (!state.user) return; // assistant only for logged-in users
  if (aiAvailable === false) return;

  const fab = document.createElement('button');
  fab.className = 'ai-fab';
  fab.innerHTML = '✦ Assistente CISIA';
  fab.onclick = () => { aiOpen = !aiOpen; renderAiWidget(); };
  document.body.appendChild(fab);

  if (!aiOpen) return;

  const panel = document.createElement('div');
  panel.className = 'ai-panel';
  const msgs = aiTurns.map(t => `<div class="ai-msg ${t.role}">${escapeHtml(t.content)}${t.role==='assistant' && t.insertable ? `<br><button class="ai-insert" data-insert-idx="${t.idx}">Inserir no formulário de resposta</button>` : ''}</div>`).join('')
    || `<div class="ai-msg system-note">${aiContextQuestion ? 'Peça uma explicação, passo a passo, para ajudar a estruturar sua resposta.' : 'Pergunte algo sobre a matéria — o assistente explica de forma didática, sem só dar a resposta pronta.'}</div>`;

  panel.innerHTML = `
    <div class="ai-head"><b>✦ Assistente CISIA</b><button data-ai-close="1">×</button></div>
    <div class="ai-sub">${aiContextQuestion ? 'Contexto: ' + escapeHtml(aiContextQuestion.titulo) : 'Assistente de estudos'}</div>
    <div class="ai-body" id="aiBody">${msgs}${aiBusy ? '<div class="ai-msg system-note">Pensando…</div>' : ''}</div>
    <form class="ai-foot" id="aiForm">
      <textarea id="aiInput" maxlength="4000" placeholder="Digite sua dúvida..." ${aiBusy ? 'disabled' : ''}></textarea>
      <button type="submit" ${aiBusy ? 'disabled' : ''}>Enviar</button>
    </form>
  `;
  document.body.appendChild(panel);
  const bodyEl = panel.querySelector('#aiBody');
  if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;

  panel.querySelector('[data-ai-close]').onclick = () => { aiOpen = false; renderAiWidget(); };
  panel.querySelectorAll('[data-insert-idx]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-insert-idx'), 10);
      const text = aiTurns[idx] ? aiTurns[idx].content : '';
      const ta = document.getElementById('answerBody');
      if (ta) { ta.value = text; aiOpen = false; renderAiWidget(); }
    };
  });
  const form = panel.querySelector('#aiForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = panel.querySelector('#aiInput');
    const text = input.value.trim();
    if (!text || aiBusy) return;
    await sendToAi(text);
  });
}

function renderNotifButton() {
  const old = document.querySelector('.notif-btn');
  if (old) old.remove();
  if (!('Notification' in window) || !state.user) return;
  if (Notification.permission === 'granted') return;
  const btn = document.createElement('button');
  btn.className = 'notif-btn';
  btn.textContent = '🔔 Ativar notificações';
  btn.onclick = () => { Notification.requestPermission().then(() => { render(); }); };
  document.body.appendChild(btn);
}
function renderThemeWidget() {
  document.querySelectorAll('.theme-panel').forEach(el => el.remove());
  if (!state.themeOpen) return;
  const current = (localStorage.getItem(THEME_KEY) || '#0a0e17').toLowerCase();
  const panel = document.createElement('div');
  panel.className = 'theme-panel';
  panel.innerHTML = `
    <h3>Aparência</h3>
    <p class="sub3">Escolha a cor de fundo — o texto se ajusta sozinho para continuar legível.</p>
    <div class="swatches">
      ${THEME_PRESETS.map(p => `<button class="swatch ${p.hex.toLowerCase()===current?'active':''}" style="background:${p.hex};" data-set-theme="${p.hex}" title="${p.nome}"></button>`).join('')}
    </div>
    <div class="theme-custom">
      <input type="color" id="customThemeColor" value="${current.length===7?current:'#0a0e17'}">
      <label>ou escolha uma cor personalizada</label>
    </div>`;
  document.body.appendChild(panel);
  panel.querySelectorAll('[data-set-theme]').forEach(btn => {
    btn.addEventListener('click', () => { applyTheme(btn.getAttribute('data-set-theme'), true); state.themeOpen = false; render(); });
  });
  const colorInput = panel.querySelector('#customThemeColor');
  colorInput.addEventListener('input', () => applyTheme(colorInput.value, true));
}
