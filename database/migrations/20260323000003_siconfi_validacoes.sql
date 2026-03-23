-- Histórico de validações MSC do Validador SICONFI
CREATE TABLE IF NOT EXISTS siconfi_validacoes (
  id             BIGSERIAL    PRIMARY KEY,
  municipio_id   BIGINT       NOT NULL REFERENCES municipios(id),
  usuario_id     UUID         REFERENCES usuarios(id),
  tipo_msc       VARCHAR(30)  NOT NULL,        -- 'agregada' | 'encerramento'
  arquivo_nome   VARCHAR(255),
  ano_exercicio  INTEGER,
  total          INTEGER      NOT NULL DEFAULT 0,
  ok             INTEGER      NOT NULL DEFAULT 0,
  avisos         INTEGER      NOT NULL DEFAULT 0,
  erros          INTEGER      NOT NULL DEFAULT 0,
  status_geral   VARCHAR(30)  NOT NULL,        -- 'regular' | 'warning' | 'irregular'
  resultado_json JSONB,
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siconfi_validacoes_municipio ON siconfi_validacoes(municipio_id);
CREATE INDEX IF NOT EXISTS idx_siconfi_validacoes_criado    ON siconfi_validacoes(criado_em DESC);
