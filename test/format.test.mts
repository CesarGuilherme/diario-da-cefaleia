// Formatação pt-BR e as contas de data. `idade` tem a lógica de virada de aniversário
// (o -1 quando ainda não fez anos este ano); o resto é conversão de unidade.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { idade, duracaoMin, fmtDuracao, fmtSono, fmtDecorrido } from '../src/format.ts'

const em = (ano: number, mes1a12: number, dia: number) => new Date(ano, mes1a12 - 1, dia)

test('idade: sem data de nascimento não há idade', () => {
  assert.equal(idade(null), null)
  assert.equal(idade(undefined), null)
  assert.equal(idade(''), null)
})

test('idade: aniversário já passou este ano', () => {
  assert.equal(idade('2014-03-22', em(2026, 9, 1)), 12)
})

test('idade: aniversário ainda vai chegar este ano', () => {
  assert.equal(idade('2014-12-25', em(2026, 9, 1)), 11)
})

test('idade: no dia do aniversário já conta o ano', () => {
  assert.equal(idade('2000-09-01', em(2026, 9, 1)), 26)
})

test('idade: um dia antes do aniversário ainda não conta', () => {
  assert.equal(idade('2000-09-02', em(2026, 9, 1)), 25)
})

test('idade: nascido em 29/fev, ano não bissexto', () => {
  assert.equal(idade('2000-02-29', em(2027, 2, 28)), 26)
  assert.equal(idade('2000-02-29', em(2027, 3, 1)), 27)
})

test('duracaoMin: crise sem fim está em andamento', () => {
  assert.equal(duracaoMin({ inicio: '2026-09-01T10:00:00Z', fim: null }), null)
})

test('duracaoMin: minutos arredondados, nunca menos que 1', () => {
  assert.equal(duracaoMin({ inicio: '2026-09-01T10:00:00Z', fim: '2026-09-01T12:44:00Z' }), 164)
  assert.equal(duracaoMin({ inicio: '2026-09-01T10:00:00Z', fim: '2026-09-01T10:00:20Z' }), 1)
})

test('fmtDuracao: minutos abaixo de 1h, horas com minutos zero-padded', () => {
  assert.equal(fmtDuracao(45), '45 min')
  assert.equal(fmtDuracao(120), '2h')
  assert.equal(fmtDuracao(125), '2h05')
  assert.equal(fmtDuracao(164), '2h44')
})

test('fmtSono: meia hora vira "h30"', () => {
  assert.equal(fmtSono(8), '8h')
  assert.equal(fmtSono(6.5), '6h30')
})

test('fmtDecorrido: mm:ss abaixo de 1h, h:mm depois, nunca negativo', () => {
  assert.equal(fmtDecorrido(90 * 1000), '1:30')
  assert.equal(fmtDecorrido(3661 * 1000), '1:01')
  assert.equal(fmtDecorrido(-5000), '0:00')
})
