# CISIA — plataforma colaborativa de perguntas e respostas

A interface da CISIA fica em `public/index.html`, os dados e o login usam o Supabase,
e um pequeno servidor Node local mantém a chave da Anthropic fora do navegador.
Não precisa de npm, MySQL nem XAMPP.

## 1. Crie o backend (Supabase) — só uma vez, ~5 minutos

1. Crie uma conta grátis em https://supabase.com/dashboard e um novo projeto.
2. No menu lateral, abra **SQL Editor**, cole o conteúdo inteiro do arquivo
   `database/supabase-schema.sql` e clique em **Run**. Isso cria as tabelas
   de perguntas, respostas, projetos, perfis/login, o bucket de anexos e as regras
   de permissão — tudo de uma vez.
3. Em **Authentication → Providers → Email**, deixe habilitado (padrão). Se quiser
   testar rápido sem confirmar e-mail a cada cadastro, desmarque "Confirm email"
   ali mesmo (dá pra ligar de volta depois, se for publicar para outras pessoas).
4. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

## 2. Configure o `public/index.html`

> **Atenção:** a versão atual do `public/index.html` ainda não usa o Supabase — as
> constantes abaixo não existem nele. Veja o estado real e as pendências em
> `docs/MUDANCAS.md`.

Abra `public/index.html` num editor de texto, ache estas linhas perto do topo:

```js
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA-ANON-KEY-AQUI";
```

Cole a URL e a chave que você copiou no passo anterior. Salve o arquivo.

## 3. Abra e use

Para usar o Supabase sem os recursos de IA, abrir `public/index.html` diretamente ainda
funciona. Para habilitar a IA com a chave protegida, inicie o servidor local na
pasta do projeto:

```powershell
Copy-Item .env.example .env
```

Abra `.env`, substitua `COLE_A_CHAVE_NOVA_AQUI` por uma chave nova da Anthropic e
inicie o servidor:

```powershell
node --env-file=.env server.js
```

Depois acesse http://127.0.0.1:3000. Mantenha esse terminal aberto enquanto usa
o app. O servidor escuta apenas na própria máquina; não publique a chave nem o
arquivo `.env`.

## 4. Torne sua conta administradora (opcional)

Cadastre-se normalmente pela tela de login do próprio CISIA primeiro. Depois,
no **SQL Editor** do Supabase, rode (trocando o e-mail pelo seu):

```sql
update public.profiles set is_admin = true where email = 'seuemail@gmail.com';
```

A partir daí, ao logar com essa conta aparece um link **"administração"** no topo
do app, com a lista de usuários (banir/reativar) e de conteúdo (remover perguntas
e projetos).

## 5. IA (opcional)

O botão de resposta rápida e o assistente enviam pedidos ao endpoint local
`/api/ai`. `server.js` lê `ANTHROPIC_API_KEY` do `.env` e chama a API da Anthropic;
a chave não é enviada ao navegador. Sem `.env` configurado, os recursos de IA
permanecem desativados. A chave fornecida anteriormente foi exposta no código e
na conversa: revogue-a na Anthropic e use uma chave nova.

## O que mudou (para quem já usava a versão com server.js)

- **Login/cadastro**: agora é feito pelo Supabase Auth (e-mail + senha), direto
  no navegador. A senha nunca passa por um servidor seu.
- **Perguntas, respostas, projetos, avaliações, banimento**: tudo vira linhas em
  tabelas Postgres no Supabase, protegidas por regras (Row Level Security) que
  substituem as checagens que o `server.js` fazia.
- **Tempo real**: o WebSocket próprio virou o Supabase Realtime — quando alguém
  posta ou avalia algo, todo mundo com a página aberta vê na hora, do mesmo jeito
  de antes.
- **Anexos**: em vez de salvar em uma pasta `uploads/` no servidor, os arquivos
  vão para o Supabase Storage (bucket público `attachments`).
- **Administração**: deixou de ser uma senha única compartilhada
  (`ADMIN_PASSWORD`) e virou uma marcação (`is_admin`) na própria conta — veja o
  passo 4 acima.
- `database/Code-BD-CISIA.txt` foi o modelo relacional original (útil como documentação/
  referência para o artigo do TCC), mas não é mais executado pelo app — quem
  roda de verdade agora é o `database/supabase-schema.sql`.

## Estrutura do projeto

```
CISIA/
├── server.js                servidor local e proxy da API Anthropic
├── public/
│   └── index.html           interface e lógica do app
├── database/
│   ├── supabase-schema.sql  script único para criar tudo no Supabase (rode 1x)
│   └── Code-BD-CISIA.txt    modelo relacional original (documentação/TCC)
├── docs/
│   └── MUDANCAS.md          histórico de mudanças (versão antiga com data.json/WebSocket)
├── .env.example             modelo da configuração local da chave
├── .gitignore               impede versionar o arquivo .env
└── README.md
```

## Problemas comuns

**"Could not find the table 'public.profiles' in the schema cache"** — isso
acontecia porque o SQL Editor do Supabase roda o script inteiro como uma única
transação: se qualquer linha falhasse (mesmo a última, sobre tempo real), o
Postgres desfazia a criação de todas as tabelas anteriores, mesmo que o editor
tivesse mostrado "sucesso" no meio do caminho. Já corrigi isso no
`database/supabase-schema.sql` — a parte de tempo real agora roda isolada e nunca derruba
o resto. Esse arquivo também ficou seguro de rodar mais de uma vez: se algo der
errado, pode colar e rodar de novo sem medo (mensagens do tipo "already exists,
skipping" durante uma nova execução são normais e esperadas).

## Limitações desta versão

- A chave pública do Supabase (`anon key`) fica visível no código-fonte — isso é
  esperado e seguro por design: quem protege os dados são as regras (RLS) no
  banco, não o sigilo dessa chave.
- O proxy de IA está configurado para uso local. Para publicar o app, hospede o
  servidor em um backend seguro e restrinja acesso, uso e custos da API.
- Testei o schema SQL inteiro (cadastro, perguntas, respostas, avaliação,
  banimento, promoção a admin) contra um Postgres real antes de entregar, mas não
  consegui testar contra um projeto Supabase de verdade a partir daqui — vale
  conferir com calma no seu projeto antes de usar em produção/apresentar no TCC.
