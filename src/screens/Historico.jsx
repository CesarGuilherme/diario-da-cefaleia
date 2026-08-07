import { fmtDataHist, fmtHora, fmtDuracao, fmtSono, duracaoMin } from '../format.js'
import { INT, GATCHIP } from '../tokens.js'
import { card, titulo, eyebrow, CardVazio } from '../ui.jsx'

const NEUTRO = { fg: 'rgba(235,235,245,.75)', bg: 'rgba(120,120,128,.2)', bd: '.5px solid transparent' }

// Ordem dos chips copiada do protótipo (linhas 238-245) — é o que dá a leitura rápida do card.
function chipsDe(c) {
  const m = INT[c.intensidade] ?? INT['Moderada']
  const chips = [
    { label: c.intensidade, fg: m.chipFg, bg: m.chipBg, bd: m.chipBd },
    { label: `${c.localizacao} · ${c.carater}`, ...NEUTRO },
    ...c.sintomas.slice(0, 2).map((s) => ({ label: s, ...NEUTRO })),
  ]
  if (c.sono_horas < 7) {
    chips.push({
      label: `Sono ${fmtSono(c.sono_horas)}`,
      fg: '#c9c2fd', bg: 'rgba(124,108,246,.18)', bd: '.5px solid rgba(124,108,246,.35)',
    })
  }
  // Cada gatilho vem seguido do seu detalhe, para a leitura ficar "Alimentação → leite · pão".
  for (const g of c.gatilhos) {
    chips.push({ label: g, ...(GATCHIP[g] ?? GATCHIP['Estresse']) })
    const itens = c.detalhes?.[g] ?? []
    if (itens.length) {
      chips.push({
        label: `“${itens.join(' · ')}”`,
        fg: 'rgba(235,235,245,.6)', bg: 'rgba(120,120,128,.14)', bd: '.5px dashed rgba(255,255,255,.2)',
      })
    }
  }
  return chips
}

function CriseCard({ c, apagar }) {
  const m = INT[c.intensidade] ?? INT['Moderada']
  const inicio = new Date(c.inicio)
  const d = duracaoMin(c)

  const remover = () => {
    if (confirm(`Apagar a crise de ${fmtDataHist(inicio)}? Isso não pode ser desfeito.`)) apagar(c.id)
  }

  return (
    <article style={{ ...card, borderRadius: 24, padding: '15px 16px', boxShadow: 'inset 1px 1px 1px rgba(255,255,255,.10),0 8px 24px rgba(0,0,0,.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span aria-hidden="true" style={{
            flex: 'none', width: 11, height: 11, borderRadius: '50%',
            background: m.dot, boxShadow: `0 0 10px ${m.glow}`,
          }} />
          <span style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtDataHist(inicio)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {c.fim ? (
            <span style={{ fontSize: 13.5, color: 'rgba(235,235,245,.55)', whiteSpace: 'nowrap' }}>
              {fmtHora(inicio)} – {fmtHora(new Date(c.fim))} · {fmtDuracao(d)}
            </span>
          ) : (
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#ff6961', whiteSpace: 'nowrap' }}>Em andamento</span>
          )}
          <button type="button" onClick={remover} aria-label={`Apagar crise de ${fmtDataHist(inicio)}`}
            title="Apagar" style={{
              flex: 'none', width: 28, height: 28, borderRadius: 999, cursor: 'pointer',
              background: 'rgba(120,120,128,.2)', border: '.5px solid rgba(255,255,255,.1)',
              color: 'rgba(235,235,245,.55)', fontSize: 13, lineHeight: 1, fontFamily: 'inherit',
            }}>✕</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {chipsDe(c).map((ch, i) => (
          <span key={i} style={{
            padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            color: ch.fg, background: ch.bg, border: ch.bd,
          }}>{ch.label}</span>
        ))}
      </div>

      <div style={{ marginTop: 9, fontSize: 13, color: 'rgba(235,235,245,.5)' }}>
        {c.medicacao
          ? `℞ ${c.medicacao}${c.alivio ? ` · alívio ${c.alivio.toLowerCase()}` : ''}`
          : 'Sem medicação'}
      </div>
    </article>
  )
}

export default function Historico({ crises, carregando, apagar }) {
  const n = crises.length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '4px 4px 2px' }}>
        <div style={eyebrow}>
          {carregando ? 'carregando…' : `${n} ${n === 1 ? 'crise registrada' : 'crises registradas'}`}
        </div>
        <h1 style={{ ...titulo, margin: 0 }}>Histórico</h1>
      </div>
      {!carregando && n === 0 && (
        <CardVazio titulo="Nenhuma crise registrada" sub="Use a aba Nova para registrar a primeira." />
      )}
      {crises.map((c) => <CriseCard key={c.id} c={c} apagar={apagar} />)}
    </div>
  )
}
