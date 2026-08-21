// A conta em si: o que dá para saber do `user` do Supabase sem perguntar ao servidor.
// Fora dos componentes de propósito — igual a senha.ts e sync.ts, aqui é lógica pura,
// testável sem o cliente do Supabase nem o React.
import type { User } from '@supabase/supabase-js'

/**
 * Esta conta tem senha para trocar? Quem entrou só pelo Google não tem: o GoTrue guarda
 * uma identidade por provedor, e a senha pertence à identidade `email`. Sem isso os
 * Ajustes mostrariam um formulário de "senha atual" que nunca poderia dar certo.
 */
export function temSenha(user: User): boolean {
  // `identities` é a fonte boa, mas some em sessão restaurada de versão antiga do SDK —
  // aí o `providers` do app_metadata (que o próprio GoTrue põe no JWT) responde igual.
  const ids = user.identities
  if (ids?.length) return ids.some((i) => i.provider === 'email')
  const provedores = user.app_metadata?.providers
  return Array.isArray(provedores) ? provedores.includes('email') : user.app_metadata?.provider === 'email'
}

/** O nome que o usuário escolheu para si nos Ajustes. Vazio = nunca preencheu. */
export const nomeDoUsuario = (user: User): string =>
  typeof user.user_metadata?.nome === 'string' ? user.user_metadata.nome.trim() : ''
