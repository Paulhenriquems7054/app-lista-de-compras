-- ============================================================
-- MIGRATION 00002 — Tipos enumerados (ENUMs)
-- Espelham os enums do types.ts
-- ============================================================

-- Categorias de produto
CREATE TYPE public.categoria_produto AS ENUM (
  'Frutas e Verduras',
  'Carnes e Frios',
  'Laticínios',
  'Padaria',
  'Mercearia',
  'Limpeza',
  'Higiene Pessoal',
  'Bebidas',
  'Outros'
);

-- Classificação de consumo por produto
CREATE TYPE public.consumo_classificacao AS ENUM (
  'Consumo Muito Alto',
  'Consumo Alto',
  'Consumo Médio',
  'Consumo Baixo',
  'Consumo Raro'
);

-- Urgência das sugestões de reposição
CREATE TYPE public.urgencia_sugestao AS ENUM (
  'alta',
  'media',
  'baixa'
);

COMMENT ON TYPE public.categoria_produto       IS 'Categorias de produtos disponíveis na lista de compras';
COMMENT ON TYPE public.consumo_classificacao   IS 'Classificação automática de frequência de consumo por produto';
COMMENT ON TYPE public.urgencia_sugestao       IS 'Nível de urgência da sugestão de reposição de item';
