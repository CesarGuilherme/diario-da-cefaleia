import { test } from 'node:test'
import assert from 'node:assert/strict'
import { falhasSenha, senhaValida, REGRAS_SENHA } from '../src/senha.ts'

test('rejeita o que falta em cada regra', () => {
  assert.deepEqual(falhasSenha('Aa1!xxx'), ['8 caracteres'])
  assert.ok(falhasSenha('aa1!xxxx').includes('maiúscula'))
  assert.ok(falhasSenha('AA1!XXXX').includes('minúscula'))
  assert.ok(falhasSenha('Aa!!xxxx').includes('número'))
  assert.ok(falhasSenha('Aa11xxxx').includes('caractere especial'))
})

test('aceita uma senha que cumpre tudo', () => {
  assert.equal(senhaValida('Abcd123!'), true)
  assert.deepEqual(falhasSenha('Abcd123!'), [])
  assert.ok(REGRAS_SENHA.every((r) => r.ok('Abcd123!')))
})

test('o checklist marca regra a regra enquanto digita', () => {
  const ids = (s: string) => REGRAS_SENHA.filter((r) => r.ok(s)).map((r) => r.id)
  assert.deepEqual(ids(''), [])
  assert.deepEqual(ids('abcdefgh'), ['len', 'a'])
  assert.deepEqual(ids('Abcdefgh'), ['len', 'A', 'a'])
  assert.deepEqual(ids('Abcdefg1'), ['len', 'A', 'a', 'n'])
  assert.deepEqual(ids('Abcdefg1!'), ['len', 'A', 'a', 'n', 's'])
})
