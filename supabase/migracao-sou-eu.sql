-- "Eu sou o paciente": qual dos N pacientes da conta é o próprio dono dela.
-- O adulto que usa o app para si mesmo é paciente como qualquer outro — a flag só diz
-- qual deles é ele, para o app parar de falar como se todo paciente fosse um terceiro.
alter table pacientes add column sou_eu boolean not null default false;

-- Um por conta, garantido pelo banco (mesma escola do crises_uma_ativa).
create unique index pacientes_sou_eu on pacientes (user_id) where sou_eu;

-- Trocar a marca de um paciente para outro precisa desta função, e não de dois PATCHes do
-- cliente: entre um e outro a conta ficaria com dois `sou_eu`, ou com nenhum se o segundo
-- falhasse. Aqui os dois updates estão na mesma transação.
--
-- São dois de propósito, e não um `set sou_eu = (id = pid)`: índice único parcial não é
-- adiável (deferrable só existe para constraint, e constraint não é parcial), então o
-- update de uma linha só já esbarraria na linha antiga, que ainda está viva dentro do
-- comando. Limpar primeiro e marcar depois nunca cruza as duas.
--
-- security invoker (o padrão) de propósito: a RLS de `pacientes` continua sendo quem
-- decide de quem são as linhas — o `user_id` no where é só para não varrer a tabela.
create function public.definir_sou_eu(pid uuid)
returns void
language sql
set search_path = ''
as $$
  update public.pacientes set sou_eu = false
   where user_id = (select auth.uid()) and sou_eu and id is distinct from pid;

  update public.pacientes set sou_eu = true
   where user_id = (select auth.uid()) and id = pid and not sou_eu;
$$;

revoke all on function public.definir_sou_eu(uuid) from public;
grant execute on function public.definir_sou_eu(uuid) to authenticated;
