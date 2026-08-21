# Diário da Cefaléia — web

Port do app iOS (`../Diário-da-Cefaléia`) para web, com login e histórico por usuário.
Vite + React, Supabase (Postgres + Auth), deploy estático na Vercel. Sem backend próprio:
o browser fala direto com o Supabase e a **RLS** é a fronteira de confiança.

## Setup

**1. Projeto no Supabase** → SQL Editor → colar `supabase/schema.sql` e rodar.
Bancos que já existiam rodam, em vez do schema, as migrações na ordem:
`migracao-paciente.sql` (cria `pacientes` e move as crises existentes pra um "Paciente 1"),
`migracao-rls-paciente.sql` (fecha as policies — ver **Segurança**),
`migracao-relatorio-publico.sql` (a tabela `relatorios` e a função do link do médico) e
`migracao-sou-eu.sql` (a marca de qual paciente é o dono da conta).

**2. Providers** (Authentication → Providers): e-mail+senha, Google, Apple.
Em Authentication → URL Configuration, as Redirect URLs devem ter a URL de produção
(senão o OAuth volta para `localhost` em produção) e **só** ela mais `localhost` — a
lista é o que impede um redirect aberto, já que o `redirectTo` vem do cliente.

**3. Env** — copiar `.env.local.example` para `.env.local` e preencher com
Project Settings → API. A `anon key` é pública por design; quem protege é a RLS.
A `service_role key` não entra neste projeto em lugar nenhum.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # lógica do relatório
npm run build
```

**4. Deploy** — `vercel`, com as duas env vars `VITE_SUPABASE_*` no projeto.
Os headers de segurança (CSP, HSTS, `nosniff`) estão em `vercel.json`. O `style-src`
carrega `'unsafe-inline'` porque a UI inteira é estilo inline do React — tirar isso
seria reescrever a UI em CSS.

## Estrutura

| | |
|---|---|
| `src/report.js` | análise de gatilhos, insight, estatísticas, texto do compartilhamento — única lógica não-trivial, coberta por `test/` |
| `src/tokens.js` | cores/gradientes copiados verbatim do protótipo do handoff |
| `src/format.js` | datas e durações pt-BR (espelha `Components.swift`) |
| `src/useCrises.js` | leitura/escrita no Supabase |
| `src/Publico.jsx` | o relatório em `/r/<token>`, aberto por quem não tem conta |
| `src/Pacientes.jsx` | hook dos pacientes, form e barra de troca |
| `src/screens/` | as 4 telas do telefone |
| `src/Painel.jsx` | o dashboard de desktop (≥1024px), com as mesmas telas em coluna |
| `src/useDesktop.js` | o breakpoint, via `matchMedia` |
| `src/screens/Ajustes.tsx` | a conta: nome, quem é você, senha, sair e excluir |
| `src/conta.ts` | o que dá para saber do usuário sem perguntar ao servidor |
| `src/ui.jsx` | card de vidro, segmented, chip, botão, campo, ação secundária |

Estilos são inline, copiados do protótipo `design_handoff_diario_cefaleia/`. Não
"aproximar" sombras e gradientes daqui — é o que mantém a paridade com o iOS.

## Modelo

Duas tabelas: um responsável tem N `pacientes` (os filhos), e toda linha de `crises`
pertence a um paciente. O paciente selecionado é o filtro de tudo que o app mostra.

O responsável também pode ser um deles: `pacientes.sou_eu` marca qual dos N é o dono da
conta (um por conta, por índice único parcial). É o que permite o adulto que registra as
próprias crises usar o mesmo app sem ser tratado como cuidador de si mesmo. Trocar a marca
de um paciente para outro passa por `definir_sou_eu()`, e não por dois PATCHes: entre um e
outro a conta ficaria com dois donos, e o índice não é adiável.

**A crise em andamento é simplesmente a linha com `fim IS NULL`** — não existe um segundo
conceito de "ativa" para divergir do histórico. Um índice único parcial garante uma crise
aberta **por paciente**, no banco (dois filhos podem estar em crise ao mesmo tempo).

### Detalhe por gatilho

`detalhes jsonb` mapeia cada gatilho aos itens específicos daquela crise:

```json
{ "Alimentação": ["sucrilhos", "leite"], "Estresse": ["prova de matemática"] }
```

O usuário digita separado por vírgula; a quebra por vírgula dá itens limpos sem nenhuma
heurística de linguagem. Com isso o Relatório mostra, por gatilho, o que **se repete**
entre crises — "leite 2 de 3" — que é o ponto do campo: achar o item culpado, não guardar
texto. A comparação ignora caixa e acento (`Leite` = `leite`) e conta uma vez por crise.

## Segurança

Não há backend: a RLS **é** a fronteira de confiança, e as policies em `schema.sql` são
as linhas mais importantes do projeto. Duas sutilezas que não são óbvias lendo o SQL:

- O `with check` de `crises` exige que o `paciente_id` seja de um paciente da própria
  conta. Sem esse `exists`, um usuário podia gravar uma crise no paciente de outro: a
  leitura não vazava, mas `crises_uma_ativa` é um índice único, e índice é físico —
  ignora RLS. Uma crise aberta plantada assim travava o paciente da vítima, que não
  conseguia abrir crise nem enxergar a linha que a bloqueava.
- As policies são `to authenticated` e usam `(select auth.uid())`, não `auth.uid()`.
  O `select` faz o Postgres resolver o uid uma vez por query em vez de uma vez por linha.

Testar policy é rodar SQL como o usuário, não confiar na leitura: `set local role
authenticated` + `set local request.jwt.claims` com o `sub` de um usuário real, dentro de
uma transação com `rollback`.

## Paridade com o iOS

Igual: as 4 telas, os vocabulários, o anel de 3h, a ordem dos chips, os cálculos do relatório,
o gráfico de crises por dia, compartilhar como texto.

Diferente de propósito: apagar é um botão `✕` + `confirm()` (no iOS é long-press);
o alívio só vai para o banco ao encerrar a crise.

A mais que o iOS: múltiplos pacientes, edição de crise já encerrada (o sintoma que só
foi notado no dia seguinte) e o dashboard de desktop. O painel "dias por mês" saiu da tela
para o relatório ficar igual ao do iOS — `porMes` continua no texto do médico, onde o iOS
também o tem.

## Relatório público

"Gerar link" grava em `relatorios` um **snapshot** do relatório (`snapshotRelatorio`, em
`report.js`) e devolve `/r/<id do snapshot>`. O id é o token: uuid v4, 122 bits, e não existe
outra coluna para adivinhar. É um por paciente — gerar de novo apaga o anterior — e vale 7 dias.

Snapshot, não espelho: o médico vê daqui a uma semana o mesmo relatório que você mandou, e
crise registrada depois não vaza para um link já enviado. O `gerado_em` também é o "hoje" que
alimenta o gráfico, para a linha não esticar com o relógio de quem abre.

O visitante **não** ganha policy nenhuma. Ele chama `relatorio_publico(token)`, uma função
`security definer` que devolve só a linha daquele token não expirado — é isso que impede listar
a tabela com a anon key (com `select`, o anon vê 0 linhas). Token errado e token vencido dão o
mesmo `null`, então a página não conta se o link existe. O `Publico.jsx` usa um cliente Supabase
separado, sem `persistSession`: senão ele restauraria a sessão do dono e o teste passaria na sua
máquina e falharia na do médico.

A rota vem de um `rewrite` no `vercel.json`, junto com um `X-Robots-Tag: noindex` — o link não
pede senha, então pelo menos não cai em buscador.

## Conta

`src/screens/Ajustes.tsx` é a 4ª aba, e o único lugar que fala da conta: nome do usuário
(no `user_metadata`, sem tabela para uma linha de texto), qual paciente é você, senha,
sair e excluir a conta.

Trocar a senha **confere a senha atual** antes (`signInWithPassword` e depois
`updateUser`). O Supabase não exige a antiga, e a sessão dura semanas — sem isso, um
celular destravado troca a senha do dono. Conta que entrou só pelo Google não tem senha:
a seção some, em vez de mostrar um formulário que nunca funcionaria.

**Excluir a conta** passa por três portões, porque não tem volta: o botão vermelho revela
um card, o card escreve o que some (conta, pacientes, crises, links do médico), e o alerta
nativo — o mesmo de apagar uma crise — pergunta uma última vez. O card não substitui o
alerta: ele explica, e o alerta é o que tira o dedo de cima do botão errado.

É a guideline 5.1.1(v) do App Review, e é a única coisa aqui que não
dá para fazer com a anon key: apagar `auth.users` é admin-only. Quem apaga é a edge
function `supabase/functions/excluir-conta`, com a service role, atrás do Bearer do
chamador — o cascade das três tabelas limpa o resto.

```bash
supabase functions deploy excluir-conta --no-verify-jwt
```

O `--no-verify-jwt` não abre a porta: o Bearer é conferido dentro da função, no
`getUser()`. É o gateway que precisa sair da frente, senão ele responde 401 ao preflight
`OPTIONS` (que não leva Authorization nenhum) e o browser nem chega a mandar o POST.

**Não tem** (fora de escopo por decisão): export PDF, notificações, filtro de período,
calendário, gráfico sono×crises, trocar de e-mail e definir senha em conta social.
