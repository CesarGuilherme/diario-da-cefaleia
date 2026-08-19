-- Sincronia entre aparelhos: sem as tabelas na publicação do Realtime nenhum evento sai, e a
-- crise registrada num celular só aparece no outro depois de fechar e reabrir o app.
-- A RLS continua valendo — o postgres_changes avalia as policies com o JWT de quem escuta,
-- então cada conta só recebe evento das próprias linhas.
alter publication supabase_realtime add table public.crises;
alter publication supabase_realtime add table public.pacientes;

-- `replica identity full` não é zelo: com o default, o evento de DELETE só carrega a chave
-- primária, e sem as outras colunas o Realtime não consegue casar o filtro por paciente nem
-- avaliar a RLS — o resultado é que apagar uma crise num aparelho não some no outro (testado).
-- O custo é o WAL levar a linha antiga inteira; aqui são unidades de linha por conta.
alter table public.crises replica identity full;
alter table public.pacientes replica identity full;
