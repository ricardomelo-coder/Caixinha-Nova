-- Migration: 004_create_closings.sql
-- Description: Creates the monthly closings table storing state snapshots for bookkeeping.

CREATE TABLE IF NOT EXISTS public.monthly_closings (
    id TEXT PRIMARY KEY,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    criado_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('BLOQUEADO', 'REABERTO')),
    contas JSONB NOT NULL DEFAULT '[]'::jsonb,
    resultado_liquido_geral NUMERIC NOT NULL,
    total_movimentacoes INTEGER NOT NULL DEFAULT 0,
    forcado BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_reabertura TEXT,
    CONSTRAINT unique_period UNIQUE (mes, ano)
);

COMMENT ON TABLE public.monthly_closings IS 'Relatórios de fechamento fiscal mensal por competência com salvamentos snapshots em formato JSONB.';
