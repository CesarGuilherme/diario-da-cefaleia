// Dashboard desktop: as três abas do mobile viradas painéis simultâneos.
// Nenhuma tela foi reescrita — NovaCrise, CriseAndamento, Historico, FormPaciente e os
// painéis do Relatório são os mesmos componentes, só compostos em grid.
import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase.ts'
import { fmtDecorrido, idade } from './format.ts'
import { card, campo, titulo, eyebrow, BotaoPrimario, BannerErro } from './ui.tsx'
import { analisar } from './report.ts'
import { FormPaciente } from './Pacientes.tsx'
import NovaCrise from './screens/NovaCrise.tsx'
import CriseAndamento from './screens/CriseAndamento.tsx'
import Historico from './screens/Historico.tsx'
import {
  MIN_CRISES, CabecalhoRelatorio, SemDados, Insight, Gatilhos, Estatisticas, CrisesPorDia,
  Compartilhar,
} from './screens/Relatorio.tsx'
import type { Casca } from './App.tsx'
import type { Crise, Paciente } from './lib/tipos.ts'
import type { CSSProperties, ReactNode } from 'react'

// 100vh menos o padding do grid (28px em cima e embaixo), senão o documento fica maior
// que a janela: três barras de rolagem e a sidebar sticky nunca engata.
const COLUNA_ROLA: CSSProperties = { minHeight: 0, maxHeight: 'calc(100vh - 56px)', overflowY: 'auto', paddingRight: 4 }

/** Folha sobreposta: registro e formulários não roubam espaço do dashboard. */
function Sobreposto({ children, fechar }: { children: ReactNode; fechar: () => void }) {
  // Só fecha se o gesto começou e terminou no fundo: selecionar texto no formulário e
  // soltar o mouse fora não pode descartar o rascunho de uma crise.
  const doFundo = useRef(false)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [fechar])

  return (
    <div role="dialog" aria-modal="true"
      onMouseDown={(e) => { doFundo.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && doFundo.current) fechar() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 40, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px',
        background: 'rgba(6,6,14,.62)', backdropFilter: 'blur(8px)',
      }}>
      <div style={{
        width: '100%', maxWidth: 520, maxHeight: '100%', overflowY: 'auto',
        borderRadius: 30, padding: 22, boxSizing: 'border-box',
        background: 'rgba(20,20,32,.92)', border: '.5px solid rgba(255,255,255,.16)',
        boxShadow: '0 24px 60px rgba(0,0,0,.6)',
      }}>
        {children}
        <button type="button" onClick={fechar} style={{
          width: '100%', marginTop: 14, background: 'none', border: 'none', fontFamily: 'inherit',
          fontSize: 13, color: 'rgba(235,235,245,.45)', cursor: 'pointer', padding: 8,
        }}>Fechar (Esc)</button>
      </div>
    </div>
  )
}

function ItemPaciente({ p, sel, onClick }: { p: Paciente; sel: boolean; onClick: () => void }) {
  const anos = idade(p.data_nascimento)
  return (
    <button type="button" onClick={onClick} aria-current={sel ? 'true' : undefined} style={{
      display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
      padding: '10px 12px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
      background: sel ? 'rgba(255,255,255,.14)' : 'transparent',
      border: sel ? '.5px solid rgba(255,255,255,.18)' : '.5px solid transparent',
      boxShadow: sel ? 'inset 1px 1px 1px rgba(255,255,255,.16)' : 'none',
      color: sel ? '#fff' : 'rgba(235,235,245,.6)',
    }}>
      <span aria-hidden="true" style={{
        width: 8, height: 8, borderRadius: '50%', flex: 'none',
        background: sel ? '#8b7cfc' : 'rgba(120,120,128,.5)',
        boxShadow: sel ? '0 0 8px rgba(139,124,252,.8)' : 'none',
      }} />
      <span style={{ fontSize: 14.5, fontWeight: sel ? 700 : 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {p.nome}
      </span>
      {anos !== null && (
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(235,235,245,.4)' }}>{anos}a</span>
      )}
    </button>
  )
}

/** Crise aberta na sidebar: o cronômetro corre aqui também, para não precisar abrir o painel. */
function EmCurso({ ativa, abrir }: { ativa: Crise; abrir: () => void }) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <button type="button" onClick={abrir} style={{
      width: '100%', textAlign: 'left', padding: 14, borderRadius: 20, cursor: 'pointer',
      fontFamily: 'inherit', color: '#fff', background: 'rgba(255,69,58,.18)',
      border: '.5px solid rgba(255,69,58,.35)', boxShadow: 'inset 1px 1px 1px rgba(255,255,255,.12)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
        color: '#ffb5b0', animation: 'pulsar 2.4s ease-in-out infinite',
      }}>● Crise em andamento</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
        {fmtDecorrido(agora - new Date(ativa.inicio).getTime())}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(235,235,245,.55)' }}>abrir para atualizar ou encerrar</div>
    </button>
  )
}

