-- Migration: 007_trigger_block_closed_period.sql
-- Description: Protects historical records by blocking inserts, updates or deletions in locked periods.

CREATE OR REPLACE FUNCTION public.check_is_period_closed()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
    target_year INTEGER;
    target_month INTEGER;
    is_closed BOOLEAN;
BEGIN
    -- Determine the date to check depending on the table and TG_OP
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
        -- settlements are linked to transactions, check the transaction's date
        IF TG_OP = 'DELETE' THEN
            SELECT date INTO target_date FROM public.transactions WHERE id = OLD.transaction_id;
        ELSE
            SELECT date INTO target_date FROM public.transactions WHERE id = NEW.transaction_id;
        END IF;
    END IF;

    IF target_date IS NOT NULL THEN
        target_year := EXTRACT(YEAR FROM target_date);
        target_month := EXTRACT(MONTH FROM target_date);
        
        -- Check if there is an active BLOQUEADO closing for the period
        SELECT EXISTS (
            SELECT 1 FROM public.monthly_closings
            WHERE ano = target_year AND mes = target_month AND status = 'BLOQUEADO'
        ) INTO is_closed;
        
        IF is_closed THEN
            RAISE EXCEPTION 'Ação bloqueada: o período de %/% já está fechado e consolidado.', target_month, target_year;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind triggers to the three main transaction sheets
CREATE OR REPLACE TRIGGER trg_block_closed_transactions
    BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.check_is_period_closed();

CREATE OR REPLACE TRIGGER trg_block_closed_settlements
    BEFORE INSERT OR UPDATE OR DELETE ON public.settlements
    FOR EACH ROW EXECUTE FUNCTION public.check_is_period_closed();

CREATE OR REPLACE TRIGGER trg_block_closed_reimbursements
    BEFORE INSERT OR UPDATE OR DELETE ON public.reimbursements
    FOR EACH ROW EXECUTE FUNCTION public.check_is_period_closed();
