/* Telas de login, cadastro e configuração inicial */
/* ---------- Login ---------- */
function renderLogin() {
  return `
  <div class="auth-wrap">
    <div class="auth-card">
      <h1>Entrar na CISIA</h1>
      <p class="sub">Entre com seu e-mail e senha para tirar dúvidas, responder colegas e acompanhar sua pontuação de qualidade.</p>
      ${state.authError ? `<div class="auth-error">${escapeHtml(state.authError)}</div>` : ''}
      <form id="loginForm">
        <div class="field"><label>E-mail</label><input required type="email" name="email" placeholder="seu@email.com"></div>
        <div class="field"><label>Senha</label><input required type="password" name="senha" placeholder="Sua senha"></div>
        <button class="btn-block" type="submit" ${state.authBusy ? 'disabled' : ''}>${state.authBusy ? 'Entrando…' : 'Entrar na CISIA'}</button>
      </form>
      <div class="switch-link">Ainda não tenho conta — <a data-nav="cadastro">cadastrar</a></div>
      <div class="auth-note">Sua conta é gerenciada pelo Supabase Auth — a senha nunca fica salva em texto puro. Ative as notificações do navegador para saber quando alguém responder ou avaliar seu conteúdo.</div>
    </div>
  </div>`;
}

function renderCadastro() {
  return `
  <div class="auth-wrap">
    <div class="auth-card">
      <h1>Criar conta</h1>
      <p class="sub">Crie sua conta com e-mail e senha para tirar dúvidas, responder colegas e acompanhar sua pontuação de qualidade.</p>
      ${state.authError ? `<div class="auth-error">${escapeHtml(state.authError)}</div>` : ''}
      <form id="cadastroForm">
        <div class="field"><label>Seu nome</label><input required name="nome" placeholder="Ex: Marina Souza"></div>
        <div class="field"><label>E-mail</label><input required type="email" name="email" placeholder="seu@email.com"></div>
        <div class="field"><label>Senha</label><input required minlength="6" type="password" name="senha" placeholder="Mínimo 6 caracteres"></div>
        <div class="field"><label>Você é</label>
          <select name="papel">${PAPEIS.map(p => `<option>${p}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Seu nível de ensino</label>
          <select name="nivel">${NIVEIS.map(n => `<option>${n}</option>`).join('')}</select>
        </div>
        <button class="btn-block" type="submit" ${state.authBusy ? 'disabled' : ''}>${state.authBusy ? 'Criando…' : 'Criar conta'}</button>
      </form>
      <div class="switch-link">Já tenho conta — <a data-nav="login">entrar</a></div>
    </div>
  </div>`;
}


/* ---------- Configuração pendente (config.js ainda com os valores de exemplo) ---------- */
function renderSetup() {
  return `
  <div class="auth-wrap">
    <div class="auth-card">
      <h1>Falta conectar o banco</h1>
      <p class="sub">Abra <b>public/js/config.js</b> e preencha <b>SUPABASE_URL</b> e <b>SUPABASE_ANON_KEY</b> com os dados do seu projeto (Supabase → Project Settings → API). Depois recarregue esta página.</p>
      <div class="auth-note">Ainda não criou as tabelas? Rode o arquivo <b>database/supabase-schema.sql</b> no SQL Editor do Supabase. Se esta mensagem continuar aparecendo, confira também sua conexão com a internet (a biblioteca do Supabase é carregada por CDN).</div>
    </div>
  </div>`;
}