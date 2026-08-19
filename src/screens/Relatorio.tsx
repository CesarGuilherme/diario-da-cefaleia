// Os painéis do relatório são exportados um a um: o mobile empilha numa coluna,
// o dashboard desktop distribui em duas. Mesma análise, layouts diferentes.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.ts'
import { analisar, textoRelatorio, porDia, snapshotRelatorio } from '../report.ts'
import { fmtDuracao, fmtDataHist, fmtDiaEixo } from '../format.ts'
import { card, campo, titulo, eyebrow, CardVazio } from '../ui.tsx'
import type { Analise } from '../report.ts'
import type { DadosCrises } from '../useCrises.ts'
import type { Crise, CriseSnapshot, LinkRelatorio, Paciente } from '../lib/tipos.ts'
import type { CSSProperties, ReactNode } from 'react'

/** Crises encerradas necessárias para o relatório dizer algo — regra única, usada nos dois layouts. */
export const MIN_CRISES = 2

function Stat({ rotulo, valor, sufixo, sub }: {
  rotulo: string; valor: string | number; sufixo?: string; sub: string
}) {
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

export function Insight({ insight }: { insight: string }) {
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

export function Gatilhos({ gatilhos }: { gatilhos: Analise['gatilhos'] }) {
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

export function Estatisticas({ frequencia, duracaoMedia }: Pick<Analise, 'frequencia' | 'duracaoMedia'>) {
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
export function CrisesPorDia({ crises, hoje }: { crises: CriseSnapshot[]; hoje?: Date }) {
  const dias = porDia(crises, hoje ?? new Date())
  const [sel, setSel] = useState<number | null>(null)
  const [largura, setLargura] = useState(0)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!caixa.current) return
    const ro = new ResizeObserver(([e]) => e && setLargura(e.contentRect.width))
    ro.observe(caixa.current)
    return () => ro.disconnect()
  }, [])

  if (!dias.length) return null
  const maxN = Math.max(1, ...dias.map((d) => d.n))
  const w = Math.max(0, largura - PAD_D - PAD_E)
  const x = (i: number) => PAD_E + (dias.length === 1 ? w / 2 : (i * w) / (dias.length - 1))
  const y = (n: number) => PAD_T + (ALT - PAD_B - PAD_T) * (1 - n / maxN)
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

/**
 * Compartilhar com o médico: um card só. O botão grande é sempre a ação principal — gera o
 * link na primeira vez e depois envia. Copiar, regenerar, revogar e o relatório em texto são
 * ações secundárias, porque só uma delas é o que se faz na consulta.
 * Link é um por paciente, vale 30 dias, e gerar de novo mata o anterior.
 */
export function Compartilhar({ encerradas, paciente }: { encerradas: Crise[]; paciente: Paciente }) {
  const [link, setLink] = useState<LinkRelatorio | null>(null)   // null = nenhum
  const [ocupado, setOcupado] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)

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

  const gerar = async () => {
    setOcupado(true); setAviso(null)
    const { data, error } = await supabase.from('relatorios')
      .insert({ paciente_id: paciente.id, dados: snapshotRelatorio(encerradas, paciente) })
      .select().single()
    setOcupado(false)
    if (error) { setAviso(error.message); return null }
    // Insere antes de apagar: se a limpeza falhar sobra um link a mais, nunca nenhum.
    await supabase.from('relatorios').delete().eq('paciente_id', paciente.id).neq('id', data.id)
    setLink(data)
    return `${location.origin}/r/${data.id}`
  }

  // Ação principal: sem link ainda, cria um antes de abrir o compartilhamento — o médico
  // recebe a página, não um texto que ele teria de rolar no WhatsApp.
  const enviar = async () => {
    const alvo = url ?? await gerar()
    if (!alvo) return
    const text = `Relatório do Diário da Cefaléia — ${paciente.nome}`
    try {
      if (navigator.share) await navigator.share({ title: 'Diário da Cefaléia', text, url: alvo })
      else { await navigator.clipboard.writeText(alvo); setAviso('Link copiado.') }
    } catch (e) {
      if (!(e instanceof Error) || e.name !== 'AbortError') setAviso('Não foi possível compartilhar — copie o endereço acima.')
    }
  }

  const copiar = async () => {
    if (!url) return
    try { await navigator.clipboard.writeText(url); setAviso('Link copiado.') }
    catch { setAviso('Não foi possível copiar — selecione o endereço acima.') }
  }

  const revogar = async () => {
    if (!link || !confirm('Revogar o link? Quem já recebeu deixa de conseguir abrir.')) return
    setOcupado(true)
    const { error } = await supabase.from('relatorios').delete().eq('id', link.id)
    setOcupado(false)
    if (error) setAviso(error.message)
    else { setLink(null); setAviso(null) }
  }

  // O relatório como texto continua existindo para onde link não serve (e-mail, prontuário
  // que só aceita colar) — mas como ação secundária, não como segundo botão grande.
  const comoTexto = async () => {
    const text = textoRelatorio(encerradas, paciente)
    try {
      if (navigator.share) await navigator.share({ title: 'Diário da Cefaléia', text })
      else { await navigator.clipboard.writeText(text); setAviso('Relatório copiado como texto.') }
    } catch (e) {
      if (!(e instanceof Error) || e.name !== 'AbortError') setAviso('Não foi possível compartilhar.')
    }
  }

  return (
    <section style={{ ...card, padding: 18 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>Compartilhar com o médico</h2>
      <div style={{ fontSize: 13, color: 'rgba(235,235,245,.5)', marginBottom: 14, lineHeight: 1.45 }}>
        Uma página só de leitura com este relatório, que abre sem conta nenhuma. Quem tiver o
        endereço vê o relatório — ele não é indexado, mas também não pede senha.
      </div>

      {url && (
        <>
          <div style={{ ...campoLink, wordBreak: 'break-all' }}>{url}</div>
          <div style={{ fontSize: 12, color: 'rgba(235,235,245,.45)', margin: '8px 0 0' }}>
            Expira em {fmtDataHist(new Date(link!.expira_em))} · congelado como o relatório está hoje
          </div>
        </>
      )}

      <button type="button" onClick={enviar} disabled={ocupado} style={{
        marginTop: 14, height: 54, borderRadius: 999, width: '100%', boxSizing: 'border-box',
        cursor: ocupado ? 'default' : 'pointer', opacity: ocupado ? 0.5 : 1,
        background: 'rgba(120,120,128,.24)', backdropFilter: 'blur(12px) saturate(180%)',
        border: '.5px solid rgba(255,255,255,.18)', boxShadow: 'inset 1.5px 1.5px 1px rgba(255,255,255,.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
      }}>↑ {url ? 'Enviar link ao médico' : 'Gerar link e enviar'}</button>

      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px 4px', marginTop: 12,
      }}>
        {url && <Secundaria onClick={copiar} disabled={ocupado}>copiar</Secundaria>}
        {url && <Secundaria onClick={gerar} disabled={ocupado}>gerar novo</Secundaria>}
        {url && <Secundaria onClick={revogar} disabled={ocupado} perigo>revogar</Secundaria>}
        <Secundaria onClick={comoTexto} disabled={ocupado}>copiar como texto</Secundaria>
      </div>

      {aviso && (
        <div role="status" style={{
          fontSize: 13, color: 'rgba(235,235,245,.6)', marginTop: 10, textAlign: 'center',
        }}>{aviso}</div>
      )}
    </section>
  )
}

const campoLink: CSSProperties = {
  ...campo, height: 'auto', minHeight: 44, padding: '11px 14px', fontSize: 14,
  color: 'rgba(235,235,245,.85)', display: 'flex', alignItems: 'center',
}

/** Ação secundária: texto, não botão — é o que a mantém abaixo do botão principal. */
function Secundaria({ children, onClick, disabled, perigo }: {
  children: ReactNode; onClick: () => void; disabled?: boolean; perigo?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background: 'none', border: 'none', fontFamily: 'inherit', padding: '6px 8px',
      fontSize: 13, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      color: perigo ? 'rgba(255,159,154,.85)' : 'rgba(235,235,245,.55)',
      textDecoration: 'underline', textUnderlineOffset: 3,
    }}>{children}</button>
  )
}

export function CabecalhoRelatorio({ n, carregando }: { n: number; carregando: boolean }) {
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

export default function Relatorio(
  { encerradas, carregando, paciente }: Pick<DadosCrises, 'encerradas' | 'carregando'> & { paciente: Paciente },
) {
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
