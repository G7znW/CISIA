/* Entrega os arquivos da pasta public/ (HTML, CSS, JS, imagens) */
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { sendJson } = require("./http");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
/* Cabeçalhos de segurança: só scripts do próprio site, conexão só com o Supabase,
   nada de iframes e nada de <base>/<object>. */
const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/* /js/config.js não é um arquivo: o servidor monta na hora a partir do .env
   (SUPABASE_URL e SUPABASE_ANON_KEY). A anon key é pública por design; nada mais do .env sai daqui. */
function serveConfig(response) {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_ANON_KEY || "").trim();
  const valid = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && key.length > 20;
  const body = valid
    ? `const SUPABASE_URL = ${JSON.stringify(url)};\nconst SUPABASE_ANON_KEY = ${JSON.stringify(key)};\n`
    : "const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';\nconst SUPABASE_ANON_KEY = 'SUA-ANON-KEY-AQUI';\n"; // a tela de "falta conectar o banco" aparece
  response.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
  response.end(body);
}

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
    response.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": type, "Cache-Control": "no-store" });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "Rota não encontrada." });
  }
}

module.exports = { serveStatic, serveConfig };
