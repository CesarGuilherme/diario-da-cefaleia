import { useEffect, useState } from 'react'
import { supabase, faltaConfig } from './lib/supabase.js'
import { useCrises } from './useCrises.js'
import { usePacientes, FormPaciente, BarraPaciente } from './Pacientes.jsx'
import { useDesktop } from './useDesktop.js'
import { BannerErro } from './ui.jsx'
import Painel from './Painel.jsx'
import Login from './Login.jsx'
import NovaCrise from './screens/NovaCrise.jsx'
import CriseAndamento from './screens/CriseAndamento.jsx'
import Historico from './screens/Historico.jsx'
import Relatorio from './screens/Relatorio.jsx'

const AURORA = [
  'radial-gradient(circle at 15% 8%, rgba(124,108,246,.38), transparent 42%)',
  'radial-gradient(circle at 90% 25%, rgba(56,189,248,.20), transparent 45%)',
  'radial-gradient(circle at 60% 95%, rgba(124,108,246,.18), transparent 50%)',
]
// O 4º gradiente só aparece com crise aberta — junto com a aba vermelha, é o aviso do app.
const AURORA_ATIVA = 'radial-gradient(circle at 50% 0%, rgba(255,69,58,.30), transparent 45%)'

const ABAS = [['Nova', 'nova'], ['Histórico', 'historico'], ['Relatório', 'relatorio']]

export default function App() {
  const [sessao, setSessao] = useState(undefined) // undefined = ainda carregando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // backgroundImage/Color separados do shorthand: misturar `background` com
  // `backgroundAttachment` faz o React avisar de conflito no rerender.
  const fundo = {
    minHeight: '100%',
    backgroundImage: AURORA.join(','),
    backgroundColor: '#0a0a13',
    backgroundAttachment: 'fixed',
  }

  if (faltaConfig) return <div style={fundo}><ErroConfig /></div>
  if (sessao === undefined) return <div style={fundo} />
  if (!sessao) return <div style={fundo}><Login /></div>
  // key no uid: trocar de conta sem passar por deslogado reaproveitaria os hooks e
  // mostraria o paciente do usuário anterior por um render (espelha .id(userId) no iOS).
  return <Diario key={sessao.user.id} userId={sessao.user.id} />
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
function Diario({ userId }) {
  const pac = usePacientes(userId)
  const dados = useCrises(pac.selecionado?.id)
  const desktop = useDesktop()
  const erro = dados.erro ?? pac.erro
  const dispensar = () => { dados.setErro(null); pac.setErro(null) }

  const camadas = dados.ativa ? [AURORA_ATIVA, ...AURORA] : AURORA

  return (
    <div style={{
      minHeight: '100%', backgroundImage: camadas.join(','),
      backgroundColor: '#0a0a13', backgroundAttachment: 'fixed',
    }}>
      {desktop
        ? <Painel pac={pac} dados={dados} erro={erro} dispensar={dispensar} />
        : <Telefone pac={pac} dados={dados} erro={erro} dispensar={dispensar} />}
    </div>
  )
}

function Telefone({ pac, dados, erro, dispensar }) {
  const [tela, setTela] = useState('nova')
  const [editando, setEditando] = useState(null) // null | 'novo' | paciente
  const paciente = pac.selecionado
  const { ativa } = dados

  // Paciente é obrigatório: sem nenhum cadastrado, o app é só o formulário.
  const form = editando ?? (!pac.carregando && !paciente ? 'novo' : null)

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
            <BarraPaciente
              pacientes={pac.pacientes} selecionado={paciente} escolher={pac.escolher}
              onNovo={() => setEditando('novo')} onEditar={() => setEditando(paciente)}
            />
            {tela === 'nova' && !ativa && <NovaCrise {...dados} />}
            {tela === 'nova' && ativa && <CriseAndamento key={ativa.id} {...dados} irPara={setTela} />}
            {tela === 'historico' && <Historico {...dados} />}
            {tela === 'relatorio' && <Relatorio {...dados} paciente={paciente} />}
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
