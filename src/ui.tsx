import type { CSSProperties, ReactNode } from 'react'

// Estilos e componentes compartilhados. Valores copiados verbatim do protótipo do handoff —
// não "aproximar" nenhuma sombra ou gradiente daqui, é o que garante paridade com o iOS.

// Fundo escuro com aurora — o mesmo nas duas cascas (App) e na página pública (Publico).
// backgroundImage/Color separados do shorthand: misturar `background` com
// `backgroundAttachment` faz o React avisar de conflito no rerender.
export const AURORA = [
  'radial-gradient(circle at 15% 8%, rgba(124,108,246,.38), transparent 42%)',
  'radial-gradient(circle at 90% 25%, rgba(56,189,248,.20), transparent 45%)',
  'radial-gradient(circle at 60% 95%, rgba(124,108,246,.18), transparent 50%)',
]

/** `frente` entra na frente dos gradientes base — é a aurora vermelha da crise aberta. */
export const fundoAurora = (...frente: string[]): CSSProperties => ({
  minHeight: '100%',
  backgroundImage: [...frente, ...AURORA].join(','),
  backgroundColor: '#0a0a13',
  backgroundAttachment: 'fixed',
})

export const card: CSSProperties = {
  position: 'relative', borderRadius: 26, background: 'rgba(255,255,255,.07)',
  border: '.5px solid rgba(255,255,255,.14)',
  boxShadow: 'inset 1px 1px 1px rgba(255,255,255,.10),0 10px 28px rgba(0,0,0,.28)',
  backdropFilter: 'blur(24px) saturate(160%)', padding: 16, boxSizing: 'border-box',
}

export const sectionLabel: CSSProperties = {
  fontSize: 12, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase',
  color: 'rgba(235,235,245,.5)', marginBottom: 10,
}

export const trilho: CSSProperties = {
  display: 'flex', gap: 5, padding: 4, borderRadius: 999,
  background: 'rgba(0,0,0,.28)', border: '.5px solid rgba(255,255,255,.08)',
}

export const campo: CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 44, borderRadius: 14,
  background: 'rgba(0,0,0,.28)', border: '.5px solid rgba(255,255,255,.1)',
  // 16px é o mínimo: abaixo disso o iOS dá zoom no foco e não volta (vira scroll lateral).
  padding: '0 14px', fontSize: 16, color: '#fff', fontFamily: 'inherit', outline: 'none',
}

export const titulo: CSSProperties = { fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: '.2px' }
export const eyebrow: CSSProperties = { fontSize: 13, color: 'rgba(235,235,245,.55)', fontWeight: 500 }
export const legenda: CSSProperties = { textAlign: 'center', fontSize: 12, color: 'rgba(235,235,245,.4)' }

/** Capsule segmentada. `palette` opcional dá gradiente por item (intensidade, alívio). */
type SegmentedProps<T extends string> = {
  opcoes: readonly T[]
  valor: T | null
  onChange: (v: T) => void
  palette?: Record<string, { grad: string; fg: string; sh: string } | undefined>
  style?: CSSProperties
  fontSize?: number
  padding?: string
}

export function Segmented<T extends string>(
  { opcoes, valor, onChange, palette, style, fontSize = 15, padding = '9px 0' }: SegmentedProps<T>,
) {
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

export function Chip({ label, selecionado, onClick }: {
  label: string; selecionado: boolean; onClick: () => void
}) {
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

export function BotaoPrimario({ children, onClick, disabled, verde, type = 'button' }: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  verde?: boolean
  type?: 'button' | 'submit'
}) {
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

/** Banner de erro, um só para os dois layouts (no desktop atravessa o grid).
 *  Diz "dispensar" e não "toque para dispensar": no dashboard se usa mouse. */
export function BannerErro({ erro, dispensar, style }: {
  erro: string | null
  dispensar: () => void
  style?: CSSProperties
}) {
  if (!erro) return null
  return (
    <div role="alert" onClick={dispensar} style={{
      marginBottom: 14, padding: '12px 16px', borderRadius: 16, cursor: 'pointer',
      background: 'rgba(255,69,58,.16)', border: '.5px solid rgba(255,69,58,.3)',
      color: '#ffb5b0', fontSize: 13, ...style,
    }}>{erro} — dispensar</div>
  )
}

export function CardVazio({ titulo: t, sub }: { titulo: string; sub: string }) {
  return (
    <div style={{ ...card, borderRadius: 24, padding: '36px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{t}</div>
      <div style={{ fontSize: 13, color: 'rgba(235,235,245,.5)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

/** Ação secundária: texto, não botão — é o que a mantém abaixo da ação principal.
 *  `perigo` é o vermelho de ação destrutiva (revogar link, excluir conta). */
export function Secundaria({ children, onClick, disabled, perigo, style }: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  perigo?: boolean
  style?: CSSProperties
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background: 'none', border: 'none', fontFamily: 'inherit', padding: '6px 8px',
      fontSize: 13, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      color: perigo ? 'rgba(255,159,154,.85)' : 'rgba(235,235,245,.55)',
      textDecoration: 'underline', textUnderlineOffset: 3, ...style,
    }}>{children}</button>
  )
}
