-- Fecha e afina as policies. Já aplicada no projeto vzhp… em 2026-08-11 (via MCP,
-- migration `rls_authenticated_e_uid_cacheado`). Fica aqui para qualquer outro banco.
-- Rodar uma vez no SQL Editor. Não toca em dados — só troca as policies.
--
-- 1. O `with check` de `crises` só validava `user_id`, então dava para inserir/atualizar
--    uma crise apontando para o `paciente_id` de outra conta. Não vazava leitura (o
--    `using` filtra por user_id), mas o índice único `crises_uma_ativa` é físico e ignora
--    RLS: uma crise aberta plantada no paciente da vítima a impedia de abrir qualquer
--    crise, sem que ela pudesse ver ou apagar a linha culpada.
-- 2. As policies valiam para o role `public` (inclui anon) e chamavam `auth.uid()` por
--    linha. `to authenticated` + `(select auth.uid())` é o que o guia de RLS do Supabase
--    recomenda: uma avaliação por query, e o anon nem entra na conta.

drop policy "dono" on crises;
drop policy "dono" on pacientes;

create policy "dono" on pacientes for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "dono" on crises for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from pacientes p
       where p.id = paciente_id and p.user_id = (select auth.uid())
    )
  );

-- Confere se sobrou alguma crise apontando para paciente de outro dono (deve dar 0):
-- select count(*) from crises c join pacientes p on p.id = c.paciente_id
--  where p.user_id <> c.user_id;
