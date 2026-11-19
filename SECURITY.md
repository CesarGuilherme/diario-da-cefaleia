# Segurança

Relatório da auditoria de 2026-11-19 (skill `security-audit`) e política de segurança do projeto.
Cada afirmação foi verificada contra produção ou contra o código; o que não pôde ser verificado está marcado.

## Como reportar uma falha

Abra um aviso privado em *Security → Report a vulnerability* neste repositório, ou fale com o mantenedor. Não abra issue pública com detalhes de exploração. O app guarda dados de saúde.

## Modelo de segurança

- **Fronteira de confiança: RLS do Postgres (Supabase).** A chave `anon` é pública por design; quem protege os dados são as policies e os grants. A `service_role` existe só na edge function `excluir-conta`, nunca no cliente.
- **Auth:** Supabase Auth com JWT em header (sem cookie de sessão) e Sign in with Apple no iOS.
- **Relatório do médico:** snapshot congelado, token UUID, expira em 7 dias, lido só via função `relatorio_publico`.

## Achados e estado

| ID | Sev. | Achado | Estado |
|---|---|---|---|
| S1 | Alta | Dump do banco com dados reais solto na raiz de um repo público, sem `.gitignore`. Nunca foi commitado nem servido pela Vercel. | **Corrigido**: dump movido para fora do repo; `.gitignore` cobre `db_cluster*`, `*.backup`, `*.backup.gz`, `*.storage.zip` (PR #2) |
| S2 | Média | `vite` 7.3.6 com 2 CVEs altas (servidor de desenvolvimento, não o bundle). | **Corrigido**: 7.3.8; `npm audit` = 0 (PR #2) |
| S3 | Média | Proteção contra senhas vazadas (HIBP) desligada. | **Aceito**: recurso exclusivo do plano Pro; a política de senha em `supabase/migracao-politica-senha.sql` compensa |
| S4 | Baixa | `relatorio_publico` (`SECURITY DEFINER`) executável por `anon`. | **Aceito**: intencional, é o link do médico; `search_path = ''`, filtra por token e expiração |
| S5 | Info | `relatorio_acessos` com RLS e sem policy. | **Aceito**: intencional, só a função `SECURITY DEFINER` escreve |
| S6 | Info | Zip de storage vazio na raiz. | **Corrigido**: apagado |
| S7 | Baixa | CORS `*` na edge function `excluir-conta`. | **Aceito**: a barreira é o Bearer, validado por `getUser()`; sem token ou com token inválido responde 401 (testado) |

## O que foi verificado e está coberto

- **RLS/grants (produção, como `anon`):** `pacientes`, `crises`, `relatorios` e `relatorio_acessos` respondem 42501; o schema responde 401.
- **Segredos:** nenhum `.env` ou dump no histórico do Git (todas as refs); bundle sem `service_role`; `service_role` só no servidor.
- **Headers (produção):** CSP restritiva (`script-src 'self'`, `frame-ancestors 'none'`), HSTS de 1 ano, `nosniff`, Referrer-Policy, Permissions-Policy; `http://` redireciona 308 para `https://`; `/r/*` com `no-store`, `noindex` e `no-referrer`.
- **Arquivos expostos:** 404 para `.env`, `.git/*`, `package.json`, `supabase/schema.sql`, `src/*`, `README.md`. Sem source maps no `dist/`. *Ressalva:* a Vercel passou a desafiar o `curl` após muitas requisições; essa lista foi testada antes do bloqueio e pode ser reconferida no browser.
- **XSS:** nenhum `innerHTML`, `dangerouslySetInnerHTML` ou `eval` em `src/`.
- **Dependências:** `npm audit` = 0; build e 75/75 testes passam.
- **Edge function:** preflight 204; POST sem token e com token inválido = 401 (origem `https://evil.test`). *Não testado:* exclusão com token válido, porque apagaria uma conta real.

## Não se aplica

CSRF (auth por Bearer, sem cookie), hash de senha (delegado ao Supabase Auth/Apple), pagamentos, upload de arquivos, rotas de administrador, SQL manual (o SDK parametriza).

## Regras para manter

- Dumps e backups do Supabase ficam em `~/Backups/`, nunca no repositório.
- Variáveis `VITE_*` vão para o bundle: só valores públicos. A `service_role` nunca entra no cliente.
- Se um segredo vazar: rotacionar primeiro; limpar histórico do Git só depois.
- Reauditar com `/security-audit` a cada mudança de RLS, de edge function ou de headers.
