import { test } from 'node:test'
import assert from 'node:assert/strict'
import { temSenha, nomeDoUsuario, pacienteQueSouEu, listar } from '../src/conta.ts'
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

const p = (nome: string, sou_eu = false) => ({ nome, sou_eu })

test('quem já está marcado é você, mesmo com outro nome', () => {
  assert.equal(pacienteQueSouEu([p('Manu'), p('Zé', true)], 'César')?.nome, 'Zé')
})

test('sem marca, o homônimo é você — e ele não vira um segundo paciente', () => {
  assert.equal(pacienteQueSouEu([p('Manu'), p('César')], 'César')?.nome, 'César')
  assert.equal(pacienteQueSouEu([p('cesar')], 'César')?.nome, 'cesar')
  assert.equal(pacienteQueSouEu([p('  CÉSAR ')], 'cesar')?.nome, '  CÉSAR ')
})

test('sem homônimo não há quem marcar: quem chamar que crie', () => {
  assert.equal(pacienteQueSouEu([p('Manu'), p('João')], 'César'), undefined)
  assert.equal(pacienteQueSouEu([], 'César'), undefined)
})

test('sem nome, só a marca conta — nome vazio não casa com ninguém', () => {
  assert.equal(pacienteQueSouEu([p('Manu')], ''), undefined)
  assert.equal(pacienteQueSouEu([p('Manu'), p('Zé', true)], '   ')?.nome, 'Zé')
})

test('a lista de quem você acompanha sai em português', () => {
  assert.equal(listar(['Manu']), 'Manu')
  assert.equal(listar(['Manu', 'João']), 'Manu e João')
  assert.equal(listar(['Manu', 'João', 'Ana']), 'Manu, João e Ana')
})

test('o nome vem do metadata, sem espaço em volta', () => {
  assert.equal(nomeDoUsuario(usuario({ user_metadata: { nome: '  César  ' } })), 'César')
  assert.equal(nomeDoUsuario(usuario({ user_metadata: {} })), '')
  assert.equal(nomeDoUsuario(usuario({ user_metadata: { nome: 42 } })), '')
})
