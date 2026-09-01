-- Purga diária dos relatórios públicos expirados.
-- Já aplicada no projeto vzhp… em 2026-09-01 (migration purga_relatorios_expirados).
-- Fica aqui para qualquer outro banco. Rodar uma vez no SQL Editor.
--
-- Um link expirado guarda PHI — nome, idade, todas as crises e as medicações — em jsonb
-- puro, e depois de `expira_em` a função `relatorio_publico` já não o devolve. A linha
-- fica só ocupando a tabela, o WAL e os backups. Isto é minimização de dado, não a
-- questão de volume que o comentário do schema.sql supunha: mesmo com "unidades de linha
-- por conta", o certo num app de saúde é o dado sumir quando deixa de ter uso.
--
-- pg_cron é o agendador que o Supabase já oferece para isto. O job roda como `postgres`,
-- fora da RLS, então varre a tabela inteira — é o que se quer aqui.

create extension if not exists pg_cron;

select cron.schedule(
  'purga-relatorios-expirados',
  '17 4 * * *',                       -- todo dia às 04:17 UTC (fora do horário de pico BR)
  $$ delete from public.relatorios where expira_em < now() $$
);

-- Conferir o agendamento:      select * from cron.job where jobname = 'purga-relatorios-expirados';
-- Ver as últimas execuções:    select * from cron.job_run_details order by start_time desc limit 5;
-- Desfazer:                    select cron.unschedule('purga-relatorios-expirados');
