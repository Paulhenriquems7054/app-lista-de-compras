-- ============================================================
-- MIGRATION 00005 — Itens da lista de compras ativa
-- Espelha a interface Item do types.ts
-- ============================================================

CREATE TABLE public.shopping_items (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Dados principais do item
  nome                TEXT        NOT NULL CHECK (char_length(trim(nome)) > 0),
  quantidade          TEXT        NOT NULL DEFAULT '1',
  categoria           TEXT        NOT NULL DEFAULT 'Outros',
  -- TEXT em vez de ENUM para suportar categorias personalizadas dinamicamente

  comprado            BOOLEAN     NOT NULL DEFAULT false,

  -- Métricas de frequência de compra
  frequencia          INTEGER     NOT NULL DEFAULT 1 CHECK (frequencia >= 0),
  ultima_compra       TIMESTAMPTZ NOT NULL DEFAULT now(),
  dias_entre_compras  NUMERIC(8,2) CHECK (dias_entre_compras >= 0),

  -- Controle de preços
  preco_medio         NUMERIC(10,2) CHECK (preco_medio >= 0),
  historico_precos    NUMERIC(10,2)[] NOT NULL DEFAULT '{}',
  -- Array de preços históricos para cálculo de média e evolução

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.shopping_items                    IS 'Lista de compras ativa do usuário';
COMMENT ON COLUMN public.shopping_items.categoria          IS 'Nome da categoria (pode ser padrão ou personalizada)';
COMMENT ON COLUMN public.shopping_items.frequencia         IS 'Número de vezes que o item foi comprado pelo usuário';
COMMENT ON COLUMN public.shopping_items.dias_entre_compras IS 'Média móvel de dias entre compras consecutivas';
COMMENT ON COLUMN public.shopping_items.historico_precos   IS 'Sequência cronológica de preços unitários registrados';

-- Índices
CREATE INDEX idx_shopping_items_user_id     ON public.shopping_items(user_id);
CREATE INDEX idx_shopping_items_categoria   ON public.shopping_items(user_id, categoria);
CREATE INDEX idx_shopping_items_comprado    ON public.shopping_items(user_id, comprado);
CREATE INDEX idx_shopping_items_nome_trgm  ON public.shopping_items USING gin(nome gin_trgm_ops);

CREATE TRIGGER trg_shopping_items_updated_at
  BEFORE UPDATE ON public.shopping_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopping_items_select_own"
  ON public.shopping_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "shopping_items_insert_own"
  ON public.shopping_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shopping_items_update_own"
  ON public.shopping_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shopping_items_delete_own"
  ON public.shopping_items FOR DELETE
  USING (auth.uid() = user_id);
