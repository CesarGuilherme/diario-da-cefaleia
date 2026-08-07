import { useEffect, useState } from 'react'
import { fmtEyebrow, fmtHora, fmtSono } from '../format.js'
import { INT, INTENSIDADES, LOCALIZACOES, CARATERES, SINTOMAS, GATILHOS, FORM_PADRAO, itensDe } from '../tokens.js'
import { card, sectionLabel, campo, titulo, eyebrow, legenda, trilho, Segmented, Chip, BotaoPrimario } from '../ui.jsx'

export default function NovaCrise({ iniciar }) {
  const [form, setForm] = useState(FORM_PADRAO)
  const [agora, setAgora] = useState(() => new Date())
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const alterna = (k, v) => set(k, form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v])

  const enviar = async () => {
    setOcupado(true)
    // No formulário `detalhes` guarda o texto cru por gatilho; no banco vira lista de itens.
    // Detalhe de gatilho desligado é descartado.
    const detalhes = {}
    for (const g of form.gatilhos) {
      const itens = itensDe(form.detalhes[g])
      if (itens.length) detalhes[g] = itens
    }
    // O rascunho só é descartado se o servidor confirmou — falhou, o usuário não redigita.
    if (await iniciar({ ...form, detalhes })) setForm(FORM_PADRAO)
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

      <section style={card}>
        <div style={sectionLabel}>Intensidade</div>
        <Segmented opcoes={INTENSIDADES} valor={form.intensidade} palette={INT}
          onChange={(v) => set('intensidade', v)} />

        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          <div style={{ flex: 1.3 }}>
            <div style={{ ...sectionLabel, marginBottom: 8 }}>Localização</div>
            <Segmented opcoes={LOCALIZACOES} valor={form.localizacao} onChange={(v) => set('localizacao', v)}
              style={{ gap: 4, padding: 3 }} fontSize={13} padding="7px 4px" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...sectionLabel, marginBottom: 8 }}>Caráter</div>
            <Segmented opcoes={CARATERES} valor={form.carater} onChange={(v) => set('carater', v)}
              style={{ gap: 4, padding: 3 }} fontSize={13} padding="7px 4px" />
          </div>
        </div>
      </section>

      <section style={card}>
        <div style={sectionLabel}>Sintomas</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SINTOMAS.map((s) => (
            <Chip key={s} label={s} selecionado={form.sintomas.includes(s)} onClick={() => alterna('sintomas', s)} />
          ))}
        </div>
      </section>

      <section style={card}>
        <div style={sectionLabel}>Gatilhos</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
          <label htmlFor="sono" style={{ fontSize: 15, fontWeight: 600 }}>Sono (noite anterior)</label>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#8b7cfc' }}>{fmtSono(form.sono_horas)}</span>
        </div>
        <input id="sono" type="range" min={3} max={12} step={0.5} value={form.sono_horas}
          onChange={(e) => set('sono_horas', parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#8b7cfc', height: 30, margin: '0 0 8px', cursor: 'pointer' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {GATILHOS.map(([label, valor, dica]) => {
            const on = form.gatilhos.includes(valor)
            return (
              <div key={valor}>
                <button type="button" role="switch" aria-checked={on}
                  onClick={() => alterna('gatilhos', valor)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                    padding: '8px 0', cursor: 'pointer', background: 'none', border: 'none',
                    fontFamily: 'inherit', color: '#fff',
                  }}>
                  <span style={{ fontSize: 15, textAlign: 'left' }}>{label}</span>
                  <span style={{
                    width: 48, height: 29, borderRadius: 999, padding: 2, boxSizing: 'border-box',
                    display: 'flex', flex: 'none', transition: 'background .15s',
                    background: on ? '#30d158' : 'rgba(120,120,128,.32)',
                    justifyContent: on ? 'flex-end' : 'flex-start',
                  }}>
                    <span style={{ width: 25, height: 25, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
                  </span>
                </button>

                {/* O detalhe só existe se o gatilho está ligado — nada de campo órfão. */}
                {on && (
                  <div style={{ padding: '0 0 10px 12px', borderLeft: '2px solid rgba(48,209,88,.35)', marginLeft: 2 }}>
                    <input aria-label={`Detalhe de ${valor}`} placeholder={dica}
                      style={{ ...campo, height: 40, fontSize: 14 }}
                      value={form.detalhes[valor] ?? ''}
                      onChange={(e) => set('detalhes', { ...form.detalhes, [valor]: e.target.value })} />
                    <div style={{ fontSize: 11, color: 'rgba(235,235,245,.4)', marginTop: 5 }}>
                      Separe por vírgula — é o que permite achar o item que se repete
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section style={card}>
        <label htmlFor="med" style={{ ...sectionLabel, display: 'block' }}>Medicação</label>
        <input id="med" style={campo} value={form.medicacao}
          onChange={(e) => set('medicacao', e.target.value)} placeholder="Ex.: Ibuprofeno 400 mg" />
      </section>

      <div style={{ marginTop: 4 }}>
        <BotaoPrimario onClick={enviar} disabled={ocupado}>Iniciar registro da crise</BotaoPrimario>
      </div>
      <div style={legenda}>A duração e o alívio são registrados ao encerrar a crise</div>
    </div>
  )
}
