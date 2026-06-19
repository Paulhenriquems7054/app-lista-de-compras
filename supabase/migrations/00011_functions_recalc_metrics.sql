-- ============================================================
-- MIGRATION 00011 — Função de recálculo de métricas mensais
-- Chamada após inserção em purchase_history (via trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalc_monthly_metrics(
  p_user_id UUID,
  p_ano     SMALLINT,
  p_mes     SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio       TIMESTAMPTZ;
  v_fim          TIMESTAMPTZ;
  v_total_compras INTEGER;
  v_total_gasto  NUMERIC(12,2);
  v_itens_unicos INTEGER;
  v_por_categoria JSONB;
  v_top_produtos  JSONB;
BEGIN
  v_inicio := make_timestamptz(p_ano, p_mes, 1, 0, 0, 0, 'America/Sao_Paulo');
  v_fim    := v_inicio + INTERVAL '1 month';

  -- Totais do mês
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(preco_total), 0),
    COUNT(DISTINCT item_nome)::INTEGER
  INTO v_total_compras, v_total_gasto, v_itens_unicos
  FROM public.purchase_history
  WHERE user_id    = p_user_id
    AND data_compra >= v_inicio
    AND data_compra <  v_fim;

  -- Gasto por categoria (JSONB)
  SELECT COALESCE(
    jsonb_object_agg(categoria, total_cat),
    '{}'::JSONB
  )
  INTO v_por_categoria
  FROM (
    SELECT categoria, SUM(COALESCE(preco_total, 0)) AS total_cat
    FROM   public.purchase_history
    WHERE  user_id    = p_user_id
      AND  data_compra >= v_inicio
      AND  data_compra <  v_fim
    GROUP  BY categoria
  ) sub;

  -- Top 5 produtos do mês
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY cnt DESC),
    '[]'::JSONB
  )
  INTO v_top_produtos
  FROM (
    SELECT jsonb_build_object(
      'nome',  item_nome,
      'count', COUNT(*),
      'gasto', COALESCE(SUM(preco_total), 0)
    ) AS row_data,
    COUNT(*) AS cnt
    FROM   public.purchase_history
    WHERE  user_id    = p_user_id
      AND  data_compra >= v_inicio
      AND  data_compra <  v_fim
    GROUP  BY item_nome
    ORDER  BY cnt DESC
    LIMIT  5
  ) sub;

  -- Upsert
  INSERT INTO public.user_consumption_metrics (
    user_id, ano, mes,
    total_compras, total_gasto, total_itens_unicos,
    gasto_por_categoria, top_produtos, calculado_em
  )
  VALUES (
    p_user_id, p_ano, p_mes,
    v_total_compras, v_total_gasto, v_itens_unicos,
    v_por_categoria, v_top_produtos, now()
  )
  ON CONFLICT (user_id, ano, mes)
  DO UPDATE SET
    total_compras       = EXCLUDED.total_compras,
    total_gasto         = EXCLUDED.total_gasto,
    total_itens_unicos  = EXCLUDED.total_itens_unicos,
    gasto_por_categoria = EXCLUDED.gasto_por_categoria,
    top_produtos        = EXCLUDED.top_produtos,
    calculado_em        = now();
END;
$$;

COMMENT ON FUNCTION public.recalc_monthly_metrics IS
  'Recalcula as métricas mensais agregadas para um usuário em um mês/ano específico. '
  'Chamada pelo trigger após INSERT em purchase_history.';


-- ── Trigger: recalcula métricas mensais após inserção ────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_purchase_history_monthly()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalc_monthly_metrics(
    NEW.user_id,
    EXTRACT(YEAR  FROM NEW.data_compra)::SMALLINT,
    EXTRACT(MONTH FROM NEW.data_compra)::SMALLINT
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_purchase_history_monthly_metrics
  AFTER INSERT ON public.purchase_history
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_purchase_history_monthly();
