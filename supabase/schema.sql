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
-- `to authenticated` mantém o anon fora da avaliação; `(select auth.uid())` faz o
-- Postgres resolver o uid uma vez por query em vez de uma vez por linha.
create policy "dono" on pacientes for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- O `exists` não é zelo extra: sem ele dá para gravar uma crise no paciente de outra
-- conta. Como `crises_uma_ativa` é um índice único (ignora RLS), uma crise aberta
-- plantada assim trava o paciente da vítima — ela não consegue abrir crise nem enxergar
-- a linha que a bloqueia.
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

-- Relatório público: um link somente-leitura por paciente (supabase/migracao-relatorio-publico.sql).
-- O id É o token da URL: uuid v4, 122 bits de aleatoriedade, sem coluna extra para adivinhar.
-- `dados` é um snapshot congelado do relatório, não um espelho: o médico vê daqui a 20 dias o
-- mesmo que você mandou, e crise nova não vaza para um link já enviado.
create table relatorios (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  paciente_id  uuid not null references pacientes(id) on delete cascade,
  dados        jsonb not null,
  criado_em    timestamptz not null default now(),
  expira_em    timestamptz not null default now() + interval '7 days'
);

create index relatorios_paciente on relatorios (paciente_id);

alter table relatorios enable row level security;

-- Mesma policy das outras tabelas, com o mesmo `exists`: sem ele daria para publicar um
-- relatório pendurado no paciente de outra conta.
create policy "dono" on relatorios for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from pacientes p
       where p.id = paciente_id and p.user_id = (select auth.uid())
    )
  );

-- O visitante não ganha policy nenhuma — ele entra por esta função, e é isso que impede
-- listar a tabela inteira com a anon key. `security definer` ignora a RLS de propósito e só
-- devolve a linha de um token válido e não expirado; token errado e token vencido dão o mesmo
-- `null`, então a página não revela se o link existe.
create function public.relatorio_publico(token uuid)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select r.dados from public.relatorios r
   where r.id = token and r.expira_em > now();
$$;

revoke all on function public.relatorio_publico(uuid) from public;
grant execute on function public.relatorio_publico(uuid) to anon, authenticated;

-- Linha expirada guarda PHI sem servir para nada — a varredura diária que a apaga está em
-- supabase/migracao-purga-relatorios.sql (pg_cron).
