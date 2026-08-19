import { useEffect, useState } from 'react'
import { fmtEyebrow, fmtHora } from '../format.ts'
import { FORM_PADRAO, paraBanco } from '../tokens.ts'
import { titulo, eyebrow, legenda, BotaoPrimario } from '../ui.tsx'
import CamposCrise from '../CamposCrise.tsx'
import type { DadosCrises } from '../useCrises.ts'

export default function NovaCrise({ iniciar }: Pick<DadosCrises, 'iniciar'>) {
  const [form, setForm] = useState(FORM_PADRAO)
  const [agora, setAgora] = useState(() => new Date())
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const enviar = async () => {
    setOcupado(true)
    // O rascunho só é descartado se o servidor confirmou — falhou, o usuário não redigita.
    if (await iniciar(paraBanco(form))) setForm(FORM_PADRAO)
    setOcupado(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '4px 4px 2px', gap: 8 }}>
        <div>
          <div style={eyebrow}>{fmtEyebrow(agora)}</div>
          <h1 style={{ ...titulo, margin: 0 }}>Nova Crise</h1>
        </div>
        <div style={{
          height: 38, padding: '0 16px', borderRadius: 999, display: 'flex', alignItems: 'center',
          background: 'rgba(120,120,128,.24)', backdropFilter: 'blur(12px) saturate(180%)',
          border: '.5px solid rgba(255,255,255,.15)', boxShadow: 'inset 1px 1px 1px rgba(255,255,255,.14)',
          fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
        }}>{fmtHora(agora)} · Agora</div>
      </div>

      <CamposCrise form={form} setForm={setForm} />

      <div style={{ marginTop: 4 }}>
        <BotaoPrimario onClick={enviar} disabled={ocupado}>Iniciar registro da crise</BotaoPrimario>
      </div>
      <div style={legenda}>A duração e o alívio são registrados ao encerrar a crise</div>
    </div>
  )
}
