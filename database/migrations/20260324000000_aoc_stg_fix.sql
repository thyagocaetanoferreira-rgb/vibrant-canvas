-- =============================================================
-- AOC: Correção dos schemas de staging
-- 1. stg_aoc_11 recriada com colunas alinhadas ao layout TCM-GO
-- 2. stg_aoc_12 criada (estava ausente)
-- =============================================================

-- -------------------------------------------------------------
-- stg_aoc_11 — Det. Alterações por Elemento de Despesa
-- Problema: tabela existia com colunas erradas (vl_dotacao_inicial,
--   elemento_despesa, etc.) que nunca eram populadas pelo parser,
--   pois o layout TCM-GO define campos distintos nessas posições.
-- Solução: drop + recreate com colunas que correspondem ao layout.
-- -------------------------------------------------------------
DROP TABLE IF EXISTS stg_aoc_11 CASCADE;

CREATE TABLE stg_aoc_11 (
    id                   SERIAL PRIMARY KEY,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id   INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha         INTEGER NOT NULL,
    linha_bruta          TEXT,
    tipo_registro        VARCHAR(2),
    cod_programa         VARCHAR(4),
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    cod_funcao           VARCHAR(2),
    cod_subfuncao        VARCHAR(3),
    natureza_acao        VARCHAR(1),
    nro_proj_ativ        VARCHAR(3),
    cod_natureza_despesa VARCHAR(6),   -- pos 20-25
    dt_alteracao         VARCHAR(8),   -- pos 26-33 (AAAAMMDD)
    nr_alteracao         VARCHAR(3),   -- pos 34-36
    tipo_alteracao       VARCHAR(2),   -- pos 37-38
    vl_alteracao         VARCHAR(13),  -- pos 39-51
    vl_saldo_ant_dotacao VARCHAR(13),  -- pos 52-64
    vl_saldo_atual       VARCHAR(13),  -- pos 65-77
    nro_sequencial       INTEGER,
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_aoc_11_remessa ON stg_aoc_11(remessa_id);

-- -------------------------------------------------------------
-- stg_aoc_12 — Det. Alterações por Fonte de Recurso
-- Problema: tabela nunca foi criada; parser não conseguia
--   persistir registros do tipo 12 do arquivo AOC.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stg_aoc_12 (
    id                   SERIAL PRIMARY KEY,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id   INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha         INTEGER NOT NULL,
    linha_bruta          TEXT,
    tipo_registro        VARCHAR(2),
    cod_programa         VARCHAR(4),
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    cod_funcao           VARCHAR(2),
    cod_subfuncao        VARCHAR(3),
    natureza_acao        VARCHAR(1),
    nro_proj_ativ        VARCHAR(3),
    cod_natureza_despesa VARCHAR(6),   -- pos 20-25
    dt_alteracao         VARCHAR(8),   -- pos 26-33
    nr_alteracao         VARCHAR(3),   -- pos 34-36
    tipo_alteracao       VARCHAR(2),   -- pos 37-38
    cod_fonte_recurso    VARCHAR(3),   -- pos 39-41
    vl_alteracao_fonte   VARCHAR(13),  -- pos 42-54
    vl_saldo_ant_fonte   VARCHAR(13),  -- pos 55-67
    vl_saldo_atual_fonte VARCHAR(13),  -- pos 68-80
    nro_sequencial       INTEGER,
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_aoc_12_remessa ON stg_aoc_12(remessa_id);
