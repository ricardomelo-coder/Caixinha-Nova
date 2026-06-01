-- Migration: 003_create_transactions.sql
-- Description: Creates the financial tables: transactions (movimentações),
-- settlements (adiantamentos/prestações de contas) and reimbursements (reembolsos).

-- 1. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SAIDA', 'TRANSFERENCIA')),
    category TEXT NOT NULL CHECK (category IN ('SAIDA_DIRETA', 'ADIANTAMENTO', 'REEMBOLSO')),
    account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    destination_account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('PIX', 'DINHEIRO')),
    description TEXT NOT NULL,
    origin_name TEXT NOT NULL,
    destination_name TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('SETTLED', 'AWAITING_SETTLEMENT', 'AWAITING_REIMBURSEMENT', 'CANCELLED')),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Settlements Table (Prestações de adiantamentos)
CREATE TABLE IF NOT EXISTS public.settlements (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount_transferred NUMERIC NOT NULL CHECK (amount_transferred >= 0),
    amount_used NUMERIC NOT NULL DEFAULT 0 CHECK (amount_used >= 0),
    returned_amount NUMERIC NOT NULL DEFAULT 0 CHECK (returned_amount >= 0),
    reimbursement_required NUMERIC NOT NULL DEFAULT 0 CHECK (reimbursement_required >= 0),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'RESOLVED')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Reimbursements Table (Solicitações diretas ou resultantes de adiantamentos complementados)
CREATE TABLE IF NOT EXISTS public.reimbursements (
    id TEXT PRIMARY KEY,
    requester_name TEXT NOT NULL,
    account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'REJECTED')),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.transactions IS 'Movimentações de entrada, saída e transferências do caixa.';
COMMENT ON TABLE public.settlements IS 'Prestações de contas vinculadas a adiantamentos específicos.';
COMMENT ON TABLE public.reimbursements IS 'Acompanhamento e pagamentos de reembolsos operacionais.';
