-- Migração para quem já tem dados na versão de uma tabela só (crises sem paciente).
-- Rodar uma vez no SQL Editor. Cria um "Paciente 1" por usuário que já tem crises
-- e aponta as crises existentes pra ele — nada é apagado. Renomear depois no app.

create table pacientes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nome             text not null check (length(trim(nome)) > 0),
  data_nascimento  date,
  criado_em        timestamptz not null default now()
);

create index pacientes_user on pacientes (user_id, criado_em);

alter table pacientes enable row level security;

create policy "dono" on pacientes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Nullable primeiro para o backfill, not null depois.
alter table crises add column paciente_id uuid references pacientes(id) on delete cascade;

insert into pacientes (user_id, nome)
select distinct user_id, 'Paciente 1' from crises;

update crises c
   set paciente_id = p.id
  from pacientes p
 where p.user_id = c.user_id;

alter table crises alter column paciente_id set not null;

create index crises_paciente_inicio on crises (paciente_id, inicio desc);

drop index crises_uma_ativa;
create unique index crises_uma_ativa on crises (paciente_id) where fim is null;
