-- ============================================================
-- MIGRATION 00014 — Função de arquivamento de lista
-- Substitui o handleArchiveList do App.tsx
-- Executa em transação única: archived_list + purchase_history
-- + recálculo automático via triggers
-- ============================================================

CREATE OR REPLACE FUNCTION public.archive_shopping_list(
  p_user_id UUID,
  p_item_ids UUID[]   -- IDs dos shopping_items marcados como comprado
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived_list_id  UUID;
  v_total_gasto       NUMERIC(12,2) := 0;
  v_total_items       INTEGER       := 0;
  v_now               TIMESTAMPTZ   := now();
  v_item              RECORD;
  v_result            JSONB;
BEGIN
  -- Validação básica
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id é obrigatório';
  END IF;

  IF array_length(p_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhum item fornecido para arquivar';
  END IF;

  -- ── 1. Criar cabeçalho da lista arquivada ─────────────────────────────────
  INSERT INTO public.archived_lists (user_id, archived_at, total_items, total_gasto)
  VALUES (p_user_id, v_now, 0, 0)
  RETURNING id INTO v_archived_list_id;

  -- ── 2. Copiar itens comprados para archived_list_items + purchase_history ──
  FOR v_item IN
    SELECT *
    FROM   public.shopping_items
    WHERE  id = ANY(p_item_ids)
      AND  user_id = p_user_id
      AND  comprado = true
  LOOP
    v_total_items := v_total_items + 1;
    v_total_gasto := v_total_gasto + COALESCE(v_item.preco_medio, 0);

    -- Snapshot do item na lista arquivada
    INSERT INTO public.archived_list_items (
      archived_list_id, user_id,
      nome, quantidade, categoria, frequencia,
      preco_medio, historico_precos, dias_entre_compras, ultima_compra
    ) VALUES (
      v_archived_list_id, p_user_id,
      v_item.nome, v_item.quantidade, v_item.categoria, v_item.frequencia,
      v_item.preco_medio, v_item.historico_precos, v_item.dias_entre_compras,
      v_item.ultima_compra
    );

    -- Registro granular em purchase_history
    -- O trigger em purchase_history recalcula product_statistics e monthly_metrics
    INSERT INTO public.purchase_history (
      user_id, archived_list_id,
      item_nome, categoria, quantidade,
      preco_unitario, preco_total, data_compra
    ) VALUES (
      p_user_id, v_archived_list_id,
      lower(trim(v_item.nome)), v_item.categoria, v_item.quantidade,
      v_item.preco_medio, v_item.preco_medio, v_now
    );

    -- Atualizar dias_entre_compras no item (se já tinha ultima_compra anterior)
    IF v_item.ultima_compra IS NOT NULL THEN
      UPDATE public.shopping_items
      SET
        dias_entre_compras = CASE
          WHEN dias_entre_compras IS NOT NULL THEN
            ROUND((
              dias_entre_compras +
              EXTRACT(EPOCH FROM (v_now - v_item.ultima_compra)) / 86400.0
            ) / 2.0, 2)
          ELSE
            ROUND(EXTRACT(EPOCH FROM (v_now - v_item.ultima_compra)) / 86400.0, 2)
          END,
        ultima_compra = v_now,
        updated_at    = v_now
      WHERE id = v_item.id;
    END IF;

  END LOOP;

  -- ── 3. Atualizar totais do cabeçalho ─────────────────────────────────────
  UPDATE public.archived_lists
  SET total_items = v_total_items,
      total_gasto = v_total_gasto
  WHERE id = v_archived_list_id;

  -- ── 4. Remover itens comprados da lista ativa ────────────────────────────
  DELETE FROM public.shopping_items
  WHERE id = ANY(p_item_ids)
    AND user_id  = p_user_id
    AND comprado = true;

  -- ── 5. Retornar resumo da operação ───────────────────────────────────────
  v_result := jsonb_build_object(
    'archived_list_id', v_archived_list_id,
    'total_items',      v_total_items,
    'total_gasto',      v_total_gasto,
    'archived_at',      v_now
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, a transação inteira é revertida automaticamente
    RAISE EXCEPTION 'Erro ao arquivar lista: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

COMMENT ON FUNCTION public.archive_shopping_list IS
  'Arquiva os itens comprados de uma lista em uma transação atômica: '
  'cria archived_list, copia itens, insere em purchase_history '
  '(triggers recalculam stats), atualiza dias_entre_compras e remove da lista ativa.';
