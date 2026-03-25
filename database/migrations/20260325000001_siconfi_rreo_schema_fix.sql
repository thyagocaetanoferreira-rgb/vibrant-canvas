-- ============================================================
-- Correção do schema siconfi_rreo para alinhar com API real
-- Campos renomeados e novos campos adicionados
-- ============================================================

-- Recria a tabela com o schema correto (ainda vazia, sem dados)
DROP TABLE IF EXISTS siconfi_rreo;

CREATE TABLE siconfi_rreo (
  id               BIGSERIAL PRIMARY KEY,
  municipio_id     BIGINT        NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,

  -- Identificação do ente
  cod_ibge         TEXT          NOT NULL,   -- cod_ibge da API
  uf               TEXT,                      -- UF do município
  instituicao      TEXT,                      -- nome do ente/órgão
  populacao        INT,

  -- Identificação do relatório
  exercicio        INT           NOT NULL,    -- an = ano de referência
  demonstrativo    TEXT          NOT NULL,    -- 'RREO' | 'RREO Simplificado'
  periodo          INT           NOT NULL,    -- bimestre 1–6
  periodicidade    TEXT,                      -- sempre 'B'

  -- Estrutura do anexo
  anexo            TEXT,                      -- 'RREO-Anexo 01', etc.
  rotulo           TEXT,                      -- identificador de sub-tabela
  coluna           TEXT,                      -- ex: 'PREVISÃO INICIAL'

  -- Conta contábil
  cod_conta        TEXT          NOT NULL,    -- codificação textual da linha
  conta            TEXT,                      -- rótulo legível da linha

  -- Valor
  valor            NUMERIC(20,2),

  importado_em     TIMESTAMPTZ   DEFAULT now(),

  CONSTRAINT uq_rreo_linha UNIQUE (
    cod_ibge, exercicio, periodo,
    demonstrativo, anexo, rotulo, coluna, cod_conta
  )
);

CREATE INDEX IF NOT EXISTS idx_rreo_municipio    ON siconfi_rreo (municipio_id);
CREATE INDEX IF NOT EXISTS idx_rreo_ibge_periodo ON siconfi_rreo (cod_ibge, exercicio, periodo);
CREATE INDEX IF NOT EXISTS idx_rreo_anexo        ON siconfi_rreo (anexo);
CREATE INDEX IF NOT EXISTS idx_rreo_cod_conta    ON siconfi_rreo (cod_conta);
