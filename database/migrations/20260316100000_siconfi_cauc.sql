-- Tabela CAUC com colunas nativas do relatório do Tesouro Transparente
-- Valores dos requisitos: '!' = irregular | 'DD/MM/YY' = regular (data de validade) | NULL = não avaliado

DROP TABLE IF EXISTS public.siconfi_cauc_situacao;
DROP TABLE IF EXISTS public.siconfi_sync_log;

CREATE TABLE public.siconfi_cauc_situacao (
  id             SERIAL PRIMARY KEY,

  -- Identificação do ente
  uf             CHAR(2)  NOT NULL,
  nome_ente      TEXT     NOT NULL,
  codigo_ibge    BIGINT   UNIQUE,
  codigo_siafi   TEXT,
  regiao         CHAR(2),
  populacao      INTEGER,

  -- Situação global calculada na importação
  -- 'Regular' = nenhum requisito com '!', 'Irregular' = ao menos um '!'
  situacao_global TEXT,

  -- Grupo 1 — Regularidade Fiscal e Cadastral
  req_1_1  TEXT,   -- 1.1  Regularidade cadastral (CNPJ)
  req_1_2  TEXT,   -- 1.2  Regularidade fiscal federal (Receita Federal)
  req_1_3  TEXT,   -- 1.3  Regularidade previdenciária (INSS/RPPS)
  req_1_4  TEXT,   -- 1.4  Regularidade trabalhista (FGTS/CADIN)
  req_1_5  TEXT,   -- 1.5  Regularidade junto ao TCE/TCM/TCU

  -- Grupo 2 — Adimplência com União
  req_2_1_1 TEXT,  -- 2.1.1 Dívida ativa da União
  req_2_1_2 TEXT,  -- 2.1.2 Parcelamentos perante a PGFN

  -- Grupo 3 — LRF e prestação de contas
  req_3_1_1 TEXT,  -- 3.1.1 Limites da LRF - despesa com pessoal (Executivo)
  req_3_1_2 TEXT,  -- 3.1.2 Limites da LRF - despesa com pessoal (Legislativo)
  req_3_2_1 TEXT,  -- 3.2.1 Operações de crédito
  req_3_2_2 TEXT,  -- 3.2.2 Concessão de garantias
  req_3_2_3 TEXT,  -- 3.2.3 Restos a pagar
  req_3_2_4 TEXT,  -- 3.2.4 Dívida consolidada líquida
  req_3_3   TEXT,  -- 3.3   RREO e RGF
  req_3_4_1 TEXT,  -- 3.4.1 Prestação de contas ao TCE/TCM
  req_3_4_2 TEXT,  -- 3.4.2 Prestação de contas ao TCU
  req_3_5   TEXT,  -- 3.5   Aplicação em saúde (SIOPS)
  req_3_6   TEXT,  -- 3.6   Aplicação em educação (SIOPE)
  req_3_7   TEXT,  -- 3.7   Alimentação escolar (PNAE)

  -- Grupo 4 — CAUC Habitação
  req_4_1  TEXT,   -- 4.1   Adesão ao SNHIS
  req_4_2  TEXT,   -- 4.2   Fundo municipal de habitação

  -- Grupo 5 — Outros requisitos
  req_5_1  TEXT,   -- 5.1
  req_5_2  TEXT,   -- 5.2
  req_5_3  TEXT,   -- 5.3
  req_5_4  TEXT,   -- 5.4
  req_5_5  TEXT,   -- 5.5
  req_5_6  TEXT,   -- 5.6
  req_5_7  TEXT,   -- 5.7

  importado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cauc_ibge      ON public.siconfi_cauc_situacao (codigo_ibge);
CREATE INDEX idx_cauc_uf        ON public.siconfi_cauc_situacao (uf);
CREATE INDEX idx_cauc_situacao  ON public.siconfi_cauc_situacao (situacao_global);

-- Log de sincronizações SICONFI
CREATE TABLE public.siconfi_sync_log (
  id              SERIAL PRIMARY KEY,
  status          TEXT NOT NULL DEFAULT 'em_andamento',
  total_registros INTEGER DEFAULT 0,
  mensagem_erro   TEXT,
  iniciado_em     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finalizado_em   TIMESTAMP WITH TIME ZONE
);
