-- ============================================================
-- MIGRATION 00007 — Histórico granular de compras
-- Espelha a interface PurchaseRecord do types.ts
-- Tabela central do módulo de consumo inteligente
-- ============================================================

CREATE TABLE public.purchase_history (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  archived_list_id  UUID          REFERENCES public.archived_lists(id) ON DELETE SET NULL,
  -- NULL quando migrado do localStorage (sem vínculo com lista arquivada)

  -- Produto
  item_nome         TEXT          NOT NULL CHECK (char_length(trim(item_nome)) > 0),
  -- Normalizado: lowercase + trim (equivale ao itemNome do PurchaseRecord)
  categoria         TEXT          NOT NULL DEFAULT 'Outros',
  quantidade        TEXT          NOT NULL DEFAULT '1',

  -- Financeiro
  preco_unitario    NUMERIC(10,2) CHECK (preco_unitario > 0),
  preco_total       NUMERIC(10,2) CHECK (preco_total >= 0),

  -- Temporal
  data_compra       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.purchase_history                    IS 'Registro granular de cada item comprado — base do módulo de consumo inteligente';
COMMENT ON COLUMN public.purchase_history.item_nome          IS 'Nome normalizado (lowercase+trim) para agrupamento consistente';
COMMENT ON COLUMN public.purchase_history.archived_list_id   IS 'Referência à lista de origem; NULL para dados migrados do localStorage';
COMMENT ON COLUMN public.purchase_history.preco_unitario     IS 'Preço pago por unidade nesta compra específica';
COMMENT ON COLUMN public.purchase_history.preco_total        IS 'Preço total desta linha (pode diferir do unitário em caso de qty > 1 no futuro)';

-- ── Índices de performance ────────────────────────────────────────────────────

-- Acesso por usuário (todas as queries filtram por user_id)
CREATE INDEX idx_purchase_history_user_id
  ON public.purchase_history(user_id);

-- Análise de frequência por produto
CREATE INDEX idx_purchase_history_user_nome
  ON public.purchase_history(user_id, item_nome);

-- Análise temporal (gastos por mês, tendências)
CREATE INDEX idx_purchase_history_user_data
  ON public.purchase_history(user_id, data_compra DESC);

-- Análise por categoria
CREATE INDEX idx_purchase_history_user_categoria
  ON public.purchase_history(user_id, categoria);

-- Busca textual por nome do produto
CREATE INDEX idx_purchase_history_nome_trgm
  ON public.purchase_history USING gin(item_nome gin_trgm_ops);

-- Índice composto para a query mais comum:
-- "últimas N compras de cada produto nos últimos X meses"
CREATE INDEX idx_purchase_history_produto_data
  ON public.purchase_history(user_id, item_nome, data_compra DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_history_select_own"
  ON public.purchase_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "purchase_history_insert_own"
  ON public.purchase_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "purchase_history_delete_own"
  ON public.purchase_history FOR DELETE
  USING (auth.uid() = user_id);
