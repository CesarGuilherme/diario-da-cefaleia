// Exclusão de conta — guideline 5.1.1(v) do App Review: quem cria conta pelo app
// precisa poder apagá-la pelo app. A anon key não pode apagar auth.users (é
// admin-only), por isso isto roda com a service role, atrás de um Bearer válido.
//
// pacientes/crises/relatorios já são `references auth.users(id) on delete cascade`
// (ver supabase/schema.sql) — apagar o usuário limpa tudo, sem deleção manual por tabela.
//
// Deploy: supabase functions deploy excluir-conta
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization')
  if (!auth) return new Response('Missing Authorization header', { status: 401 })

  // Client anon + o Bearer do chamador: só confirma quem está pedindo, não apaga nada.
  const semPrivilegio = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  )
  const { data: { user }, error: erroAuth } = await semPrivilegio.auth.getUser()
  if (erroAuth || !user) return new Response('Unauthorized', { status: 401 })

  // Só a service role tem admin.deleteUser — nunca embarcar essa chave no cliente.
  const comPrivilegio = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { error } = await comPrivilegio.auth.admin.deleteUser(user.id)
  if (error) return new Response(error.message, { status: 500 })

  return new Response(null, { status: 204 })
})
