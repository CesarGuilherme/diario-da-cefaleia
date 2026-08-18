// Os painéis do relatório são exportados um a um: o mobile empilha numa coluna,
// o dashboard desktop distribui em duas. Mesma análise, layouts diferentes.
import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { analisar, textoRelatorio, porMes, porDia } from '../report.js'
import { fmtDuracao, fmtDataHist } from '../format.js'
import { card, titulo, eyebrow, CardVazio } from '../ui.jsx'

/** Crises encerradas necessárias para o relatório dizer algo — regra única, usada nos dois layouts. */
export const MIN_CRISES = 2

function Stat({ rotulo, valor, sufixo, sub }) {
  return (
    <div style={{ ...card, flex: 1, borderRadius: 24, boxShadow: 'inset 1px 1px 1px rgba(255,255,255,.10)' }}>
      <div style={{ fontSize: 13, color: 'rgba(235,235,245,.55)' }}>{rotulo}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}>
        {valor}
        {sufixo && <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(235,235,245,.55)' }}>{sufixo}</span>}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(235,235,245,.45)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

export function Insight({ insight }) {
  return (
    <section style={{
      position: 'relative', borderRadius: 26, overflow: 'hidden', padding: 18,
      border: '.5px solid rgba(255,255,255,.18)', boxShadow: '0 10px 28px rgba(0,0,0,.3)',
      background: 'linear-gradient(135deg,rgba(139,124,252,.32),rgba(108,92,231,.16))',
      backdropFilter: 'blur(24px) saturate(160%)',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
        color: '#b9affe', marginBottom: 8,
      }}>✦ Insight</div>
      <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35 }}>{insight}</div>
    </section>
  )
}

