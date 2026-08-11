-- Fecha a policy de `crises` para quem já rodou o schema anterior.
-- Rodar uma vez no SQL Editor. Não toca em dados — só troca a policy.
--
-- Antes: o `with check` só validava `user_id`, então dava para inserir/atualizar uma
-- crise apontando para o `paciente_id` de outra conta. Não vazava leitura (o `using`
-- filtra por user_id), mas o índice único `crises_uma_ativa` é físico e ignora RLS:
-- uma crise aberta plantada no paciente da vítima a impedia de abrir qualquer crise,
-- sem que ela pudesse ver ou apagar a linha culpada.

drop policy "dono" on crises;

create policy "dono" on crises for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from pacientes p
       where p.id = paciente_id and p.user_id = auth.uid()
    )
  );

-- Confere se sobrou alguma crise apontando para paciente de outro dono (deve dar 0):
-- select count(*) from crises c join pacientes p on p.id = c.paciente_id
--  where p.user_id <> c.user_id;
