// A fila que serializa as escritas da crise em andamento. Sem ela, dois cliques rápidos
// num sintoma partem do mesmo array e o segundo PATCH apaga o primeiro.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serial } from '../src/serial.ts'

// Escritas que resolvem fora de ordem: a primeira demora mais que a segunda.
const fakeAtualizar = (log: string[][], atrasos: number[]) => (patch: { sintomas: string[] }) =>
  new Promise<boolean>((r) => setTimeout(() => { log.push(patch.sintomas); r(true) }, atrasos.shift()))

test('as escritas chegam na ordem, mesmo resolvendo fora de ordem', async () => {
  const log: string[][] = []
  const atualizar = fakeAtualizar(log, [30, 1])
  const enfileirar = serial()

  enfileirar(() => atualizar({ sintomas: ['Náusea'] }))
  const ultima = enfileirar(() => atualizar({ sintomas: ['Náusea', 'Aura'] }))
  await ultima

  assert.deepEqual(log, [['Náusea'], ['Náusea', 'Aura']])
})

test('uma escrita que falha não trava a fila', async () => {
  const feitas: string[] = []
  const enfileirar = serial()

  enfileirar(() => Promise.reject(new Error('rede caiu')))
  await enfileirar(() => { feitas.push('depois'); return Promise.resolve() })

  assert.deepEqual(feitas, ['depois'])
})
