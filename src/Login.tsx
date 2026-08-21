import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { supabase } from './lib/supabase.ts'
import { card, campo, sectionLabel, BotaoPrimario } from './ui.tsx'
import { falhasSenha, senhaValida, REGRAS_SENHA } from './senha.ts'

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

const linkFantasma: CSSProperties = {
  background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13,
  color: '#8b7cfc', cursor: 'pointer', padding: 4,
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

  const recuperar = async () => {
    if (!email) { setMsg({ erro: true, texto: 'Informe o e-mail para redefinir a senha.' }); return }
    setOcupado(true); setMsg(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setOcupado(false)
    if (error) setMsg({ erro: true, texto: error.message })
    else setMsg({ texto: 'Se esta conta existir, enviamos um link para redefinir a senha.' })
  }

  const porEmail = async (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (modo === 'cadastrar') {
      const falta = falhasSenha(senha)
      if (falta.length) {
        setMsg({ erro: true, texto: `A senha precisa de ${falta.join(', ')}.` })
        return
      }
    }
    setOcupado(true)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      setOcupado(false)
      if (error) setMsg({ erro: true, texto: error.message })
      return
    }
    const { error } = await supabase.auth.signUp({
      email, password: senha, options: { emailRedirectTo: window.location.origin },
    })
    setOcupado(false)
    if (error) { setMsg({ erro: true, texto: error.message }); return }
    // Mesma frase para conta nova e e-mail já usado: o GoTrue devolve 200 nos dois
    // casos e o identities vazio denunciaria quem já tem cadastro.
    setMsg({ texto: 'Se este e-mail puder receber, enviamos um link. Já tem conta? Entre ou redefina a senha.' })
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
              <input id="senha" type="password" required minLength={modo === 'cadastrar' ? 8 : 1} style={campo}
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                value={senha} onChange={(e) => setSenha(e.target.value)}
                placeholder={modo === 'cadastrar' ? 'Aa1! · 8 caracteres' : ''} />
              {modo === 'cadastrar' && <ValidadorSenha senha={senha} />}
            </div>
            <BotaoPrimario type="submit" disabled={ocupado || (modo === 'cadastrar' && !senhaValida(senha))}>{verbo}</BotaoPrimario>
          </form>

          {msg && (
            <div role="status" style={{ fontSize: 13, textAlign: 'center', color: msg.erro ? '#ffb5b0' : '#a9f0cd' }}>
              {msg.texto}
            </div>
          )}

          <button type="button" onClick={recuperar} disabled={ocupado} style={linkFantasma}>
            Esqueci a senha
          </button>

          <button type="button"
            onClick={() => { setModo(modo === 'entrar' ? 'cadastrar' : 'entrar'); setMsg(null) }}
            style={linkFantasma}>
            {modo === 'entrar' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Sessão de `PASSWORD_RECOVERY`: o link do e-mail já autenticou; só falta a senha nova. */
export function RedefinirSenha({ onOk }: { onOk: () => void }) {
  const [senha, setSenha] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<{ erro?: boolean; texto: string } | null>(null)

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    const falta = falhasSenha(senha)
    if (falta.length) { setMsg({ erro: true, texto: `A senha precisa de ${falta.join(', ')}.` }); return }
    setOcupado(true); setMsg(null)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setOcupado(false)
    if (error) setMsg({ erro: true, texto: error.message })
    else onOk()
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', boxSizing: 'border-box' }}>
      <form onSubmit={salvar} style={{ ...card, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Nova senha</div>
        <label>
          <div style={sectionLabel}>Senha</div>
          <input type="password" required minLength={8} autoComplete="new-password" style={campo}
            value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Aa1! · 8 caracteres" />
        </label>
        <ValidadorSenha senha={senha} />
        <BotaoPrimario type="submit" disabled={ocupado || !senhaValida(senha)}>Salvar senha</BotaoPrimario>
        {msg && (
          <div role="status" style={{ fontSize: 13, textAlign: 'center', color: msg.erro ? '#ffb5b0' : '#a9f0cd' }}>
            {msg.texto}
          </div>
        )}
      </form>
    </div>
  )
}

/** Checklist ao vivo da senha. Exportado: os Ajustes mostram o mesmo ao trocar de senha. */
export function ValidadorSenha({ senha }: { senha: string }) {
  return (
    <ul aria-live="polite" style={{
      listStyle: 'none', margin: '8px 0 0', padding: 0,
      display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      {REGRAS_SENHA.map((r) => {
        const ok = r.ok(senha)
        return (
          <li key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600,
            color: ok ? '#a9f0cd' : 'rgba(235,235,245,.38)',
            transition: 'color .15s ease',
          }}>
            <span aria-hidden="true" style={{
              width: 14, height: 14, borderRadius: 999, flex: 'none',
              display: 'grid', placeItems: 'center', fontSize: 9, lineHeight: 1,
              background: ok ? 'rgba(48,209,88,.28)' : 'rgba(120,120,128,.18)',
              border: ok ? '.5px solid rgba(48,209,88,.45)' : '.5px solid rgba(255,255,255,.12)',
              color: ok ? '#30d158' : 'rgba(235,235,245,.35)',
            }}>{ok ? '✓' : ''}</span>
            {r.label}
          </li>
        )
      })}
    </ul>
  )
}
