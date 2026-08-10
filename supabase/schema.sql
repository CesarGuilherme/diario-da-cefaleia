-- Diário da Cefaléia — schema completo. Rodar uma vez no SQL Editor do Supabase.
-- Duas tabelas. O isolamento entre contas é a policy de RLS lá embaixo, não código de app.
-- Quem já rodou a versão de uma tabela só: usar supabase/migracao-paciente.sql.

-- Um responsável (user) tem N pacientes (filhos). Toda crise pertence a um paciente.
create table pacientes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nome             text not null check (length(trim(nome)) > 0),
  data_nascimento  date,                               -- opcional; só alimenta a idade no relatório
  criado_em        timestamptz not null default now()
);

create index pacientes_user on pacientes (user_id, criado_em);

create table crises (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  paciente_id     uuid not null references pacientes(id) on delete cascade,
  inicio          timestamptz not null default now(),
  fim             timestamptz,                        -- null = crise em andamento
  intensidade     text not null check (intensidade in ('Leve','Moderada','Intensa')),
  localizacao     text not null check (localizacao in ('Esq.','Dir.','Bilateral')),
  carater         text not null check (carater in ('Pulsátil','Pressão')),
  sintomas        text[] not null default '{}',
  sono_horas      numeric(3,1) not null default 8 check (sono_horas between 3 and 12),
  gatilhos        text[] not null default '{}',
  -- gatilho -> itens específicos daquela crise, ex.:
  -- {"Alimentação": ["leite","chocolate"], "Estresse": ["prova de matemática"]}
  -- É o que permite achar o item recorrente entre crises (o "leite" em 2 de 3).
  detalhes        jsonb not null default '{}',
  medicacao       text not null default '',
  alivio          text check (alivio in ('Não','Parcial','Total')),
  check (fim is null or fim > inicio)
);

create index crises_paciente_inicio on crises (paciente_id, inicio desc);

-- Uma crise aberta por paciente, garantido pelo banco (dois filhos podem estar em crise ao mesmo tempo).
create unique index crises_uma_ativa on crises (paciente_id) where fim is null;

alter table pacientes enable row level security;
alter table crises enable row level security;

-- As linhas mais importantes do projeto: sem elas o app vaza dados entre contas.
create policy "dono" on pacientes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "dono" on crises for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
