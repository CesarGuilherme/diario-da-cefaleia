// Toda a lógica do Relatório, pura e sem React — é a única coisa não-trivial do app,
// e é o que test/report.test.mjs cobre. Portado do protótipo (linhas 267-282).

import { fmtDuracao, fmtDataHist, fmtHora, fmtMes, duracaoMin, idade } from './format.js'

// O 2º item é a chave do gatilho em `gatilhos`/`detalhes` — null para "Sono < 7h",
// que é numérico e não tem itens.
const DEFS = [
  ['Sono < 7h', null,
    'linear-gradient(90deg,#6c5ce7,#8b7cfc)', '#8b7cfc', '0 2px 8px rgba(124,108,246,.5)'],
  ['Estresse', 'Estresse',
    'linear-gradient(90deg,#3f9bfd,#5ec8f8)', 'rgba(235,235,245,.8)', 'none'],
  ['Mudança climática', 'Mudança climática',
    'linear-gradient(90deg,#2fb8a6,#5ee6c8)', 'rgba(235,235,245,.8)', 'none'],
  ['Alimentação', 'Alimentação',
    'linear-gradient(90deg,#8e8e93,#aeaeb2)', 'rgba(235,235,245,.8)', 'none'],
]

const presente = (gatilho) =>
  gatilho === null ? (c) => c.sono_horas < 7 : (c) => c.gatilhos.includes(gatilho)

// Compara ignorando caixa e acento, para "Leite" e "leite" contarem como o mesmo item.
const chave = (s) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/**
 * Itens que se repetem entre as crises de um gatilho — o "leite em 2 de 3".
 * Conta uma vez por crise (repetir na mesma crise não vira recorrência).
 */
export function recorrentes(crises, gatilho) {
  if (!gatilho) return []
  const comGatilho = crises.filter(presente(gatilho))
  const conta = new Map()
  for (const c of comGatilho) {
    const vistos = new Set()
    for (const item of c.detalhes?.[gatilho] ?? []) {
      const k = chave(item)
      if (!k || vistos.has(k)) continue
      vistos.add(k)
      const e = conta.get(k) ?? { item: item.trim(), n: 0 }
      e.n += 1
      conta.set(k, e)
    }
  }
  return [...conta.values()]
    .filter((e) => e.n >= 2)
    .sort((a, b) => b.n - a.n || a.item.localeCompare(b.item))
    .map((e) => ({ ...e, de: comGatilho.length }))
}

/**
 * Dias com e sem crise, mês a mês, do mês da primeira crise até o mês corrente
 * (meses vazios no meio entram com 0 — é justamente o mês bom que o médico quer ver).
 * ponytail: conta o dia do `inicio`; crise que atravessa a meia-noite conta 1 dia só.
 */
export function porMes(crises, hoje = new Date()) {
  if (!crises.length) return []
  const dias = new Map()   // 'YYYY-MM' -> Set de dias do mês com crise
  let primeira = null
  for (const c of crises) {
    const d = new Date(c.inicio)
    if (!primeira || d < primeira) primeira = d
    const k = `${d.getFullYear()}-${d.getMonth()}`
    if (!dias.has(k)) dias.set(k, new Set())
    dias.get(k).add(d.getDate())
  }

  const meses = []
  const cur = new Date(primeira.getFullYear(), primeira.getMonth(), 1)
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  while (cur <= ultimo) {
    const k = `${cur.getFullYear()}-${cur.getMonth()}`
    // Mês corrente conta só os dias já vividos, senão "sem crise" vira promessa de futuro.
    const total = cur.getTime() === ultimo.getTime()
      ? hoje.getDate()
      : new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate()
    const com = dias.get(k)?.size ?? 0
    meses.push({ mes: fmtMes(cur), com, sem: total - com, total })
    cur.setMonth(cur.getMonth() + 1)
  }
  return meses
}

export function analisar(crises) {
  const n = crises.length
  const gatilhos = DEFS
    .map(([label, gatilho, grad, valColor, sh]) => ({
      label, grad, valColor, sh,
      pct: Math.round((100 * crises.filter(presente(gatilho)).length) / n),
      recorrentes: recorrentes(crises, gatilho),
    }))
    .sort((a, b) => b.pct - a.pct)

  const top = gatilhos[0]
  const insight = top && top.pct > 0
    ? `${top.pct}% das crises ocorreram com "${top.label}" presente — o gatilho mais frequente do período.`
    : 'Ainda sem um gatilho dominante — continue registrando.'

  // ponytail: frequência assume janela fixa de ~90 dias, igual ao iOS. Trocar por
  // bucket real de mês quando existir filtro de período (hoje "período" = tudo).
  const frequencia = Math.max(1, Math.round(n / 3))

  const duracoes = crises.map(duracaoMin).filter((d) => d !== null)
  const duracaoMedia = duracoes.length
    ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length)
    : null

  return { gatilhos, insight, frequencia, duracaoMedia }
}

// Texto compartilhado com o médico. Espelha reportText em RelatorioView.swift:37-53.
export function textoRelatorio(crises, paciente = null) {
  const { gatilhos, insight, frequencia, duracaoMedia } = analisar(crises)
  const anos = idade(paciente?.data_nascimento)
  const linhas = [
    'Diário da Cefaléia — Relatório para o médico',
    ...(paciente ? [`Paciente: ${paciente.nome}${anos === null ? '' : ` (${anos} anos)`}`] : []),
    '',
    `INSIGHT: ${insight}`,
    '',
    'GATILHOS:',
    ...gatilhos.flatMap((g) => [
      `  ${g.label}: ${g.pct}%`,
      ...g.recorrentes.map((r) => `    recorrente: ${r.item} (${r.n} de ${r.de})`),
    ]),
    '',
    'ESTATÍSTICAS:',
    `  Frequência: ${frequencia}/mês`,
    `  Duração média: ${duracaoMedia === null ? '—' : fmtDuracao(duracaoMedia)}`,
    '',
    'DIAS POR MÊS:',
    ...porMes(crises).map((m) => `  ${m.mes}: ${m.com} com crise, ${m.sem} sem (de ${m.total})`),
    '',
    `CRISES (${crises.length}):`,
  ]
  for (const c of crises) {
    const ini = new Date(c.inicio)
    const d = duracaoMin(c)
    linhas.push(`  ${fmtDataHist(ini)} ${fmtHora(ini)} — ${c.intensidade}, ${d === null ? 'em andamento' : fmtDuracao(d)}`)
    if (c.medicacao) linhas.push(`    ℞ ${c.medicacao}${c.alivio ? ` · alívio ${c.alivio.toLowerCase()}` : ''}`)
  }
  return linhas.join('\n')
}
