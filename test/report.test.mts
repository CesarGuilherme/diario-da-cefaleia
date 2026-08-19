// Única lógica não-trivial do app: a análise de gatilhos do Relatório.
// Fixture = as 4 crises seed do protótipo do handoff (linhas 163-168), e os números
// esperados são os do screenshot 04-relatorio.png.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analisar, textoRelatorio, recorrentes, porMes, porDia, snapshotRelatorio } from '../src/report.ts'
import { itensDe, paraForm, paraBanco } from '../src/tokens.ts'
import { fmtDuracao, fmtSono, fmtDataHist, fmtEyebrow, idade } from '../src/format.ts'
import type { CriseSnapshot } from '../src/lib/tipos.ts'

// O que toda crise da fixture precisa dizer; o resto tem padrão.
type Obrigatorios = Pick<CriseSnapshot, 'intensidade' | 'localizacao' | 'carater' | 'sono_horas'>

const c = (inicio: string, fim: string | null, o: Obrigatorios & Partial<CriseSnapshot>): CriseSnapshot => ({
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
  const abertas = [SEEDS[0]!, SEEDS[1]!].map((s) => ({ ...s, fim: null }))
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
  assert.equal(recorrentes(misto, 'Alimentação')[0]!.de, 3) // 3, não 4
})

test('Sono < 7h não tem itens (é numérico)', () => {
  assert.deepEqual(recorrentes(ALIMENTACAO, null), [])
  const sono = analisar(ALIMENTACAO).gatilhos.find((g) => g.label === 'Sono < 7h')
  assert.deepEqual(sono!.recorrentes, [])
})

test('recorrentes aparecem no texto para o médico', () => {
  assert.match(textoRelatorio(ALIMENTACAO), /Alimentação: 100%\n {4}recorrente: leite \(2 de 3\)/)
})

test('dias com e sem crise por mês', () => {
  // SEEDS: 23 e 27 de julho, 1 e 5 de agosto.
  assert.deepEqual(
    porMes(SEEDS, new Date(2025, 7, 31)).map((m) => [m.mes, m.com, m.sem, m.total]),
    [['jul/25', 2, 29, 31], ['ago/25', 2, 29, 31]],
  )
})

test('mês corrente conta só os dias já vividos', () => {
  const ago = porMes(SEEDS, new Date(2025, 7, 10)).at(-1)
  assert.deepEqual([ago!.mes, ago!.com, ago!.sem, ago!.total], ['ago/25', 2, 8, 10])
})

test('mês sem nenhuma crise entra com zero', () => {
  const meses = porMes([SEEDS[0]!, { ...SEEDS[3]!, inicio: '2025-06-10T12:00:00Z' }], new Date(2025, 7, 31))
  assert.deepEqual(meses.map((m) => [m.mes, m.com]), [['jun/25', 1], ['jul/25', 0], ['ago/25', 1]])
})

test('duas crises no mesmo dia contam um dia só', () => {
  const mesmoDia = [SEEDS[0]!, { ...SEEDS[0]!, inicio: '2025-08-05T22:00:00Z' }]
  assert.equal(porMes(mesmoDia, new Date(2025, 7, 31))[0]!.com, 1)
})

test('sem crise nenhuma não há meses', () => {
  assert.deepEqual(porMes([]), [])
})

// porDia usa a convenção oposta à de porMes: soma as crises do dia em vez de contar dias.
// Datas locais (`new Date(a, m, d, h)`) porque o dia sai do fuso do usuário, não do UTC.
const dia = (mes: number, d: number, hora: number) => new Date(2025, mes - 1, d, hora).toISOString()

test('porDia: dois dias distintos', () => {
  const dias = porDia(
    [{ ...SEEDS[0]!, inicio: dia(8, 1, 10) }, { ...SEEDS[1]!, inicio: dia(8, 5, 14) }],
    new Date(2025, 7, 5),
  )
  assert.equal(dias.at(0)!.n, 1)
  assert.equal(dias.at(-1)!.n, 1)
  assert.equal(dias.reduce((a, d) => a + d.n, 0), 2)
})

test('porDia: duas crises no mesmo dia somam', () => {
  const dias = porDia(
    [{ ...SEEDS[0]!, inicio: dia(8, 5, 10) }, { ...SEEDS[1]!, inicio: dia(8, 5, 22) }],
    new Date(2025, 7, 5),
  )
  assert.equal(dias.length, 1)
  assert.equal(dias[0]!.n, 2)
})

test('porDia: dia sem crise no meio entra com zero', () => {
  const dias = porDia(
    [{ ...SEEDS[0]!, inicio: dia(8, 1, 10) }, { ...SEEDS[1]!, inicio: dia(8, 3, 10) }],
    new Date(2025, 7, 3),
  )
  assert.deepEqual(dias.map((d) => d.n), [1, 0, 1])
})

