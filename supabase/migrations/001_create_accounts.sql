-- Migration: 001_create_accounts.sql
-- Description: Creates the accounts table which represents financial nodes (caixas).

CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    initial_balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Comments for documentation & clarity
COMMENT ON TABLE public.accounts IS 'Nodes de controle financeiro (caixinhas) com gerenciamento de saldos individuais.';
COMMENT ON COLUMN public.accounts.id IS 'ID único da conta, ex: acc-1';
COMMENT ON COLUMN public.accounts.name IS 'Nome descritivo da conta';
COMMENT ON COLUMN public.accounts.balance IS 'Saldo físico consolidado e atualizado em tempo real';
COMMENT ON COLUMN public.accounts.initial_balance IS 'Saldo de abertura/inicial';
