/* Confere quem está chamando o proxy da IA: só conta logada no Supabase e não banida.
   O servidor repete a conferência (nunca confia no navegador). */

function authConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

async function verifyUser(request) {
  const header = String(request.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  // um JWT tem 3 partes separadas por ponto; recusa lixo antes de gastar uma chamada de rede
  if (!token || token.length > 4000 || token.split(".").length !== 3) throw fail(401, "Entre na CISIA para usar o assistente.");

  const base = process.env.SUPABASE_URL.replace(/\/+$/, "");
  const headers = { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
  const signal = AbortSignal.timeout(8_000);

  const userRes = await fetch(`${base}/auth/v1/user`, { headers, signal }).catch(() => null);
  if (!userRes) throw fail(502, "Não foi possível confirmar seu login agora.");
  if (!userRes.ok) throw fail(401, "Sessão inválida. Entre novamente.");
  const user = await userRes.json().catch(() => ({}));
  if (!user.id || !/^[0-9a-f-]{36}$/i.test(user.id)) throw fail(401, "Sessão inválida. Entre novamente.");

  const profileRes = await fetch(`${base}/rest/v1/profiles?select=banned&id=eq.${user.id}`, { headers, signal }).catch(() => null);
  const rows = profileRes && profileRes.ok ? await profileRes.json().catch(() => null) : null;
  if (!Array.isArray(rows) || rows.length !== 1) throw fail(403, "Perfil não encontrado.");
  if (rows[0].banned) throw fail(403, "Conta sem acesso ao assistente.");
  return { id: user.id };
}

/* Limite por usuário: LIMIT pedidos a cada WINDOW_MS (guardado na memória do servidor) */
const WINDOW_MS = 10 * 60_000;
const LIMIT = 20;
const hits = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(userId, recent);
    throw fail(429, "Muitas perguntas seguidas. Aguarde alguns minutos.");
  }
  recent.push(now);
  hits.set(userId, recent);
  if (hits.size > 5_000) for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k);
}

module.exports = { authConfigured, verifyUser, checkRateLimit };
