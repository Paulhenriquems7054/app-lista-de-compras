-- ============================================================
-- MIGRATION 00016 — Índices adicionais de performance
-- Cenários: 10.000+ registros por usuário, múltiplos usuários
-- ============================================================

-- ── Índices parciais (filtram apenas dados relevantes) ────────────────────────

-- purchase_history: registros com preço (para análise financeira)
CREATE INDEX idx_purchase_history_com_preco
  ON public.purchase_history(user_id, data_compra DESC)
  WHERE preco_total > 0;

-- shopping_items: apenas itens não comprados (lista ativa)
CREATE INDEX idx_shopping_items_pendentes
  ON public.shopping_items(user_id, categoria)
  WHERE comprado = false;

-- shopping_items: itens com preço definido (para cálculo do orçamento)
CREATE INDEX idx_shopping_items_com_preco
  ON public.shopping_items(user_id)
  WHERE preco_medio IS NOT NULL;

-- product_statistics: produtos com intervalo definido (para sugestões)
CREATE INDEX idx_product_stats_com_intervalo
  ON public.product_statistics(user_id, ultima_compra DESC)
  WHERE media_intervalo_dias IS NOT NULL AND media_intervalo_dias > 0;

-- ── Índices compostos para queries frequentes do dashboard ───────────────────

-- Top 10 mais comprados por usuário
CREATE INDEX idx_ph_user_nome_count
  ON public.purchase_history(user_id, item_nome, data_compra);

-- Gasto mensal: query de agrupamento por mês
-- Nota: date_trunc() é STABLE, não IMMUTABLE — não pode ser usada em expressão de índice.
-- O planner usa este índice em range scans com: WHERE data_compra >= '...' AND data_compra < '...'
CREATE INDEX idx_ph_user_mes
  ON public.purchase_history(user_id, data_compra);

-- ── Estatísticas do planner (ajuda o query planner do Postgres) ───────────────
-- Coleta estatísticas mais detalhadas para colunas com alta cardinalidade
ALTER TABLE public.purchase_history    ALTER COLUMN item_nome  SET STATISTICS 500;
ALTER TABLE public.purchase_history    ALTER COLUMN categoria  SET STATISTICS 200;
ALTER TABLE public.product_statistics  ALTER COLUMN item_nome  SET STATISTICS 500;

-- ── Comentários de manutenção ─────────────────────────────────────────────────
COMMENT ON INDEX idx_purchase_history_com_preco IS
  'Índice parcial para queries financeiras — ignora registros sem preço';

COMMENT ON INDEX idx_shopping_items_pendentes IS
  'Índice parcial para lista ativa — ignora itens já comprados';

COMMENT ON INDEX idx_product_stats_com_intervalo IS
  'Índice parcial para sugestões de reposição — ignora produtos sem baseline';
