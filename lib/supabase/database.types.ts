// File: /lib/supabase/database.types.ts
// Description: Type-safety definitions matching the database schema.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          balance: number
          is_active: boolean
          initial_balance: number
          created_at: string
        }
        Insert: {
          id: string
          name: string
          balance?: number
          is_active?: boolean
          initial_balance?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          balance?: number
          is_active?: boolean
          initial_balance?: number
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: 'ADMIN' | 'USER'
          account_ids: string[]
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role: 'ADMIN' | 'USER'
          account_ids?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'ADMIN' | 'USER'
          account_ids?: string[]
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          type: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
          category: 'SAIDA_DIRETA' | 'ADIANTAMENTO' | 'REEMBOLSO'
          account_id: string
          destination_account_id: string | null
          amount: number
          payment_method: 'PIX' | 'DINHEIRO'
          description: string
          origin_name: string
          destination_name: string
          date: string
          status: 'SETTLED' | 'AWAITING_SETTLEMENT' | 'AWAITING_REIMBURSEMENT' | 'CANCELLED'
          user_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          type: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
          category: 'SAIDA_DIRETA' | 'ADIANTAMENTO' | 'REEMBOLSO'
          account_id: string
          destination_account_id?: string | null
          amount: number
          payment_method: 'PIX' | 'DINHEIRO'
          description: string
          origin_name: string
          destination_name: string
          date: string
          status: 'SETTLED' | 'AWAITING_SETTLEMENT' | 'AWAITING_REIMBURSEMENT' | 'CANCELLED'
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
          category?: 'SAIDA_DIRETA' | 'ADIANTAMENTO' | 'REEMBOLSO'
          account_id?: string
          destination_account_id?: string | null
          amount?: number
          payment_method?: 'PIX' | 'DINHEIRO'
          description?: string
          origin_name?: string
          destination_name?: string
          date?: string
          status?: 'SETTLED' | 'AWAITING_SETTLEMENT' | 'AWAITING_REIMBURSEMENT' | 'CANCELLED'
          user_id?: string | null
          created_at?: string
        }
      }
      settlements: {
        Row: {
          id: string
          transaction_id: string
          amount_transferred: number
          amount_used: number
          returned_amount: number
          reimbursement_required: number
          status: 'PENDING' | 'RESOLVED'
          description: string
          created_at: string
        }
        Insert: {
          id: string
          transaction_id: string
          amount_transferred: number
          amount_used?: number
          returned_amount?: number
          reimbursement_required?: number
          status: 'PENDING' | 'RESOLVED'
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          amount_transferred?: number
          amount_used?: number
          returned_amount?: number
          reimbursement_required?: number
          status?: 'PENDING' | 'RESOLVED'
          description?: string
          created_at?: string
        }
      }
      reimbursements: {
        Row: {
          id: string
          requester_name: string
          account_id: string
          amount: number
          description: string
          status: 'PENDING' | 'PAID' | 'REJECTED'
          date: string
          created_at: string
        }
        Insert: {
          id: string
          requester_name: string
          account_id: string
          amount: number
          description: string
          status: 'PENDING' | 'PAID' | 'REJECTED'
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          requester_name?: string
          account_id?: string
          amount?: number
          description?: string
          status?: 'PENDING' | 'PAID' | 'REJECTED'
          date?: string
          created_at?: string
        }
      }
      monthly_closings: {
        Row: {
          id: string
          mes: number
          ano: number
          data_criacao: string
          criado_por: string | null
          status: 'BLOQUEADO' | 'REABERTO'
          contas: Json
          resultado_liquido_geral: number
          total_movimentacoes: number
          forcado: boolean
          motivo_reabertura: string | null
        }
        Insert: {
          id: string
          mes: number
          ano: number
          data_criacao?: string
          criado_por?: string | null
          status: 'BLOQUEADO' | 'REABERTO'
          contas?: Json
          resultado_liquido_geral: number
          total_movimentacoes?: number
          forcado?: boolean
          motivo_reabertura?: string | null
        }
        Update: {
          id?: string
          mes?: number
          ano?: number
          data_criacao?: string
          criado_por?: string | null
          status?: 'BLOQUEADO' | 'REABERTO'
          contas?: Json
          resultado_liquido_geral?: number
          total_movimentacoes?: number
          forcado?: boolean
          motivo_reabertura?: string | null
        }
      }
    }
  }
}
