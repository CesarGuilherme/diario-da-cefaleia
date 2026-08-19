import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.ts'
import { aplicar, norm, useAoVoltar } from './sync.ts'
import type { Alivio, Crise, FormBanco } from './lib/tipos.ts'

// Sem update otimista de propósito: é registro médico, uma escrita que falha calada
// é dado perdido. Espera o servidor e usa a linha que ele devolveu.
// ponytail: carrega tudo de uma vez; paginar se alguém passar de ~500 crises.

/** Tudo que a tela precisa de crises — o que as telas recebem via {...dados}. */
export type DadosCrises = ReturnType<typeof useCrises>

export function useCrises(pacienteId: string | null) {
  const [crises, setCrises] = useState<Crise[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!pacienteId) { setCrises([]); return }
    const { data, error } = await supabase.from('crises').select('*')
      .eq('paciente_id', pacienteId).order('inicio', { ascending: false })
    if (error) setErro(error.message)
    else setCrises((data as Crise[]).map(norm))
    setCarregando(false)
  }, [pacienteId])

  // A lista tem de mudar sozinha: os dois celulares da casa ficam na mesma conta, e a crise
  // registrada num precisa aparecer no outro sem fechar o app. O Realtime traz cada escrita;
  // o `carregar()` do SUBSCRIBED cobre o que passou enquanto o socket esteve caído.
  useEffect(() => {
    if (!pacienteId) { setCrises([]); return }
    setCarregando(true)
    const canal = supabase.channel(`crises:${pacienteId}`)
      .on<Crise>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crises', filter: `paciente_id=eq.${pacienteId}` },
        // ponytail: dois PATCHes seguidos na mesma linha (a fila do serial.ts, os sintomas da
        // crise em andamento) podem fazer um eco antigo repintar a linha por alguns
        // milissegundos — converge no eco seguinte. Se incomodar: coluna `atualizado_em` com
        // trigger, descartando evento mais velho que a linha em memória.
        (evento) => setCrises((cs) => aplicar(cs, evento)),
      )
      .subscribe((status) => { if (status === 'SUBSCRIBED') carregar() })
    return () => { supabase.removeChannel(canal) }
  }, [pacienteId, carregar])

  useAoVoltar(carregar)

  const iniciar = useCallback(async (form: FormBanco) => {
    if (!pacienteId) return false
    const { data, error } = await supabase.from('crises')
      .insert({ ...form, paciente_id: pacienteId, inicio: new Date().toISOString() })
      .select().single()
    if (error) { setErro(error.message); return false }
    setCrises((cs) => [norm(data as Crise), ...cs])
    return true
  }, [pacienteId])

  const atualizar = useCallback(async (id: string, campos: Partial<Crise>) => {
    const { data, error } = await supabase.from('crises')
      .update(campos).eq('id', id).select().single()
    if (error) { setErro(error.message); return false }
    setCrises((cs) => cs.map((c) => (c.id === id ? norm(data as Crise) : c)))
    return true
  }, [])

  // A medicação pendente vai junto: um clique no botão não é caminho garantido de blur
  // (Enter, autofill, teclado do Safari iOS), e mandar tudo num patch só evita duas
  // escritas concorrentes na mesma linha. Chave ausente = "não toque na coluna".
  const encerrar = useCallback((id: string, alivio: Alivio | null, medicacao?: string) =>
    atualizar(id, {
      fim: new Date().toISOString(), alivio,
      ...(medicacao === undefined ? {} : { medicacao }),
    }), [atualizar])

  const apagar = useCallback(async (id: string) => {
    const { error } = await supabase.from('crises').delete().eq('id', id)
    if (error) { setErro(error.message); return false }
    setCrises((cs) => cs.filter((c) => c.id !== id))
    return true
  }, [])

  // A crise em andamento é simplesmente a linha sem `fim` — não existe um segundo
  // conceito de "active" para divergir do histórico.
  const ativa = crises.find((c) => !c.fim) ?? null
  const encerradas = crises.filter((c) => c.fim)

  return { crises, ativa, encerradas, carregando, erro, setErro, iniciar, atualizar, encerrar, apagar }
}
