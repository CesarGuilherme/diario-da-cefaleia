-- Prazo do link público: 30 → 7 dias. Já aplicada no projeto vzhp… em 2026-08-20.
-- Só o default de linhas novas; link já emitido mantém a data que gravou.
alter table public.relatorios
  alter column expira_em set default (now() + interval '7 days');
