/* Proxy da IA (Groq, API compatível com a da OpenAI) — a chave fica só aqui, nunca no navegador */
const { sendJson, readJson } = require("./http");
const { authConfigured, verifyUser, checkRateLimit } = require("./auth");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// llama-3.1-8b-instant: modelo rápido, com os maiores limites do plano gratuito.
// Para respostas melhores (com limite menor), use GROQ_MODEL=llama-3.3-70b-versatile no .env.
const DEFAULT_MODEL = "llama-3.1-8b-instant";

function aiModel() {
  const wanted = String(process.env.GROQ_MODEL || "").trim();
  return /^[\w.:\/-]{1,80}$/.test(wanted) ? wanted : DEFAULT_MODEL;
}

function validatePayload(payload) {
  if (!payload || typeof payload.system !== "string" || payload.system.length > 10_000) {
    throw Object.assign(new Error("Instruções inválidas."), { status: 400 });
  }
  if (!Array.isArray(payload.messages) || payload.messages.length < 1 || payload.messages.length > 12) {
    throw Object.assign(new Error("Mensagens inválidas."), { status: 400 });
  }
  const validMessages = payload.messages.every(message =>
    message && ["user", "assistant"].includes(message.role) &&
    typeof message.content === "string" && message.content.length <= 6_000
  );
  if (!validMessages) throw Object.assign(new Error("Formato de mensagem inválido."), { status: 400 });
  if (!Number.isInteger(payload.max_tokens) || payload.max_tokens < 1 || payload.max_tokens > 700) {
    throw Object.assign(new Error("Limite de resposta inválido."), { status: 400 });
  }
}

/* A IA só liga se a chave da Groq E a conferência de login estiverem configuradas
   (sem a conferência, qualquer pessoa gastaria o limite da sua chave). */
function aiEnabled() {
  return Boolean(process.env.GROQ_API_KEY) && authConfigured();
}

function handleStatus(request, response) {
  sendJson(response, 200, { enabled: aiEnabled() });
}

async function handleChat(request, response) {
  if (!aiEnabled()) {
    sendJson(response, 503, { error: "Assistente indisponível no momento." });
    return;
  }
  const apiKey = process.env.GROQ_API_KEY;
  try {
    const user = await verifyUser(request);
    checkRateLimit(user.id);
    const payload = await readJson(request);
    validatePayload(payload);
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: aiModel(),
        max_completion_tokens: payload.max_tokens,
        messages: [{ role: "system", content: payload.system }, ...payload.messages],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      // detalhes só no log do servidor (a chave nunca é registrada); a pessoa vê uma mensagem genérica
      console.error("Groq:", upstream.status, result.error && result.error.message);
      if (upstream.status === 429) {
        sendJson(response, 429, { error: "O assistente está muito requisitado agora. Tente novamente em instantes." });
      } else {
        sendJson(response, 502, { error: "O assistente não conseguiu responder agora. Tente novamente." });
      }
      return;
    }
    const choice = Array.isArray(result.choices) ? result.choices[0] : null;
    const text = String((choice && choice.message && choice.message.content) || "").trim();
    sendJson(response, 200, { text });
  } catch (error) {
    if (!error.status) console.error("ai-proxy:", error);
    sendJson(response, error.status || 502, { error: error.status ? error.message : "Falha ao consultar o serviço de IA." });
  }
}

module.exports = { handleStatus, handleChat };
