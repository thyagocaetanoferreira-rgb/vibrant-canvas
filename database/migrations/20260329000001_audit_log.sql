-- ─────────────────────────────────────────────────────────────────────────────
-- audit_log: rastreabilidade de ações de negócio
-- Separado de log técnico (stdout/Docker).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL    PRIMARY KEY,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  user_id      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  acao         VARCHAR(80)  NOT NULL,   -- 'login', 'executar_validacao', 'exportar_pdf'
  modulo       VARCHAR(40)  NOT NULL,   -- 'auth', 'simulador', 'siconfi', 'tcmgo'
  municipio_id INTEGER      REFERENCES municipios(id) ON DELETE SET NULL,
  exercicio    SMALLINT,
  entidade     VARCHAR(40),             -- 'remessa', 'arquivo', 'verificacao'
  entidade_id  VARCHAR(100),
  detalhes     JSONB,
  ip           INET,
  user_agent   TEXT,
  request_id   VARCHAR(40)
);

-- Índices para consultas típicas de suporte e auditoria
CREATE INDEX IF NOT EXISTS idx_audit_user_date      ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_municipio_date ON audit_log(municipio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_acao           ON audit_log(acao, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_modulo         ON audit_log(modulo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at     ON audit_log(created_at DESC);

COMMENT ON TABLE  audit_log              IS 'Rastreabilidade de ações de negócio — não misturar com log técnico';
COMMENT ON COLUMN audit_log.acao         IS 'Snake_case: login, executar_validacao, importar_rreo, exportar_pdf';
COMMENT ON COLUMN audit_log.modulo       IS 'Módulo do sistema: auth, simulador, siconfi, tcmgo, usuarios';
COMMENT ON COLUMN audit_log.detalhes     IS 'Payload livre em JSON para contexto adicional';
COMMENT ON COLUMN audit_log.request_id   IS 'Correlação com log técnico do backend (x-request-id header)';
