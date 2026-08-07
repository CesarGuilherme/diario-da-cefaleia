import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { analisar, textoRelatorio } from '../report.js'
import { fmtDuracao } from '../format.js'
import { card, titulo, eyebrow, CardVazio } from '../ui.jsx'

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

export default function Relatorio({ encerradas, carregando }) {
  const [aviso, setAviso] = useState(null)
  const n = encerradas.length
  const pronto = n >= 2

  const compartilhar = async () => {
    const text = textoRelatorio(encerradas)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '4px 4px 2px' }}>
        <div style={eyebrow}>{carregando ? 'carregando…' : `${n} ${n === 1 ? 'crise' : 'crises'} no período`}</div>
        <h1 style={{ ...titulo, margin: 0 }}>Relatório</h1>
      </div>

      {!carregando && !pronto && (
        <CardVazio titulo="Dados insuficientes" sub="Registre ao menos 2 crises para ver correlações." />
      )}

      {pronto && <Conteudo encerradas={encerradas} compartilhar={compartilhar} aviso={aviso} />}

      <button type="button" onClick={() => supabase.auth.signOut()}
        style={{
          marginTop: 8, background: 'none', border: 'none', fontFamily: 'inherit',
          fontSize: 13, color: 'rgba(235,235,245,.45)', cursor: 'pointer', padding: 8,
        }}>Sair da conta</button>
    </div>
  )
}

function Conteudo({ encerradas, compartilhar, aviso }) {
  const { gatilhos, insight, frequencia, duracaoMedia } = analisar(encerradas)

  return (
    <>
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

      <div style={{ display: 'flex', gap: 12 }}>
        <Stat rotulo="Frequência" valor={frequencia} sufixo="/mês" sub="média do período" />
        <Stat rotulo="Duração média" valor={duracaoMedia === null ? '—' : fmtDuracao(duracaoMedia)} sub="por crise" />
      </div>

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
