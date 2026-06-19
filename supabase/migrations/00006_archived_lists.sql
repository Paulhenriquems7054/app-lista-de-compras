-- ============================================================
-- MIGRATION 00006 — Listas arquivadas (histórico de compras)
-- Espelha a interface ArchivedList do types.ts
-- ============================================================

-- Cabeçalho da lista arquivada
CREATE TABLE public.archived_lists (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  archived_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Resumo desnormalizado para queries rápidas no histórico
  total_items     INTEGER     NOT NULL DEFAULT 0 CHECK (total_items >= 0),
  total_gasto     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_gasto >= 0),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.archived_lists             IS 'Cabeçalho das listas de compras arquivadas pelo usuário';
COMMENT ON COLUMN public.archived_lists.archived_at IS 'Data/hora em que a lista foi arquivada (equivale ao date do ArchivedList)';
COMMENT ON COLUMN public.archived_lists.total_gasto IS 'Soma dos preços dos itens desta lista (cache para performance)';

CREATE INDEX idx_archived_lists_user_id     ON public.archived_lists(user_id);
CREATE INDEX idx_archived_lists_archived_at ON public.archived_lists(user_id, archived_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.archived_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archived_lists_select_own"
  ON public.archived_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "archived_lists_insert_own"
  ON public.archived_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "archived_lists_delete_own"
  ON public.archived_lists FOR DELETE
  USING (auth.uid() = user_id);


-- ── Itens de cada lista arquivada ────────────────────────────────────────────

CREATE TABLE public.archived_list_items (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  archived_list_id    UUID        NOT NULL REFERENCES public.archived_lists(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- user_id duplicado para RLS sem JOIN

  nome                TEXT        NOT NULL,
  quantidade          TEXT        NOT NULL DEFAULT '1',
  categoria           TEXT        NOT NULL DEFAULT 'Outros',
  frequencia          INTEGER     NOT NULL DEFAULT 1,
  preco_medio         NUMERIC(10,2),
  historico_precos    NUMERIC(10,2)[] NOT NULL DEFAULT '{}',
  dias_entre_compras  NUMERIC(8,2),
  ultima_compra       TIMESTAMPTZ
);

COMMENT ON TABLE  public.archived_list_items                 IS 'Itens que compunham uma lista arquivada (snapshot no momento do arquivamento)';
COMMENT ON COLUMN public.archived_list_items.user_id         IS 'Denormalizado para RLS eficiente sem necessidade de JOIN';

CREATE INDEX idx_archived_list_items_list_id ON public.archived_list_items(archived_list_id);
CREATE INDEX idx_archived_list_items_user_id ON public.archived_list_items(user_id);
CREATE INDEX idx_archived_list_items_nome    ON public.archived_list_items USING gin(nome gin_trgm_ops);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.archived_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archived_list_items_select_own"
  ON public.archived_list_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "archived_list_items_insert_own"
  ON public.archived_list_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "archived_list_items_delete_own"
  ON public.archived_list_items FOR DELETE
  USING (auth.uid() = user_id);
