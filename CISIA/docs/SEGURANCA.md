# CISIA — revisão de segurança (S-SDLC)

Revisão do código e do banco usando as regras da palestra "Programando com segurança": não confiar no
que o usuário digita (validar no servidor), segredos fora do código, erro genérico, cada um só vê o que é
seu, privilégio mínimo e o modelo STRIDE.

## O que foi encontrado e o que mudou

| # | Falha | Regra / STRIDE | Correção |
|---|---|---|---|
| 1 | Qualquer visitante, só com a chave pública, lia **todos os perfis** (e-mail, idade, estado civil, empresa, escola) e todo o conteúdo: as regras do banco eram `using (true)` sem exigir login. Boa parte dos usuários são menores de idade. | Information Disclosure · cada um só vê o que é seu | Visitante (`anon`) não tem acesso a nenhuma tabela. Perfis não têm e-mail; `idade` e `estado civil` deixaram de ser coletados. E-mails só no painel admin, por função que confere `is_admin`. |
| 2 | O navegador enviava `author_name`, `author_email`, `from_name`: dava para publicar ou mandar mensagem **com o nome de outra pessoa**. | Spoofing | `author_id`/`from_id` assumem `auth.uid()` no banco e a regra recusa qualquer outro valor; nomes vêm de `profiles`. O site não envia mais autor. |
| 3 | Link de publicação com `javascript:` virava `href` clicável (XSS armazenado): `escapeHtml` não bloqueia isso. | Nunca confie no que o usuário digita | `safeUrl()` no site e `CHECK` no banco aceitam só `http(s)://`; links abrem com `noopener noreferrer`. |
| 4 | Notas e curtidas guardadas como listas de **e-mails** em colunas JSON, legíveis por todos. | Information Disclosure | Tabelas próprias por id de usuário, 1 nota por pessoa, não vale a própria; sem RPC de `security definer` para isso. |
| 5 | Sequência de dias (selos) calculada e gravada pelo navegador: dava para forjar. | Tampering | `register_visit()` calcula pela data do servidor (fuso de São Paulo); a coluna não é gravável pelo navegador. |
| 6 | Atualização de perfil liberada em todas as colunas, protegida só por gatilho. | Privilégio mínimo | `GRANT` por coluna: o navegador só grava `bio`, `company` e `school`. Ban e admin: só por funções (`admin_set_banned` recusa banir a si mesmo ou outro admin). |
| 7 | Bucket público de anexos em que qualquer conta enviava qualquer arquivo — e o site nem usava. | Superfície desnecessária | Removido, junto com as colunas de anexo. |
| 8 | Proxy da IA aberto: sem login, sem limite (gasto da chave), texto de outro usuário dentro das instruções (prompt injection), erro do provedor repassado ao navegador. | Denial of Service · Elevation of Privilege | Exige login válido e conta não banida (conferidos no Supabase pelo servidor), 20 pedidos/10 min por pessoa, instruções fixas com a pergunta enviada como dado, erro genérico. A IA só liga se a conferência de login estiver configurada. |
| 9 | Erros mostravam texto do banco e dicas internas ("rode o schema", "desative Confirm email"). | Regra 4: erro não conta segredo | Mensagens genéricas; detalhes só no console. |
| 10 | `server.js` e `server/` dentro de `public/js/` (servidos para qualquer um); caminhos quebrados (`Public` ≠ `public`). | Information Disclosure | Reorganizado; só `public/` é entregue (testado: `../.env` e `/server/*.js` dão 404). |
| 11 | Sem CSP; script inline e biblioteca vinda de CDN de terceiros. | Defesa em profundidade | CSP (`script-src 'self'`), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; Supabase servido localmente; script inline virou arquivo e não usa mais `innerHTML` com texto de erro. |
| 12 | Tamanhos sem limite, listas só no JavaScript, senha mínima de 6. | Validar no servidor | `CHECK` no banco (tamanhos, níveis, disciplinas, tipos, notas 1–5) e `maxlength` no site; senha mínima de 8 no site. |
| 13 | Faltavam `.gitignore` e `.env.example` no projeto: risco de subir o `.env` ao GitHub. | Regra 3: segredo fora do código | Criados. |
| 14 | Cor do tema lida do `localStorage` sem validar. | Validar tudo | Só aceita `#rrggbb`. |

Já estavam certos e foram mantidos: texto de usuário sempre passa por `escapeHtml`, mensagem de login
genérica ("e-mail ou senha incorretos"), senhas só no Supabase Auth (hash), chave da IA só no servidor,
chave pública do Supabase no site (é assim por design), bloqueio de host e origem no servidor.

## Riscos que continuam (decisões suas)

- **Cadastro sem confirmação de e-mail**: qualquer pessoa cria conta com qualquer e-mail, e "Professor" é só um rótulo escolhido no cadastro. Com **Confirm email** ligado isso melhora e a mensagem "já existe uma conta" deixa de revelar e-mails cadastrados.
- **Mensagens diretas**: qualquer conta logada pode escrever para qualquer outra (inclusive menores). Faltam denúncia/bloqueio.
- **Spam**: o banco limita tamanho, não frequência de publicação. O Supabase já limita as rotas de login.
- **Sessão no `localStorage`** (padrão do Supabase): a CSP reduz o risco de roubo por XSS, mas não elimina.
- **CSP só vale quando o site é entregue pelo `server.js`**; ao hospedar em outro lugar, configure os cabeçalhos lá.
- **Google Fonts** é o único recurso de terceiros que ainda carrega (CSS e fontes).
- **O assistente de IA envia o texto digitado nele (e a pergunta aberta) ao provedor (Groq)**: confira a política de dados do provedor antes de abrir o site a menores; o limite do plano gratuito vale para toda a conta da Groq, não por pessoa.
- Dados pessoais de menores (nome, nível de ensino, bio): vale ter política de privacidade e, se for abrir ao público, autorização dos responsáveis (LGPD, art. 14).

## Como foi testado

- **Banco**: Postgres 16 local com os papéis do Supabase simulados (`anon`, `authenticated`, `auth.uid()`): 60 verificações de acesso passaram, entre elas: visitante bloqueado, autor forjado recusado, nota na própria pergunta/resposta recusada, `is_admin`/`banned`/`streak` não graváveis pelo usuário, `javascript:` recusado, conversa privada entre duas pessoas, banido sem acesso, admin sem poder banir a si mesmo nem outro admin; o script rodou duas vezes sem erro.
- **Servidor**: CSP e cabeçalhos presentes; `Host`/`Origin` inválidos, caminhos fora de `public/` e IA sem token, com token falso, de banido e acima do limite foram recusados (Supabase simulado).
- **Site**: 30 verificações em jsdom com Supabase simulado: telas renderizam sem erro, XSS no título e no bio ficam como texto, o navegador não envia autor/remetente/`user_id`, estrelas somem no próprio conteúdo, painel admin só para admin.
- **Não testado**: um projeto Supabase real (PostgREST, Realtime e e-mails de confirmação).
