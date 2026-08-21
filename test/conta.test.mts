import { test } from 'node:test'
import assert from 'node:assert/strict'
import { temSenha, nomeDoUsuario } from '../src/conta.ts'
import type { User } from '@supabase/supabase-js'

// Só os campos que as funções leem — o resto do User não entra na conta.
const usuario = (parcial: Partial<User>) => ({ app_metadata: {}, user_metadata: {}, ...parcial }) as User
const identidade = (provider: string) => ({ provider }) as NonNullable<User['identities']>[number]

test('tem senha quando existe a identidade de e-mail', () => {
  assert.equal(temSenha(usuario({ identities: [identidade('email')] })), true)
  assert.equal(temSenha(usuario({ identities: [identidade('google'), identidade('email')] })), true)
})

test('conta só do Google não tem senha para trocar', () => {
  assert.equal(temSenha(usuario({ identities: [identidade('google')] })), false)
})

test('sem identities, cai no app_metadata do JWT', () => {
  assert.equal(temSenha(usuario({ app_metadata: { providers: ['email'] } })), true)
  assert.equal(temSenha(usuario({ app_metadata: { providers: ['google'] } })), false)
  assert.equal(temSenha(usuario({ app_metadata: { provider: 'email' } })), true)
  assert.equal(temSenha(usuario({ identities: [], app_metadata: {} })), false)
})

test('o nome vem do metadata, sem espaço em volta', () => {
  assert.equal(nomeDoUsuario(usuario({ user_metadata: { nome: '  César  ' } })), 'César')
  assert.equal(nomeDoUsuario(usuario({ user_metadata: {} })), '')
  assert.equal(nomeDoUsuario(usuario({ user_metadata: { nome: 42 } })), '')
})
