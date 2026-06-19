-- ============================================================
-- MIGRATION 00008 — Estatísticas de produto (cache materializado)
-- Espelha a interface ProductStats do types.ts
-- Evita recalcular tudo no cliente a cada acesso
-- ============================================================

CREATE TABLE public.product_statistics (
  id                        UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Identificação do produto
  item_nome                 TEXT              NOT NULL,
  categoria                 TEXT              NOT NULL DEFAULT 'Outros',

  -- Métricas de consumo (espelham ProductStats)
  total_compras             INTEGER           NOT NULL DEFAULT 0 CHECK (total_compras >= 0),
  frequencia_mensal_media   NUMERIC(8,4)      NOT NULL DEFAULT 0 CHECK (frequencia_mensal_media >= 0),
  frequencia_semanal_media  NUMERIC(8,4)      NOT NULL DEFAULT 0 CHECK (frequencia_semanal_media >= 0),
  media_intervalo_dias      NUMERIC(8,2)      CHECK (media_intervalo_dias >= 0),
  ultima_compra             TIMESTAMPTZ,
  primeira_compra           TIMESTAMPTZ,

  -- Financeiro
  gasto_total               NUMERIC(12,2)     NOT NULL DEFAULT 0 CHECK (gasto_total >= 0),
  preco_medio               NUMERIC(10,2)     CHECK (preco_medio >= 0),
  preco_minimo              NUMERIC(10,2)     CHECK (preco_minimo >= 0),
  preco_maximo              NUMERIC(10,2)     CHECK (preco_maximo >= 0),
  evolucao_precos           NUMERIC(10,2)[]   NOT NULL DEFAULT '{}',
  -- últimos 24 preços registrados, para gráfico de evolução

  -- Classificação e selos
  classificacao             public.consumo_classificacao NOT NULL DEFAULT 'Consumo Raro',
  selos                     TEXT[]            NOT NULL DEFAULT '{}',
  -- Array de emojis: ['🔥','⭐','📈','💰']

  -- Controle de atualização
  calculado_em              TIMESTAMPTZ       NOT NULL DEFAULT now(),
  -- Timestamp do último recálculo — usado para cache invalidation

  CONSTRAINT uq_product_statistics_user_nome UNIQUE (user_id, item_nome)
);

COMMENT ON TABLE  public.product_statistics                       IS 'Cache materializado das estatísticas de consumo por produto. Recalculado via trigger ou função agendada.';
COMMENT ON COLUMN public.product_statistics.evolucao_precos       IS 'Últimos 24 preços unitários em ordem cronológica (para gráfico de evolução)';
COMMENT ON COLUMN public.product_statistics.selos                 IS 'Selos visuais: 🔥 consumo alto, ⭐ recorrente, 📈 preço em alta, 💰 maior gasto';
COMMENT ON COLUMN public.product_statistics.calculado_em          IS 'Data/hora do último recálculo das estatísticas';

-- Índices
CREATE INDEX idx_product_statistics_user_id
  ON public.product_statistics(user_id);

CREATE INDEX idx_product_statistics_classificacao
  ON public.product_statistics(user_id, classificacao);

CREATE INDEX idx_product_statistics_gasto_total
  ON public.product_statistics(user_id, gasto_total DESC);

CREATE INDEX idx_product_statistics_total_compras
  ON public.product_statistics(user_id, total_compras DESC);

CREATE INDEX idx_product_statistics_ultima_compra
  ON public.product_statistics(user_id, ultima_compra DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.product_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_statistics_select_own"
  ON public.product_statistics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "product_statistics_insert_own"
  ON public.product_statistics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "product_statistics_update_own"
  ON public.product_statistics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "product_statistics_delete_own"
  ON public.product_statistics FOR DELETE
  USING (auth.uid() = user_id);
