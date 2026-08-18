// Os painéis do relatório são exportados um a um: o mobile empilha numa coluna,
// o dashboard desktop distribui em duas. Mesma análise, layouts diferentes.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { analisar, textoRelatorio, porDia, snapshotRelatorio } from '../report.js'
import { fmtDuracao, fmtDataHist, fmtDiaEixo } from '../format.js'
import { card, campo, titulo, eyebrow, CardVazio } from '../ui.jsx'

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

// Crises por dia, do primeiro registro até hoje — o mesmo gráfico do iOS
// (CrisesPorDiaView), com linha, pontos e o dia selecionado virando legenda.
// Coordenadas em pixel, com a largura medida: SVG esticado por viewBox deforma traço,
// círculo e texto (e no WebKit o vectorEffect não segura). Sem biblioteca de gráfico.
const ALT = 160          // altura da área do gráfico
const PAD_D = 26         // respiro à direita para os rótulos do eixo Y
const PAD_B = 20         // idem abaixo, para as datas
const PAD_E = 10         // e nas bordas, senão o ponto do extremo fica cortado pela metade
const PAD_T = 8

// `hoje` existe para o relatório público congelar a linha na data em que foi gerado, em
// vez de esticá-la até o relógio de quem abre o link.
export function CrisesPorDia({ crises, hoje }) {
  const dias = porDia(crises, hoje ?? new Date())
  const [sel, setSel] = useState(null)
  const [largura, setLargura] = useState(0)
  const caixa = useRef(null)

  useEffect(() => {
    if (!caixa.current) return
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width))
    ro.observe(caixa.current)
    return () => ro.disconnect()
  }, [])

  if (!dias.length) return null
  const maxN = Math.max(1, ...dias.map((d) => d.n))
  const w = Math.max(0, largura - PAD_D - PAD_E)
  const x = (i) => PAD_E + (dias.length === 1 ? w / 2 : (i * w) / (dias.length - 1))
  const y = (n) => PAD_T + (ALT - PAD_B - PAD_T) * (1 - n / maxN)
  const linha = dias.map((d, i) => `${x(i)},${y(d.n)}`).join(' ')

  // ~5 datas no eixo, sempre incluindo a primeira; passo em dias inteiros.
  const passo = Math.max(1, Math.ceil(dias.length / 5))
  const marcas = dias.map((d, i) => ({ d, i })).filter(({ i }) => i % passo === 0)

  const escolhido = sel === null ? null : dias[sel]
  const legendaDia = escolhido
    ? `${fmtDataHist(escolhido.dia)} · ${escolhido.n} ${escolhido.n === 1 ? 'crise' : 'crises'}`
    : 'Toque num ponto para ver o dia'

  return (
    <section style={{ ...card, padding: 18 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>Crises por dia</h2>
      <div style={{ fontSize: 13, color: 'rgba(235,235,245,.5)', marginBottom: 16 }}>{legendaDia}</div>
      <div ref={caixa} style={{ width: '100%' }}>
        {largura > 0 && (
          <svg width={largura} height={ALT} role="img"
            aria-label={`Crises por dia, ${dias.length} dias, pico de ${maxN} num dia`}>
            {marcas.map(({ i }) => (
              <line key={`g${i}`} x1={x(i)} x2={x(i)} y1={PAD_T} y2={ALT - PAD_B}
                stroke="rgba(255,255,255,.08)" strokeDasharray="3 4" />
            ))}
            {[maxN, 0].map((n) => (
              <text key={`y${n}`} x={largura - PAD_D + 8} y={y(n) + 4}
                fill="rgba(235,235,245,.45)" fontSize="11">{n}</text>
            ))}
            {marcas.map(({ d, i }) => (
              <text key={`x${i}`} x={x(i)} y={ALT - 4} textAnchor={i === 0 ? 'start' : 'middle'}
                fill="rgba(235,235,245,.45)" fontSize="11">{fmtDiaEixo(d.dia)}</text>
            ))}

            <polyline points={linha} fill="none" stroke="#ff6961" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" />

            {dias.map((d, i) => d.n > 0 && (
              // O círculo maior e transparente é o alvo do toque — o ponto visível tem 4px.
              <g key={d.dia.getTime()} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
                <circle cx={x(i)} cy={y(d.n)} r="14" fill="transparent" />
                <circle cx={x(i)} cy={y(d.n)} r={sel === i ? 6 : 4} fill="#ff453a"
                  stroke={sel === i ? '#fff' : 'none'} strokeWidth="1.5" />
                <title>{`${fmtDataHist(d.dia)} · ${d.n} ${d.n === 1 ? 'crise' : 'crises'}`}</title>
              </g>
            ))}
          </svg>
        )}
      </div>
    </section>
  )
}

/** Botão + aviso: o estado do compartilhamento pertence ao botão, não à tela. */
export function Compartilhar({ encerradas, paciente, url }) {
  const [aviso, setAviso] = useState(null)

  const compartilhar = async () => {
    const text = textoRelatorio(encerradas, paciente)
    try {
      // Havendo link público, ele vai junto: quem recebe escolhe entre ler o texto ou abrir
      // a página. `url` undefined é simplesmente ignorado pelo navigator.share.
      if (navigator.share) await navigator.share({ title: 'Diário da Cefaléia', text, url })
      else {
        await navigator.clipboard.writeText(url ? `${text}\n\n${url}` : text)
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

/** Link público: um por paciente, 30 dias, revogável. Gerar de novo mata o anterior. */
export function LinkPublico({ encerradas, paciente, onUrl }) {
  const [link, setLink] = useState(null)   // null = nenhum | linha de `relatorios`
  const [ocupado, setOcupado] = useState(true)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    let vivo = true
    supabase.from('relatorios').select('*').eq('paciente_id', paciente.id)
      .order('criado_em', { ascending: false }).limit(1)
      .then(({ data, error }) => {
        if (!vivo) return
        // Link vencido no banco não serve para nada: some da tela como se não existisse.
        const atual = data?.[0]
        setLink(error || !atual || new Date(atual.expira_em) < new Date() ? null : atual)
        setOcupado(false)
      })
    return () => { vivo = false }
  }, [paciente.id])

  const url = link ? `${location.origin}/r/${link.id}` : null
  useEffect(() => { onUrl?.(url) }, [url, onUrl])

  const gerar = async () => {
    setOcupado(true); setAviso(null)
    const { data, error } = await supabase.from('relatorios')
      .insert({ paciente_id: paciente.id, dados: snapshotRelatorio(encerradas, paciente) })
      .select().single()
    if (error) { setAviso(error.message); setOcupado(false); return }
    // Insere antes de apagar: se a limpeza falhar sobra um link a mais, nunca nenhum.
    await supabase.from('relatorios').delete().eq('paciente_id', paciente.id).neq('id', data.id)
    setLink(data); setOcupado(false)
  }

  const revogar = async () => {
    if (!confirm('Revogar o link? Quem já recebeu deixa de conseguir abrir.')) return
    setOcupado(true)
    const { error } = await supabase.from('relatorios').delete().eq('id', link.id)
    if (error) setAviso(error.message)
    else setLink(null)
    setOcupado(false)
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setAviso('Link copiado.')
    } catch { setAviso('Não foi possível copiar — selecione o endereço acima.') }
  }

  return (
    <section style={{ ...card, padding: 18 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>Link para o médico</h2>
      <div style={{ fontSize: 13, color: 'rgba(235,235,245,.5)', marginBottom: 14, lineHeight: 1.45 }}>
        Uma página só de leitura com este relatório, que abre sem conta nenhuma.
        Quem tiver o endereço vê o relatório — ele não é indexado, mas também não pede senha.
      </div>

      {url ? (
        <>
          <div style={{
            ...campoLink, wordBreak: 'break-all',
          }}>{url}</div>
          <div style={{ fontSize: 12, color: 'rgba(235,235,245,.45)', margin: '8px 0 12px' }}>
            Expira em {fmtDataHist(new Date(link.expira_em))} · o relatório fica congelado como está hoje
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <BotaoSecundario onClick={copiar} disabled={ocupado}>Copiar link</BotaoSecundario>
            <BotaoSecundario onClick={gerar} disabled={ocupado}>Gerar novo</BotaoSecundario>
            <BotaoSecundario onClick={revogar} disabled={ocupado} perigo>Revogar</BotaoSecundario>
          </div>
        </>
      ) : (
        <BotaoSecundario onClick={gerar} disabled={ocupado}>Gerar link · vale 30 dias</BotaoSecundario>
      )}

      {aviso && (
        <div role="status" style={{ fontSize: 13, color: 'rgba(235,235,245,.6)', marginTop: 10 }}>{aviso}</div>
      )}
    </section>
  )
}

const campoLink = {
  ...campo, height: 'auto', minHeight: 44, padding: '11px 14px', fontSize: 14,
  color: 'rgba(235,235,245,.85)', display: 'flex', alignItems: 'center',
}

function BotaoSecundario({ children, onClick, disabled, perigo }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      flex: '1 1 auto', height: 42, borderRadius: 999, cursor: disabled ? 'default' : 'pointer',
      padding: '0 16px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
      opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
      color: perigo ? '#ff9f9a' : '#fff',
      background: perigo ? 'rgba(255,69,58,.16)' : 'rgba(120,120,128,.24)',
      border: `.5px solid ${perigo ? 'rgba(255,69,58,.3)' : 'rgba(255,255,255,.16)'}`,
      boxShadow: 'inset 1px 1px 1px rgba(255,255,255,.12)',
    }}>{children}</button>
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
  const [urlPublica, setUrlPublica] = useState(null)
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
          <CrisesPorDia crises={encerradas} />
          <Estatisticas frequencia={a.frequencia} duracaoMedia={a.duracaoMedia} />
          <LinkPublico encerradas={encerradas} paciente={paciente} onUrl={setUrlPublica} />
          <Compartilhar encerradas={encerradas} paciente={paciente} url={urlPublica} />
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
