-- ============================================================
-- MIGRATION 00009 — Métricas de consumo por usuário (agregações mensais)
-- Cache de gastos mensais, por categoria e totais históricos
-- ============================================================

CREATE TABLE public.user_consumption_metrics (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Período de referência
  ano                   SMALLINT      NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
  mes                   SMALLINT      NOT NULL CHECK (mes >= 1 AND mes <= 12),

  -- Totais do mês
  total_compras         INTEGER       NOT NULL DEFAULT 0 CHECK (total_compras >= 0),
  -- Número de registros em purchase_history no mês

  total_gasto           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_gasto >= 0),
  -- Soma de preco_total de todos os registros do mês

  total_itens_unicos    INTEGER       NOT NULL DEFAULT 0 CHECK (total_itens_unicos >= 0),
  -- Produtos distintos comprados no mês

  ticket_medio          NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN total_compras > 0 THEN total_gasto / total_compras ELSE 0 END
  ) STORED,
  -- Ticket médio por item (calculado automaticamente)

  -- Gastos por categoria (JSONB: {"Frutas e Verduras": 45.80, "Laticínios": 32.00, ...})
  gasto_por_categoria   JSONB         NOT NULL DEFAULT '{}',

  -- Top 5 produtos mais comprados no mês (JSONB array)
  -- [{"nome": "leite", "count": 4, "gasto": 22.00}, ...]
  top_produtos          JSONB         NOT NULL DEFAULT '[]',

  calculado_em          TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT uq_consumption_metrics_user_mes UNIQUE (user_id, ano, mes)
);

COMMENT ON TABLE  public.user_consumption_metrics                   IS 'Agregações mensais de consumo por usuário — usadas para os gráficos do dashboard';
COMMENT ON COLUMN public.user_consumption_metrics.gasto_por_categoria IS 'JSONB: mapa categoria→total_gasto no mês';
COMMENT ON COLUMN public.user_consumption_metrics.top_produtos        IS 'JSONB: top 5 produtos do mês com contagem e gasto';
COMMENT ON COLUMN public.user_consumption_metrics.ticket_medio        IS 'Coluna gerada: gasto_total / total_compras';

CREATE INDEX idx_consumption_metrics_user_id
  ON public.user_consumption_metrics(user_id);

CREATE INDEX idx_consumption_metrics_periodo
  ON public.user_consumption_metrics(user_id, ano DESC, mes DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.user_consumption_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consumption_metrics_select_own"
  ON public.user_consumption_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "consumption_metrics_insert_own"
  ON public.user_consumption_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "consumption_metrics_update_own"
  ON public.user_consumption_metrics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "consumption_metrics_delete_own"
  ON public.user_consumption_metrics FOR DELETE
  USING (auth.uid() = user_id);
