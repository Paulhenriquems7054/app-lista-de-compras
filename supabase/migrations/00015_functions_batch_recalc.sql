-- ============================================================
-- MIGRATION 00015 — Função de recálculo em lote
-- Para migração de dados do localStorage e manutenção
-- ============================================================

-- Recalcula TODAS as estatísticas de um usuário do zero
-- Útil após migração de dados ou correção manual
CREATE OR REPLACE FUNCTION public.full_recalc_for_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_produto        RECORD;
  v_ano            SMALLINT;
  v_mes            SMALLINT;
  v_periodo        RECORD;
  v_produtos_count INTEGER := 0;
  v_meses_count    INTEGER := 0;
BEGIN
  -- 1. Recalcular stats por produto
  FOR v_produto IN
    SELECT DISTINCT item_nome
    FROM   public.purchase_history
    WHERE  user_id = p_user_id
  LOOP
    PERFORM public.recalc_product_statistics(p_user_id, v_produto.item_nome);
    v_produtos_count := v_produtos_count + 1;
  END LOOP;

  -- 2. Recalcular selos (uma única vez, em lote)
  PERFORM public.recalc_seals_for_user(p_user_id);

  -- 3. Recalcular métricas mensais
  FOR v_periodo IN
    SELECT DISTINCT
      EXTRACT(YEAR  FROM data_compra)::SMALLINT AS ano,
      EXTRACT(MONTH FROM data_compra)::SMALLINT AS mes
    FROM public.purchase_history
    WHERE user_id = p_user_id
    ORDER BY ano, mes
  LOOP
    PERFORM public.recalc_monthly_metrics(p_user_id, v_periodo.ano, v_periodo.mes);
    v_meses_count := v_meses_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'user_id',        p_user_id,
    'produtos_recalc', v_produtos_count,
    'meses_recalc',    v_meses_count,
    'executado_em',    now()
  );
END;
$$;

COMMENT ON FUNCTION public.full_recalc_for_user IS
  'Recalcula do zero todas as estatísticas de produto, selos e métricas mensais '
  'para um usuário. Use após migração de dados do localStorage ou correção manual.';


-- ── Função de migração: converte dados do localStorage para o banco ───────────
-- Recebe um array JSONB com os PurchaseRecords do localStorage
CREATE OR REPLACE FUNCTION public.migrate_from_localstorage(
  p_user_id UUID,
  p_records JSONB  -- array de objetos PurchaseRecord
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record      JSONB;
  v_inserted    INTEGER := 0;
  v_skipped     INTEGER := 0;
  v_item_nome   TEXT;
  v_categoria   TEXT;
  v_data_compra TIMESTAMPTZ;
  v_preco_u     NUMERIC;
  v_preco_t     NUMERIC;
BEGIN
  IF jsonb_typeof(p_records) != 'array' THEN
    RAISE EXCEPTION 'p_records deve ser um array JSON';
  END IF;

  FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    -- Validações
    v_item_nome := lower(trim(v_record->>'itemNome'));
    IF v_item_nome IS NULL OR v_item_nome = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    BEGIN
      v_data_compra := (v_record->>'dataCompra')::TIMESTAMPTZ;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END;

    v_categoria := COALESCE(NULLIF(v_record->>'categoria', ''), 'Outros');

    v_preco_u := CASE
      WHEN v_record->>'precoUnitario' ~ '^[0-9]+(\.[0-9]+)?$'
      THEN (v_record->>'precoUnitario')::NUMERIC
      ELSE NULL END;

    v_preco_t := CASE
      WHEN v_record->>'precoTotal' ~ '^[0-9]+(\.[0-9]+)?$'
      THEN (v_record->>'precoTotal')::NUMERIC
      ELSE NULL END;

    -- Inserir ignorando duplicatas (mesmo item_nome + data_compra + user)
    INSERT INTO public.purchase_history (
      user_id, item_nome, categoria, quantidade,
      preco_unitario, preco_total, data_compra
    )
    SELECT
      p_user_id,
      v_item_nome,
      v_categoria,
      COALESCE(NULLIF(v_record->>'quantidade', ''), '1'),
      v_preco_u,
      v_preco_t,
      v_data_compra
    WHERE NOT EXISTS (
      -- Evitar duplicatas: mesmo usuário, produto e janela de 1h
      SELECT 1 FROM public.purchase_history
      WHERE  user_id    = p_user_id
        AND  item_nome  = v_item_nome
        AND  data_compra BETWEEN v_data_compra - INTERVAL '1 hour'
                             AND v_data_compra + INTERVAL '1 hour'
    );

    IF FOUND THEN
      v_inserted := v_inserted + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  -- Recalcular tudo após migração em lote
  IF v_inserted > 0 THEN
    PERFORM public.full_recalc_for_user(p_user_id);
  END IF;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'skipped',  v_skipped,
    'total',    jsonb_array_length(p_records)
  );
END;
$$;

COMMENT ON FUNCTION public.migrate_from_localstorage IS
  'Migra os PurchaseRecords armazenados no localStorage para o banco de dados. '
  'Chame uma vez por usuário após implementar o Supabase client no frontend. '
  'Ignora duplicatas (janela de 1h por produto). Recalcula todas as stats no final.';
