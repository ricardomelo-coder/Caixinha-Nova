-- STAYPASS MASTER INTEGRATION MIGRATION (CONSOLIDATED)
-- Executar este script completo diretamente no "SQL Editor" do painel do Supabase.
-- Ele remove versões anteriores e cria todo o banco de dados de forma consistente e em ordem correta de dependências.

-- ----------------------------------------------------
-- 1. LIMPEZA SEGURA DE VERSÕES ANTERIORES
-- ----------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS trg_block_closed_transactions ON public.transactions;
DROP TRIGGER IF EXISTS trg_block_closed_settlements ON public.settlements;
DROP TRIGGER IF EXISTS trg_block_closed_reimbursements ON public.reimbursements;
DROP FUNCTION IF EXISTS public.check_is_period_closed() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

DROP TABLE IF EXISTS public.monthly_closings CASCADE;
DROP TABLE IF EXISTS public.reimbursements CASCADE;
DROP TABLE IF EXISTS public.settlements CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;

-- ----------------------------------------------------
-- 2. CRIAÇÃO DAS TABELAS MAIS ALTAS (SEM DEPENDÊNCIAS DE FK)
-- ----------------------------------------------------
-- TABELA DE CONTAS FINANCEIRAS (CAIXINHAS)
CREATE TABLE public.accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    initial_balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.accounts IS 'Canais de mola financeira (caixinhas) com gerenciamento de saldos individuais.';

-- TABELA DE PERFIS DE USUÁRIOS (Sincronizado com Supabase Auth)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')),
    account_ids TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.users IS 'Perfis de usuários vinculados ao Supabase Auth para controle de acessos específicos e LGPD.';

