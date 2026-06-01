-- Migration: 006_indexes.sql
-- Description: Applies high-performance query indexes on critical foreign-key columns and date metrics.

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions (category);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions (status);

CREATE INDEX IF NOT EXISTS idx_settlements_transaction ON public.settlements (transaction_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON public.settlements (status);

CREATE INDEX IF NOT EXISTS idx_reimbursements_date ON public.reimbursements (date);
CREATE INDEX IF NOT EXISTS idx_reimbursements_account ON public.reimbursements (account_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_status ON public.reimbursements (status);

CREATE INDEX IF NOT EXISTS idx_closings_period ON public.monthly_closings (ano, mes);
