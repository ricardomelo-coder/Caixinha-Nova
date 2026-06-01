-- Migration: 005_rls_policies.sql
-- Description: Enables Row Level Security (RLS) and creates security policies for each table.

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- First, check the role directly from the authenticated session's JWT to prevent recursion.
    -- If the JWT has role = 'ADMIN', we return true immediately.
    IF (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN' THEN
        RETURN TRUE;
    END IF;

    -- Otherwise, query the users table directly (as Security Definer, bypassing RLS recursion if needed).
    RETURN COALESCE(
        (SELECT role = 'ADMIN' FROM public.users WHERE id = auth.uid()),
        FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Policies for standard "users" table
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

-- 2. Policies for "accounts"
CREATE POLICY "Authenticated users can view accounts" 
    ON public.accounts FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can write accounts" 
    ON public.accounts FOR ALL 
    USING (public.is_admin());

-- 3. Policies for "transactions"
CREATE POLICY "Authenticated users can view transactions" 
    ON public.transactions FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create transactions" 
    ON public.transactions FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update or delete transactions" 
    ON public.transactions FOR UPDATE 
    USING (public.is_admin());

CREATE POLICY "Only admins can delete transactions" 
    ON public.transactions FOR DELETE 
    USING (public.is_admin());

-- 4. Policies for "settlements"
CREATE POLICY "Authenticated users can view settlements" 
    ON public.settlements FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create settlements" 
    ON public.settlements FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only admins can perform structural settlements modifications" 
    ON public.settlements FOR UPDATE 
    USING (public.is_admin());

-- 5. Policies for "reimbursements"
CREATE POLICY "Authenticated users can view reimbursements" 
    ON public.reimbursements FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create direct reimbursements" 
    ON public.reimbursements FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage reimbursement status" 
    ON public.reimbursements FOR ALL 
    USING (public.is_admin());

-- 6. Policies for "monthly_closings"
CREATE POLICY "Authenticated users can view monthly closings" 
    ON public.monthly_closings FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can perform monthly closings operations" 
    ON public.monthly_closings FOR ALL 
    USING (public.is_admin());
