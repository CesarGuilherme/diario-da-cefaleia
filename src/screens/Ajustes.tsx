// Ajustes: tudo que é da conta, e não da crise. Antes disso o app não tinha onde tratar
// senha, nome ou exclusão de conta — "Sair" vivia solto no rodapé do Relatório.
//
// A forma é a lista agrupada dos Ajustes do iOS (HIG): cabeçalho de seção fora do card,
// uma tarefa por grupo, e a ação destrutiva sozinha no fim, em vermelho, dizendo o que
// some antes de perguntar. Desenhada com o design system que já existe — nenhum
// componente visual novo entra por causa desta tela.
import { useState } from 'react'
import { supabase } from '../lib/supabase.ts'
import { card, campo, titulo, eyebrow, sectionLabel, BotaoPrimario, Secundaria } from '../ui.tsx'
import { falhasSenha, senhaValida } from '../senha.ts'
import { temSenha, nomeDoUsuario, pacienteQueSouEu, listar } from '../conta.ts'
import { ValidadorSenha } from '../Login.tsx'
import { chaveLocal } from '../Pacientes.tsx'
import type { DadosPacientes } from '../Pacientes.tsx'
import type { User } from '@supabase/supabase-js'
import type { CSSProperties, FormEvent, ReactNode } from 'react'

type Msg = { erro?: boolean; texto: string } | null

const aviso: CSSProperties = { fontSize: 13, lineHeight: 1.45, color: 'rgba(235,235,245,.5)' }

function Secao({ nome, children }: { nome: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 8, padding: '0 4px' }}>{nome}</div>
      <section style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </section>
    </div>
  )
}

function Recado({ msg }: { msg: Msg }) {
  if (!msg) return null
  return (
    <div role="status" style={{ fontSize: 13, color: msg.erro ? '#ffb5b0' : '#a9f0cd' }}>
      {msg.texto}
    </div>
  )
}

export default function Ajustes({ user, pac }: { user: User; pac: DadosPacientes }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ padding: '4px 4px 2px' }}>
        <div style={eyebrow}>{user.email}</div>
        <h1 style={{ ...titulo, margin: 0 }}>Ajustes</h1>
      </div>

      <Perfil user={user} pac={pac} />
      <QuemSouEu user={user} pac={pac} />
      <Senha user={user} />

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Secundaria onClick={() => supabase.auth.signOut()}>Sair da conta</Secundaria>
      </div>

      <ExcluirConta user={user} />
    </div>
  )
}

/** O nome do usuário mora no `user_metadata` do próprio Supabase — nenhuma tabela nova
 *  para uma linha de texto, e ele já sincroniza sozinho entre os aparelhos. */
function Perfil({ user, pac }: { user: User; pac: DadosPacientes }) {
  const salvo = nomeDoUsuario(user)
  const [nome, setNome] = useState(salvo)
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const limpo = nome.trim()

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setOcupado(true); setMsg(null)
    const { error } = await supabase.auth.updateUser({ data: { nome: limpo } })
    // Se este usuário também é um paciente, o nome é o mesmo nos dois lugares — deixar
    // divergir daria duas respostas para "como você se chama" na mesma conta.
    const eu = pac.pacientes.find((p) => p.sou_eu)
    if (!error && eu && limpo && eu.nome !== limpo) await pac.salvar(eu.id, { nome: limpo, data_nascimento: eu.data_nascimento })
    setOcupado(false)
    setMsg(error ? { erro: true, texto: error.message } : { texto: 'Nome salvo.' })
  }

  return (
    <Secao nome="Seu nome">
      <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input value={nome} onChange={(e) => { setNome(e.target.value); setMsg(null) }}
          placeholder="Como podemos te chamar" aria-label="Seu nome" style={campo} />
        <div style={aviso}>Aparece só para você. O nome do paciente é outro campo.</div>
        <BotaoPrimario type="submit" disabled={ocupado || limpo === salvo}>Salvar nome</BotaoPrimario>
        <Recado msg={msg} />
      </form>
    </Secao>
  )
}

