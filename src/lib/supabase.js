import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const faltaConfig = !url || !anonKey

// Sem as env vars o app não funciona — mas precisa carregar para conseguir DIZER isso.
// Dar throw aqui derruba o módulo antes do React montar e o usuário vê só uma tela
// preta, sem pista nenhuma. Por isso o cliente é criado com valores de fachada e quem
// mostra o erro é a UI.
// A anon key é pública por design — quem protege os dados é a RLS da tabela crises.
export const supabase = createClient(
  url || 'https://fachada.supabase.co',
  anonKey || 'fachada',
)

// Cliente da página pública: nada de sessão. Sem `persistSession: false` ele restauraria a
// sessão do dono no localStorage e as queries sairiam autenticadas — o relatório abriria
// para você e daria vazio para o médico. `detectSessionInUrl: false` evita que o token da
// URL do relatório seja confundido com um callback de OAuth.
export const supabaseAnon = createClient(
  url || 'https://fachada.supabase.co',
  anonKey || 'fachada',
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
)
