-- ============================================================
-- MIGRATION 00012 — Função de recálculo de selos (badges)
-- Selos são relativos ao conjunto do usuário — precisam
-- ser recalculados para TODOS os produtos quando qualquer
-- produto muda de ranking (ex: novo item vira top 20%)
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalc_seals_for_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_top20_freq_cutoff  NUMERIC;
  v_top20_gasto_cutoff NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.product_statistics
  WHERE user_id = p_user_id;

  IF v_count = 0 THEN RETURN; END IF;

  -- ── Calcular cortes do top 20% ─────────────────────────────────────────
  -- Frequência: valor mínimo para estar no top 20%
  SELECT frequencia_mensal_media
  INTO   v_top20_freq_cutoff
  FROM   public.product_statistics
  WHERE  user_id = p_user_id
  ORDER  BY frequencia_mensal_media DESC
  OFFSET GREATEST(1, CEIL(v_count * 0.2)::INTEGER) - 1
  LIMIT  1;

  -- Gasto: valor mínimo para estar no top 20%
  SELECT gasto_total
  INTO   v_top20_gasto_cutoff
  FROM   public.product_statistics
  WHERE  user_id = p_user_id
  ORDER  BY gasto_total DESC
  OFFSET GREATEST(1, CEIL(v_count * 0.2)::INTEGER) - 1
  LIMIT  1;

  -- ── Atualizar selos em lote ────────────────────────────────────────────
  UPDATE public.product_statistics ps
  SET selos = (
    SELECT ARRAY(
      SELECT selo FROM (VALUES
        -- 🔥 top 20% frequência
        ('🔥', ps.frequencia_mensal_media >= COALESCE(v_top20_freq_cutoff, 0)),
        -- ⭐ recorrente (≥ 0.75 compras/mês)
        ('⭐', ps.frequencia_mensal_media >= 0.75),
        -- 📈 preço subiu ≥10% nos últimos 2 registros
        ('📈', (
          array_length(ps.evolucao_precos, 1) >= 2
          AND ps.evolucao_precos[array_length(ps.evolucao_precos, 1) - 1] > 0
          AND (
            ps.evolucao_precos[array_length(ps.evolucao_precos, 1)]
            - ps.evolucao_precos[array_length(ps.evolucao_precos, 1) - 1]
          ) / ps.evolucao_precos[array_length(ps.evolucao_precos, 1) - 1] >= 0.10
        )),
        -- 💰 top 20% gasto
        ('💰', ps.gasto_total >= COALESCE(v_top20_gasto_cutoff, 0) AND ps.gasto_total > 0)
      ) AS t(selo, condicao)
      WHERE condicao = true
    )
  )
  WHERE ps.user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.recalc_seals_for_user IS
  'Recalcula os selos visuais (🔥⭐📈💰) para todos os produtos de um usuário '
  'com base nos rankings relativos. Deve ser chamada após qualquer alteração '
  'em product_statistics para o mesmo user_id.';


-- ── Trigger: recalcula selos após upsert em product_statistics ───────────────
CREATE OR REPLACE FUNCTION public.trg_fn_product_stats_recalc_seals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalc_seals_for_user(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_statistics_recalc_seals
  AFTER INSERT OR UPDATE ON public.product_statistics
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_product_stats_recalc_seals();
