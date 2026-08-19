// O que acontece com a lista quando chega um evento do Realtime do outro celular.
// Sem isso, a crise registrada num aparelho não aparece no outro sem fechar o app.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aplicar } from '../src/sync.ts'
import type { Crise } from '../src/lib/tipos.ts'

const crise = (id: string, inicio: string, extra: Partial<Crise> = {}): Crise => ({
  id, inicio, fim: null, user_id: 'u1', paciente_id: 'p1',
  intensidade: 'Moderada', localizacao: 'Bilateral', carater: 'Pulsátil',
  sintomas: [], sono_horas: 8, gatilhos: [], detalhes: {}, medicacao: '', alivio: null,
  ...extra,
})

// O payload real tem mais campos (schema, commit_timestamp…), mas `aplicar` só lê estes.
const evento = (eventType: 'INSERT' | 'UPDATE' | 'DELETE', linha: Partial<Crise>) =>
  ({ eventType, new: linha, old: linha }) as never

const A = crise('a', '2025-08-05T18:00:00Z')
const B = crise('b', '2025-08-01T14:00:00Z')

test('crise criada no outro aparelho entra na lista, na ordem', () => {
  const nova = crise('c', '2025-08-10T09:00:00Z')
  assert.deepEqual(aplicar([A, B], evento('INSERT', nova)).map((c) => c.id), ['c', 'a', 'b'])
})

test('crise antiga chegando por INSERT não vai parar no topo', () => {
  const antiga = crise('c', '2025-07-01T09:00:00Z')
  assert.deepEqual(aplicar([A, B], evento('INSERT', antiga)).map((c) => c.id), ['a', 'b', 'c'])
})

test('o eco da nossa própria escrita não duplica a crise', () => {
  assert.deepEqual(aplicar([A, B], evento('INSERT', A)).map((c) => c.id), ['a', 'b'])
})

test('UPDATE troca a linha e mantém o resto intacto', () => {
  const encerrada = { ...A, fim: '2025-08-05T21:00:00Z', alivio: 'Parcial' as const }
  const depois = aplicar([A, B], evento('UPDATE', encerrada))
  assert.deepEqual(depois.map((c) => c.id), ['a', 'b'])
  assert.equal(depois[0]!.fim, '2025-08-05T21:00:00Z')
  assert.equal(depois[1]!.fim, null)
})

test('UPDATE de crise desconhecida entra (o aparelho estava sem rede quando ela nasceu)', () => {
  const nunca_vista = crise('c', '2025-08-10T09:00:00Z', { medicacao: 'Dipirona' })
  assert.deepEqual(aplicar([A], evento('UPDATE', nunca_vista)).map((c) => c.id), ['c', 'a'])
})

test('DELETE remove pelo id', () => {
  assert.deepEqual(aplicar([A, B], evento('DELETE', { id: 'a' })).map((c) => c.id), ['b'])
})

test('DELETE de crise que não temos não mexe na lista', () => {
  assert.deepEqual(aplicar([A, B], evento('DELETE', { id: 'z' })).map((c) => c.id), ['a', 'b'])
})

test('sono_horas que chega como string vira número', () => {
  // O `numeric` do Postgres sai como string no JSON; o relatório compara com < 7.
  const comString = { ...A, sono_horas: '6.5' } as unknown as Crise
  assert.equal(aplicar([B], evento('INSERT', comString))[0]!.sono_horas, 6.5)
})

test('o mesmo evento duas vezes dá o mesmo resultado', () => {
  const nova = crise('c', '2025-08-10T09:00:00Z')
  const uma = aplicar([A, B], evento('INSERT', nova))
  assert.deepEqual(aplicar(uma, evento('INSERT', nova)), uma)
})
