-- ============================================================
-- MIGRATION 00018 — Compartilhamento entre casal
-- Adiciona couple_id em profiles e ajusta RLS de shopping_items
-- para que ambos os usuários do casal vejam os mesmos itens.
-- ============================================================

-- ── 1. Adicionar couple_id em profiles ───────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS couple_id UUID;

COMMENT ON COLUMN public.profiles.couple_id IS
  'UUID compartilhado entre os dois usuários do casal. '
  'Ambos têm o mesmo couple_id, permitindo acesso à lista compartilhada.';

-- Índice para lookup rápido de parceiro
CREATE INDEX IF NOT EXISTS idx_profiles_couple_id
  ON public.profiles(couple_id)
  WHERE couple_id IS NOT NULL;

-- ── 2. Adicionar couple_id em shopping_items ─────────────────────────────────
ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS couple_id  UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selecionado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unidade     TEXT     NOT NULL DEFAULT 'un',
  ADD COLUMN IF NOT EXISTS preco_unitario NUMERIC(10,2) CHECK (preco_unitario >= 0),
  ADD COLUMN IF NOT EXISTS local_compra   TEXT,
  ADD COLUMN IF NOT EXISTS observacao     TEXT;

COMMENT ON COLUMN public.shopping_items.couple_id   IS 'FK para o casal — permite RLS compartilhada entre os dois usuários';
COMMENT ON COLUMN public.shopping_items.created_by  IS 'Usuário que criou o item (para auditoria)';
COMMENT ON COLUMN public.shopping_items.selecionado IS 'Item selecionado para modo de compras (espelha Item.selecionado)';
COMMENT ON COLUMN public.shopping_items.unidade     IS 'Unidade de medida: un, kg, g, L, ml, cx, pct, dz';

-- Índice para queries por casal
CREATE INDEX IF NOT EXISTS idx_shopping_items_couple_id
  ON public.shopping_items(couple_id)
  WHERE couple_id IS NOT NULL;

-- ── 3. Remover políticas antigas de shopping_items ────────────────────────────
DROP POLICY IF EXISTS "shopping_items_select_own"  ON public.shopping_items;
DROP POLICY IF EXISTS "shopping_items_insert_own"  ON public.shopping_items;
DROP POLICY IF EXISTS "shopping_items_update_own"  ON public.shopping_items;
DROP POLICY IF EXISTS "shopping_items_delete_own"  ON public.shopping_items;

-- ── 4. Novas políticas: acesso individual OU por casal ───────────────────────

-- SELECT: vê seus próprios itens OU itens do mesmo casal
CREATE POLICY "shopping_items_select_couple"
  ON public.shopping_items FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      couple_id IS NOT NULL
      AND couple_id = (
        SELECT couple_id FROM public.profiles
        WHERE id = auth.uid()
        LIMIT 1
      )
    )
  );

-- INSERT: só insere itens próprios (user_id = auth.uid())
CREATE POLICY "shopping_items_insert_own"
  ON public.shopping_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: atualiza seus próprios itens OU itens do mesmo casal
CREATE POLICY "shopping_items_update_couple"
  ON public.shopping_items FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      couple_id IS NOT NULL
      AND couple_id = (
        SELECT couple_id FROM public.profiles
        WHERE id = auth.uid()
        LIMIT 1
      )
    )
  )
  WITH CHECK (true);

-- DELETE: exclui seus próprios itens OU itens do mesmo casal
CREATE POLICY "shopping_items_delete_couple"
  ON public.shopping_items FOR DELETE
  USING (
    auth.uid() = user_id
    OR (
      couple_id IS NOT NULL
      AND couple_id = (
        SELECT couple_id FROM public.profiles
        WHERE id = auth.uid()
        LIMIT 1
      )
    )
  );

-- ── 5. Função: vincular dois usuários como casal ─────────────────────────────
-- Chamada quando um usuário convida o parceiro e este aceita o convite.
-- Gera um couple_id único e aplica nos dois profiles.
CREATE OR REPLACE FUNCTION public.link_couple(partner_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id  UUID := auth.uid();
  partner_id       UUID;
  existing_couple  UUID;
  new_couple_id    UUID;
BEGIN
  -- Buscar parceiro pelo e-mail
  SELECT id INTO partner_id
  FROM public.profiles
  WHERE email = lower(trim(partner_email))
  LIMIT 1;

  IF partner_id IS NULL THEN
    RETURN json_build_object('error', 'Parceiro não encontrado. Peça que ele se cadastre primeiro.');
  END IF;

  IF partner_id = current_user_id THEN
    RETURN json_build_object('error', 'Você não pode vincular-se a si mesmo.');
  END IF;

  -- Verificar se o parceiro já tem casal diferente
  SELECT couple_id INTO existing_couple
  FROM public.profiles
  WHERE id = partner_id;

  IF existing_couple IS NOT NULL THEN
    RETURN json_build_object('error', 'Este usuário já está vinculado a outro casal.');
  END IF;

  -- Gerar novo couple_id (ou reutilizar o do usuário atual)
  SELECT couple_id INTO new_couple_id
  FROM public.profiles
  WHERE id = current_user_id;

  IF new_couple_id IS NULL THEN
    new_couple_id := gen_random_uuid();
  END IF;

  -- Atualizar ambos os profiles
  UPDATE public.profiles SET couple_id = new_couple_id WHERE id = current_user_id;
  UPDATE public.profiles SET couple_id = new_couple_id WHERE id = partner_id;

  RETURN json_build_object('success', true, 'couple_id', new_couple_id);
END;
$$;

-- ── 6. Função: desvincular casal ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.unlink_couple()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_couple UUID;
BEGIN
  SELECT couple_id INTO current_couple
  FROM public.profiles
  WHERE id = auth.uid();

  IF current_couple IS NULL THEN
    RETURN json_build_object('error', 'Você não está vinculado a nenhum casal.');
  END IF;

  -- Remover couple_id de todos os membros do casal
  UPDATE public.profiles SET couple_id = NULL WHERE couple_id = current_couple;

  RETURN json_build_object('success', true);
END;
$$;

-- ── 7. Habilitar Realtime na tabela shopping_items ───────────────────────────
-- Necessário para o canal Supabase Realtime funcionar
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_items;
