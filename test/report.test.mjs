// Única lógica não-trivial do app: a análise de gatilhos do Relatório.
// Fixture = as 4 crises seed do protótipo do handoff (linhas 163-168), e os números
// esperados são os do screenshot 04-relatorio.png.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analisar, textoRelatorio, recorrentes } from '../src/report.js'
import { itensDe } from '../src/tokens.js'
import { fmtDuracao, fmtSono, fmtDataHist, fmtEyebrow } from '../src/format.js'

const c = (inicio, fim, o) => ({
  inicio, fim, sintomas: [], gatilhos: [], detalhes: {}, medicacao: '', alivio: null, ...o,
})

const SEEDS = [
  c('2025-08-05T18:21:00Z', '2025-08-05T21:05:00Z', { intensidade: 'Intensa', localizacao: 'Bilateral', carater: 'Pulsátil', sintomas: ['Náusea', 'Fotofobia'], sono_horas: 6.5, gatilhos: ['Estresse'], medicacao: 'Ibuprofeno 400 mg', alivio: 'Parcial' }),
  c('2025-08-01T14:10:00Z', '2025-08-01T15:20:00Z', { intensidade: 'Moderada', localizacao: 'Dir.', carater: 'Pressão', sintomas: ['Fonofobia'], sono_horas: 7.5, gatilhos: ['Estresse'], medicacao: 'Dipirona 500 mg', alivio: 'Total' }),
  c('2025-07-27T09:40:00Z', '2025-07-27T10:25:00Z', { intensidade: 'Leve', localizacao: 'Esq.', carater: 'Pulsátil', sono_horas: 8, gatilhos: ['Mudança climática'] }),
  c('2025-07-23T19:00:00Z', '2025-07-23T22:10:00Z', { intensidade: 'Moderada', localizacao: 'Bilateral', carater: 'Pressão', sintomas: ['Fotofobia', 'Náusea'], sono_horas: 5.5, gatilhos: ['Estresse', 'Alimentação'], medicacao: 'Ibuprofeno 400 mg', alivio: 'Parcial' }),
]

test('gatilhos batem com o screenshot 04-relatorio.png', () => {
  const { gatilhos } = analisar(SEEDS)
  assert.deepEqual(
    gatilhos.map((g) => [g.label, g.pct]),
    [['Estresse', 75], ['Sono < 7h', 50], ['Mudança climática', 25], ['Alimentação', 25]],
  )
})

test('insight cita o gatilho do topo', () => {
  assert.equal(
    analisar(SEEDS).insight,
    '75% das crises ocorreram com "Estresse" presente — o gatilho mais frequente do período.',
  )
})

test('insight avisa quando nenhum gatilho aparece', () => {
  const semGatilho = SEEDS.map((s) => ({ ...s, gatilhos: [], sono_horas: 8 }))
  assert.equal(analisar(semGatilho).insight, 'Ainda sem um gatilho dominante — continue registrando.')
})

test('estatísticas: 1/mês e 1h57', () => {
  const { frequencia, duracaoMedia } = analisar(SEEDS)
  assert.equal(frequencia, 1)
  assert.equal(duracaoMedia, 117) // (164+70+45+190)/4
  assert.equal(fmtDuracao(duracaoMedia), '1h57')
})

test('crise em andamento não entra na duração média', () => {
  const comAberta = [...SEEDS, c('2025-08-06T10:00:00Z', null, { intensidade: 'Leve', localizacao: 'Esq.', carater: 'Pressão', sono_horas: 8 })]
  assert.equal(analisar(comAberta).duracaoMedia, 117)
})

test('duração média é null quando nada foi encerrado', () => {
  const abertas = [SEEDS[0], SEEDS[1]].map((s) => ({ ...s, fim: null }))
  assert.equal(analisar(abertas).duracaoMedia, null)
})

test('formatação de duração e sono', () => {
  assert.equal(fmtDuracao(45), '45 min')
  assert.equal(fmtDuracao(164), '2h44')
  assert.equal(fmtDuracao(120), '2h')
  assert.equal(fmtSono(6.5), '6h30')
  assert.equal(fmtSono(8), '8h')
})

test('datas pt-BR no formato do design (o ICU insere um "de" que o iOS não tem)', () => {
  const d = new Date(2025, 7, 5, 18, 21) // ter, 5 de agosto de 2025, hora local
  assert.equal(fmtDataHist(d), 'ter, 5 ago')
  assert.equal(fmtEyebrow(d), 'ter, 5 de agosto')
})

