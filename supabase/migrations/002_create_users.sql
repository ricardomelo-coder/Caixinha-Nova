-- Migration: 002_create_users.sql
-- Description: Creates the public users table which represents the application's user profiles,
-- aligning them with the secure Supabase auth.users system.

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')),
    account_ids TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.users IS 'Perfis de usuários vinculados ao Supabase Auth para controle de acessos específicos e LGPD.';

-- Trigger for syncing new users from auth.users to public.users automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, role, account_ids)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Colaborador StayPass'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'USER'),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'account_ids')), '{}'::text[])
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
