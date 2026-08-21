// Exclusão de conta — guideline 5.1.1(v) do App Review: quem cria conta pelo app
// precisa poder apagá-la pelo app. A anon key não pode apagar auth.users (é
// admin-only), por isso isto roda com a service role, atrás de um Bearer válido.
//
// pacientes/crises/relatorios já são `references auth.users(id) on delete cascade`
// (ver supabase/schema.sql) — apagar o usuário limpa tudo, sem deleção manual por tabela.
//
// Deploy: supabase functions deploy excluir-conta --no-verify-jwt
// O --no-verify-jwt não abre a porta: o Bearer é conferido aqui embaixo, no getUser(). É o
// gateway que precisa sair da frente, senão ele responde 401 ao preflight OPTIONS (que não
// leva Authorization nenhum) e o browser nem chega a mandar o POST.
import { createClient } from 'jsr:@supabase/supabase-js@2'

// O `Authorization` faz o browser mandar um OPTIONS antes do POST — sem resposta a esse
// preflight, `functions.invoke` falha antes de chegar aqui, e a exclusão de conta é
// justamente a que não pode falhar (é ela que o App Review testa).
//
// `*` e não uma lista de origens: aqui a origem não protege nada. Quem chama precisa de um
// Bearer válido, que mora no localStorage e só a própria origem consegue ler — outra página
// não obtém o token, e se obtivesse já faria tudo direto na API. Uma lista, em troca, quebra
// calada em cada domínio novo (preview da Vercel, domínio próprio).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Os headers vão em TODA resposta, inclusive nas de erro: sem eles o browser esconde o
  // corpo do 401/500 e a tela mostraria "Failed to fetch" em vez do motivo.
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const auth = req.headers.get('Authorization')
  if (!auth) return new Response('Missing Authorization header', { status: 401, headers: CORS })

  // Client anon + o Bearer do chamador: só confirma quem está pedindo, não apaga nada.
  const semPrivilegio = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  )
  const { data: { user }, error: erroAuth } = await semPrivilegio.auth.getUser()
  if (erroAuth || !user) return new Response('Unauthorized', { status: 401, headers: CORS })

  // Só a service role tem admin.deleteUser — nunca embarcar essa chave no cliente.
  const comPrivilegio = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { error } = await comPrivilegio.auth.admin.deleteUser(user.id)
  if (error) return new Response(error.message, { status: 500, headers: CORS })

  return new Response(null, { status: 204, headers: CORS })
})
