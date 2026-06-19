# Como Executar as Migrations no Supabase

## URL do Projeto
`https://fzzoxqttbzdziuglicik.supabase.co`

## Acesso ao SQL Editor
1. Acesse: https://supabase.com/dashboard/project/fzzoxqttbzdziuglicik/sql/new
2. Cole o conteúdo de cada arquivo **na ordem numérica**
3. Clique em **Run** após cada arquivo
4. Verifique que não há erros antes de prosseguir

---

## Ordem de Execução (OBRIGATÓRIA)

| # | Arquivo | O que faz |
|---|---------|-----------|
| 1 | `00001_extensions.sql` | Instala uuid-ossp, pgcrypto, pg_trgm |
| 2 | `00002_enums.sql` | Cria tipos ENUM (categoria, classificação, urgência) |
| 3 | `00003_profiles.sql` | Tabela de perfis + trigger auto-criação ao registrar |
| 4 | `00004_custom_categories.sql` | Categorias personalizadas por usuário |
| 5 | `00005_shopping_items.sql` | Lista de compras ativa |
| 6 | `00006_archived_lists.sql` | Listas arquivadas + itens snapshot |
| 7 | `00007_purchase_history.sql` | Histórico granular de compras (tabela principal) |
| 8 | `00008_product_statistics.sql` | Cache de estatísticas por produto |
| 9 | `00009_user_consumption_metrics.sql` | Métricas mensais agregadas |
| 10 | `00010_functions_recalc_stats.sql` | Função + trigger de recálculo de stats |
| 11 | `00011_functions_recalc_metrics.sql` | Função + trigger de métricas mensais |
| 12 | `00012_functions_update_seals.sql` | Função + trigger de recálculo de selos |
| 13 | `00013_views.sql` | Views do dashboard (sugestões, top produtos, etc.) |
| 14 | `00014_functions_archive_list.sql` | Função transacional de arquivamento |
| 15 | `00015_functions_batch_recalc.sql` | Recálculo em lote + migração do localStorage |
| 16 | `00016_performance_indexes.sql` | Índices adicionais de performance |
| 17 | `00017_seed_defaults.sql` | Categorias padrão do sistema |

---

## Verificação após execução

Cole no SQL Editor para verificar se tudo foi criado:

```sql
-- Verificar tabelas
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_type   = 'BASE TABLE'
ORDER  BY table_name;

-- Verificar funções
SELECT routine_name
FROM   information_schema.routines
WHERE  routine_schema = 'public'
ORDER  BY routine_name;

-- Verificar triggers
SELECT trigger_name, event_object_table, event_manipulation
FROM   information_schema.triggers
WHERE  trigger_schema = 'public'
ORDER  BY event_object_table, trigger_name;

-- Verificar RLS ativo em todas as tabelas
SELECT tablename, rowsecurity
FROM   pg_tables
WHERE  schemaname = 'public'
ORDER  BY tablename;
```

---

## Migrar dados do localStorage (após implementar o cliente Supabase)

```sql
-- Exemplo de chamada da função de migração
-- Substituir 'SEU-USER-ID' pelo UUID do usuário autenticado
-- e passar o JSON do localStorage como p_records

SELECT public.migrate_from_localstorage(
  'SEU-USER-ID'::UUID,
  '[
    {
      "id": "...",
      "itemNome": "leite",
      "categoria": "Laticínios",
      "quantidade": "1 litro",
      "precoUnitario": 5.99,
      "precoTotal": 5.99,
      "dataCompra": "2025-06-01T10:00:00Z"
    }
  ]'::JSONB
);
```

---

## Rollback (se necessário)

Para desfazer tudo, execute na ordem **inversa** (17 → 1):

```sql
-- ATENÇÃO: Isso apaga TODOS os dados. Não execute em produção sem backup.

DROP TABLE IF EXISTS public.system_categories          CASCADE;
DROP TABLE IF EXISTS public.user_consumption_metrics   CASCADE;
DROP TABLE IF EXISTS public.product_statistics         CASCADE;
DROP TABLE IF EXISTS public.purchase_history           CASCADE;
DROP TABLE IF EXISTS public.archived_list_items        CASCADE;
DROP TABLE IF EXISTS public.archived_lists             CASCADE;
DROP TABLE IF EXISTS public.shopping_items             CASCADE;
DROP TABLE IF EXISTS public.custom_categories          CASCADE;
DROP TABLE IF EXISTS public.profiles                   CASCADE;

DROP VIEW IF EXISTS public.v_smart_suggestions  CASCADE;
DROP VIEW IF EXISTS public.v_top_products       CASCADE;
DROP VIEW IF EXISTS public.v_monthly_dashboard  CASCADE;
DROP VIEW IF EXISTS public.v_category_spending  CASCADE;

DROP FUNCTION IF EXISTS public.archive_shopping_list       CASCADE;
DROP FUNCTION IF EXISTS public.recalc_product_statistics   CASCADE;
DROP FUNCTION IF EXISTS public.recalc_monthly_metrics      CASCADE;
DROP FUNCTION IF EXISTS public.recalc_seals_for_user       CASCADE;
DROP FUNCTION IF EXISTS public.full_recalc_for_user        CASCADE;
DROP FUNCTION IF EXISTS public.migrate_from_localstorage   CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user             CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at              CASCADE;

DROP TYPE IF EXISTS public.urgencia_sugestao      CASCADE;
DROP TYPE IF EXISTS public.consumo_classificacao  CASCADE;
DROP TYPE IF EXISTS public.categoria_produto      CASCADE;
```
