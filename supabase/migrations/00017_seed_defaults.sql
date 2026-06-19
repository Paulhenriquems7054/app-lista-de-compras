-- ============================================================
-- MIGRATION 00017 — Dados de seed (referência)
-- NÃO insere dados de usuário — apenas cria tabela de
-- referência das categorias padrão do sistema
-- ============================================================

-- Tabela de categorias padrão do sistema (somente leitura)
CREATE TABLE public.system_categories (
  name        TEXT  PRIMARY KEY,
  icon        TEXT  NOT NULL,
  color_class TEXT  NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 99
);

COMMENT ON TABLE public.system_categories IS
  'Categorias padrão do sistema (somente leitura). '
  'Não requer RLS — dados públicos de referência.';

INSERT INTO public.system_categories (name, icon, color_class, sort_order) VALUES
  ('Frutas e Verduras', '🍎', 'bg-red-400',    1),
  ('Carnes e Frios',    '🥩', 'bg-red-600',    2),
  ('Laticínios',        '🧀', 'bg-yellow-400', 3),
  ('Padaria',           '🥖', 'bg-yellow-600', 4),
  ('Mercearia',         '🥫', 'bg-blue-400',   5),
  ('Limpeza',           '🧹', 'bg-green-400',  6),
  ('Higiene Pessoal',   '🪥', 'bg-purple-400', 7),
  ('Bebidas',           '🧃', 'bg-orange-400', 8),
  ('Outros',            '🧺', 'bg-gray-400',   9);

-- Acesso público de leitura (sem autenticação necessária)
ALTER TABLE public.system_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_categories_public_read"
  ON public.system_categories FOR SELECT
  USING (true);
