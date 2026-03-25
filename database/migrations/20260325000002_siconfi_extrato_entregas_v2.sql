-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Recria siconfi_extrato_entregas com schema alinhado à API real
--
-- Endpoint: GET /extrato_entregas?id_ente=&an_referencia=
-- Retorna: relatórios homologados/retificados e matrizes entregues (RREO, RGF,
--          DCA, MSC, etc.)
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop da tabela antiga (schema incompatível; estava vazia)
DROP TABLE IF EXISTS siconfi_extrato_entregas CASCADE;

-- Nova tabela com schema alinhado à resposta da API
CREATE TABLE siconfi_extrato_entregas (
  id               BIGSERIAL PRIMARY KEY,

  -- Vínculo interno
  municipio_id     BIGINT NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,

  -- Campos da API
  cod_ibge         TEXT    NOT NULL,          -- id_ente (IBGE)
  exercicio        INT     NOT NULL,          -- an_referencia

  populacao        INT,                       -- estimativa de habitantes
  instituicao      TEXT,                      -- órgão responsável

  entregavel       TEXT    NOT NULL,          -- tipo: RREO, RGF, DCA, MSC, etc.
  periodo          INT     NOT NULL,          -- período de referência (1-12 conforme periodicidade)
  periodicidade    CHAR(1),                   -- M=mensal B=bimestral Q=quadrimestral S=semestral A=anual

  status_relatorio CHAR(2),                   -- HO=homologado RE=retificado
  data_status      TIMESTAMPTZ,              -- data da homologação/retificação/entrega

  forma_envio      TEXT,                      -- P I M F XML CSV
  tipo_relatorio   CHAR(1),                   -- P=padrão S=simplificado (RREO/RGF mun.<50k hab.)

  sincronizado_em  TIMESTAMPTZ DEFAULT now(),

  -- Unicidade: um status por entregável + período
  -- (se vier HO e depois RE, ambos ficam registrados)
  CONSTRAINT uq_extrato_entrega UNIQUE (cod_ibge, exercicio, entregavel, periodo, status_relatorio)
);

CREATE INDEX idx_extrato_municipio  ON siconfi_extrato_entregas (municipio_id);
CREATE INDEX idx_extrato_ibge_ano   ON siconfi_extrato_entregas (cod_ibge, exercicio);
CREATE INDEX idx_extrato_entregavel ON siconfi_extrato_entregas (entregavel, periodo);

COMMENT ON TABLE siconfi_extrato_entregas IS
  'Extrato de entregas SICONFI (relatórios homologados/retificados e matrizes). '
  'Fonte: GET /extrato_entregas?id_ente=&an_referencia=';

COMMENT ON COLUMN siconfi_extrato_entregas.entregavel      IS 'Ex: RREO, RGF, Balanço Anual (DCA), MSC';
COMMENT ON COLUMN siconfi_extrato_entregas.periodicidade   IS 'M=mensal B=bimestral Q=quadrimestral S=semestral A=anual';
COMMENT ON COLUMN siconfi_extrato_entregas.status_relatorio IS 'HO=homologado RE=retificado';
COMMENT ON COLUMN siconfi_extrato_entregas.forma_envio     IS 'Relatórios: P I M F  |  Matrizes: XML CSV';
COMMENT ON COLUMN siconfi_extrato_entregas.tipo_relatorio  IS 'P=padrão S=simplificado (RREO/RGF para mun.<50k hab.)';
