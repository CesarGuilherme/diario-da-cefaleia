-- Relatório público: link somente-leitura para o médico.
-- Rodar no SQL Editor de um banco que já tem `pacientes` e `crises`.
-- O mesmo bloco está no fim de schema.sql, para quem começa do zero.

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
