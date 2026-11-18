[README.md](https://github.com/user-attachments/files/35038359/README.md)
# CISIA — plataforma colaborativa de perguntas e respostas

Interface em `public/` (HTML + CSS + JS puro, sem build), dados e login no **Supabase**,
e um servidor Node local (`server.js`) que entrega a página e protege a chave da IA.
Não precisa de `npm install`.

## Estrutura

```
CISIA/
├── server.js                 inicia o servidor local
├── server/
│   ├── http.js               utilitários (JSON, erros)
│   ├── ai-proxy.js           proxy da API da Anthropic (/api/ai)
│   └── static.js             entrega os arquivos de public/
├── public/
│   ├── index.html            só a "casca": carrega CSS e scripts
│   ├── css/styles.css
│   ├── img/logo.webp
│   └── js/
│       ├── config.js         URL e chave do Supabase  ← edite aqui
│       ├── constants.js      níveis, disciplinas, papéis
│       ├── utils.js          escapeHtml, timeAgo, toast
│       ├── state.js          estado da tela + cache + pontuação/selos
│       ├── services/
│       │   ├── api.js        TODO acesso ao Supabase (leitura, escrita, tempo real)
│       │   ├── session.js    login, cadastro, logout, sequência de dias
│       │   ├── notifications.js
│       │   ├── ai.js         assistente de IA (chama /api/ai)
│       │   └── theme.js
│       ├── views/            uma tela por arquivo (auth, feed, forms, question,
│       │                     admin, profile, messages) + widgets flutuantes
│       ├── events/           eventos agrupados por assunto
│       ├── render.js         desenha a página
│       └── main.js           inicialização
├── database/
│   ├── supabase-schema.sql   cria todo o banco no Supabase (pode rodar mais de uma vez)
│   └── Code-BD-CISIA.txt     modelo relacional original (documentação do TCC)
├── docs/MUDANCAS.md
├── .env.example
└── .gitignore
```

Onde mexer: **dados/banco** → `services/api.js` · **uma tela** → `views/` · **um botão ou
formulário** → `events/` · **visual** → `css/styles.css`.

## 1. Banco (Supabase) — uma vez só

1. Crie um projeto em https://supabase.com/dashboard.
2. **SQL Editor** → cole o conteúdo de `database/supabase-schema.sql` → **Run**.
   (Já rodou a versão antiga? Rode de novo: ele só acrescenta o que falta.)
3. **Authentication → Providers → Email**: desmarque **"Confirm email"** e salve. O site não usa verificação de e-mail; com ela ligada o cadastro não entra.
4. **Project Settings → API**: copie a **Project URL** e a **anon public key**.

## 2. Conecte o site

Edite `public/js/config.js`:

```js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-ANON-KEY-AQUI';
```

## 3. Rode

```powershell
node server.js
```

Abra http://127.0.0.1:3000. Para ligar a IA (opcional):

```powershell
Copy-Item .env.example .env      # coloque sua chave da Anthropic no .env
node --env-file=.env server.js
```

Sem o `.env`, o botão do assistente fica oculto. Sem o servidor, também dá para abrir
`public/index.html` direto no navegador (só sem IA).

## 4. Conta de administrador

Cadastre-se pelo site e, no SQL Editor:

```sql
update public.profiles set is_admin = true where email = 'seuemail@gmail.com';
```

O botão **Painel admin** aparece só para essas contas (banir/reativar usuários, remover
perguntas e publicações). A senha fixa antiga foi removida.

## Como os dados fluem

`views` leem de `cache` → `cache` é preenchido por `Api.refresh()` (converte as colunas do banco
para o formato da interface) → mudanças de qualquer pessoa chegam pelo Supabase Realtime e a tela
se atualiza. Notas, curtidas e "lida" passam por funções do banco (`rate_answer`, `rate_question`,
`toggle_project_reaction`, `mark_messages_read`), então o navegador não consegue alterar outros campos.

## Limitações

- A `anon key` fica visível no navegador — é assim por design; a proteção é o RLS do banco.
- As leituras trazem até 1000 linhas por tabela (limite padrão do Supabase). Para mais, paginar.
- Perfis (incluindo e-mail) são legíveis por qualquer visitante — regra herdada do schema original.
- O proxy de IA é só para uso local. Para publicar, hospede em backend seguro com limite de uso.
- Se você usava a chave da Anthropic que foi exposta antes, revogue-a e use uma nova.
