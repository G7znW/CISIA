# CISIA — o que foi feito e modificado

Este documento resume a revisão completa feita no projeto: o que foi testado, os bugs reais
encontrados (e corrigidos) e as melhorias de funcionalidade adicionadas. Nada da identidade visual
ou da experiência original foi alterado — o objetivo foi deixar o que já existia mais robusto e
adicionar recursos que fazem sentido para uma plataforma de perguntas e respostas.

## 1. Como validei o projeto

- Instalei as dependências (`npm install`) e rodei o servidor de verdade (`node server.js`).
- Testei todas as rotas da API com `curl` (perguntas, respostas, avaliações, IA), incluindo casos
  de erro (campos vazios, IDs inexistentes, JSON malformado, avaliação da própria resposta, notas
  fora do intervalo 1–5).
- Testei o WebSocket com um cliente separado em Node.js para confirmar que o broadcast de
  perguntas/respostas/avaliações chega corretamente a quem está conectado.
- Revisei o front-end (`public/index.html`) linha a linha, simulando os principais fluxos de uso
  manualmente no código.

O projeto **já funcionava** no sentido de "sobe e responde requisições" — mas encontrei bugs reais
que afetavam robustez e experiência, descritos abaixo.

## 2. Bugs corrigidos

### No servidor (`server.js`)

1. **Campos só com espaços em branco eram aceitos.** Era possível criar uma pergunta com título,
   corpo e autor contendo apenas espaços (`"   "`), porque a validação checava apenas se o campo
   existia, não se tinha conteúdo real depois de removido o espaço. Isso também acontecia no envio
   de respostas. Agora todo campo de texto passa por `trim()` antes de ser validado e salvo.

2. **Disciplina e nível de ensino não eram validados no servidor.** O front-end só oferece opções
   de uma lista fixa, mas a API aceitava qualquer string enviada diretamente (por exemplo, via
   `curl` ou outra ferramenta), o que podia gerar perguntas com disciplina/nível inventados e quebrar
   os filtros da tela. Agora o servidor valida contra a mesma lista usada no front-end.

3. **JSON malformado na requisição derrubava uma página de erro do Express com stack trace.**
   Enviar um corpo de requisição inválido (JSON quebrado) fazia o Express devolver uma página HTML
   de erro padrão, expondo caminhos internos do servidor — além de não ser algo que o front-end
   sabe interpretar. Agora existe um tratador de erros dedicado que devolve `{"error": "..."}` com
   status 400, de forma limpa e sem vazar detalhes internos.

4. **Nenhum tratamento de erro genérico / rota de API inexistente.** Qualquer exceção não prevista
   podia derrubar a resposta de forma inconsistente, e chamar uma rota `/api/...` que não existe
   simplesmente devolvia o `index.html` (comportamento confuso). Agora há um handler de erro
   genérico (loga no servidor e devolve JSON com status 500) e um 404 dedicado para `/api/*`.

5. **Gravação em disco sem tratamento de falha.** Se o `data.json` não pudesse ser salvo (disco
   cheio, permissão negada etc.), o servidor derrubava o processo inteiro com uma exceção não
   tratada. Agora esse erro é capturado e apenas registrado no log, sem tirar o servidor do ar.

6. **Chamada à API da Anthropic sem tempo limite.** Se a API demorasse a responder, a requisição
   do usuário ficava pendurada indefinidamente. Agora há um timeout de 30 segundos, com mensagem de
   erro clara para quem estava esperando a resposta da IA.

### No front-end (`public/index.html`)

7. **Condição de corrida podia duplicar pergunta/resposta na tela de quem publicou.** O servidor
   transmite a atualização via WebSocket *antes* de responder à requisição HTTP original. Em alguns
   casos essa atualização chegava pelo WebSocket antes da resposta do `fetch` terminar — e como o
   código também inseria o item manualmente ao receber a resposta HTTP, o item podia aparecer
   duplicado na tela de quem criou a pergunta/resposta. Corrigido: agora, antes de inserir
   localmente, o código verifica se o item já existe (por `id`).

8. **Formulários aceitavam texto só com espaço em branco.** O atributo HTML `required` considera
   um campo "preenchido" mesmo se só tiver espaços, então o mesmo problema de campos vazios do item
   1 também acontecia direto pela interface, não só via API. Agora o front-end valida com `trim()`
   antes de enviar e mostra uma mensagem de erro clara em vez de simplesmente não fazer nada.

9. **Clique duplo nos botões de publicar podia gerar envios repetidos.** Nada impedia que a pessoa
   clicasse duas vezes rápido em "Publicar pergunta" ou "Publicar resposta" enquanto a requisição
   ainda estava em andamento. Agora os botões ficam desabilitados (com texto "Publicando…") durante
   o envio.