test('porDia: lista vazia', () => {
  assert.deepEqual(porDia([]), [])
})

test('idade sai do nascimento (sem contar o aniversário que não chegou)', () => {
  assert.equal(idade('2014-03-22', new Date(2026, 1, 10)), 11)
  assert.equal(idade('2014-03-22', new Date(2026, 2, 22)), 12)
  assert.equal(idade(null), null)
})

test('texto para o médico traz paciente e os dias por mês', () => {
  const t = textoRelatorio(SEEDS, { nome: 'Manu', data_nascimento: '2014-03-22' })
  assert.match(t, /^Paciente: Manu \(\d+ anos\)$/m)
  assert.match(t, /DIAS POR MÊS:\n {2}jul\/25: 2 com crise, 29 sem \(de 31\)/)
})

test('itensDe limpa espaço e vírgula sobrando', () => {
  assert.deepEqual(itensDe(' alho, frango,, batata '), ['alho', 'frango', 'batata'])
  assert.deepEqual(itensDe(''), [])
  assert.deepEqual(itensDe(undefined), [])
})

test('editar histórico: banco -> form -> banco não perde nem inventa nada', () => {
  const c = ALIMENTACAO[0]!
  const form = paraForm(c)
  assert.equal(form.detalhes['Alimentação'], 'sopa, alho, frango, milho, batata')
  const volta = paraBanco(form)
  assert.deepEqual(volta.detalhes, c.detalhes)
  assert.deepEqual(volta.sintomas, c.sintomas)
  assert.equal(volta.intensidade, c.intensidade)
  // inicio/fim/alivio não são campos do form — o update não pode sobrescrevê-los.
  for (const k of ['inicio', 'fim', 'alivio', 'id', 'paciente_id']) assert.ok(!(k in volta), k)
})

test('editar histórico: desligar o gatilho joga o detalhe fora', () => {
  const form = { ...paraForm(ALIMENTACAO[0]!), gatilhos: [] }
  assert.deepEqual(paraBanco(form).detalhes, {})
})

test('editar histórico: sintoma novo entra sem mexer no resto', () => {
  const form = paraForm(SEEDS[0]!)
  form.sintomas = [...form.sintomas, 'Aura']
  assert.deepEqual(paraBanco(form).sintomas, ['Náusea', 'Fotofobia', 'Aura'])
  assert.deepEqual(paraForm(SEEDS[0]!).sintomas, ['Náusea', 'Fotofobia']) // não mutou a crise original
})

test('crises sem detalhes não quebram a análise', () => {
  assert.deepEqual(recorrentes(SEEDS, 'Estresse'), [])
  assert.equal(analisar(SEEDS).gatilhos[0]!.pct, 75)
})

test('texto compartilhado traz insight, gatilhos e as crises', () => {
  const t = textoRelatorio(SEEDS)
  assert.match(t, /INSIGHT: 75% das crises ocorreram com "Estresse"/)
  assert.match(t, /Estresse: 75%/)
  assert.match(t, /Duração média: 1h57/)
  assert.match(t, /CRISES \(4\):/)
  assert.match(t, /℞ Ibuprofeno 400 mg · alívio parcial/)
})

// O snapshot é o que vai para o link público — o que ele não carrega importa tanto quanto
// o que carrega.
const PACIENTE = { id: 'p1', user_id: 'u1', nome: 'Noah', data_nascimento: '2014-03-22', criado_em: 'x' }
const LINHAS = SEEDS.map((c, i) => ({ ...c, id: `c${i}`, user_id: 'u1', paciente_id: 'p1' }))

test('snapshot não leva id, user_id, paciente_id nem data de nascimento', () => {
  const snap = snapshotRelatorio(LINHAS, PACIENTE, new Date(2026, 1, 10))
  const texto = JSON.stringify(snap)
  for (const proibido of ['user_id', 'paciente_id', '"id"', 'data_nascimento', '2014-03-22']) {
    assert.equal(texto.includes(proibido), false, `snapshot vazou ${proibido}`)
  }
  assert.deepEqual(snap.paciente, { nome: 'Noah', idade: 11 })
  assert.equal(snap.gerado_em, new Date(2026, 1, 10).toISOString())
})

test('snapshot alimenta o mesmo relatório da tela', () => {
  const snap = snapshotRelatorio(LINHAS, PACIENTE, new Date(2025, 7, 31))
  assert.deepEqual(
    analisar(snap.crises).gatilhos.map((g) => [g.label, g.pct]),
    analisar(SEEDS).gatilhos.map((g) => [g.label, g.pct]),
  )
  assert.deepEqual(
    porDia(snap.crises, new Date(2025, 7, 31)).map((d) => d.n),
    porDia(SEEDS, new Date(2025, 7, 31)).map((d) => d.n),
  )
})
