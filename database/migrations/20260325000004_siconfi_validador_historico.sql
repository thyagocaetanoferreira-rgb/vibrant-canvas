-- Histórico de execuções do Validador SICONFI (RREO, RGF, DCA, MSC, etc.)
CREATE TABLE IF NOT EXISTS siconfi_validador_historico (
  id               BIGSERIAL    PRIMARY KEY,
  municipio_id     BIGINT       NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,
  usuario_id       UUID         REFERENCES usuarios(id),
  tipo_analise     VARCHAR(60)  NOT NULL,   -- ex: 'RREO', 'RGF', 'RREO x RGF'
  ano_exercicio    INTEGER      NOT NULL,
  total_analisadas INTEGER      NOT NULL DEFAULT 0,
  consistentes     INTEGER      NOT NULL DEFAULT 0,
  inconsistentes   INTEGER      NOT NULL DEFAULT 0,
  avisos           INTEGER      NOT NULL DEFAULT 0,
  status_geral     VARCHAR(20)  NOT NULL,   -- 'regular' | 'alerta' | 'irregular'
  resultado_json   JSONB,
  executado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_val_hist_municipio ON siconfi_validador_historico (municipio_id);
CREATE INDEX idx_val_hist_executado ON siconfi_validador_historico (executado_em DESC);
