-- Amplia a tabela audit_log existente com os novos campos de rastreabilidade.
-- Os campos originais (id, usuario_id, cliente_id, acao, detalhes, criado_em) são preservados.

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS modulo       VARCHAR(40),
  ADD COLUMN IF NOT EXISTS municipio_id INTEGER REFERENCES municipios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exercicio    SMALLINT,
  ADD COLUMN IF NOT EXISTS entidade     VARCHAR(40),
  ADD COLUMN IF NOT EXISTS entidade_id  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ip           INET,
  ADD COLUMN IF NOT EXISTS user_agent   TEXT,
  ADD COLUMN IF NOT EXISTS request_id   VARCHAR(40);

-- Índices para consultas de suporte e auditoria
CREATE INDEX IF NOT EXISTS idx_audit_usuario_date   ON audit_log(usuario_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_municipio_date ON audit_log(municipio_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_acao           ON audit_log(acao, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_modulo         ON audit_log(modulo, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_criado_em      ON audit_log(criado_em DESC);

COMMENT ON TABLE  audit_log                IS 'Rastreabilidade de ações de negócio — separado de log técnico';
COMMENT ON COLUMN audit_log.acao          IS 'Snake_case: login, executar_validacao, importar_rreo, exportar_pdf';
COMMENT ON COLUMN audit_log.modulo        IS 'Módulo do sistema: auth, simulador, siconfi, tcmgo, usuarios';
COMMENT ON COLUMN audit_log.detalhes      IS 'Payload JSON para contexto adicional da ação';
COMMENT ON COLUMN audit_log.request_id    IS 'Correlação com log técnico do backend (x-request-id header)';
