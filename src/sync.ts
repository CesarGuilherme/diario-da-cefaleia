// Sincronia entre aparelhos: o que fazer com um evento do Realtime, e quando reconsultar.
// Fora dos hooks de propósito — igual ao serial.ts, aqui é código puro e testável sem o
// cliente do Supabase nem o React.
import { useEffect } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Crise } from './lib/tipos.ts'

// Postgres `numeric` pode chegar como string no JSON — tanto no select quanto no evento do
// Realtime. Normaliza na entrada, uma vez, em vez de espalhar Number() por todo consumidor.
export const norm = (r: Crise): Crise => ({ ...r, sono_horas: Number(r.sono_horas) })

const porInicio = (cs: Crise[]) =>
  [...cs].sort((a, b) => b.inicio.localeCompare(a.inicio))

/**
 * Aplica na lista em memória a mudança que veio de outro aparelho (ou o eco da nossa).
 * Idempotente de propósito: o mesmo evento duas vezes dá o mesmo resultado.
 */
export function aplicar(crises: Crise[], evento: RealtimePostgresChangesPayload<Crise>): Crise[] {
  if (evento.eventType === 'DELETE') {
    const { id } = evento.old
    return id ? crises.filter((c) => c.id !== id) : crises
  }

  const linha = norm(evento.new)
  // UPDATE de crise que este aparelho ainda não conhece entra na lista: ele pode ter ficado
  // sem rede justamente quando ela foi criada.
  const conhecida = crises.some((c) => c.id === linha.id)
  if (evento.eventType === 'INSERT' && conhecida) return crises   // eco da nossa própria escrita
  return porInicio(conhecida ? crises.map((c) => (c.id === linha.id ? linha : c)) : [linha, ...crises])
}

/** Reconsulta quando o app volta ao primeiro plano — o iOS mata o websocket do PWA em segundo. */
export function useAoVoltar(recarregar: () => void) {
  useEffect(() => {
    const voltou = () => document.visibilityState === 'visible' && recarregar()
    document.addEventListener('visibilitychange', voltou)
    return () => document.removeEventListener('visibilitychange', voltou)
  }, [recarregar])
}
