-- ============================================================
-- MIGRATION 00004 — Categorias personalizadas
-- Espelha CustomCategory do types.ts
-- ============================================================

CREATE TABLE public.custom_categories (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(trim(name)) > 0),
  icon        TEXT        NOT NULL DEFAULT '🏷️' CHECK (char_length(icon) <= 4),
  color       TEXT        NOT NULL DEFAULT 'bg-mint',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Um usuário não pode ter duas categorias com o mesmo nome
  CONSTRAINT uq_custom_categories_user_name UNIQUE (user_id, name)
);

COMMENT ON TABLE  public.custom_categories          IS 'Categorias de produto criadas pelo usuário';
COMMENT ON COLUMN public.custom_categories.icon     IS 'Emoji (máx 2 chars visíveis) representando a categoria';
COMMENT ON COLUMN public.custom_categories.color    IS 'Classe Tailwind CSS de cor (ex: bg-mint, bg-red-400)';

-- Índice principal de acesso por usuário
CREATE INDEX idx_custom_categories_user_id ON public.custom_categories(user_id);

CREATE TRIGGER trg_custom_categories_updated_at
  BEFORE UPDATE ON public.custom_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_categories_select_own"
  ON public.custom_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "custom_categories_insert_own"
  ON public.custom_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "custom_categories_update_own"
  ON public.custom_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "custom_categories_delete_own"
  ON public.custom_categories FOR DELETE
  USING (auth.uid() = user_id);
