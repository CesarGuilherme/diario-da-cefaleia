// A conta em si: o que dá para saber do `user` do Supabase sem perguntar ao servidor.
// Fora dos componentes de propósito — igual a senha.ts e sync.ts, aqui é lógica pura,
// testável sem o cliente do Supabase nem o React.
import { chave } from './report.ts'
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

/**
 * Qual das linhas de `pacientes` é o próprio dono da conta, quando ele diz "sou paciente
 * também". A marca vale mais que o nome; sem marca, um homônimo do nome da conta é ele.
 *
 * O homônimo não é firula: quem começou sozinho já se cadastrou como paciente (o app exige
 * um antes de qualquer crise), e sem isto marcar-se criaria um segundo "César" ao lado do
 * primeiro — com o histórico dividido entre os dois. `undefined` = não existe ainda, cria.
 */
export function pacienteQueSouEu<T extends { nome: string; sou_eu: boolean }>(
  pacientes: T[], nome: string,
): T | undefined {
  const marcado = pacientes.find((p) => p.sou_eu)
  if (marcado || !nome.trim()) return marcado
  return pacientes.find((p) => chave(p.nome) === chave(nome))
}

/** "Manu", "Manu e João", "Manu, João e Ana" — o `Intl` já sabe as vírgulas do português. */
const CONJUNCAO = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' })
export const listar = (nomes: string[]): string => CONJUNCAO.format(nomes)
