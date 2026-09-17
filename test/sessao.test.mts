import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CHAVE_RECOVERY, marcarRecovery, emRecovery, limparRecovery, MAX_RECOVERY_MS, urlEhRecovery,
} from '../src/sessao.ts'
import { confirmaExclusao } from '../src/conta.ts'

const store = () => {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v) },
    removeItem: (k: string) => { m.delete(k) },
  }
}

test('recovery sobrevive a refresh dentro da janela', () => {
  const s = store()
  const t0 = 1_000_000
  marcarRecovery(s, t0, 'u1')
  assert.equal(s.getItem(CHAVE_RECOVERY), `u1:${t0}`)
  assert.equal(emRecovery(s, t0 + 60_000, 'u1'), true)
  assert.equal(emRecovery(s, t0, 'u1'), true)
})

test('recovery de outro usuário não vale', () => {
  const s = store()
  marcarRecovery(s, 1, 'u1')
  assert.equal(emRecovery(s, 1, 'u2'), false)
  assert.equal(s.getItem(CHAVE_RECOVERY), null)
})

test('recovery expira e some depois da janela', () => {
  const s = store()
  const t0 = 1_000_000
  marcarRecovery(s, t0, 'u1')
  assert.equal(emRecovery(s, t0 + MAX_RECOVERY_MS + 1, 'u1'), false)
  assert.equal(s.getItem(CHAVE_RECOVERY), null)
})

test('limpar recovery libera o app', () => {
  const s = store()
  marcarRecovery(s, 1, 'u1')
  limparRecovery(s)
  assert.equal(emRecovery(s, 1, 'u1'), false)
})

test('urlEhRecovery lê type=recovery no hash e na query', () => {
  assert.equal(urlEhRecovery('https://x.app/#access_token=a&type=recovery'), true)
  assert.equal(urlEhRecovery('https://x.app/?type=recovery&code=1'), true)
  assert.equal(urlEhRecovery('https://x.app/#access_token=a&type=signup'), false)
  assert.equal(urlEhRecovery('https://x.app/'), false)
})

test('exclusão com senha exige a senha atual', () => {
  assert.equal(confirmaExclusao({ temSenha: true, email: 'a@b.c', senha: '', emailConfirma: '' }), 'Informe a senha atual.')
  assert.equal(confirmaExclusao({ temSenha: true, email: 'a@b.c', senha: 'x', emailConfirma: '' }), null)
})

test('exclusão Google exige o e-mail da conta', () => {
  assert.equal(
    confirmaExclusao({ temSenha: false, email: 'eu@x.com', senha: '', emailConfirma: '' }),
    'Digite o e-mail da conta para confirmar.',
  )
  assert.equal(
    confirmaExclusao({ temSenha: false, email: 'eu@x.com', senha: '', emailConfirma: 'outro@x.com' }),
    'Digite o e-mail da conta para confirmar.',
  )
  assert.equal(
    confirmaExclusao({ temSenha: false, email: 'Eu@x.com', senha: '', emailConfirma: ' eu@x.com ' }),
    null,
  )
})