export default function Painel({ pac, dados, erro, dispensar }: Casca) {
  // null = dashboard limpo; string = uma folha; um paciente = editando esse paciente.
  const [painel, setPainel] = useState<'nova' | 'andamento' | 'novo-paciente' | Paciente | null>(null)
  const { ativa, encerradas, crises, carregando } = dados
  const paciente = pac.selecionado
  const fechar = () => setPainel(null)

  // Paciente é obrigatório: sem nenhum, o dashboard não existe ainda.
  if (!paciente) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px' }}>
        <BannerErro erro={erro} dispensar={dispensar} />
        {!pac.carregando && <FormPaciente primeiro onSalvar={pac.criar} />}
      </div>
    )
  }

  const n = encerradas.length
  const a = n >= MIN_CRISES ? analisar(encerradas) : null

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '240px minmax(0,1fr) 420px', gap: 20,
      maxWidth: 1480, margin: '0 auto', padding: '28px 24px', boxSizing: 'border-box',
      alignItems: 'start',
    }}>
      <BannerErro erro={erro} dispensar={dispensar} style={{ gridColumn: '1 / -1', margin: 0 }} />

      <aside style={{ position: 'sticky', top: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: '0 4px' }}>
          <div style={eyebrow}>diário da</div>
          <div style={{ ...titulo, fontSize: 24 }}>Cefaléia</div>
        </div>

        <section style={{ ...card, padding: 8 }}>
          {pac.pacientes.map((p) => (
            <ItemPaciente key={p.id} p={p} sel={p.id === paciente.id} onClick={() => pac.escolher(p.id)} />
          ))}
          <div style={{ display: 'flex', gap: 6, padding: '6px 4px 2px' }}>
            <button type="button" onClick={() => setPainel('novo-paciente')} style={{
              ...campo, flex: 1, height: 34, fontSize: 12.5, cursor: 'pointer', color: 'rgba(235,235,245,.6)',
            }}>+ Paciente</button>
            <button type="button" onClick={() => setPainel(paciente)} aria-label="Editar paciente" title="Editar"
              style={{ ...campo, width: 34, height: 34, padding: 0, cursor: 'pointer', fontSize: 13 }}>✎</button>
          </div>
        </section>

        {ativa
          ? <EmCurso ativa={ativa} abrir={() => setPainel('andamento')} />
          : <BotaoPrimario onClick={() => setPainel('nova')}>+ Nova crise</BotaoPrimario>}

        <button type="button" onClick={() => supabase.auth.signOut()} style={{
          background: 'none', border: 'none', fontFamily: 'inherit', padding: 8, textAlign: 'left',
          fontSize: 13, color: 'rgba(235,235,245,.45)', cursor: 'pointer',
        }}>Sair da conta</button>
      </aside>

      <main style={{ ...COLUNA_ROLA, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <CabecalhoRelatorio n={n} carregando={carregando} />
        {!carregando && !a && <SemDados />}
        {a && (
          <>
            <Insight insight={a.insight} />
            {/* O ganho da tela grande: gatilhos e evolução no mês lado a lado. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14, alignItems: 'start' }}>
              <Gatilhos gatilhos={a.gatilhos} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Estatisticas frequencia={a.frequencia} duracaoMedia={a.duracaoMedia} />
                <CrisesPorDia crises={encerradas} />
              </div>
            </div>
            <Compartilhar encerradas={encerradas} paciente={paciente} />
          </>
        )}
      </main>

      <div style={COLUNA_ROLA}>
        <Historico crises={crises} carregando={carregando} apagar={dados.apagar} atualizar={dados.atualizar} />
      </div>

      {painel === 'nova' && (
        <Sobreposto fechar={fechar}>
          {/* iniciar devolve true/false; fecha só quando o servidor confirmou. */}
          <NovaCrise iniciar={async (c) => { const ok = await dados.iniciar(c); if (ok) fechar(); return ok }} />
        </Sobreposto>
      )}
      {painel === 'andamento' && ativa && (
        <Sobreposto fechar={fechar}>
          <CriseAndamento key={ativa.id} {...dados} ativa={ativa} irPara={fechar} />
        </Sobreposto>
      )}
      {painel === 'novo-paciente' && (
        <Sobreposto fechar={fechar}>
          <FormPaciente onSalvar={pac.criar} onCancelar={fechar} />
        </Sobreposto>
      )}
      {painel !== null && typeof painel === 'object' && (
        <Sobreposto fechar={fechar}>
          <FormPaciente inicial={painel} onSalvar={(campos) => pac.salvar(painel.id, campos)} onCancelar={fechar} />
        </Sobreposto>
      )}
    </div>
  )
}
