// Pacientes: um responsável, N filhos. Toda crise pertence a um — o paciente
// selecionado é o filtro de tudo que o app mostra.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { card, campo, titulo, eyebrow, sectionLabel, BotaoPrimario } from './ui.jsx'
import { idade } from './format.js'

const chaveLocal = (userId) => `paciente:${userId}`

export function usePacientes(userId) {
  const [pacientes, setPacientes] = useState([])
  const [id, setId] = useState(() => localStorage.getItem(chaveLocal(userId)))
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let vivo = true
    supabase.from('pacientes').select('*').order('criado_em')
      .then(({ data, error }) => {
        if (!vivo) return
        if (error) setErro(error.message)
        else setPacientes(data)
        setCarregando(false)
      })
    return () => { vivo = false }
  }, [userId])

  const escolher = useCallback((novo) => {
    setId(novo)
    localStorage.setItem(chaveLocal(userId), novo)
  }, [userId])

  const criar = useCallback(async (campos) => {
    const { data, error } = await supabase.from('pacientes').insert(campos).select().single()
    if (error) { setErro(error.message); return false }
    setPacientes((ps) => [...ps, data])
    escolher(data.id)
    return true
  }, [escolher])

  const salvar = useCallback(async (pid, campos) => {
    const { data, error } = await supabase.from('pacientes')
      .update(campos).eq('id', pid).select().single()
    if (error) { setErro(error.message); return false }
    setPacientes((ps) => ps.map((p) => (p.id === pid ? data : p)))
    return true
  }, [])

  // Se o id guardado no localStorage não existe mais (apagado em outro device), cai no primeiro.
  const selecionado = pacientes.find((p) => p.id === id) ?? pacientes[0] ?? null

  return { pacientes, selecionado, carregando, erro, setErro, escolher, criar, salvar }
}

/** Form de paciente. Sem `inicial` = criando; com = editando. */
export function FormPaciente({ inicial, primeiro, onSalvar, onCancelar }) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [nasc, setNasc] = useState(inicial?.data_nascimento ?? '')
  const [salvando, setSalvando] = useState(false)
  const hoje = new Date().toISOString().slice(0, 10)

  const enviar = async (e) => {
    e.preventDefault()
    if (!nome.trim() || salvando) return
    setSalvando(true)
    const ok = await onSalvar({ nome: nome.trim(), data_nascimento: nasc || null })
    if (ok) onCancelar?.()
    else setSalvando(false)
  }

  return (
    <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '4px 4px 2px' }}>
        <div style={eyebrow}>{primeiro ? 'quem você vai acompanhar' : 'paciente'}</div>
        <h1 style={{ ...titulo, margin: 0 }}>{inicial ? 'Editar paciente' : 'Novo paciente'}</h1>
      </div>
      <section style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label>
          <div style={sectionLabel}>Nome</div>
          <input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus
            placeholder="Ex.: Manu" style={campo} />
        </label>
        <label>
          <div style={sectionLabel}>Nascimento (opcional)</div>
          <input type="date" value={nasc} max={hoje}
            onChange={(e) => setNasc(e.target.value)} style={campo} />
        </label>
      </section>
      <BotaoPrimario type="submit" disabled={!nome.trim() || salvando}>
        {inicial ? 'Salvar' : 'Começar a acompanhar'}
      </BotaoPrimario>
      {onCancelar && (
        <button type="button" onClick={onCancelar} style={{
          background: 'none', border: 'none', fontFamily: 'inherit', padding: 8,
          fontSize: 13, color: 'rgba(235,235,245,.45)', cursor: 'pointer',
        }}>Cancelar</button>
      )}
    </form>
  )
}

/** Troca de paciente. `<select>` nativo: o iOS já dá a roleta e a acessibilidade. */
export function BarraPaciente({ pacientes, selecionado, escolher, onNovo, onEditar }) {
  const anos = idade(selecionado.data_nascimento)
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
      <select value={selecionado.id} aria-label="Paciente"
        onChange={(e) => (e.target.value === 'novo' ? onNovo() : escolher(e.target.value))}
        style={{ ...campo, flex: 1, height: 40, fontWeight: 600, appearance: 'none' }}>
        {pacientes.map((p) => (
          <option key={p.id} value={p.id} style={{ color: '#000' }}>{p.nome}</option>
        ))}
        <option value="novo" style={{ color: '#000' }}>+ Novo paciente…</option>
      </select>
      {anos !== null && (
        <span style={{ fontSize: 13, color: 'rgba(235,235,245,.45)' }}>{anos} anos</span>
      )}
      <button type="button" onClick={onEditar} aria-label="Editar paciente" style={{
        ...campo, width: 40, height: 40, padding: 0, cursor: 'pointer', fontSize: 15,
      }}>✎</button>
    </div>
  )
}
