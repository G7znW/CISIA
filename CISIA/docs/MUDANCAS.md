# CISIA — histórico e estado atual

## Estado atual

| Peça | Situação |
|---|---|
| Interface (`public/`) | Dividida em CSS + ~25 arquivos JS. Usa Supabase para login, dados e tempo real. |
| Banco (`database/supabase-schema.sql`) | Tabelas `profiles`, `questions`, `answers`, `projects`, `messages`, bucket `attachments`, RLS, funções de nota/curtida/leitura e Realtime. |
| Servidor (`server.js` + `server/`) | Entrega `public/` e faz o proxy `/api/ai`. Aceita `127.0.0.1` e `localhost`. |
| IA | O assistente usa `POST /api/ai` (chave só no `.env`). |

## Mudanças desta versão

- Site ligado ao Supabase: login por Supabase Auth (a senha em hash SHA-256 no navegador foi removida), perguntas, respostas, avaliações, publicações, curtidas, mensagens, perfil e banimento.
- `index.html` (85 KB, tudo junto) → casca de 40 linhas + `css/` + `js/` por assunto; o logo virou `img/logo.webp`.
- Remoção de conteúdo pelo admin agora apaga de verdade (antes só marcava `removido`).
- Admin = `profiles.is_admin`; `ADMIN_PASSWORD` removida.
- Schema ampliado: perfil (papel, bio, empresa, escola, idade, estado civil, sequência), nota em perguntas, tipo/link/documento/curtidas em publicações, tabela `messages`.
- Passa a ser proibido avaliar a própria pergunta (antes dava para inflar a própria pontuação).
- Servidor dividido em `server/http.js`, `ai.js`, `static.js`, com proteção contra acesso fora de `public/`.

## Pendências

- [ ] Testar com um projeto Supabase real (o schema foi testado num Postgres local e a interface com um Supabase simulado).
- [ ] Anexos: o bucket existe, mas a interface ainda não envia arquivos (só links).
- [ ] Revogar a chave antiga da Anthropic.
- [ ] Paginação quando passar de 1000 registros por tabela.
- [ ] Futuro: levar as demais tabelas de `Code-BD-CISIA.txt` (curtidas, seguidores, grupos, hashtags) conforme novas mecânicas.
