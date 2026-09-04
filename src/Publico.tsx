// Relatório público: a URL /r/<token> aberta por quem não tem conta. Só leitura, só este
// relatório — o visitante não fala com `crises` nem com `pacientes`, e sim com a função
// `relatorio_publico`, que devolve o snapshot congelado de um token válido.
import { useEffect, useState } from 'react'
import { supabaseAnon, faltaConfig } from './lib/supabase.ts'
import { analisar } from './report.ts'
import { fmtDataHist } from './format.ts'
import { card, titulo, eyebrow, legenda, fundoAurora, Carregando } from './ui.tsx'
import { CriseCard } from './screens/Historico.tsx'
import { MIN_CRISES, Insight, Gatilhos, CrisesPorDia, Estatisticas } from './screens/Relatorio.tsx'
import type { Snapshot } from './lib/tipos.ts'

const fundo = fundoAurora()

export default function Publico({ token }: { token: string }) {
  const [estado, setEstado] = useState<'carregando' | 'invalido' | 'dados'>('carregando')
  const [dados, setDados] = useState<Snapshot | null>(null)

  useEffect(() => {
    if (faltaConfig) { setEstado('invalido'); return }
    let vivo = true
    supabaseAnon.rpc('relatorio_publico', { token }).then(({ data, error }) => {
      if (!vivo) return
      // Token errado e token vencido dão o mesmo `null` — a página não conta qual dos dois.
      if (error || !data) setEstado('invalido')
      // O jsonb volta como Json: quem garante a forma é snapshotRelatorio, que o gravou.
      else { setDados(data as unknown as Snapshot); setEstado('dados') }
    })
    return () => { vivo = false }
  }, [token])

  return (
    <div style={fundo}>
      <div style={{ maxWidth: 760, margin: '0 auto', boxSizing: 'border-box', padding: '48px 16px 64px' }}>
        {estado === 'carregando' && <Carregando emLinha texto="Carregando relatório…" />}
        {estado === 'invalido' && <LinkInvalido />}
        {estado === 'dados' && dados && <Conteudo dados={dados} />}
      </div>
    </div>
  )
}

function LinkInvalido() {
  return (
    <section style={{ ...card, padding: 22, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Link indisponível</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(235,235,245,.7)' }}>
        Este relatório expirou ou o endereço está incorreto. Peça um link novo a quem
        compartilhou — eles valem 7 dias.
      </div>
    </section>
  )
}

function Conteudo({ dados }: { dados: Snapshot }) {
  const { paciente, crises, gerado_em } = dados
  // O "hoje" do relatório é a data em que ele foi gerado: o gráfico não estica com o
  // relógio de quem abre, e os números batem com os da tela de quem compartilhou.
  const gerado = new Date(gerado_em)
  const pronto = crises.length >= MIN_CRISES
  const a = pronto ? analisar(crises) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ padding: '4px 4px 2px' }}>
        <div style={eyebrow}>relatório compartilhado · gerado em {fmtDataHist(gerado)}</div>
        <h1 style={{ ...titulo, margin: 0 }}>
          {paciente.nome}
          {paciente.idade !== null && (
            <span style={{ fontSize: 17, fontWeight: 600, color: 'rgba(235,235,245,.55)' }}>
              {' '}· {paciente.idade} anos
            </span>
          )}
        </h1>
        <div style={{ ...eyebrow, marginTop: 4 }}>
          {crises.length} {crises.length === 1 ? 'crise registrada' : 'crises registradas'}
          {crises.length > 0 && ` · de ${fmtDataHist(new Date(crises.at(-1)!.inicio))} a ${fmtDataHist(new Date(crises[0]!.inicio))}`}
        </div>
      </header>

      {a && (
        <>
          <Insight insight={a.insight} />
          <Gatilhos gatilhos={a.gatilhos} />
          <CrisesPorDia crises={crises} hoje={gerado} />
          <Estatisticas frequencia={a.frequencia} duracaoMedia={a.duracaoMedia} />
        </>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', padding: '0 4px' }}>Crises</h2>
        {crises.map((c, i) => <CriseCard key={i} c={c} />)}
      </section>

      <div style={{ ...legenda, marginTop: 10, lineHeight: 1.5 }}>
        Registrado no Diário da Cefaléia. Esta página é uma cópia somente leitura,
        congelada em {fmtDataHist(gerado)}.
      </div>
    </div>
  )
}
