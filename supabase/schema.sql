-- Diário da Cefaléia — schema completo. Rodar uma vez no SQL Editor do Supabase.
-- Uma tabela. O isolamento entre contas é a policy de RLS lá embaixo, não código de app.

create table crises (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  inicio          timestamptz not null default now(),
  fim             timestamptz,                        -- null = crise em andamento
  intensidade     text not null check (intensidade in ('Leve','Moderada','Intensa')),
  localizacao     text not null check (localizacao in ('Esq.','Dir.','Bilateral')),
  carater         text not null check (carater in ('Pulsátil','Pressão')),
  sintomas        text[] not null default '{}',
  sono_horas      numeric(3,1) not null default 8 check (sono_horas between 3 and 12),
  gatilhos        text[] not null default '{}',
  detalhe_gatilho text not null default '',
  medicacao       text not null default '',
  alivio          text check (alivio in ('Não','Parcial','Total')),
  check (fim is null or fim > inicio)
);

create index crises_user_inicio on crises (user_id, inicio desc);

-- Uma crise aberta por usuário, garantido pelo banco.
create unique index crises_uma_ativa on crises (user_id) where fim is null;

alter table crises enable row level security;

-- A linha mais importante do projeto: sem ela o app vaza dados entre contas.
create policy "dono" on crises for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