10. **Botão "Resposta rápida com IA" não informava quando a IA estava indisponível.** Sem a chave
    configurada no `.env`, clicar no botão sempre resultava em erro — mas isso só era descoberto
    depois de clicar. Agora o front-end consulta o servidor (`GET /api/config`) ao carregar a
    página e desabilita o botão com uma dica explicando o motivo, se a IA não estiver configurada.

## 3. Melhorias de funcionalidade adicionadas

- **Busca por palavra-chave** no feed de perguntas (procura em título, detalhes e autor).
- **Ordenação** do feed: mais recentes, mais respondidas, ou somente as que ainda não têm resposta
  — útil para quem quer ajudar respondendo dúvidas em aberto.
- **Limite de uso do botão de IA** (1 chamada a cada 8 segundos por IP) no servidor, para evitar
  cliques repetidos gerando custo desnecessário na API da Anthropic.
- **Encerramento limpo do servidor** (`Ctrl+C`): agora ele fecha as conexões WebSocket e a porta
  corretamente antes de sair, evitando o clássico erro de "porta já em uso" ao reiniciar.
- **`maxlength` nos campos de texto** do front-end alinhado com os limites reais do servidor
  (2000 caracteres para detalhes da pergunta, 3000 para respostas), evitando que a pessoa digite
  um texto longo e ele seja cortado sem aviso ao salvar.
- **Tecla Esc fecha o modal** de nova pergunta.
- **Arquivo `.gitignore`** — não existia no projeto original, então `node_modules/`, o `.env` (com
  a chave da API) e o `data.json` (dados dos usuários) corriam o risco de serem versionados por
  engano caso o projeto fosse colocado num repositório Git.

## 4. O que **não** foi alterado

- O visual, as cores, as fontes e o layout continuam exatamente os mesmos.
- A estrutura de dados (`data.json`) e o formato das mensagens do WebSocket não mudaram — nenhuma
  migração é necessária.
- O fluxo de uso (entrar com nome, perguntar, responder, avaliar) é o mesmo; as mudanças são
  correções por trás da cena e acréscimos que não interferem no que já funcionava.

## 6. Assistente CISIA (novo — chat de ajuda geral)

Você pediu uma API que respondesse dúvidas do usuário e ajudasse com qualquer problema, e perguntou se
valia a pena construir algo do zero ou usar uma API pronta. A resposta curta: **usar uma API pronta**
— treinar e manter um modelo de IA próprio exigiria uma base de dados enorme, servidores de GPU e meses
de trabalho, para no fim ficar pior que uma API já madura. O projeto já usava a API da Anthropic (Claude)
para o botão "Resposta rápida com IA"; a solução foi generalizar essa mesma integração.

**O que foi adicionado:**

- Um botão flutuante (🤖) no canto da tela, disponível em qualquer página do app.
- Ao clicar, abre um painel de chat onde dá pra perguntar qualquer coisa — dúvida de matéria, dúvida
  sobre como usar a plataforma, ou pedir ajuda para organizar uma pergunta antes de publicar.
- A conversa mantém contexto (as últimas mensagens são reenviadas a cada pergunta nova), então dá pra
  fazer perguntas de acompanhamento ("e se for negativo?", "pode dar um exemplo?") sem repetir tudo.
- No servidor, foi criada a rota `POST /api/assistant`, separada da `POST /api/quick-answer` já existente
  (elas têm propósitos diferentes: uma é um chat geral, a outra gera um rascunho de resposta para uma
  pergunta específica dentro da plataforma). As duas agora compartilham a mesma função de chamada à API
  da Anthropic (`callAnthropic`), evitando duplicar código.
- Limite de uso: no máximo 1 mensagem a cada 3 segundos por IP no assistente (mais permissivo que o
  quick-answer, que é de 8 segundos, já que uma conversa natural precisa de respostas mais ágeis).
- Se a chave da API não estiver configurada no servidor, o painel abre normalmente e mostra um aviso
  claro — em vez de deixar o botão todo desabilitado sem explicação.
- A conversa fica só na memória do navegador (não é salva no servidor nem compartilhada entre pessoas);
  se a página for recarregada, o histórico do chat reinicia.

**Como testar:** com o servidor rodando e uma `ANTHROPIC_API_KEY` válida no `.env`, clique no ícone 🤖
no canto inferior direito e mande uma pergunta.

## 7. Como rodar

Igual ao processo original, sem nenhum passo novo:

```bash
npm install
cp .env.example .env   # opcional, só para habilitar a resposta rápida com IA
npm start
```
