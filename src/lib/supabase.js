import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (veja .env.local.example)')
}

// A anon key é pública por design — quem protege os dados é a RLS da tabela crises.
export const supabase = createClient(url, anonKey)
