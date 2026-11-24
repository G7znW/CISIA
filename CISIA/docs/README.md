# CISIA — plataforma colaborativa de perguntas e respostas

Site em `public/` (HTML + CSS + JS puro, sem build), dados e login no **Supabase** e um servidor
Node local (`server.js`) que entrega o site com cabeçalhos de segurança e protege a chave da IA.
Não precisa de `npm install` (Node 20.6 ou mais novo).

## Estrutura (onde colocar cada arquivo)

```
CISIA/
├── server.js
├── .env.example
├── .gitignore
├── README.md
│
├── server/
│   ├── http.js
│   ├── static.js
│   ├── auth.js
│   └── ai-proxy.js
│
├── public/
│   ├── index.html
│   │
│   ├── css/
│   │   └── styles.css
│   │
│   ├── img/
│   │   └── logo.webp
│   │
│   ├── vendor/
│   │   └── supabase.js
│   │
│   └── js/
│       ├── constants.js
│       ├── utils.js
│       ├── state.js
│       ├── render.js
│       ├── main.js
│       ├── boot-error.js
│       │
│       ├── services/
│       │   ├── api.js
│       │   ├── session.js
│       │   ├── ai.js
│       │   ├── theme.js
│       │   └── notifications.js
│       │
│       ├── views/
│       │   ├── auth.js
│       │   ├── feed.js
│       │   ├── forms.js
│       │   ├── question.js
│       │   ├── profile.js
│       │   ├── messages.js
│       │   ├── admin.js
│       │   └── widgets.js
│       │
│       └── events/
│           ├── events.js
│           ├── events-auth.js
│           ├── events-content.js
│           ├── events-social.js
│           └── events-admin.js
│
├── database/
│   └── supabase-schema.sql
│
└── docs/
    ├── SEGURANCA.md
    ├── MUDANCAS.md
    └── modelo-original-mysql.txt
```

Regras para não dar erro:

- A pasta é `public` em **minúsculo**.
- `server.js` e a pasta `server/` ficam na **raiz**, nunca dentro de `public/` (tudo o que está em `public/` é entregue na internet).
- Existe um único `index.html`, dentro de `public/`.
- `vendor/supabase.js`: se não tiver o arquivo, baixe em https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js e salve com esse nome.

Onde mexer: **banco** → `database/` e `services/api.js` · **uma tela** → `views/` · **botão ou formulário** → `events/` · **visual** → `css/`.

## 1. Banco (Supabase)

1. Crie um projeto em https://supabase.com/dashboard.
2. **SQL Editor** → cole `database/supabase-schema.sql` → **Run**.
   **Use em um projeto novo e vazio do Supabase.** O script não apaga nada: se as tabelas já existirem, ele para com erro e não altera o banco. Como o projeto é novo, siga o passo 2 para trocar a URL e a chave no site.
3. **Authentication → Sign In / Providers → Email**: defina o tamanho mínimo da senha para **8 ou mais** e, se o seu plano tiver, ligue a proteção contra senhas vazadas. A regra do site é só um aviso; quem protege de verdade é essa configuração.
   Para uso real, deixe **Confirm email** ligado (o cadastro passa a exigir o link enviado por e-mail). Para a demonstração em aula, pode ficar desligado: o cadastro entra direto.

## 2. Conecte o site

Não existe arquivo de configuração no site: tudo vem do `.env`. Copie o modelo e preencha:

```powershell
Copy-Item .env.example .env
```

No `.env`, coloque `SUPABASE_URL` e `SUPABASE_ANON_KEY` do seu projeto (Supabase → Project Settings → API; use o botão de copiar, sem digitar). O servidor entrega esses dois valores ao site. A chave "anon/publishable" é pública por design; quem protege os dados é o banco.

## 3. Rode

```powershell
node --env-file=.env server.js
```

Abra http://127.0.0.1:3000 (não use Live Server: ele não entrega a configuração do `.env`).

Para ligar a IA (opcional), crie uma chave gratuita em https://console.groq.com/keys e coloque em `GROQ_API_KEY` no `.env` (só ali: nunca em código, chat ou print). Modelo padrão: `llama-3.1-8b-instant`; para respostas melhores, com limite diário menor, use `GROQ_MODEL=llama-3.3-70b-versatile`. O servidor confere se quem pergunta está logado e não banido, e limita 20 pedidos a cada 10 minutos por pessoa. Sem a chave, o botão do assistente fica oculto.

## 4. Conta de administrador

Cadastre-se pelo site e, no SQL Editor:

```sql
update public.profiles set is_admin = true
  where id = (select id from auth.users where email = 'seuemail@gmail.com');
```

O botão **Painel admin** aparece só para essas contas (banir/reativar, remover perguntas e publicações, ver e-mails).

## 5. Publicar na internet

O `server.js` é para uso local. Se hospedar em outro lugar (Netlify, Vercel, GitHub Pages…), configure lá os mesmos cabeçalhos de `server/static.js` (principalmente o `Content-Security-Policy`) e mantenha o proxy da IA em um backend seu, com a chave só no ambiente do servidor.

## Segurança

Resumo e riscos que sobram em `docs/SEGURANCA.md`. Se alguma chave de API já esteve em um arquivo enviado ao GitHub (ou foi colada em um chat), revogue-a e crie outra.