// O caso do César: 3 crises de Alimentação, "leite" em 2 delas.
const ALIMENTACAO = [
  c('2025-08-05T18:00:00Z', '2025-08-05T19:00:00Z', { intensidade: 'Leve', localizacao: 'Esq.', carater: 'Pressão', sono_horas: 8, gatilhos: ['Alimentação'], detalhes: { 'Alimentação': ['sopa', 'alho', 'frango', 'milho', 'batata'] } }),
  c('2025-08-03T18:00:00Z', '2025-08-03T19:00:00Z', { intensidade: 'Leve', localizacao: 'Esq.', carater: 'Pressão', sono_horas: 8, gatilhos: ['Alimentação'], detalhes: { 'Alimentação': ['sucrilhos', 'leite'] } }),
  c('2025-08-01T18:00:00Z', '2025-08-01T19:00:00Z', { intensidade: 'Leve', localizacao: 'Esq.', carater: 'Pressão', sono_horas: 8, gatilhos: ['Alimentação'], detalhes: { 'Alimentação': ['Leite', 'chocolate'] } }),
]

test('acha o item que se repete entre crises do mesmo gatilho', () => {
  assert.deepEqual(
    recorrentes(ALIMENTACAO, 'Alimentação').map((r) => [r.item, r.n, r.de]),
    [['leite', 2, 3]], // "Leite" e "leite" contam como o mesmo item
  )
})

test('item que aparece uma vez só não é recorrência', () => {
  const itens = recorrentes(ALIMENTACAO, 'Alimentação').map((r) => r.item)
  for (const unico of ['sopa', 'alho', 'frango', 'milho', 'batata', 'sucrilhos', 'chocolate']) {
    assert.ok(!itens.includes(unico), `${unico} não deveria aparecer`)
  }
})

test('repetir o item na mesma crise não vira recorrência', () => {
  const uma = [c('2025-08-05T18:00:00Z', '2025-08-05T19:00:00Z', { intensidade: 'Leve', localizacao: 'Esq.', carater: 'Pressão', sono_horas: 8, gatilhos: ['Alimentação'], detalhes: { 'Alimentação': ['leite', 'leite', 'LEITE'] } })]
  assert.deepEqual(recorrentes(uma, 'Alimentação'), [])
})

test('só conta crises em que o gatilho estava presente', () => {
  const misto = [...ALIMENTACAO, c('2025-07-20T18:00:00Z', '2025-07-20T19:00:00Z', { intensidade: 'Leve', localizacao: 'Esq.', carater: 'Pressão', sono_horas: 8, gatilhos: ['Estresse'], detalhes: { 'Estresse': ['prova'] } })]
  assert.equal(recorrentes(misto, 'Alimentação')[0].de, 3) // 3, não 4
})

test('Sono < 7h não tem itens (é numérico)', () => {
  assert.deepEqual(recorrentes(ALIMENTACAO, null), [])
  const sono = analisar(ALIMENTACAO).gatilhos.find((g) => g.label === 'Sono < 7h')
  assert.deepEqual(sono.recorrentes, [])
})

test('recorrentes aparecem no texto para o médico', () => {
  assert.match(textoRelatorio(ALIMENTACAO), /Alimentação: 100%\n {4}recorrente: leite \(2 de 3\)/)
})

test('itensDe limpa espaço e vírgula sobrando', () => {
  assert.deepEqual(itensDe(' alho, frango,, batata '), ['alho', 'frango', 'batata'])
  assert.deepEqual(itensDe(''), [])
  assert.deepEqual(itensDe(undefined), [])
})

test('crises sem detalhes não quebram a análise', () => {
  assert.deepEqual(recorrentes(SEEDS, 'Estresse'), [])
  assert.equal(analisar(SEEDS).gatilhos[0].pct, 75)
})

test('texto compartilhado traz insight, gatilhos e as crises', () => {
  const t = textoRelatorio(SEEDS)
  assert.match(t, /INSIGHT: 75% das crises ocorreram com "Estresse"/)
  assert.match(t, /Estresse: 75%/)
  assert.match(t, /Duração média: 1h57/)
  assert.match(t, /CRISES \(4\):/)
  assert.match(t, /℞ Ibuprofeno 400 mg · alívio parcial/)
})
