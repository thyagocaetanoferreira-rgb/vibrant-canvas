-- Tabela de verificações do SICONFI (CAPAG/STN)
-- 197 regras distribuídas em 4 dimensões: DI, DII, DIII, DIV
CREATE TABLE IF NOT EXISTS siconfi_verificacoes (
  id             SERIAL PRIMARY KEY,
  co_dimensao    CHAR(4)      NOT NULL,          -- DI | DII | DIII | DIV
  no_verificacao VARCHAR(20)  NOT NULL UNIQUE,   -- ex: D1_00001
  no_dimensao    TEXT         NOT NULL,          -- nome por extenso da dimensão
  no_aplicavel   TEXT,                           -- E/DF/M | E/DF | M
  no_desc        TEXT         NOT NULL,          -- título resumido da verificação
  no_declaracao  TEXT,                           -- demonstrativo(s) relacionado(s)
  no_anexo       TEXT,                           -- anexo ou tipo de verificação
  no_finalidade  TEXT,                           -- descrição detalhada
  capag          BOOLEAN NOT NULL DEFAULT FALSE  -- impacta nota CAPAG
);

COMMENT ON TABLE siconfi_verificacoes IS
  'Regras de verificação do SICONFI (STN) usadas na avaliação CAPAG e conformidade contábil/fiscal.';

COMMENT ON COLUMN siconfi_verificacoes.co_dimensao    IS 'Código da dimensão: DI=Gestão da Informação, DII=Contábil, DIII=Fiscal, DIV=Contábil×Fiscal';
COMMENT ON COLUMN siconfi_verificacoes.no_verificacao IS 'Código único da verificação, ex: D1_00001';
COMMENT ON COLUMN siconfi_verificacoes.no_aplicavel   IS 'Abrangência: E/DF/M=todos, E/DF=estados+DF, M=municípios';
COMMENT ON COLUMN siconfi_verificacoes.capag          IS 'TRUE se a verificação compõe a nota CAPAG';
