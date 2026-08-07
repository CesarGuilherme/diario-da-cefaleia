import { useEffect, useState } from 'react'
import { fmtDecorrido, fmtHora } from '../format.js'
import { INT, INTENSIDADES, ALIVIOS, ALIVIO_PAL } from '../tokens.js'
import { card, sectionLabel, legenda, Segmented, BotaoPrimario } from '../ui.jsx'

const R = 104
const VOLTA = Math.round(2 * Math.PI * R) // 653 — mesmo valor do protótipo
const SWEEP_MS = 180 * 60 * 1000          // o anel completa uma volta em 3h

export default function CriseAndamento({ ativa, atualizar, encerrar, irPara }) {
  const [agora, setAgora] = useState(() => Date.now())
  const [alivio, setAlivio] = useState(null) // só vai pro banco ao encerrar, igual ao iOS
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const inicio = new Date(ativa.inicio)
  const decorrido = Math.max(0, agora - inicio.getTime())
  const preenchido = Math.min(decorrido / SWEEP_MS, 1) * VOLTA

  const fechar = async () => {
    setOcupado(true)
    if (await encerrar(ativa.id, alivio)) irPara('historico')
    else setOcupado(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', paddingTop: 10 }}>
      <div style={{
        fontSize: 13, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,.55)', animation: 'pulsar 2.4s ease-in-out infinite',
      }}>Crise em andamento</div>

      <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="220" height="220" viewBox="0 0 230 230" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
          <circle cx="115" cy="115" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10" />
          <circle cx="115" cy="115" r={R} fill="none" stroke="url(#anel)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${preenchido} ${VOLTA}`} transform="rotate(-90 115 115)" />
          <defs>
            <linearGradient id="anel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff9f0a" />
              <stop offset="1" stopColor="#ff453a" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>
            {fmtDecorrido(decorrido)}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)' }}>início às {fmtHora(inicio)}</div>
        </div>
      </div>

      <section style={{ ...card, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Intensidade agora</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.45)' }}>atualize se mudar</span>
        </div>
        <Segmented opcoes={INTENSIDADES} valor={ativa.intensidade} palette={INT}
          onChange={(v) => atualizar(ativa.id, { intensidade: v })} />
      </section>

      <section style={{ ...card, width: '100%' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{ativa.medicacao || 'Sem medicação registrada'}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
          {ativa.medicacao ? 'registrada no início da crise' : 'adicione ao encerrar, se usar'}
        </div>
        <div style={{ ...sectionLabel, marginTop: 14, letterSpacing: '.06em' }}>Aliviou?</div>
        <Segmented opcoes={ALIVIOS} valor={alivio} palette={ALIVIO_PAL} onChange={setAlivio}
          fontSize={14} padding="8px 0" />
      </section>

      <BotaoPrimario verde onClick={fechar} disabled={ocupado}>Encerrar crise</BotaoPrimario>
      <div style={legenda}>A duração total é calculada automaticamente</div>
    </div>
  )
}
