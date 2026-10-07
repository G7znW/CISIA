const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "127.0.0.1";
const PAGE_PATH = path.join(__dirname, "index.html");
const MAX_BODY_BYTES = 100_000;

function sendJson(response, status, data){
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(data));
}

async function readJson(request){
  const chunks = [];
  let size = 0;
  for await (const chunk of request){
    size += chunk.length;
    if(size > MAX_BODY_BYTES) throw Object.assign(new Error("Pedido muito grande."), {status:413});
    chunks.push(chunk);
  }
  try{
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }catch{
    throw Object.assign(new Error("Corpo JSON inválido."), {status:400});
  }
}

function validatePayload(payload){
  if(!payload || typeof payload.system !== "string" || payload.system.length > 10_000){
    throw Object.assign(new Error("Instruções inválidas."), {status:400});
  }
  if(!Array.isArray(payload.messages) || payload.messages.length < 1 || payload.messages.length > 12){
    throw Object.assign(new Error("Mensagens inválidas."), {status:400});
  }
  const validMessages = payload.messages.every(message =>
    message && ["user", "assistant"].includes(message.role) &&
    typeof message.content === "string" && message.content.length <= 6_000
  );
  if(!validMessages){
    throw Object.assign(new Error("Formato de mensagem inválido."), {status:400});
  }
  if(!Number.isInteger(payload.max_tokens) || payload.max_tokens < 1 || payload.max_tokens > 700){
    throw Object.assign(new Error("Limite de resposta inválido."), {status:400});
  }
}

const server = http.createServer(async (request, response) => {
  if(request.headers.host !== `${HOST}:${PORT}`){
    sendJson(response, 403, {error:"Host não permitido."});
    return;
  }

  const origin = request.headers.origin;
  if(origin && origin !== `http://${HOST}:${PORT}`){
    sendJson(response, 403, {error:"Origem não permitida."});
    return;
  }

  const url = new URL(request.url, `http://${HOST}:${PORT}`);
  if(request.method === "GET" && url.pathname === "/api/ai/status"){
    sendJson(response, 200, {enabled:Boolean(process.env.ANTHROPIC_API_KEY)});
    return;
  }

  if(request.method === "POST" && url.pathname === "/api/ai"){
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if(!apiKey){
      sendJson(response, 503, {error:"IA sem configuração. Defina ANTHROPIC_API_KEY no .env e reinicie o servidor."});
      return;
    }

    try{
      const payload = await readJson(request);
      validatePayload(payload);
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key":apiKey,
          "anthropic-version":"2023-06-01"
        },
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:payload.max_tokens,
          system:payload.system,
          messages:payload.messages
        }),
        signal:AbortSignal.timeout(30_000)
      });
      const result = await upstream.json().catch(()=>({}));
      if(!upstream.ok){
        const status = upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502;
        sendJson(response, status, {error:result.error?.message || "A Anthropic não conseguiu processar o pedido."});
        return;
      }
      const text = (result.content || []).map(block=>block.text || "").join("\n").trim();
      sendJson(response, 200, {text});
    }catch(error){
      sendJson(response, error.status || 502, {error:error.status ? error.message : "Falha ao consultar o serviço de IA."});
    }
    return;
  }

  if(request.method === "GET" && ["/", "/index.html"].includes(url.pathname)){
    try{
      const html = await readFile(PAGE_PATH);
      response.writeHead(200, {
        "Content-Type":"text/html; charset=utf-8",
        "Cache-Control":"no-store",
        "X-Content-Type-Options":"nosniff",
        "Referrer-Policy":"no-referrer"
      });
      response.end(html);
    }catch{
      sendJson(response, 500, {error:"Não foi possível abrir index.html."});
    }
    return;
  }

  sendJson(response, 404, {error:"Rota não encontrada."});
});

server.listen(PORT, HOST, () => {
  console.log(`CISIA disponível em http://${HOST}:${PORT}`);
});