/* Proxy da API da Anthropic — a chave fica só aqui, nunca no navegador */
const { sendJson, readJson } = require("./http");

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

function handleStatus(request, response) {
  sendJson(response, 200, { enabled: Boolean(process.env.ANTHROPIC_API_KEY) });
}

async function handleChat(request, response) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, { error: "IA sem configuração. Defina ANTHROPIC_API_KEY no .env e reinicie o servidor." });
    return;
  }
  try {
    const payload = await readJson(request);
    validatePayload(payload);
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: payload.max_tokens,
        system: payload.system,
        messages: payload.messages,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const status = upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502;
      sendJson(response, status, { error: result.error?.message || "A Anthropic não conseguiu processar o pedido." });
      return;
    }
    const text = (result.content || []).map(block => block.text || "").join("\n").trim();
    sendJson(response, 200, { text });
  } catch (error) {
    sendJson(response, error.status || 502, { error: error.status ? error.message : "Falha ao consultar o serviço de IA." });
  }
}

module.exports = { handleStatus, handleChat };
