-- ============================================================
-- SETUP COMPLETO — Cole este arquivo no SQL Editor do Supabase
-- Projeto: https://fzzoxqttbzdziuglicik.supabase.co
-- Execute uma única vez. Idempotente (pode rodar novamente sem erro).
-- ============================================================

-- ── 1. Extensões ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. Tabela profiles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  display_name  TEXT,
  nome_casal    TEXT,
  orcamento     NUMERIC(10,2) DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar colunas que podem estar faltando (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                   AND table_name   = 'profiles'
                   AND column_name  = 'nome_casal') THEN
    ALTER TABLE public.profiles ADD COLUMN nome_casal TEXT;
  END IF;
END;
$$;

-- ── 3. Função updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. Função e trigger: criar perfil ao registrar usuário ───────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, nome_casal)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'nome_casal',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'nome_casal',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    nome_casal   = COALESCE(public.profiles.nome_casal, EXCLUDED.nome_casal),
    updated_at   = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 5. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- ── 6. Inserir perfis de usuários já existentes que ainda não têm perfil ─────
INSERT INTO public.profiles (id, email, display_name, nome_casal)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'nome_casal', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'nome_casal', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- ── 7. Verificação final ──────────────────────────────────────────────────────
SELECT
  'profiles' AS tabela,
  COUNT(*)   AS total_registros
FROM public.profiles;
