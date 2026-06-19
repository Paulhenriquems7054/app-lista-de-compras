-- ============================================================
-- MIGRATION 00010 — Função de recálculo de estatísticas de produto
-- Chamada após inserção em purchase_history (via trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalc_product_statistics(
  p_user_id  UUID,
  p_item_nome TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_compras         INTEGER;
  v_primeira_compra       TIMESTAMPTZ;
  v_ultima_compra         TIMESTAMPTZ;
  v_gasto_total           NUMERIC(12,2);
  v_preco_medio           NUMERIC(10,2);
  v_preco_minimo          NUMERIC(10,2);
  v_preco_maximo          NUMERIC(10,2);
  v_evolucao_precos       NUMERIC(10,2)[];
  v_media_intervalo_dias  NUMERIC(8,2);
  v_janela_obs_dias       NUMERIC;
  v_janela_mes            NUMERIC;
  v_janela_semana         NUMERIC;
  v_freq_mensal           NUMERIC(8,4);
  v_freq_semanal          NUMERIC(8,4);
  v_classificacao         public.consumo_classificacao;
  v_categoria             TEXT;
BEGIN
  -- ── 1. Agregar dados brutos de purchase_history ───────────────────────────
  SELECT
    COUNT(*)::INTEGER,
    MIN(data_compra),
    MAX(data_compra),
    COALESCE(SUM(preco_total), 0),
    CASE WHEN COUNT(*) FILTER (WHERE preco_unitario > 0) > 0
         THEN AVG(preco_unitario) FILTER (WHERE preco_unitario > 0)
         ELSE NULL END,
    MIN(preco_unitario) FILTER (WHERE preco_unitario > 0),
    MAX(preco_unitario) FILTER (WHERE preco_unitario > 0),
    -- últimos 24 preços em ordem cronológica
    ARRAY(
      SELECT preco_unitario
      FROM   public.purchase_history ph2
      WHERE  ph2.user_id   = p_user_id
        AND  ph2.item_nome = p_item_nome
        AND  ph2.preco_unitario > 0
      ORDER BY ph2.data_compra DESC
      LIMIT  24
    ),
    MAX(categoria)
  INTO
    v_total_compras,
    v_primeira_compra,
    v_ultima_compra,
    v_gasto_total,
    v_preco_medio,
    v_preco_minimo,
    v_preco_maximo,
    v_evolucao_precos,
    v_categoria
  FROM public.purchase_history
  WHERE user_id   = p_user_id
    AND item_nome = p_item_nome;

  -- ── 2. Intervalo médio entre compras ─────────────────────────────────────
  -- Calcula a média dos dias entre compras consecutivas usando LAG
  SELECT COALESCE(AVG(intervalo_dias), 0)
  INTO   v_media_intervalo_dias
  FROM (
    SELECT
      EXTRACT(EPOCH FROM (data_compra - LAG(data_compra) OVER (ORDER BY data_compra))) / 86400.0
      AS intervalo_dias
    FROM public.purchase_history
    WHERE user_id   = p_user_id
      AND item_nome = p_item_nome
    ORDER BY data_compra
  ) sub
  WHERE intervalo_dias IS NOT NULL
    AND intervalo_dias > 0;

  -- ── 3. Frequência (janela primeira→última, mínimo 30d/7d) ────────────────
  v_janela_obs_dias := GREATEST(
    EXTRACT(EPOCH FROM (v_ultima_compra - v_primeira_compra)) / 86400.0,
    0
  );
  v_janela_mes    := GREATEST(v_janela_obs_dias, 30) / 30.0;
  v_janela_semana := GREATEST(v_janela_obs_dias, 7)  / 7.0;

  v_freq_mensal  := v_total_compras::NUMERIC / v_janela_mes;
  v_freq_semanal := v_total_compras::NUMERIC / v_janela_semana;

  -- ── 4. Classificação ─────────────────────────────────────────────────────
  v_classificacao := CASE
    WHEN v_freq_mensal >= 4 OR v_total_compras >= 20 THEN 'Consumo Muito Alto'
    WHEN v_freq_mensal >= 2 OR v_total_compras >= 8  THEN 'Consumo Alto'
    WHEN v_freq_mensal >= 1 OR v_total_compras >= 4  THEN 'Consumo Médio'
    WHEN v_total_compras >= 2                        THEN 'Consumo Baixo'
    ELSE                                                  'Consumo Raro'
  END::public.consumo_classificacao;

  -- ── 5. Upsert em product_statistics ──────────────────────────────────────
  INSERT INTO public.product_statistics (
    user_id, item_nome, categoria,
    total_compras, frequencia_mensal_media, frequencia_semanal_media,
    media_intervalo_dias, ultima_compra, primeira_compra,
    gasto_total, preco_medio, preco_minimo, preco_maximo,
    evolucao_precos, classificacao, calculado_em
  )
  VALUES (
    p_user_id, p_item_nome, COALESCE(v_categoria, 'Outros'),
    v_total_compras, v_freq_mensal, v_freq_semanal,
    NULLIF(v_media_intervalo_dias, 0), v_ultima_compra, v_primeira_compra,
    v_gasto_total, v_preco_medio, v_preco_minimo, v_preco_maximo,
    v_evolucao_precos, v_classificacao, now()
  )
  ON CONFLICT (user_id, item_nome)
  DO UPDATE SET
    categoria               = EXCLUDED.categoria,
    total_compras           = EXCLUDED.total_compras,
    frequencia_mensal_media = EXCLUDED.frequencia_mensal_media,
    frequencia_semanal_media= EXCLUDED.frequencia_semanal_media,
    media_intervalo_dias    = EXCLUDED.media_intervalo_dias,
    ultima_compra           = EXCLUDED.ultima_compra,
    primeira_compra         = EXCLUDED.primeira_compra,
    gasto_total             = EXCLUDED.gasto_total,
    preco_medio             = EXCLUDED.preco_medio,
    preco_minimo            = EXCLUDED.preco_minimo,
    preco_maximo            = EXCLUDED.preco_maximo,
    evolucao_precos         = EXCLUDED.evolucao_precos,
    classificacao           = EXCLUDED.classificacao,
    calculado_em            = now();
END;
$$;

COMMENT ON FUNCTION public.recalc_product_statistics IS
  'Recalcula e faz upsert das estatísticas de um produto específico para um usuário. '
  'Chamada pelo trigger após INSERT em purchase_history.';


-- ── Trigger: recalcula stats após inserção em purchase_history ───────────────
CREATE OR REPLACE FUNCTION public.trg_fn_purchase_history_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalc_product_statistics(NEW.user_id, NEW.item_nome);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_purchase_history_recalc_stats
  AFTER INSERT ON public.purchase_history
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_purchase_history_after_insert();
