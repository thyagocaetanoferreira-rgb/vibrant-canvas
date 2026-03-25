-- ============================================================
-- SICONFI RREO Pipeline — Etapa 1: tabelas de importação via API
-- ============================================================

-- 1. Extrato de entregas (manifesto por município/ano/período)
CREATE TABLE IF NOT EXISTS siconfi_extrato_entregas (
  id                BIGSERIAL PRIMARY KEY,
  municipio_id      BIGINT        NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,
  co_ibge           TEXT          NOT NULL,
  an_exercicio      INT           NOT NULL,
  nr_periodo        INT,                          -- 1-6 para RREO bimestral
  tp_declaracao     TEXT          NOT NULL,        -- 'RREO', 'RGF', 'DCA', 'MSC'…
  dt_inicio         DATE,
  dt_fim            DATE,
  dt_prazo          DATE,
  dt_envio          TIMESTAMPTZ,                  -- NULL = ainda não entregue
  in_retificacao    BOOLEAN       DEFAULT FALSE,
  sincronizado_em   TIMESTAMPTZ   DEFAULT now(),
  CONSTRAINT uq_extrato_entrega UNIQUE (co_ibge, an_exercicio, nr_periodo, tp_declaracao)
);

CREATE INDEX IF NOT EXISTS idx_extrato_municipio ON siconfi_extrato_entregas (municipio_id);
CREATE INDEX IF NOT EXISTS idx_extrato_ibge_ano  ON siconfi_extrato_entregas (co_ibge, an_exercicio);

-- 2. Dados RREO (linhas do relatório — cada conta por período)
CREATE TABLE IF NOT EXISTS siconfi_rreo (
  id                BIGSERIAL PRIMARY KEY,
  municipio_id      BIGINT        NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,
  co_ibge           TEXT          NOT NULL,
  an_exercicio      INT           NOT NULL,
  nr_periodo        INT           NOT NULL,        -- 1-6
  tp_demonstrativo  TEXT,                          -- ex: 'RREO-Municípios'
  co_esfera         TEXT,                          -- M, E, U…
  co_poder          TEXT,                          -- E, L, J
  co_tipo_valor     TEXT,                          -- tipo da coluna de valor
  co_conta          TEXT          NOT NULL,
  no_conta          TEXT,
  vl_valor          NUMERIC(20,2),
  importado_em      TIMESTAMPTZ   DEFAULT now(),
  CONSTRAINT uq_rreo_linha UNIQUE (
    co_ibge, an_exercicio, nr_periodo,
    tp_demonstrativo, co_esfera, co_poder,
    co_tipo_valor, co_conta
  )
);

CREATE INDEX IF NOT EXISTS idx_rreo_municipio    ON siconfi_rreo (municipio_id);
CREATE INDEX IF NOT EXISTS idx_rreo_ibge_periodo ON siconfi_rreo (co_ibge, an_exercicio, nr_periodo);
CREATE INDEX IF NOT EXISTS idx_rreo_conta        ON siconfi_rreo (co_conta);

-- 3. Log de jobs de importação por município
CREATE TABLE IF NOT EXISTS siconfi_import_jobs (
  id                  BIGSERIAL PRIMARY KEY,
  municipio_id        BIGINT    NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,
  an_exercicio        INT       NOT NULL,
  tp_declaracao       TEXT      NOT NULL,          -- 'RREO'
  status              TEXT      NOT NULL           -- 'em_andamento', 'concluido', 'erro'
                      CHECK (status IN ('em_andamento','concluido','erro')),
  periodos_total      INT       DEFAULT 0,
  periodos_importados INT       DEFAULT 0,
  mensagem_erro       TEXT,
  iniciado_em         TIMESTAMPTZ DEFAULT now(),
  finalizado_em       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_municipio ON siconfi_import_jobs (municipio_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status    ON siconfi_import_jobs (status);
