// Toda a lógica do Relatório, pura e sem React — é a única coisa não-trivial do app,
// e é o que test/report.test.mjs cobre. Portado do protótipo (linhas 267-282).

import { fmtDuracao, fmtDataHist, fmtHora, duracaoMin } from './format.js'

const DEFS = [
  ['Sono < 7h', (c) => c.sono_horas < 7,
    'linear-gradient(90deg,#6c5ce7,#8b7cfc)', '#8b7cfc', '0 2px 8px rgba(124,108,246,.5)'],
  ['Estresse', (c) => c.gatilhos.includes('Estresse'),
    'linear-gradient(90deg,#3f9bfd,#5ec8f8)', 'rgba(235,235,245,.8)', 'none'],
  ['Mudança climática', (c) => c.gatilhos.includes('Mudança climática'),
    'linear-gradient(90deg,#2fb8a6,#5ee6c8)', 'rgba(235,235,245,.8)', 'none'],
  ['Alimentação', (c) => c.gatilhos.includes('Alimentação'),
    'linear-gradient(90deg,#8e8e93,#aeaeb2)', 'rgba(235,235,245,.8)', 'none'],
]

export function analisar(crises) {
  const n = crises.length
  const gatilhos = DEFS
    .map(([label, pred, grad, valColor, sh]) => ({
      label, pct: Math.round((100 * crises.filter(pred).length) / n), grad, valColor, sh,
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
export function textoRelatorio(crises) {
  const { gatilhos, insight, frequencia, duracaoMedia } = analisar(crises)
  const linhas = [
    'Diário da Cefaléia — Relatório para o médico',
    '',
    `INSIGHT: ${insight}`,
    '',
    'GATILHOS:',
    ...gatilhos.map((g) => `  ${g.label}: ${g.pct}%`),
    '',
    'ESTATÍSTICAS:',
    `  Frequência: ${frequencia}/mês`,
    `  Duração média: ${duracaoMedia === null ? '—' : fmtDuracao(duracaoMedia)}`,
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