/** O papel do dono da conta: só acompanha, ou é paciente também. Duas opções escritas por
 *  extenso, com os nomes de quem você acompanha — "Ninguém" obrigava a traduzir de cabeça
 *  o que aquilo queria dizer. Qual linha de `pacientes` é você, o app resolve sozinho. */
function QuemSouEu({ user, pac }: { user: User; pac: DadosPacientes }) {
  const [ocupado, setOcupado] = useState(false)
  const nome = nomeDoUsuario(user)
  const eu = pac.pacientes.find((p) => p.sou_eu)

  const quem = nome || eu?.nome || 'Você'
  const acompanhados = pac.pacientes.filter((p) => !p.sou_eu).map((p) => p.nome)

  const escolher = async (v: string) => {
    setOcupado(true)
    if (v !== 'eu') await pac.definirSouEu(null)
    else {
      // Marcar um homônimo em vez de criar outro: quem começou sozinho já se cadastrou
      // como paciente, e um segundo "César" partiria o histórico em dois.
      const meu = pacienteQueSouEu(pac.pacientes, nome)
      if (meu) await pac.definirSouEu(meu.id)
      else await pac.criar({ nome, data_nascimento: null, sou_eu: true })
    }
    setOcupado(false)
  }

  return (
    <Secao nome="Quem é você nesta conta">
      <select value={eu ? 'eu' : ''} disabled={ocupado} aria-label="Quem é você nesta conta"
        onChange={(e) => escolher(e.target.value)}
        style={{ ...campo, fontWeight: 600, appearance: 'none', cursor: ocupado ? 'default' : 'pointer' }}>
        <option value="" style={{ color: '#000' }}>
          {acompanhados.length
            ? `${quem} — acompanhando ${listar(acompanhados)}`
            : `${quem} — acompanhando outra pessoa`}
        </option>
        {/* Sem nome não dá para criar o paciente (o banco exige um), mas quem já está
            marcado continua podendo se ver marcado. */}
        {(nome || eu) && (
          <option value="eu" style={{ color: '#000' }}>{quem} — usuário e paciente</option>
        )}
      </select>
      <div style={aviso}>
        {eu
          ? `Suas crises entram em ${eu.nome}, junto com as de quem mais você acompanhar.`
          : nome
            ? 'A segunda opção é para quando as crises registradas também são suas.'
            : 'Preencha seu nome acima para poder se cadastrar como paciente.'}
      </div>
    </Secao>
  )
}

