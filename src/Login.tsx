import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { supabase } from './lib/supabase.ts'
import { card, campo, sectionLabel, BotaoPrimario } from './ui.tsx'

const botaoSocial: CSSProperties = {
  width: '100%', height: 52, borderRadius: 999, cursor: 'pointer',
  background: 'rgba(120,120,128,.24)', backdropFilter: 'blur(12px) saturate(180%)',
  border: '.5px solid rgba(255,255,255,.18)',
  boxShadow: 'inset 1.5px 1.5px 1px rgba(255,255,255,.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  fontSize: 16, fontWeight: 600, color: '#fff', fontFamily: 'inherit', boxSizing: 'border-box',
}

// "G" oficial do Google, inline para não depender de rede nem de arquivo.
function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ flex: 'none' }}>
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  )
}

export default function Login() {
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState<{ erro?: boolean; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const verbo = modo === 'entrar' ? 'Entrar' : 'Criar conta'

  const social = async (provider: 'google') => {
    setMsg(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider, options: { redirectTo: window.location.origin },
    })
    if (error) setMsg({ erro: true, texto: error.message })
  }

  const porEmail = async (e: FormEvent) => {
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
          {/* O primeiro login social já cria a conta — o rótulo segue o modo para deixar isso claro.
              O botão da Apple sai daqui até haver inscrição no Apple Developer Program: Sign in
              with Apple exige Services ID + key .p8, que só existem no programa pago. */}
          <button type="button" style={botaoSocial} onClick={() => social('google')}>
            <LogoGoogle />{verbo} com Google
          </button>

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