export function Gatilhos({ gatilhos }) {
  return (
    <section style={{ ...card, padding: 18 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>Possíveis gatilhos</h2>
      <div style={{ fontSize: 13, color: 'rgba(235,235,245,.5)', marginBottom: 16 }}>
        % das crises em que o fator estava presente
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {gatilhos.map((g) => (
          <div key={g.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{g.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: g.valColor }}>{g.pct}%</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: 'rgba(120,120,128,.22)' }}>
              <div style={{ width: `${g.pct}%`, height: 10, borderRadius: 999, background: g.grad, boxShadow: g.sh }} />
            </div>
            {g.recorrentes.length > 0 && (
              <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'rgba(235,235,245,.45)' }}>se repete:</span>
                {g.recorrentes.map((r) => (
                  <span key={r.item} style={{
                    padding: '3px 9px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    color: '#c9c2fd', background: 'rgba(124,108,246,.18)',
                    border: '.5px solid rgba(124,108,246,.35)',
                  }}>{r.item} <span style={{ fontWeight: 400, opacity: .7 }}>{r.n} de {r.de}</span></span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export function Estatisticas({ frequencia, duracaoMedia }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <Stat rotulo="Frequência" valor={frequencia} sufixo="/mês" sub="média do período" />
      <Stat rotulo="Duração média" valor={duracaoMedia === null ? '—' : fmtDuracao(duracaoMedia)} sub="por crise" />
    </div>
  )
}

// Dias com/sem crise por mês. Barra empilhada em CSS — o mês tem no máximo 31 dias,
// não precisa de biblioteca de gráfico pra isso. As barras crescem com a coluna,
// então no desktop cabem mais meses sem mudar nada.
export function DiasPorMes({ crises }) {
  const meses = porMes(crises)
  if (!meses.length) return null
  return (
    <section style={{ ...card, padding: 18 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>Dias por mês</h2>
      <div style={{ fontSize: 13, color: 'rgba(235,235,245,.5)', marginBottom: 16 }}>
        <span style={{ color: '#ff9f9a' }}>■</span> com crise{' · '}
        <span style={{ color: 'rgba(235,235,245,.35)' }}>■</span> sem crise
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {meses.map((m) => (
          // maxWidth para um mês só não virar um bloco do tamanho do card.
          <div key={m.mes} style={{ flex: '1 0 40px', maxWidth: 76, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ff9f9a' }}>{m.com}</div>
            <div style={{
              height: 110, borderRadius: 10, overflow: 'hidden', margin: '4px 0 5px',
              background: 'rgba(120,120,128,.22)', display: 'flex', flexDirection: 'column-reverse',
            }} title={`${m.mes}: ${m.com} com crise, ${m.sem} sem`}>
              <div style={{
                height: `${(100 * m.com) / m.total}%`,
                background: 'linear-gradient(180deg,#ff6961,#ff453a)',
                boxShadow: '0 -2px 8px rgba(255,69,58,.5)',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(235,235,245,.45)' }}>{m.mes}</div>
            <div style={{ fontSize: 11, color: 'rgba(235,235,245,.35)' }}>{m.sem} sem</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// Crises por dia, do primeiro registro até hoje. Uma barra por dia num viewBox em
// coordenadas de dado: `rect` escala sem distorcer (linha com stroke, não — sob escala
// não uniforme o WebKit deforma a espessura). Sem biblioteca, igual ao DiasPorMes.
export function CrisesPorDia({ crises }) {
  const dias = porDia(crises)
  if (!dias.length) return null
  const maxN = Math.max(1, ...dias.map((d) => d.n))
  const comCrise = dias.filter((d) => d.n > 0).length

  return (
    <section style={{ ...card, padding: 18 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>Crises por dia</h2>
      <div style={{ fontSize: 13, color: 'rgba(235,235,245,.5)', marginBottom: 16 }}>
        {comCrise} de {dias.length} {dias.length === 1 ? 'dia' : 'dias'} com crise · pico de{' '}
        {maxN} {maxN === 1 ? 'crise' : 'crises'} num dia
      </div>
      <div style={{
        height: 120, borderRadius: 10, padding: '6px 8px', boxSizing: 'border-box',
        background: 'rgba(0,0,0,.22)', border: '.5px solid rgba(255,255,255,.08)',
      }}>
        <svg viewBox={`0 0 ${dias.length} ${maxN}`} preserveAspectRatio="none" role="img"
          aria-label={`${comCrise} de ${dias.length} dias com crise, pico de ${maxN} num dia`}
          style={{ width: '100%', height: '100%', display: 'block' }}>
          {/* ponytail: uma barra por dia; passar de ~400 dias afina a barra abaixo de 1px
              — agrupar por semana quando alguém chegar lá. */}
          {dias.map((d, i) => d.n > 0 && (
            <rect key={d.dia.getTime()} x={i + 0.1} width="0.8"
              y={maxN - d.n} height={d.n} fill="#ff453a">
              <title>{`${fmtDataHist(d.dia)} · ${d.n} ${d.n === 1 ? 'crise' : 'crises'}`}</title>
            </rect>
          ))}
        </svg>
      </div>
    </section>
  )
}

/** Botão + aviso: o estado do compartilhamento pertence ao botão, não à tela. */
export function Compartilhar({ encerradas, paciente }) {
  const [aviso, setAviso] = useState(null)

  const compartilhar = async () => {
    const text = textoRelatorio(encerradas, paciente)
    try {
      if (navigator.share) await navigator.share({ title: 'Diário da Cefaléia', text })
      else {
        await navigator.clipboard.writeText(text)
        setAviso('Relatório copiado para a área de transferência.')
      }
    } catch (e) {
      if (e.name !== 'AbortError') setAviso('Não foi possível compartilhar.')
    }
  }

  return (
    <>
      <button type="button" onClick={compartilhar} style={{
        height: 54, borderRadius: 999, cursor: 'pointer', width: '100%', boxSizing: 'border-box',
        background: 'rgba(120,120,128,.24)', backdropFilter: 'blur(12px) saturate(180%)',
        border: '.5px solid rgba(255,255,255,.18)', boxShadow: 'inset 1.5px 1.5px 1px rgba(255,255,255,.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
      }}>↑ Compartilhar com o médico</button>

      {aviso && (
        <div role="status" style={{ textAlign: 'center', fontSize: 13, color: 'rgba(235,235,245,.6)' }}>{aviso}</div>
      )}
    </>
  )
}

export function CabecalhoRelatorio({ n, carregando }) {
  return (
    <div style={{ padding: '4px 4px 2px' }}>
      <div style={eyebrow}>{carregando ? 'carregando…' : `${n} ${n === 1 ? 'crise' : 'crises'} no período`}</div>
      <h1 style={{ ...titulo, margin: 0 }}>Relatório</h1>
    </div>
  )
}

export function SemDados() {
  return <CardVazio titulo="Dados insuficientes"
    sub={`Registre ao menos ${MIN_CRISES} crises para ver correlações.`} />
}

export default function Relatorio({ encerradas, carregando, paciente }) {
  const n = encerradas.length
  const pronto = n >= MIN_CRISES
  // Sem crises `analisar` dividiria por zero — só analisa quando há o que analisar.
  const a = pronto ? analisar(encerradas) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <CabecalhoRelatorio n={n} carregando={carregando} />

      {!carregando && !pronto && <SemDados />}

      {a && (
        <>
          <Insight insight={a.insight} />
          <Gatilhos gatilhos={a.gatilhos} />
          <DiasPorMes crises={encerradas} />
          <CrisesPorDia crises={encerradas} />
          <Estatisticas frequencia={a.frequencia} duracaoMedia={a.duracaoMedia} />
          <Compartilhar encerradas={encerradas} paciente={paciente} />
        </>
      )}

      <button type="button" onClick={() => supabase.auth.signOut()}
        style={{
          marginTop: 8, background: 'none', border: 'none', fontFamily: 'inherit',
          fontSize: 13, color: 'rgba(235,235,245,.45)', cursor: 'pointer', padding: 8,
        }}>Sair da conta</button>
    </div>
  )
}