function Senha({ user }: { user: User }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  // ponytail: definir senha em conta social é o fluxo de "esqueci a senha", que já existe
  // no Login. Só construir aqui se alguém pedir.
  if (!temSenha(user)) {
    return (
      <Secao nome="Senha">
        <div style={aviso}>Você entra com o Google — esta conta não tem senha para trocar.</div>
      </Secao>
    )
  }

  const trocar = async (e: FormEvent) => {
    e.preventDefault()
    const falta = falhasSenha(nova)
    if (falta.length) { setMsg({ erro: true, texto: `A senha precisa de ${falta.join(', ')}.` }); return }
    setOcupado(true); setMsg(null)

    // A senha atual é conferida de propósito: o Supabase não a exige, e a sessão dura
    // semanas — sem isto, um celular destravado troca a senha do dono. Errar aqui não
    // derruba a sessão que já está aberta.
    const { error: erroAtual } = await supabase.auth.signInWithPassword({
      email: user.email ?? '', password: atual,
    })
    if (erroAtual) {
      setOcupado(false)
      setMsg({ erro: true, texto: 'Senha atual incorreta.' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: nova })
    setOcupado(false)
    if (error) { setMsg({ erro: true, texto: error.message }); return }
    setAtual(''); setNova('')
    setMsg({ texto: 'Senha alterada.' })
  }

  return (
    <Secao nome="Senha">
      <form onSubmit={trocar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* O campo de e-mail escondido é o que faz o gerenciador de senhas do iOS saber
            de qual conta é a senha nova — sem ele, ele oferece salvar sem identidade. */}
        <input type="text" name="username" autoComplete="username" value={user.email ?? ''}
          readOnly hidden />
        <label>
          <div style={sectionLabel}>Senha atual</div>
          <input type="password" required autoComplete="current-password" style={campo}
            value={atual} onChange={(e) => setAtual(e.target.value)} />
        </label>
        <label>
          <div style={sectionLabel}>Nova senha</div>
          <input type="password" required minLength={8} autoComplete="new-password" style={campo}
            value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Aa1! · 8 caracteres" />
        </label>
        <ValidadorSenha senha={nova} />
        <BotaoPrimario type="submit" disabled={ocupado || !atual || !senhaValida(nova)}>
          Alterar senha
        </BotaoPrimario>
        <Recado msg={msg} />
      </form>
    </Secao>
  )
}

/** Guideline 5.1.1(v) do App Review: quem cria conta pelo app apaga pelo app.
 *  Três portões, porque isto não tem volta: o botão vermelho revela o card, o card escreve
 *  o que some, e o alerta nativo pergunta uma última vez. O card não substitui o alerta —
 *  ele explica; o alerta é o que tira o dedo de cima do botão errado. */
function ExcluirConta({ user }: { user: User }) {
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const excluir = async () => {
    // O mesmo alerta nativo que o app já usa para apagar uma crise e revogar um link. Ele
    // sai do desenho da página: não dá para clicar sem ver, nem tocar sem querer.
    if (!confirm('Excluir a conta e apagar todas as crises? Isso não pode ser desfeito.')) return
    setOcupado(true); setMsg(null)
    const { error } = await supabase.functions.invoke('excluir-conta', { method: 'POST' })
    if (error) {
      setOcupado(false)
      setMsg({ erro: true, texto: `Não foi possível excluir a conta: ${error.message}` })
      return
    }
    // O usuário não existe mais: o signOut normal bateria no servidor e voltaria 401,
    // deixando a sessão morta na tela. `local` só limpa este aparelho, que é o que resta.
    localStorage.removeItem(chaveLocal(user.id))
    await supabase.auth.signOut({ scope: 'local' })
  }

  if (!confirmando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Secundaria perigo onClick={() => setConfirmando(true)}>Excluir conta</Secundaria>
      </div>
    )
  }

  return (
    <section style={{
      ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
      background: 'rgba(255,69,58,.12)', border: '.5px solid rgba(255,69,58,.3)',
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#ffb5b0' }}>Excluir a conta?</div>
      <div style={{ ...aviso, color: 'rgba(235,235,245,.65)' }}>
        Some tudo, e não dá para desfazer: a conta, os pacientes, todas as crises
        registradas e os links já enviados ao médico. Não guardamos cópia.
      </div>
      <button type="button" onClick={excluir} disabled={ocupado} style={{
        width: '100%', height: 52, borderRadius: 999, border: 'none', fontFamily: 'inherit',
        background: 'linear-gradient(180deg,#ff6b62,#e0332a)',
        boxShadow: '0 8px 24px rgba(255,69,58,.35),inset 1.5px 1.5px 1px rgba(255,255,255,.3)',
        fontSize: 16, fontWeight: 700, color: '#fff', boxSizing: 'border-box',
        cursor: ocupado ? 'default' : 'pointer', opacity: ocupado ? 0.5 : 1,
      }}>{ocupado ? 'Excluindo…' : 'Excluir definitivamente'}</button>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Secundaria onClick={() => setConfirmando(false)} disabled={ocupado}>Cancelar</Secundaria>
      </div>
      <Recado msg={msg} />
    </section>
  )
}
