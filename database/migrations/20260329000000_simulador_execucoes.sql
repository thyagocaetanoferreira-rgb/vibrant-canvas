-- ─────────────────────────────────────────────────────────────────────────────
-- Simulador Verus — persistência de execuções e resultados por regra
--
-- Substitui siconfi_validador_historico (que ficará em modo legado até a
-- migração do código estar completa e for removida em migração futura).
--
-- Duas tabelas:
--   simulador_execucoes  → uma linha por rodada completa (quem, quando, score)
--   simulador_resultados → uma linha por regra de cada rodada (detalhe técnico)
--
-- Dashboard e ranking leem apenas simulador_execucoes.
-- Tela técnica e PDF leem ambas via JOIN em execucao_id.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Execução da análise ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulador_execucoes (
  id                   BIGSERIAL    PRIMARY KEY,

  municipio_id         BIGINT       NOT NULL
                         REFERENCES municipios(id) ON DELETE CASCADE,

  exercicio            INTEGER      NOT NULL,

  -- 'RREO' | 'RGF' | 'MSC'
  tipo                 VARCHAR(10)  NOT NULL,

  -- 'executando' | 'concluida' | 'falhou'
  status               VARCHAR(20)  NOT NULL DEFAULT 'executando',

  -- Pontuação consolidada (preenchida ao concluir)
  nota_total           NUMERIC,
  nota_maxima          NUMERIC,
  percentual           NUMERIC,     -- nota_total / nota_maxima * 100

  -- Contadores por status de regra
  total_consistente    INTEGER      NOT NULL DEFAULT 0,
  total_inconsistente  INTEGER      NOT NULL DEFAULT 0,
  total_nao_aplicavel  INTEGER      NOT NULL DEFAULT 0,

  -- Auditoria
  executado_em         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  executado_por        UUID
                         REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices de leitura frequente
CREATE INDEX IF NOT EXISTS idx_sim_exec_municipio_exercicio
  ON simulador_execucoes (municipio_id, exercicio);

CREATE INDEX IF NOT EXISTS idx_sim_exec_municipio_tipo
  ON simulador_execucoes (municipio_id, tipo);

CREATE INDEX IF NOT EXISTS idx_sim_exec_executado_em
  ON simulador_execucoes (executado_em DESC);

-- ── 2. Resultado por regra ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulador_resultados (
  id                   BIGSERIAL    PRIMARY KEY,

  execucao_id          BIGINT       NOT NULL
                         REFERENCES simulador_execucoes(id) ON DELETE CASCADE,

  -- Código da regra. Ex: 'D3_00001'
  codigo_regra         VARCHAR(20)  NOT NULL,

  -- 'consistente' | 'inconsistente' | 'nao_aplicavel'
  status               VARCHAR(20)  NOT NULL,

  nota                 NUMERIC      NOT NULL,
  nota_max             NUMERIC      NOT NULL,

  -- Textos gerados pela regra no backend
  resumo               TEXT,
  motivo_falha         TEXT,
  sugestao_correcao    TEXT,
  observacoes_rodape   TEXT,

  -- Array de objetos com o detalhe linha a linha (tipagem própria de cada regra)
  detalhes             JSONB        NOT NULL DEFAULT '[]'::jsonb
);

-- Índices de leitura frequente
CREATE INDEX IF NOT EXISTS idx_sim_res_execucao
  ON simulador_resultados (execucao_id);

CREATE INDEX IF NOT EXISTS idx_sim_res_codigo_regra
  ON simulador_resultados (codigo_regra);

-- Índice para encontrar rapidamente regras inconsistentes de uma execução
CREATE INDEX IF NOT EXISTS idx_sim_res_status
  ON simulador_resultados (execucao_id, status)
  WHERE status = 'inconsistente';
