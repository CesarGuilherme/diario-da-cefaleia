export const REGRAS_SENHA = [
  { id: 'len', label: '8 caracteres', ok: (s: string) => s.length >= 8 },
  { id: 'A', label: 'Maiúscula', ok: (s: string) => /[A-Z]/.test(s) },
  { id: 'a', label: 'Minúscula', ok: (s: string) => /[a-z]/.test(s) },
  { id: 'n', label: 'Número', ok: (s: string) => /\d/.test(s) },
  { id: 's', label: 'Caractere especial', ok: (s: string) => /[^A-Za-z0-9]/.test(s) },
] as const

export function falhasSenha(s: string): string[] {
  return REGRAS_SENHA.filter((r) => !r.ok(s)).map((r) => r.label.toLowerCase())
}

export const senhaValida = (s: string) => falhasSenha(s).length === 0
