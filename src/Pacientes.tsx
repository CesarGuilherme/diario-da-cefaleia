// Pacientes: um responsável, N filhos. Toda crise pertence a um — o paciente
// selecionado é o filtro de tudo que o app mostra.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.ts'
import { card, campo, titulo, eyebrow, sectionLabel, BotaoPrimario } from './ui.tsx'
import { idade } from './format.ts'
import { useAoVoltar } from './sync.ts'
import type { Paciente } from './lib/tipos.ts'
import type { FormEvent } from 'react'

/** Campos editáveis de um paciente — o que o form devolve.
 *  `sou_eu` não está no form: quem marca é a tela de Ajustes, uma escolha da conta. */
export type CamposPaciente = Pick<Paciente, 'nome' | 'data_nascimento'> & { sou_eu?: boolean }

/** Onde fica o paciente escolhido neste aparelho. Exportada porque apagar a conta
 *  também apaga isto — senão a próxima conta neste browser herdava a escolha da anterior. */
export const chaveLocal = (userId: string) => `paciente:${userId}`

export type DadosPacientes = ReturnType<typeof usePacientes>

export function usePacientes(userId: string) {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [id, setId] = useState<string | null>(() => localStorage.getItem(chaveLocal(userId)))
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('pacientes').select('*').order('criado_em')
    if (error) setErro(error.message)
    else setPacientes(data)
    setCarregando(false)
  }, [])

  // Paciente novo ou renomeado no outro celular tem de aparecer aqui também. Sem filtro: a
  // RLS já limita à conta, e a lista é curta demais para valer um merge próprio — recarrega.
  useEffect(() => {
    const canal = supabase.channel(`pacientes:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => carregar())
      .subscribe((status) => { if (status === 'SUBSCRIBED') carregar() })
    return () => { supabase.removeChannel(canal) }
  }, [userId, carregar])

  useAoVoltar(carregar)

  const escolher = useCallback((novo: string) => {
    setId(novo)
    localStorage.setItem(chaveLocal(userId), novo)
  }, [userId])

  const criar = useCallback(async (campos: CamposPaciente) => {
    const { data, error } = await supabase.from('pacientes').insert(campos).select().single()
    if (error) { setErro(error.message); return false }
    setPacientes((ps) => [...ps, data])
    escolher(data.id)
    return true
  }, [escolher])

  /** Quem, entre os pacientes da conta, é o próprio dono dela. `null` = ninguém.
   *  Marcar vai pela função do banco (troca as duas linhas numa transação só); desmarcar
   *  é um update comum, porque limpar não pode cruzar com o índice único. */
  const definirSouEu = useCallback(async (pid: string | null) => {
    const { error } = pid
      ? await supabase.rpc('definir_sou_eu', { pid })
      : await supabase.from('pacientes').update({ sou_eu: false }).eq('sou_eu', true)
    if (error) { setErro(error.message); return false }
    await carregar()
    return true
  }, [carregar])

  const salvar = useCallback(async (pid: string, campos: CamposPaciente) => {
    const { data, error } = await supabase.from('pacientes')
      .update(campos).eq('id', pid).select().single()
    if (error) { setErro(error.message); return false }
    setPacientes((ps) => ps.map((p) => (p.id === pid ? data : p)))
    return true
  }, [])

  // Se o id guardado no localStorage não existe mais (apagado em outro device), cai no primeiro.
  const selecionado = pacientes.find((p) => p.id === id) ?? pacientes[0] ?? null

  return { pacientes, selecionado, carregando, erro, setErro, escolher, criar, salvar, definirSouEu }
}

/** Form de paciente. Sem `inicial` = criando; com = editando. */
export function FormPaciente({ inicial, primeiro, onSalvar, onCancelar }: {
  inicial?: Paciente | null
  primeiro?: boolean
  onSalvar: (campos: CamposPaciente) => Promise<boolean>
  onCancelar?: () => void
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [nasc, setNasc] = useState(inicial?.data_nascimento ?? '')
  const [salvando, setSalvando] = useState(false)
  const hoje = new Date().toISOString().slice(0, 10)

  const enviar = async (e: FormEvent) => {
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
export function BarraPaciente({ pacientes, selecionado, escolher, onNovo, onEditar }: {
  pacientes: Paciente[]
  selecionado: Paciente
  escolher: (id: string) => void
  onNovo: () => void
  onEditar: () => void
}) {
  const anos = idade(selecionado.data_nascimento)
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
      <select value={selecionado.id} aria-label="Paciente"
        onChange={(e) => (e.target.value === 'novo' ? onNovo() : escolher(e.target.value))}
        style={{ ...campo, flex: 1, height: 40, fontWeight: 600, appearance: 'none' }}>
        {pacientes.map((p) => (
          <option key={p.id} value={p.id} style={{ color: '#000' }}>
            {p.nome}{p.sou_eu ? ' (você)' : ''}
          </option>
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
