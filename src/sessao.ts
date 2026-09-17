/** Gate da sessão de recuperação de senha.
 *  O evento `PASSWORD_RECOVERY` do GoTrue é um único tick: depois disso o refresh
 *  chega como `SIGNED_IN` e, sem isto, o app inteiro abre sem a senha nova. */
export const CHAVE_RECOVERY = 'diario:recuperando'
export const MAX_RECOVERY_MS = 60 * 60 * 1000

export type Store = {
  getItem: (k: string) => string | null
  setItem: (k: string, v: string) => void
  removeItem: (k: string) => void
}

const browser = (): Store | null =>
  typeof localStorage === 'undefined' ? null : localStorage

function ler(store: Store | null): { uid: string; t: number } | null {
  if (!store) return null
  try {
    const cru = store.getItem(CHAVE_RECOVERY)
    if (!cru) return null
    const [uid, ts] = cru.split(':')
    const t = Number(ts)
    if (!uid || !Number.isFinite(t)) return null
    return { uid, t }
  } catch {
    return null
  }
}

export function marcarRecovery(store: Store | null = browser(), agora = Date.now(), uid = '') {
  if (!store || !uid) return
  try { store.setItem(CHAVE_RECOVERY, `${uid}:${agora}`) } catch { /* Safari privado, quota */ }
}

export function limparRecovery(store: Store | null = browser()) {
  try { store?.removeItem(CHAVE_RECOVERY) } catch { /* ignore */ }
}

export function emRecovery(store: Store | null = browser(), agora = Date.now(), uid?: string): boolean {
  const v = ler(store)
  if (!v) return false
  if (agora - v.t > MAX_RECOVERY_MS || (uid && v.uid !== uid)) {
    limparRecovery(store)
    return false
  }
  return true
}

/** O link do e-mail traz `type=recovery` no hash ou na query — dá para armar o gate
 *  no primeiro paint, antes do GoTrue emitir PASSWORD_RECOVERY. */
export function urlEhRecovery(href = typeof location === 'undefined' ? '' : location.href): boolean {
  try {
    const u = new URL(href, 'http://local.invalid')
    if (u.searchParams.get('type') === 'recovery') return true
    const hash = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash
    return new URLSearchParams(hash.replace(/^#/, '')).get('type') === 'recovery'
  } catch {
    return false
  }
}