-- ----------------------------------------------------
-- 3. CRIAÇÃO DOS TRIGGERS DE SINCRONIZAÇÃO DE USUÁRIOS (AUTH -> PUBLIC)
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, role, account_ids)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Colaborador StayPass'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'USER'),
        COALESCE(
            CASE 
                WHEN jsonb_typeof(NEW.raw_user_meta_data->'account_ids') = 'array' 
                THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'account_ids'))
                ELSE '{}'::text[]
            END, 
            '{}'::text[]
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------
-- 4. CRIAÇÃO DAS TABELAS DE FLUXO FINANCEIRO e FECHAMENTOS
-- ----------------------------------------------------
-- TABELA DE TRANSAÇÕES
CREATE TABLE public.transactions (
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

COMMENT ON TABLE public.transactions IS 'Movimentações de entrada, saída e transferências do caixa.';

-- TABELA DE ADIANTAMENTOS E PRESTAÇÃO DE CONTAS (SETTLEMENTS)
CREATE TABLE public.settlements (
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

COMMENT ON TABLE public.settlements IS 'Prestações de contas vinculadas a adiantamentos específicos.';

-- TABELA DE SOLICITAÇÕES DE REEMBOLSOS (REIMBURSEMENTS)
CREATE TABLE public.reimbursements (
    id TEXT PRIMARY KEY,
    requester_name TEXT NOT NULL,
    account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'REJECTED')),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.reimbursements IS 'Acompanhamento e pagamentos de reembolsos operacionais.';

-- TABELA DE FECHAMENTOS MENSAIS
CREATE TABLE public.monthly_closings (
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

COMMENT ON TABLE public.monthly_closings IS 'Relatórios de fechamento fiscal mensal consolidado.';

-- ----------------------------------------------------
-- 5. CRIAÇÃO DE ÍNDICES DE PERFORMANCE (Otimização)
-- ----------------------------------------------------
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

-- ----------------------------------------------------
-- 6. POLÍCITAS DE SEGURANÇA (RLS - ROW LEVEL SECURITY)
-- ----------------------------------------------------
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;

-- Helper para verificar se o usuário autenticado atual é ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- 1. Verifica no JWT da sessão se possui a role ADMIN
    IF (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN' THEN
        RETURN TRUE;
    END IF;

    -- 2. Backup verificando diretamente na tabela users
    RETURN COALESCE(
        (SELECT role = 'ADMIN' FROM public.users WHERE id = auth.uid()),
        FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para: LIMITANDO E AUTORIZANDO ACESSOS (Users)
CREATE POLICY "Users can view their own profile or all profiles" 
    ON public.users FOR SELECT 
    USING (
        auth.uid() = id 
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
    );

CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile or as admin"
    ON public.users FOR UPDATE
    USING (
        auth.uid() = id 
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
    );

CREATE POLICY "Only admins can delete users"
    ON public.users FOR DELETE
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');

-- Políticas para: ACCOUNTS (Contas)
CREATE POLICY "Authenticated users can view accounts" 
    ON public.accounts FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can write accounts" 
    ON public.accounts FOR ALL 
    USING (public.is_admin());

-- Políticas para: TRANSACTIONS
CREATE POLICY "Authenticated users can view transactions" 
    ON public.transactions FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create transactions" 
    ON public.transactions FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update transactions" 
    ON public.transactions FOR UPDATE 
    USING (public.is_admin());

CREATE POLICY "Only admins can delete transactions" 
    ON public.transactions FOR DELETE 
    USING (public.is_admin());

-- Políticas para: SETTLEMENTS
CREATE POLICY "Authenticated users can view settlements" 
    ON public.settlements FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create settlements" 
    ON public.settlements FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only admins can perform structural settlements modifications" 
    ON public.settlements FOR UPDATE 
    USING (public.is_admin());

-- Políticas para: REIMBURSEMENTS
CREATE POLICY "Authenticated users can view reimbursements" 
    ON public.reimbursements FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create direct reimbursements" 
    ON public.reimbursements FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage reimbursement status" 
    ON public.reimbursements FOR ALL 
    USING (public.is_admin());

-- Políticas para: MONTHLY CLOSINGS (Fechamento Mensal)
CREATE POLICY "Authenticated users can view monthly closings" 
    ON public.monthly_closings FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can perform monthly closings operations" 
    ON public.monthly_closings FOR ALL 
    USING (public.is_admin());

-- ----------------------------------------------------
-- 7. TRIGER DE VALIDAÇÃO DE PERÍODOS FECHADOS (Consolidação Histórica)
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_is_period_closed()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
    target_year INTEGER;
    target_month INTEGER;
    is_closed BOOLEAN;
BEGIN
    -- Determina as datas conforme a tabela e operação
    IF TG_TABLE_NAME = 'transactions' THEN
        IF TG_OP = 'DELETE' THEN
            target_date := OLD.date;
        ELSE
            target_date := NEW.date;
        END IF;
    ELSIF TG_TABLE_NAME = 'reimbursements' THEN
        IF TG_OP = 'DELETE' THEN
            target_date := OLD.date;
        ELSE
            target_date := NEW.date;
        END IF;
    ELSIF TG_TABLE_NAME = 'settlements' THEN
        IF TG_OP = 'DELETE' THEN
            SELECT date INTO target_date FROM public.transactions WHERE id = OLD.transaction_id;
        ELSE
            SELECT date INTO target_date FROM public.transactions WHERE id = NEW.transaction_id;
        END IF;
    END IF;

    IF target_date IS NOT NULL THEN
        target_year := EXTRACT(YEAR FROM target_date);
        target_month := EXTRACT(MONTH FROM target_date);
        
        -- Verifica se o fechamento com status BLOQUEADO está ativo para o período
        SELECT EXISTS (
            SELECT 1 FROM public.monthly_closings
            WHERE ano = target_year AND mes = target_month AND status = 'BLOQUEADO'
        ) INTO is_closed;
        
        IF is_closed THEN
            RAISE EXCEPTION 'Ação bloqueada: o período de %/% já está fechado e consolidado para auditoria.', target_month, target_year;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ativar os triggers nas três tabelas essenciais
CREATE OR REPLACE TRIGGER trg_block_closed_transactions
    BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.check_is_period_closed();

CREATE OR REPLACE TRIGGER trg_block_closed_settlements
    BEFORE INSERT OR UPDATE OR DELETE ON public.settlements
    FOR EACH ROW EXECUTE FUNCTION public.check_is_period_closed();

CREATE OR REPLACE TRIGGER trg_block_closed_reimbursements
    BEFORE INSERT OR UPDATE OR DELETE ON public.reimbursements
    FOR EACH ROW EXECUTE FUNCTION public.check_is_period_closed();
