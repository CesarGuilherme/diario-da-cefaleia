import type { Crise } from './lib/tipos.ts'

// Formatação pt-BR. Espelha Components.swift do app iOS e as linhas 192-193 do protótipo.

const PT = 'pt-BR'
const semPonto = (s: string) => s.replace(/\./g, '')

// "ter, 5 de agosto"
export const fmtEyebrow = (d: Date) =>
  semPonto(d.toLocaleDateString(PT, { weekday: 'short', day: 'numeric', month: 'long' }))

// "ter, 5 ago" — o ICU atual devolve "ter., 5 de ago."; o formatter do iOS (EEE, d MMM)
// não tem o "de", então tiramos para bater com o design.
export const fmtDataHist = (d: Date) =>
  semPonto(d.toLocaleDateString(PT, { weekday: 'short', day: 'numeric', month: 'short' }))
    .replace(' de ', ' ')

// "18:21"
export const fmtHora = (d: Date) => d.toLocaleTimeString(PT, { hour: '2-digit', minute: '2-digit' })

// 45 -> "45 min" | 164 -> "2h44" | 120 -> "2h"
export function fmtDuracao(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), mm = min % 60
  return `${h}h${mm ? String(mm).padStart(2, '0') : ''}`
}

// 6.5 -> "6h30" | 8 -> "8h"
export const fmtSono = (v: number) => `${Math.floor(v)}h${v % 1 ? '30' : ''}`

// Cronômetro: "12:34" abaixo de 1h, "2:05" (h:mm) depois.
export function fmtDecorrido(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000)
  if (s >= 3600) return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// "10 ago" — rótulo curto do eixo do gráfico diário.
export const fmtDiaEixo = (d: Date) =>
  semPonto(d.toLocaleDateString(PT, { day: 'numeric', month: 'short' })).replace(' de ', ' ')

// "ago/25" — mês + ano, porque o gráfico mensal atravessa a virada do ano.
export const fmtMes = (d: Date) =>
  `${semPonto(d.toLocaleDateString(PT, { month: 'short' }))}/${String(d.getFullYear()).slice(2)}`

// data_nascimento ('2014-03-22') -> 11
export function idade(iso: string | null | undefined, hoje = new Date()): number | null {
  if (!iso) return null
  const [a, m, d] = iso.split('-').map(Number) as [number, number, number]
  let anos = hoje.getFullYear() - a
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos -= 1
  return anos
}

export const duracaoMin = (crise: Pick<Crise, 'inicio' | 'fim'>): number | null =>
  crise.fim
    ? Math.max(1, Math.round((new Date(crise.fim).getTime() - new Date(crise.inicio).getTime()) / 60000))
    : null
