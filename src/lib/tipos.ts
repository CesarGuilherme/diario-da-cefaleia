// Apelidos das linhas do banco, estreitados com o que os CHECK constraints já garantem
// (o gerador devolve `string` porque check não é enum) e com a forma real do jsonb.
import type { Database } from './database.types.ts'
import type { INTENSIDADES, LOCALIZACOES, CARATERES, ALIVIOS, SINTOMAS } from '../tokens.ts'

export type Intensidade = (typeof INTENSIDADES)[number]
export type Localizacao = (typeof LOCALIZACOES)[number]
export type Carater = (typeof CARATERES)[number]
export type Alivio = (typeof ALIVIOS)[number]
export type Sintoma = (typeof SINTOMAS)[number]

/** gatilho -> itens daquela crise: {"Alimentação": ["leite","chocolate"]} */
export type Detalhes = Record<string, string[]>

type LinhaCrise = Database['public']['Tables']['crises']['Row']

export type Crise = Omit<LinhaCrise, 'intensidade' | 'localizacao' | 'carater' | 'alivio' | 'detalhes'> & {
  intensidade: Intensidade
  localizacao: Localizacao
  carater: Carater
  alivio: Alivio | null
  detalhes: Detalhes
}

export type Paciente = Database['public']['Tables']['pacientes']['Row']

/** A linha de `relatorios`: o link público e seu snapshot. */
export type LinkRelatorio = Database['public']['Tables']['relatorios']['Row']

/** Campos editáveis no formulário. `detalhes` aqui é texto cru por gatilho (ver tokens.ts). */
export type Form = {
  intensidade: Intensidade
  localizacao: Localizacao
  carater: Carater
  sintomas: string[]
  sono_horas: number
  gatilhos: string[]
  detalhes: Record<string, string>
  medicacao: string
}

/** O que vai para o banco: `detalhes` já virou lista de itens. */
export type FormBanco = Omit<Form, 'detalhes'> & { detalhes: Detalhes }

/** Uma crise dentro do snapshot público: sem ids, só o que o relatório desenha.
 *  É também o contrato de entrada de report.ts — a `Crise` do banco satisfaz. */
export type CriseSnapshot = Omit<Crise, 'id' | 'user_id' | 'paciente_id'>

/** O jsonb gravado em `relatorios.dados` e lido pela página /r/<token>. */
export type Snapshot = {
  versao: number
  gerado_em: string
  paciente: { nome: string; idade: number | null }
  crises: CriseSnapshot[]
}
