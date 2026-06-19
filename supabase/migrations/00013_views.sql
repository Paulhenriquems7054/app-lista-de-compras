-- ============================================================
-- MIGRATION 00013 — Views para o dashboard
-- Facilitam queries complexas do frontend sem lógica SQL
-- espalhada no código JavaScript
-- ============================================================

-- ── View: Sugestões de reposição ──────────────────────────────────────────────
-- Produtos que estão perto ou além do intervalo médio de compra
CREATE OR REPLACE VIEW public.v_smart_suggestions AS
SELECT
  ps.user_id,
  ps.item_nome                                             AS nome,
  ps.categoria,
  ps.ultima_compra,
  ps.media_intervalo_dias,
  ps.frequencia_mensal_media,
  ps.classificacao,

  -- Dias desde a última compra
  EXTRACT(EPOCH FROM (now() - ps.ultima_compra)) / 86400.0
    AS dias_desde_ultima_compra,

  -- Razão dias_decorridos / intervalo_medio (>= 0.8 = sugerir)
  CASE
    WHEN ps.media_intervalo_dias > 0
    THEN (EXTRACT(EPOCH FROM (now() - ps.ultima_compra)) / 86400.0)
         / ps.media_intervalo_dias
    ELSE 0
  END AS ratio_urgencia,

  -- Urgência calculada
  CASE
    WHEN ps.media_intervalo_dias > 0
      AND (EXTRACT(EPOCH FROM (now() - ps.ultima_compra)) / 86400.0)
          / ps.media_intervalo_dias >= 1.1
    THEN 'alta'::public.urgencia_sugestao
    WHEN ps.media_intervalo_dias > 0
      AND (EXTRACT(EPOCH FROM (now() - ps.ultima_compra)) / 86400.0)
          / ps.media_intervalo_dias >= 0.9
    THEN 'media'::public.urgencia_sugestao
    WHEN ps.media_intervalo_dias > 0
      AND (EXTRACT(EPOCH FROM (now() - ps.ultima_compra)) / 86400.0)
          / ps.media_intervalo_dias >= 0.8
    THEN 'baixa'::public.urgencia_sugestao
    ELSE NULL
  END AS urgencia

FROM public.product_statistics ps
WHERE
  ps.media_intervalo_dias IS NOT NULL
  AND ps.media_intervalo_dias > 0
  AND ps.ultima_compra IS NOT NULL
  AND (EXTRACT(EPOCH FROM (now() - ps.ultima_compra)) / 86400.0)
      / ps.media_intervalo_dias >= 0.8
ORDER BY ratio_urgencia DESC;

COMMENT ON VIEW public.v_smart_suggestions IS
  'Sugestões de reposição: produtos com ratio dias_decorridos/intervalo_medio >= 0.8. '
  'Filtrar por user_id (RLS aplicada via product_statistics).';


-- ── View: Top produtos por usuário ────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_top_products AS
SELECT
  user_id,
  item_nome               AS nome,
  categoria,
  total_compras,
  gasto_total,
  preco_medio,
  frequencia_mensal_media,
  media_intervalo_dias,
  ultima_compra,
  classificacao,
  selos,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY total_compras  DESC) AS rank_compras,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY gasto_total    DESC) AS rank_gasto,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY frequencia_mensal_media DESC) AS rank_frequencia
FROM public.product_statistics;

COMMENT ON VIEW public.v_top_products IS
  'Produtos com rankings calculados para exibição no dashboard.';


-- ── View: Dashboard mensal resumido ──────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_monthly_dashboard AS
SELECT
  m.user_id,
  m.ano,
  m.mes,
  TO_DATE(m.ano::TEXT || '-' || LPAD(m.mes::TEXT, 2, '0') || '-01', 'YYYY-MM-DD') AS data_referencia,
  m.total_compras,
  m.total_gasto,
  m.total_itens_unicos,
  m.ticket_medio,
  m.gasto_por_categoria,
  m.top_produtos,
  -- Variação em relação ao mês anterior
  m.total_gasto - LAG(m.total_gasto) OVER (
    PARTITION BY m.user_id ORDER BY m.ano, m.mes
  ) AS variacao_gasto_mes_anterior,
  m.calculado_em
FROM public.user_consumption_metrics m
ORDER BY m.ano DESC, m.mes DESC;

COMMENT ON VIEW public.v_monthly_dashboard IS
  'Dados mensais para gráficos do dashboard com variação mês a mês.';


-- ── View: Resumo financeiro por categoria (todos os períodos) ─────────────────
CREATE OR REPLACE VIEW public.v_category_spending AS
SELECT
  ph.user_id,
  ph.categoria,
  COUNT(*)                        AS total_compras,
  COALESCE(SUM(ph.preco_total), 0) AS gasto_total,
  COALESCE(AVG(ph.preco_unitario) FILTER (WHERE ph.preco_unitario > 0), 0)
                                  AS preco_medio,
  COUNT(DISTINCT ph.item_nome)    AS produtos_unicos,
  MAX(ph.data_compra)             AS ultima_compra
FROM public.purchase_history ph
GROUP BY ph.user_id, ph.categoria;

COMMENT ON VIEW public.v_category_spending IS
  'Gastos totais históricos por categoria. Filtrar por user_id via RLS.';
