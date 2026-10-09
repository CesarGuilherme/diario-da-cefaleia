import { useEffect, useState } from 'react'
import { supabase, faltaConfig } from './lib/supabase.ts'
import { useCrises } from './useCrises.ts'
import type { DadosCrises } from './useCrises.ts'
import { usePacientes, FormPaciente, BarraPaciente } from './Pacientes.tsx'
import type { DadosPacientes } from './Pacientes.tsx'
import { useDesktop } from './useDesktop.ts'
import { BannerErro, Carregando, fundoAurora } from './ui.tsx'
import Painel from './Painel.tsx'
import Login, { RedefinirSenha } from './Login.tsx'
import { emRecovery, marcarRecovery, limparRecovery, urlEhRecovery } from './sessao.ts'
import NovaCrise from './screens/NovaCrise.tsx'
import CriseAndamento from './screens/CriseAndamento.tsx'
import Historico from './screens/Historico.tsx'
import Relatorio from './screens/Relatorio.tsx'
import Ajustes from './screens/Ajustes.tsx'
import type { Paciente } from './lib/tipos.ts'
import type { Session, User } from '@supabase/supabase-js'

// O 4º gradiente só aparece com crise aberta — junto com a aba vermelha, é o aviso do app.
const AURORA_ATIVA = 'radial-gradient(circle at 50% 0%, rgba(255,69,58,.30), transparent 45%)'

const ABAS = [
  ['Nova', 'nova'], ['Histórico', 'historico'], ['Relatório', 'relatorio'], ['Ajustes', 'ajustes'],
] as const

type Tela = (typeof ABAS)[number][1]

/** O que a casca (telefone ou dashboard) recebe pronto do Diario. */
export type Casca = {
  user: User
  pac: DadosPacientes
  dados: DadosCrises
  erro: string | null
  dispensar: () => void
}

export default function App() {
  // undefined = ainda carregando; null = deslogado
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)
  const [recuperando, setRecuperando] = useState(() => urlEhRecovery() || emRecovery())

  useEffect(() => {
    // Não usar getSession() aqui: no landing do link ele devolve a sessão de recovery
    // um tick antes de PASSWORD_RECOVERY e o Diario montaria com o JWT de reset.
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      const uid = s?.user.id
      if (e === 'PASSWORD_RECOVERY') {
        marcarRecovery(undefined, Date.now(), uid)
        setRecuperando(true)
      } else if (e === 'INITIAL_SESSION' && (urlEhRecovery() || emRecovery(undefined, Date.now(), uid))) {
        if (uid) marcarRecovery(undefined, Date.now(), uid)
        setRecuperando(true)
      } else if (e === 'SIGNED_OUT') {
        limparRecovery()
        setRecuperando(false)
      } else if (e === 'SIGNED_IN' && uid && !emRecovery(undefined, Date.now(), uid)) {
        limparRecovery()
        setRecuperando(false)
      }
      setSessao(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const fundo = fundoAurora()

  if (faltaConfig) return <div style={fundo}><ErroConfig /></div>
  if (sessao === undefined) return <div style={fundo}><EsperaSessao /></div>
  if (!sessao) return <div style={fundo}><Login /></div>
  if (recuperando) return <div style={fundo}><RedefinirSenha onOk={() => { limparRecovery(); setRecuperando(false) }} /></div>
  // key no uid: trocar de conta sem passar por deslogado reaproveitaria os hooks e
  // mostraria o paciente do usuário anterior por um render (espelha .id(userId) no iOS).
  return <Diario key={sessao.user.id} user={sessao.user} />
}

const LIMITE_SESSAO_MS = 8000

/** Sem resposta do Supabase (projeto pausado, rede caída) o GoTrue só desiste depois de
 *  vários retries — a tela ficaria em "Carregando…" sem explicação. */
function EsperaSessao() {
  const [demorou, setDemorou] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDemorou(true), LIMITE_SESSAO_MS)
    return () => clearTimeout(t)
  }, [])
  if (!demorou) return <Carregando />
  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', boxSizing: 'border-box' }}>
      <div role="alert" style={{
        maxWidth: 420, borderRadius: 26, padding: 22, textAlign: 'center',
        background: 'rgba(255,69,58,.12)', border: '.5px solid rgba(255,69,58,.3)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Não consegui falar com o servidor</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(235,235,245,.7)', marginBottom: 16 }}>
          Verifique sua conexão. Se continuar, o serviço pode estar indisponível.
        </div>
        <button onClick={() => location.reload()} style={{
          padding: '10px 20px', borderRadius: 999, border: 0, cursor: 'pointer',
          background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 15, fontWeight: 600,
        }}>Tentar de novo</button>
      </div>
    </div>
  )
}

