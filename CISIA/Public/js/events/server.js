/* Servidor local: entrega public/ e faz o proxy da IA (/api/ai).
   Rodar: node --env-file=.env server.js */
const http = require("node:http");
const { sendJson } = require("./server/http");
const { handleStatus, handleChat } = require("./server/ai-proxy");
const { serveStatic } = require("./server/static");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "127.0.0.1";
// aceita 127.0.0.1 e localhost (bloqueia outros hosts, protegendo contra DNS rebinding)
const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const ALLOWED_ORIGINS = new Set([...ALLOWED_HOSTS].map(h => `http://${h}`));

const server = http.createServer(async (request, response) => {
  if (!ALLOWED_HOSTS.has(request.headers.host)) {
    sendJson(response, 403, { error: "Host não permitido." });
    return;
  }
  const origin = request.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    sendJson(response, 403, { error: "Origem não permitida." });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/ai/status") return handleStatus(request, response);
  if (request.method === "POST" && url.pathname === "/api/ai") return handleChat(request, response);
  if (request.method === "GET" && !url.pathname.startsWith("/api/")) return serveStatic(response, url.pathname);

  sendJson(response, 404, { error: "Rota não encontrada." });
});

server.listen(PORT, HOST, () => {
  console.log(`CISIA disponível em http://${HOST}:${PORT}`);
});
