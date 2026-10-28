/* Entrega os arquivos da pasta public/ (HTML, CSS, JS, imagens) */
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { sendJson } = require("./http");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

async function serveStatic(response, pathname) {
  let relative;
  try {
    relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    sendJson(response, 400, { error: "Endereço inválido." });
    return;
  }
  const filePath = path.resolve(PUBLIC_DIR, relative);
  // impede acessar arquivos fora de public/ (ex.: /../.env)
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    sendJson(response, 403, { error: "Acesso negado." });
    return;
  }
  const type = TYPES[path.extname(filePath).toLowerCase()];
  if (!type) { sendJson(response, 404, { error: "Rota não encontrada." }); return; }
  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "Rota não encontrada." });
  }
}

module.exports = { serveStatic };
