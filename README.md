# Diário da Cefaléia — web

Port do app iOS (`../Diário-da-Cefaléia`) para web, com login e histórico por usuário.
Vite + React, Supabase (Postgres + Auth), deploy estático na Vercel. Sem backend próprio:
o browser fala direto com o Supabase e a **RLS** é a fronteira de confiança.

## Setup

**1. Projeto no Supabase** → SQL Editor → colar `supabase/schema.sql` e rodar.

**2. Providers** (Authentication → Providers): e-mail+senha, Google, Apple.
Em Authentication → URL Configuration, adicionar a URL de produção às Redirect URLs,
senão o OAuth volta para `localhost` em produção.

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

## Estrutura

| | |
|---|---|
| `src/report.js` | análise de gatilhos, insight, estatísticas, texto do compartilhamento — única lógica não-trivial, coberta por `test/` |
| `src/tokens.js` | cores/gradientes copiados verbatim do protótipo do handoff |
| `src/format.js` | datas e durações pt-BR (espelha `Components.swift`) |
| `src/useCrises.js` | leitura/escrita no Supabase |
| `src/screens/` | as 4 telas |
| `src/ui.jsx` | card de vidro, segmented, chip, botão |

Estilos são inline, copiados do protótipo `design_handoff_diario_cefaleia/`. Não
"aproximar" sombras e gradientes daqui — é o que mantém a paridade com o iOS.

## Modelo

Uma tabela, `crises`. **A crise em andamento é simplesmente a linha com `fim IS NULL`** —
não existe um segundo conceito de "ativa" para divergir do histórico. Um índice único
parcial garante uma crise aberta por usuário, no banco.

## Paridade com o iOS

Igual: as 4 telas, os vocabulários, o anel de 3h, a ordem dos chips, os cálculos do relatório,
compartilhar como texto.

Diferente de propósito: apagar é um botão `✕` + `confirm()` (no iOS é long-press);
o alívio só vai para o banco ao encerrar a crise.

**Não tem** (fora de escopo por decisão): editar crise finalizada, export PDF, múltiplos
pacientes, notificações, filtro de período, calendário, gráfico sono×crises.

⚠️ Não dá para editar uma crise já encerrada, só apagar — num diário médico, errar a
intensidade custa o horário real do registro. É a primeira coisa a adicionar depois.
