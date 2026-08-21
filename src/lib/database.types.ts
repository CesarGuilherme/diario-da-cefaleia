// Gerado do schema real do Supabase (MCP generate_typescript_types).
// Só as tabelas e a função — os helpers genéricos (Tables<>, TablesInsert<>...) do gerador
// ficaram de fora porque nada aqui usa. Regerar por inteiro se o schema mudar.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.15' }
  public: {
    Tables: {
      crises: {
        Row: {
          alivio: string | null
          carater: string
          detalhes: Json
          fim: string | null
          gatilhos: string[]
          id: string
          inicio: string
          intensidade: string
          localizacao: string
          medicacao: string
          paciente_id: string
          sintomas: string[]
          sono_horas: number
          user_id: string
        }
        Insert: {
          alivio?: string | null
          carater: string
          detalhes?: Json
          fim?: string | null
          gatilhos?: string[]
          id?: string
          inicio?: string
          intensidade: string
          localizacao: string
          medicacao?: string
          paciente_id: string
          sintomas?: string[]
          sono_horas?: number
          user_id?: string
        }
        Update: {
          alivio?: string | null
          carater?: string
          detalhes?: Json
          fim?: string | null
          gatilhos?: string[]
          id?: string
          inicio?: string
          intensidade?: string
          localizacao?: string
          medicacao?: string
          paciente_id?: string
          sintomas?: string[]
          sono_horas?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'crises_paciente_id_fkey'
            columns: ['paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['id']
          },
        ]
      }
      pacientes: {
        Row: {
          criado_em: string
          data_nascimento: string | null
          id: string
          nome: string
          sou_eu: boolean
          user_id: string
        }
        Insert: {
          criado_em?: string
          data_nascimento?: string | null
          id?: string
          nome: string
          sou_eu?: boolean
          user_id?: string
        }
        Update: {
          criado_em?: string
          data_nascimento?: string | null
          id?: string
          nome?: string
          sou_eu?: boolean
          user_id?: string
        }
        Relationships: []
      }
      relatorios: {
        Row: {
          criado_em: string
          dados: Json
          expira_em: string
          id: string
          paciente_id: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          dados: Json
          expira_em?: string
          id?: string
          paciente_id: string
          user_id?: string
        }
        Update: {
          criado_em?: string
          dados?: Json
          expira_em?: string
          id?: string
          paciente_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'relatorios_paciente_id_fkey'
            columns: ['paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      definir_sou_eu: { Args: { pid: string }; Returns: undefined }
      relatorio_publico: { Args: { token: string }; Returns: Json }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
