// Estilos e componentes compartilhados. Valores copiados verbatim do protótipo do handoff —
// não "aproximar" nenhuma sombra ou gradiente daqui, é o que garante paridade com o iOS.

export const card = {
  position: 'relative', borderRadius: 26, background: 'rgba(255,255,255,.07)',
  border: '.5px solid rgba(255,255,255,.14)',
  boxShadow: 'inset 1px 1px 1px rgba(255,255,255,.10),0 10px 28px rgba(0,0,0,.28)',
  backdropFilter: 'blur(24px) saturate(160%)', padding: 16, boxSizing: 'border-box',
}

export const sectionLabel = {
  fontSize: 12, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase',
  color: 'rgba(235,235,245,.5)', marginBottom: 10,
}

export const trilho = {
  display: 'flex', gap: 5, padding: 4, borderRadius: 999,
  background: 'rgba(0,0,0,.28)', border: '.5px solid rgba(255,255,255,.08)',
}

export const campo = {
  width: '100%', boxSizing: 'border-box', height: 44, borderRadius: 14,
  background: 'rgba(0,0,0,.28)', border: '.5px solid rgba(255,255,255,.1)',
  padding: '0 14px', fontSize: 15, color: '#fff', fontFamily: 'inherit', outline: 'none',
}

export const titulo = { fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: '.2px' }
export const eyebrow = { fontSize: 13, color: 'rgba(235,235,245,.55)', fontWeight: 500 }
export const legenda = { textAlign: 'center', fontSize: 12, color: 'rgba(235,235,245,.4)' }

/** Capsule segmentada. `palette` opcional dá gradiente por item (intensidade, alívio). */
export function Segmented({ opcoes, valor, onChange, palette, style, fontSize = 15, padding = '9px 0' }) {
  return (
    <div style={{ ...trilho, ...style }}>
      {opcoes.map((o) => {
        const sel = o === valor
        const p = palette && palette[o]
        return (
          <button key={o} type="button" onClick={() => onChange(o)} aria-pressed={sel}
            style={{
              flex: 1, textAlign: 'center', padding, borderRadius: 999, fontSize,
              cursor: 'pointer', border: 'none', fontFamily: 'inherit',
              fontWeight: sel ? 700 : 600,
              color: sel ? (p ? p.fg : '#fff') : 'rgba(235,235,245,.55)',
              background: sel ? (p ? p.grad : 'rgba(255,255,255,.22)') : 'transparent',
              boxShadow: sel ? (p ? p.sh : 'inset 1px 1px 1px rgba(255,255,255,.3)') : 'none',
            }}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

export function Chip({ label, selecionado, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selecionado}
      style={{
        padding: '8px 15px', borderRadius: 999, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
        color: selecionado ? '#fff' : 'rgba(235,235,245,.6)',
        background: selecionado
          ? 'linear-gradient(180deg,rgba(139,124,252,.9),rgba(108,92,231,.9))'
          : 'rgba(120,120,128,.2)',
        border: selecionado ? '.5px solid transparent' : '.5px solid rgba(255,255,255,.1)',
        boxShadow: selecionado
          ? '0 3px 10px rgba(124,108,246,.4),inset 1px 1px 1px rgba(255,255,255,.35)'
          : 'none',
      }}>
      {label}
    </button>
  )
}

export function BotaoPrimario({ children, onClick, disabled, verde, type = 'button' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        width: '100%', height: 56, borderRadius: 999, border: 'none', fontFamily: 'inherit',
        background: verde
          ? 'linear-gradient(180deg,#5ee6a8,#30d158)'
          : 'linear-gradient(180deg,#8b7cfc,#6c5ce7)',
        boxShadow: verde
          ? '0 8px 24px rgba(48,209,88,.4),inset 1.5px 1.5px 1px rgba(255,255,255,.45)'
          : '0 8px 24px rgba(108,92,231,.5),inset 1.5px 1.5px 1px rgba(255,255,255,.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, fontWeight: 700, color: verde ? '#04250f' : '#fff',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        boxSizing: 'border-box',
      }}>
      {children}
    </button>
  )
}

export function CardVazio({ titulo: t, sub }) {
  return (
    <div style={{ ...card, borderRadius: 24, padding: '36px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{t}</div>
      <div style={{ fontSize: 13, color: 'rgba(235,235,245,.5)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}
