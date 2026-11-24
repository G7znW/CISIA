# CISIA — histórico

## Versão atual (revisão de segurança + banco recriado)

- **Banco novo, só com o que o site usa** (`database/supabase-schema.sql`, para um projeto Supabase vazio): `profiles`, `questions`, `answers`, `question_ratings`, `answer_ratings`, `projects`, `project_reactions` e `messages`, mais 7 funções (`is_admin`, `is_banned`, `register_visit`, `admin_set_banned`, `admin_user_emails`, `create_profile` e o gatilho de cadastro). O script não apaga nada. Ficaram de fora as tabelas do modelo original que o site nunca usou (usuario, postagem, midia, comentario, seguidor, mensagem, grupo, participacao_grupo, notificacao, hashtag, postagem_hashtag), anexos, e-mail em perfis, idade e estado civil.
- **Identidade por id, não por e-mail**: autor, remetente, notas e curtidas usam o id da conta; o nome vem de `profiles`. O navegador não envia mais autor nenhum.
- **Tudo exige login**: visitantes não leem nada.
- **Site**: links só `http(s)`, tamanhos máximos nos campos, mensagens de erro genéricas, estrelas escondidas no próprio conteúdo, sequência de dias calculada pelo banco.
- **Servidor**: arquivos colocados nas pastas certas (`server.js` e `server/` estavam dentro de `public/js/`, e `Public` ≠ `public`), CSP e cabeçalhos de segurança, biblioteca do Supabase servida localmente, IA exige login válido, recusa banidos e tem limite de uso.
- **Configuração só no `.env`**: o arquivo `public/js/config.js` foi removido; o `server.js` monta esse script a partir de `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
- **IA com Groq** (plano gratuito) no lugar da Anthropic: `server/ai-proxy.js` chama a API da Groq; variáveis `GROQ_API_KEY` e `GROQ_MODEL` no `.env`.
- Detalhes e justificativas em `docs/SEGURANCA.md`.

## Versões anteriores

- Site ligado ao Supabase (login por Supabase Auth, perguntas, respostas, notas, publicações, mensagens, perfil e banimento); `index.html` único dividido em CSS + JS por assunto.
- Remoção de conteúdo pelo admin passou a apagar de verdade; admin definido por `profiles.is_admin` (a senha fixa `cisia-admin` foi removida); proibido avaliar o próprio conteúdo.

## Pendências

- [ ] Testar o fluxo completo em um projeto Supabase real (o SQL foi testado em Postgres 16 local com os papéis do Supabase simulados; o site, em jsdom com um Supabase simulado).
- [ ] Anexos de arquivo (hoje só links).
- [ ] Denúncia/bloqueio de mensagens e limite de criação de conteúdo (ver riscos em `SEGURANCA.md`).
- [ ] Paginação quando passar de 1000 registros por tabela (limite padrão do Supabase).
