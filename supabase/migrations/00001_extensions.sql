-- ============================================================
-- MIGRATION 00001 — Extensões necessárias
-- Executar PRIMEIRO, antes de qualquer outra migration
-- ============================================================

-- uuid_generate_v4() para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto para funções criptográficas (usado pelo Supabase Auth internamente)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- pg_trgm para busca por texto parcial eficiente (ex: buscar itens por nome)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

COMMENT ON EXTENSION "uuid-ossp"  IS 'Geração de UUIDs v4';
COMMENT ON EXTENSION "pgcrypto"   IS 'Funções criptográficas';
COMMENT ON EXTENSION "pg_trgm"    IS 'Busca por similaridade de texto (trigram)';
