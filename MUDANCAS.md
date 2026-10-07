# CISIA — histórico e estado atual do projeto

## Estado atual (resumo)

O projeto tem três peças, e hoje elas **ainda não estão ligadas entre si**:

| Peça | Arquivo | Situação |
|---|---|---|
| Interface | `public/index.html` | Funciona sozinha. Guarda os dados via capability `db` do ambiente Claude ou, se ela não existir, em `localStorage` (por navegador). Usa a capability `sample` para o assistente de IA. **Não usa Supabase nem o `server.js`.** |
| Servidor local | `server.js` | Serve o `index.html` e expõe `GET /api/ai/status` e `POST /api/ai` (proxy da API da Anthropic, chave no `.env`). Escuta só em `127.0.0.1`. |
| Banco | `database/supabase-schema.sql` | Schema Supabase (Postgres) pronto: `profiles`, `questions`, `answers`, `projects`, bucket `attachments`, regras RLS, função `rate_answer` e Realtime. Ainda não é consumido pela interface. |

`database/Code-BD-CISIA.txt` é o modelo relacional original (MySQL, estilo rede social), mantido apenas como documentação para o TCC.

## Funcionalidades da interface

- Cadastro/login (papéis Aluno e Professor; níveis de ensino e disciplinas fixos)
- Feed de perguntas, respostas e avaliação das respostas
- Feed de projetos
- Ranking, pontuação, sequência (streak) e badges
- Mensagens diretas entre usuários e notificações
- Perfil e tema de cor personalizável
- Painel de administração (banir/reativar usuários, remover conteúdo)
- Assistente de IA (botão flutuante) e resposta rápida dentro de uma pergunta

## Evolução do projeto

1. **Versão original**: Node/Express + WebSocket, dados em `data.json`, banco MySQL planejado (`Code-BD-CISIA.txt`).
2. **Revisão do servidor**: validação com `trim()`, tratamento de JSON inválido e erros, timeout de 30 s na chamada à Anthropic, limite de uso da IA, `.gitignore` protegendo `.env`.
3. **Migração planejada para Supabase**: criação de `supabase-schema.sql` (login via Supabase Auth, RLS no lugar das checagens do servidor, Realtime no lugar do WebSocket, Storage para anexos).
4. **Servidor reduzido a proxy de IA**: o `server.js` atual só serve a página e protege a chave da Anthropic.
5. **Organização de pastas**: arquivos separados em `public/`, `database/` e `docs/`; o HTML foi renomeado para `index.html` e o `server.js` passou a lê-lo de `public/`.

## Pendências

- [ ] Ligar `public/index.html` ao Supabase (Auth, tabelas, Realtime, Storage). Hoje o README cita as constantes `SUPABASE_URL`/`SUPABASE_ANON_KEY`, mas elas não existem no HTML.
- [ ] Trocar as chamadas `sample` por chamadas a `POST /api/ai` do `server.js` (a chave da Anthropic fica no servidor).
- [ ] Remover a senha de administrador fixa no código (`ADMIN_PASSWORD` no HTML) e usar `profiles.is_admin` no Supabase.
- [ ] Revogar a chave da Anthropic que foi exposta anteriormente e usar uma nova no `.env`.
- [ ] Testar o schema em um projeto Supabase real.

## Como rodar hoje

```powershell
Copy-Item .env.example .env        # opcional: só para o proxy de IA
node --env-file=.env server.js
```

Depois acesse http://127.0.0.1:3000.
