-- Trava o token e o prazo do relatório público, tira GRANT de anon nas tabelas,
-- e registra quem abriu o link. Rodar uma vez no SQL Editor (projeto já tem
-- relatorios + relatorio_publico). O mesmo bloco está no fim de schema.sql.

-- 1. O cliente autenticado podia mandar `id` adivinhável e `expira_em` em 2099
--    no INSERT. A policy FOR ALL não impede coluna — só linha.
-- 2. Sem REVOKE, anon continua com GRANT ALL nas tabelas; a RLS é o único cadeado.
-- 3. Gerar link novo (insert + delete) não era atômico: falha no delete deixava
--    dois links vivos. publicar_relatorio faz os dois na mesma transação.
-- 4. relatorio_publico não deixava rastro de abertura.

revoke all on table public.pacientes, public.crises, public.relatorios from anon, public;
grant select, insert, update, delete on table public.pacientes, public.crises to authenticated;

revoke all on table public.relatorios from authenticated;
grant select, delete on table public.relatorios to authenticated;
grant insert (paciente_id, dados) on table public.relatorios to authenticated;

alter table public.relatorios
  drop constraint if exists relatorios_dados_tam;
alter table public.relatorios
  add constraint relatorios_dados_tam check (octet_length(dados::text) <= 200000);

create or replace function public.relatorios_forcar_prazo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.id := gen_random_uuid();
    new.expira_em := now() + interval '7 days';
  else
    new.id := old.id;
    new.expira_em := old.expira_em;
    new.user_id := old.user_id;
  end if;
  if octet_length(new.dados::text) > 200000 then
    raise exception 'relatorio grande demais' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists relatorios_forcar_prazo on public.relatorios;
create trigger relatorios_forcar_prazo
  before insert or update on public.relatorios
  for each row execute function public.relatorios_forcar_prazo();

create or replace function public.publicar_relatorio(pid uuid, dados jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  novo uuid;
begin
  insert into public.relatorios (paciente_id, dados)
  values (pid, dados)
  returning id into novo;

  delete from public.relatorios
   where paciente_id = pid and id is distinct from novo;

  return novo;
end;
$$;

revoke all on function public.publicar_relatorio(uuid, jsonb) from public;
grant execute on function public.publicar_relatorio(uuid, jsonb) to authenticated;

create table if not exists public.relatorio_acessos (
  id            uuid primary key default gen_random_uuid(),
  relatorio_id  uuid not null references public.relatorios(id) on delete cascade,
  em            timestamptz not null default now()
);

create index if not exists relatorio_acessos_relatorio_em
  on public.relatorio_acessos (relatorio_id, em desc);

alter table public.relatorio_acessos enable row level security;
revoke all on table public.relatorio_acessos from anon, authenticated, public;

-- Volatile: grava o acesso. Token errado e vencido continuam devolvendo o mesmo null.
drop function if exists public.relatorio_publico(uuid);
create function public.relatorio_publico(token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rid uuid;
  payload jsonb;
begin
  select r.id, r.dados into rid, payload
    from public.relatorios r
   where r.id = token and r.expira_em > now();
  if rid is null then
    return null;
  end if;
  insert into public.relatorio_acessos (relatorio_id) values (rid);
  return payload;
end;
$$;

revoke all on function public.relatorio_publico(uuid) from public;
grant execute on function public.relatorio_publico(uuid) to anon, authenticated;