function ErroConfig() {
  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', boxSizing: 'border-box' }}>
      <div style={{
        maxWidth: 420, borderRadius: 26, padding: 22,
        background: 'rgba(255,69,58,.12)', border: '.5px solid rgba(255,69,58,.3)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>App não configurado</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(235,235,245,.7)' }}>
          Faltam as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.
          {' '}No Vite elas são embutidas <strong>durante o build</strong> — depois de adicioná-las
          na Vercel é preciso refazer o deploy.
        </div>
      </div>
    </div>
  )
}

// A casca é a mesma nos dois tamanhos: aurora, banner de erro e os hooks de dados.
// Só a composição interna troca — telefone empilha em abas, desktop abre o dashboard.
function Diario({ user }: { user: User }) {
  const pac = usePacientes(user.id)
  const dados = useCrises(pac.selecionado?.id ?? null)
  const desktop = useDesktop()
  const erro = dados.erro ?? pac.erro
  const dispensar = () => { dados.setErro(null); pac.setErro(null) }

  return (
    <div style={dados.ativa ? fundoAurora(AURORA_ATIVA) : fundoAurora()}>
      {desktop
        ? <Painel user={user} pac={pac} dados={dados} erro={erro} dispensar={dispensar} />
        : <Telefone user={user} pac={pac} dados={dados} erro={erro} dispensar={dispensar} />}
    </div>
  )
}

function Telefone({ user, pac, dados, erro, dispensar }: Casca) {
  const [tela, setTela] = useState<Tela>('nova')
  const [editando, setEditando] = useState<'novo' | Paciente | null>(null)
  const paciente = pac.selecionado
  const { ativa } = dados

  // Paciente é obrigatório: sem nenhum cadastrado, o app é só o formulário.
  const form = editando ?? (!pac.carregando && !paciente ? 'novo' : null)

  if (!form && !paciente && pac.carregando) return <Carregando />

  return (
    <>
      <div style={{
        maxWidth: 440, margin: '0 auto', boxSizing: 'border-box',
        padding: '60px 16px calc(150px + env(safe-area-inset-bottom))',
      }}>
        <BannerErro erro={erro} dispensar={dispensar} />

        {form && (
          <FormPaciente
            key={form === 'novo' ? 'novo' : form.id}
            inicial={form === 'novo' ? null : form}
            primeiro={!paciente}
            onSalvar={(campos) => (form === 'novo' ? pac.criar(campos) : pac.salvar(form.id, campos))}
            onCancelar={paciente ? () => setEditando(null) : undefined}
          />
        )}

        {!form && paciente && (
          <>
            {/* A troca de paciente não tem o que fazer nos Ajustes: lá a conversa é sobre a
                conta, e a barra dizendo "Manu" ao lado de "sou César" só confunde. */}
            {tela !== 'ajustes' && (
              <BarraPaciente
                pacientes={pac.pacientes} selecionado={paciente} escolher={pac.escolher}
                onNovo={() => setEditando('novo')} onEditar={() => setEditando(paciente)}
              />
            )}
            {tela === 'nova' && !ativa && <NovaCrise {...dados} />}
            {tela === 'nova' && ativa && <CriseAndamento key={ativa.id} {...dados} ativa={ativa} irPara={setTela} />}
            {tela === 'historico' && <Historico {...dados} />}
            {tela === 'relatorio' && <Relatorio {...dados} paciente={paciente} />}
            {tela === 'ajustes' && <Ajustes user={user} pac={pac} />}
          </>
        )}
      </div>

      {!form && paciente && <nav style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30,
        padding: '0 20px calc(28px + env(safe-area-inset-bottom))',
        pointerEvents: 'none',
      }}>
        <div style={{
          maxWidth: 440, margin: '0 auto', height: 62, borderRadius: 999, pointerEvents: 'auto',
          background: 'rgba(120,120,128,.22)', backdropFilter: 'blur(20px) saturate(180%)',
          border: '.5px solid rgba(255,255,255,.16)',
          boxShadow: 'inset 1.5px 1.5px 1px rgba(255,255,255,.14),0 12px 32px rgba(0,0,0,.4)',
          display: 'flex', gap: 5, padding: 6, boxSizing: 'border-box',
        }}>
          {ABAS.map(([label, id]) => {
            const sel = tela === id
            const emCurso = id === 'nova' && ativa
            return (
              <button key={id} type="button" onClick={() => setTela(id)} aria-current={sel ? 'page' : undefined}
                style={{
                  flex: 1, borderRadius: 999, border: 'none', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, cursor: 'pointer', fontWeight: sel ? 700 : 600,
                  color: emCurso ? (sel ? '#ffb5b0' : '#ff6961') : sel ? '#fff' : 'rgba(235,235,245,.55)',
                  background: sel ? (emCurso ? 'rgba(255,69,58,.28)' : 'rgba(255,255,255,.2)') : 'transparent',
                  boxShadow: sel ? 'inset 1px 1px 1px rgba(255,255,255,.25)' : 'none',
                }}>
                {emCurso ? '● Em curso' : label}
              </button>
            )
          })}
        </div>
      </nav>}
    </>
  )
}
