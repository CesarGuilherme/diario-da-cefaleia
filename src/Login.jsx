import { useState } from 'react'
import { supabase } from './lib/supabase.js'
import { card, campo, sectionLabel, BotaoPrimario } from './ui.jsx'

const botaoSocial = {
  width: '100%', height: 52, borderRadius: 999, cursor: 'pointer',
  background: 'rgba(120,120,128,.24)', backdropFilter: 'blur(12px) saturate(180%)',
  border: '.5px solid rgba(255,255,255,.18)',
  boxShadow: 'inset 1.5px 1.5px 1px rgba(255,255,255,.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  fontSize: 16, fontWeight: 600, color: '#fff', fontFamily: 'inherit', boxSizing: 'border-box',
}

export default function Login() {
  const [modo, setModo] = useState('entrar') // 'entrar' | 'cadastrar'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const verbo = modo === 'entrar' ? 'Entrar' : 'Criar conta'

  const social = async (provider) => {
    setMsg(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider, options: { redirectTo: window.location.origin },
    })
    if (error) setMsg({ erro: true, texto: error.message })
  }

  const porEmail = async (e) => {
    e.preventDefault()
    setMsg(null)
    setOcupado(true)
    const { error } = modo === 'entrar'
      ? await supabase.auth.signInWithPassword({ email, password: senha })
      : await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin } })
    setOcupado(false)
    if (error) setMsg({ erro: true, texto: error.message })
    else if (modo === 'cadastrar') setMsg({ texto: 'Confira seu e-mail para confirmar a conta.' })
    // No modo entrar, o onAuthStateChange do App troca a tela sozinho.
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '.2px' }}>Diário da Cefaléia</div>
          <div style={{ fontSize: 14, color: 'rgba(235,235,245,.55)', marginTop: 6 }}>
            Registre as crises e descubra o gatilho.
          </div>
        </div>

        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* O primeiro login social já cria a conta — o rótulo segue o modo para deixar isso claro. */}
          <button type="button" style={botaoSocial} onClick={() => social('google')}>{verbo} com Google</button>
          <button type="button" style={botaoSocial} onClick={() => social('apple')}>{verbo} com Apple</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
            <div style={{ flex: 1, height: '.5px', background: 'rgba(255,255,255,.14)' }} />
            <span style={{ fontSize: 12, color: 'rgba(235,235,245,.4)' }}>ou com e-mail</span>
            <div style={{ flex: 1, height: '.5px', background: 'rgba(255,255,255,.14)' }} />
          </div>

          <form onSubmit={porEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label htmlFor="email" style={sectionLabel}>E-mail</label>
              <input id="email" type="email" required autoComplete="email" style={campo}
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
            </div>
            <div>
              <label htmlFor="senha" style={sectionLabel}>Senha</label>
              <input id="senha" type="password" required minLength={6} style={campo}
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mínimo 6 caracteres" />
            </div>
            <BotaoPrimario type="submit" disabled={ocupado}>{verbo}</BotaoPrimario>
          </form>

          {msg && (
            <div role="status" style={{ fontSize: 13, textAlign: 'center', color: msg.erro ? '#ffb5b0' : '#a9f0cd' }}>
              {msg.texto}
            </div>
          )}

          <button type="button"
            onClick={() => { setModo(modo === 'entrar' ? 'cadastrar' : 'entrar'); setMsg(null) }}
            style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13, color: '#8b7cfc', cursor: 'pointer', padding: 4 }}>
            {modo === 'entrar' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
