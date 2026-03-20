-- =============================================================
-- TCM-GO: Criação das tabelas fato_* (Parte 2/2)
-- Gerado em: 2026-03-20
-- Baseado em: server/src/lib/tcmgoLayouts.ts
-- =============================================================

BEGIN;

-- =============================================================
-- ALQ.10 → fato_anulacao_liquidacao
-- =============================================================
CREATE TABLE fato_anulacao_liquidacao (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ALQ.10
    cod_programa         VARCHAR(4),
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    cod_funcao           VARCHAR(2),
    cod_subfuncao        VARCHAR(3),
    natureza_acao        VARCHAR(1),
    nro_proj_ativ        VARCHAR(3),
    elemento_despesa     VARCHAR(6),
    sub_elemento         VARCHAR(2),
    dot_orig_p2001       VARCHAR(21),
    nro_empenho          VARCHAR(20),
    dt_empenho           DATE,
    nr_liquidacao        VARCHAR(6),
    dt_liquidacao        DATE,
    nr_liquidacao_anl    VARCHAR(6),
    dt_anulacao_liq      DATE,
    tp_liquidacao        VARCHAR(1),
    vl_liquidado         NUMERIC(15,2),
    vl_anulado           NUMERIC(15,2)
);

-- =============================================================
-- ALQ.11 → fato_anulacao_liquidacao_deducao
-- =============================================================
CREATE TABLE fato_anulacao_liquidacao_deducao (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ALQ.11
    cod_programa         VARCHAR(4),
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    cod_funcao           VARCHAR(2),
    cod_subfuncao        VARCHAR(3),
    natureza_acao        VARCHAR(1),
    nro_proj_ativ        VARCHAR(3),
    elemento_despesa     VARCHAR(6),
    sub_elemento         VARCHAR(2),
    dot_orig_p2001       VARCHAR(21),
    nro_empenho          VARCHAR(20),
    dt_empenho           DATE,
    nr_liquidacao        VARCHAR(6),
    dt_liquidacao        DATE,
    nr_liquidacao_anl    VARCHAR(6),
    dt_anulacao_liq      DATE,
    cod_fonte_recurso    VARCHAR(6),
    vl_liquidado_fr      NUMERIC(15,2),
    vl_anulado_fr        NUMERIC(15,2)
);

-- =============================================================
-- ALQ.12 → fato_anulacao_liquidacao_credor  (documento fiscal anulado)
-- =============================================================
CREATE TABLE fato_anulacao_liquidacao_credor (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ALQ.12
    cod_programa         VARCHAR(4),
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    cod_funcao           VARCHAR(2),
    cod_subfuncao        VARCHAR(3),
    natureza_acao        VARCHAR(1),
    nro_proj_ativ        VARCHAR(3),
    elemento_despesa     VARCHAR(6),
    sub_elemento         VARCHAR(2),
    dot_orig_p2001       VARCHAR(21),
    nro_empenho          VARCHAR(20),
    dt_empenho           DATE,
    nr_liquidacao        VARCHAR(6),
    dt_liquidacao        DATE,
    nr_liquidacao_anl    VARCHAR(6),
    dt_anulacao_liq      DATE,
    tipo_doc_fiscal      VARCHAR(2),
    nro_doc_fiscal       VARCHAR(10),
    serie_doc_fiscal     VARCHAR(8),
    dt_doc_fiscal        DATE,
    vl_anulado           NUMERIC(15,2),
    cnpj_cpf_credor      VARCHAR(14),
    tipo_credor          VARCHAR(1),
    nr_insc_estadual     VARCHAR(15),
    nr_insc_municipal    VARCHAR(15),
    cep_municipio        VARCHAR(8),
    uf_credor            VARCHAR(2),
    nome_credor          VARCHAR(50)
);

-- =============================================================
-- OPS.10 → fato_pagamento
-- =============================================================
CREATE TABLE fato_pagamento (
    id                     SERIAL PRIMARY KEY,
    municipio_id           INTEGER NOT NULL,
    orgao_id               INTEGER,
    ano_referencia         SMALLINT NOT NULL,
    mes_referencia         SMALLINT NOT NULL,
    remessa_id             INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout OPS.10
    cod_programa           VARCHAR(4),
    cod_orgao              VARCHAR(2),
    cod_unidade            VARCHAR(2),
    cod_funcao             VARCHAR(2),
    cod_subfuncao          VARCHAR(3),
    natureza_acao          VARCHAR(1),
    nro_proj_ativ          VARCHAR(3),
    elemento_despesa       VARCHAR(6),
    sub_elemento           VARCHAR(2),
    dot_orig_p2001         VARCHAR(21),
    nro_empenho            VARCHAR(20),
    nro_op                 VARCHAR(20),
    tipo_op                VARCHAR(1),
    dt_inscricao           DATE,
    dt_emissao             DATE,
    vl_op                  NUMERIC(15,2),
    nome_credor            VARCHAR(50),
    tipo_credor            VARCHAR(1),
    cpf_cnpj               VARCHAR(14),
    especificacao_op       TEXT,       -- 200 chars
    cpf_resp_op            VARCHAR(11),
    nome_resp_op           VARCHAR(50),
    nr_extra_orcamentaria  VARCHAR(6),
    id_colare              VARCHAR(15)
);

-- =============================================================
-- OPS.11 → fato_pagamento_banco  (liquidação vinculada à OP)
-- =============================================================
CREATE TABLE fato_pagamento_banco (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout OPS.11
    cod_programa          VARCHAR(4),
    cod_orgao             VARCHAR(2),
    cod_unidade           VARCHAR(2),
    cod_funcao            VARCHAR(2),
    cod_subfuncao         VARCHAR(3),
    natureza_acao         VARCHAR(1),
    nro_proj_ativ         VARCHAR(3),
    elemento_despesa      VARCHAR(6),
    sub_elemento          VARCHAR(2),
    dot_orig_p2001        VARCHAR(21),
    nro_empenho           VARCHAR(20),
    nro_op                VARCHAR(20),
    nr_liquidacao         VARCHAR(6),
    dt_liquidacao         DATE,
    vl_liquidacao         NUMERIC(15,2),
    vl_op_vinculado_liq   NUMERIC(15,2)
);

-- =============================================================
-- OPS.12 → fato_pagamento_documento  (conta bancária de débito)
-- =============================================================
CREATE TABLE fato_pagamento_documento (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout OPS.12
    cod_programa        VARCHAR(4),
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    cod_funcao          VARCHAR(2),
    cod_subfuncao       VARCHAR(3),
    natureza_acao       VARCHAR(1),
    nro_proj_ativ       VARCHAR(3),
    elemento_despesa    VARCHAR(6),
    sub_elemento        VARCHAR(2),
    dot_orig_p2001      VARCHAR(21),
    nro_empenho         VARCHAR(20),
    nro_op              VARCHAR(20),
    cod_und_financeira  VARCHAR(2),
    banco               VARCHAR(3),
    agencia             VARCHAR(4),
    conta_corrente      VARCHAR(12),
    conta_corrente_dv   VARCHAR(1),
    tipo_conta          VARCHAR(2),
    nr_documento        VARCHAR(15),
    tipo_documento      VARCHAR(2),
    vl_documento        NUMERIC(15,2),
    dt_emissao          DATE,
    vl_associado        NUMERIC(15,2)
);

-- =============================================================
-- OPS.13 → fato_pagamento_fonte  (fonte de recurso da conta bancária)
-- =============================================================
CREATE TABLE fato_pagamento_fonte (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout OPS.13
    cod_programa        VARCHAR(4),
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    cod_funcao          VARCHAR(2),
    cod_subfuncao       VARCHAR(3),
    natureza_acao       VARCHAR(1),
    nro_proj_ativ       VARCHAR(3),
    elemento_despesa    VARCHAR(6),
    sub_elemento        VARCHAR(2),
    dot_orig_p2001      VARCHAR(21),
    nro_empenho         VARCHAR(20),
    nro_op              VARCHAR(20),
    cod_und_financeira  VARCHAR(2),
    banco               VARCHAR(3),
    agencia             VARCHAR(4),
    conta_corrente      VARCHAR(12),
    conta_corrente_dv   VARCHAR(1),
    tipo_conta          VARCHAR(2),
    nr_documento        VARCHAR(15),
    cod_fonte_recurso   VARCHAR(6),
    vl_fr               NUMERIC(15,2)
);

-- =============================================================
-- OPS.14 → fato_pagamento_deducao  (retenção vinculada à OP)
-- =============================================================
CREATE TABLE fato_pagamento_deducao (
    id                     SERIAL PRIMARY KEY,
    municipio_id           INTEGER NOT NULL,
    orgao_id               INTEGER,
    ano_referencia         SMALLINT NOT NULL,
    mes_referencia         SMALLINT NOT NULL,
    remessa_id             INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout OPS.14
    cod_programa           VARCHAR(4),
    cod_orgao              VARCHAR(2),
    cod_unidade            VARCHAR(2),
    cod_funcao             VARCHAR(2),
    cod_subfuncao          VARCHAR(3),
    natureza_acao          VARCHAR(1),
    nro_proj_ativ          VARCHAR(3),
    elemento_despesa       VARCHAR(6),
    sub_elemento           VARCHAR(2),
    dot_orig_p2001         VARCHAR(21),
    nro_empenho            VARCHAR(20),
    nro_op                 VARCHAR(20),
    tipo_retencao          VARCHAR(2),
    nr_extra_orcamentaria  VARCHAR(6),
    descricao_retencao     VARCHAR(50),
    vl_retencao            NUMERIC(15,2)
);

-- =============================================================
-- AOP.10 → fato_anulacao_pagamento
-- =============================================================
CREATE TABLE fato_anulacao_pagamento (
    id                     SERIAL PRIMARY KEY,
    municipio_id           INTEGER NOT NULL,
    orgao_id               INTEGER,
    ano_referencia         SMALLINT NOT NULL,
    mes_referencia         SMALLINT NOT NULL,
    remessa_id             INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AOP.10
    cod_programa           VARCHAR(4),
    cod_orgao              VARCHAR(2),
    cod_unidade            VARCHAR(2),
    cod_funcao             VARCHAR(2),
    cod_subfuncao          VARCHAR(3),
    natureza_acao          VARCHAR(1),
    nro_proj_ativ          VARCHAR(3),
    elemento_despesa       VARCHAR(6),
    sub_elemento           VARCHAR(2),
    dot_orig_p2001         VARCHAR(21),
    nro_empenho            VARCHAR(20),
    nro_op                 VARCHAR(20),
    dt_anulacao            DATE,
    nr_anulacao_op         VARCHAR(3),
    tipo_op                VARCHAR(1),
    dt_inscricao           DATE,
    dt_emissao             DATE,
    vl_op                  NUMERIC(15,2),
    vl_anulado_op          NUMERIC(15,2),
    nome_credor            VARCHAR(50),
    tipo_credor            VARCHAR(1),
    cpf_cnpj               VARCHAR(14),
    especificacao_op       TEXT,       -- 200 chars
    nr_extra_orcamentaria  VARCHAR(6)
);

-- =============================================================
-- AOP.11 → fato_anulacao_pagamento_banco
-- =============================================================
CREATE TABLE fato_anulacao_pagamento_banco (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AOP.11
    cod_programa        VARCHAR(4),
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    cod_funcao          VARCHAR(2),
    cod_subfuncao       VARCHAR(3),
    natureza_acao       VARCHAR(1),
    nro_proj_ativ       VARCHAR(3),
    elemento_despesa    VARCHAR(6),
    sub_elemento        VARCHAR(2),
    dot_orig_p2001      VARCHAR(21),
    nro_empenho         VARCHAR(20),
    nro_op              VARCHAR(20),
    dt_anulacao         DATE,
    nr_anulacao_op      VARCHAR(3),
    nr_liquidacao       VARCHAR(6),
    dt_liquidacao       DATE,
    vl_anulacao         NUMERIC(15,2)
);

-- =============================================================
-- AOP.12 → fato_anulacao_pagamento_documento
-- =============================================================
CREATE TABLE fato_anulacao_pagamento_documento (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AOP.12
    cod_programa        VARCHAR(4),
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    cod_funcao          VARCHAR(2),
    cod_subfuncao       VARCHAR(3),
    natureza_acao       VARCHAR(1),
    nro_proj_ativ       VARCHAR(3),
    elemento_despesa    VARCHAR(6),
    sub_elemento        VARCHAR(2),
    dot_orig_p2001      VARCHAR(21),
    nro_empenho         VARCHAR(20),
    nro_op              VARCHAR(20),
    dt_anulacao         DATE,
    nr_anulacao_op      VARCHAR(3),
    cod_und_financeira  VARCHAR(2),
    banco               VARCHAR(3),
    agencia             VARCHAR(4),
    conta_corrente      VARCHAR(12),
    conta_corrente_dv   VARCHAR(1),
    tipo_conta          VARCHAR(2),
    nr_documento        VARCHAR(15),
    tipo_documento      VARCHAR(2),
    vl_documento        NUMERIC(15,2),
    dt_emissao          DATE,
    vl_anulacao         NUMERIC(15,2)
);

-- =============================================================
-- AOP.13 → fato_anulacao_pagamento_fonte
-- =============================================================
CREATE TABLE fato_anulacao_pagamento_fonte (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AOP.13
    cod_programa        VARCHAR(4),
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    cod_funcao          VARCHAR(2),
    cod_subfuncao       VARCHAR(3),
    natureza_acao       VARCHAR(1),
    nro_proj_ativ       VARCHAR(3),
    elemento_despesa    VARCHAR(6),
    sub_elemento        VARCHAR(2),
    dot_orig_p2001      VARCHAR(21),
    nro_empenho         VARCHAR(20),
    nro_op              VARCHAR(20),
    dt_anulacao         DATE,
    nr_anulacao_op      VARCHAR(3),
    cod_und_financeira  VARCHAR(2),
    banco               VARCHAR(3),
    agencia             VARCHAR(4),
    conta_corrente      VARCHAR(12),
    conta_corrente_dv   VARCHAR(1),
    tipo_conta          VARCHAR(2),
    nr_documento        VARCHAR(15),
    cod_fonte_recurso   VARCHAR(6),
    vl_anulacao_fr      NUMERIC(15,2)
);

-- =============================================================
-- AOP.14 → fato_anulacao_pagamento_deducao
-- =============================================================
CREATE TABLE fato_anulacao_pagamento_deducao (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL,
    orgao_id                INTEGER,
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AOP.14
    cod_programa            VARCHAR(4),
    cod_orgao               VARCHAR(2),
    cod_unidade             VARCHAR(2),
    cod_funcao              VARCHAR(2),
    cod_subfuncao           VARCHAR(3),
    natureza_acao           VARCHAR(1),
    nro_proj_ativ           VARCHAR(3),
    elemento_despesa        VARCHAR(6),
    sub_elemento            VARCHAR(2),
    dot_orig_p2001          VARCHAR(21),
    nro_empenho             VARCHAR(20),
    nro_op                  VARCHAR(20),
    dt_anulacao             DATE,
    nr_anulacao_op          VARCHAR(3),
    tipo_retencao           VARCHAR(2),
    vl_anulacao_retencao    NUMERIC(15,2),
    nr_extra_orcamentaria   VARCHAR(6)
);

-- =============================================================
-- EXT.10 → fato_extraorcamentario
-- =============================================================
CREATE TABLE fato_extraorcamentario (
    id                     SERIAL PRIMARY KEY,
    municipio_id           INTEGER NOT NULL,
    orgao_id               INTEGER,
    ano_referencia         SMALLINT NOT NULL,
    mes_referencia         SMALLINT NOT NULL,
    remessa_id             INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout EXT.10
    cod_orgao              VARCHAR(2),
    cod_unidade            VARCHAR(2),
    categoria              VARCHAR(1),
    tipo_lancamento        VARCHAR(2),
    sub_tipo               VARCHAR(3),
    desdobra_sub_tipo      VARCHAR(3),
    nr_extra_orcamentaria  VARCHAR(6),
    desc_extra_orc         VARCHAR(50),
    vl_lancamento          NUMERIC(15,2)
);

-- =============================================================
-- EXT.11 → fato_extraorcamentario_deducao  (movimentação financeira)
-- =============================================================
CREATE TABLE fato_extraorcamentario_deducao (
    id                     SERIAL PRIMARY KEY,
    municipio_id           INTEGER NOT NULL,
    orgao_id               INTEGER,
    ano_referencia         SMALLINT NOT NULL,
    mes_referencia         SMALLINT NOT NULL,
    remessa_id             INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout EXT.11
    cod_orgao              VARCHAR(2),
    cod_unidade            VARCHAR(2),
    categoria              VARCHAR(1),
    tipo_lancamento        VARCHAR(2),
    sub_tipo               VARCHAR(3),
    desdobra_sub_tipo      VARCHAR(3),
    nr_extra_orcamentaria  VARCHAR(6),
    cod_und_financeira     VARCHAR(2),
    banco                  VARCHAR(3),
    agencia                VARCHAR(4),
    conta_corrente         VARCHAR(12),
    conta_corrente_dv      VARCHAR(1),
    tipo_conta             VARCHAR(2),
    vl_movimentacao        NUMERIC(15,2)
);

-- =============================================================
-- EXT.12 → fato_extraorcamentario_fonte
-- =============================================================
CREATE TABLE fato_extraorcamentario_fonte (
    id                     SERIAL PRIMARY KEY,
    municipio_id           INTEGER NOT NULL,
    orgao_id               INTEGER,
    ano_referencia         SMALLINT NOT NULL,
    mes_referencia         SMALLINT NOT NULL,
    remessa_id             INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout EXT.12
    cod_orgao              VARCHAR(2),
    cod_unidade            VARCHAR(2),
    categoria              VARCHAR(1),
    tipo_lancamento        VARCHAR(2),
    sub_tipo               VARCHAR(3),
    desdobra_sub_tipo      VARCHAR(3),
    nr_extra_orcamentaria  VARCHAR(6),
    cod_und_financeira     VARCHAR(2),
    banco                  VARCHAR(3),
    agencia                VARCHAR(4),
    conta_corrente         VARCHAR(12),
    conta_corrente_dv      VARCHAR(1),
    tipo_conta             VARCHAR(2),
    cod_fonte_recurso      VARCHAR(6),
    vl_fr                  NUMERIC(15,2)
);

-- =============================================================
-- AEX.10 → fato_anulacao_extraorcamentario
-- =============================================================
CREATE TABLE fato_anulacao_extraorcamentario (
    id                     SERIAL PRIMARY KEY,
    municipio_id           INTEGER NOT NULL,
    orgao_id               INTEGER,
    ano_referencia         SMALLINT NOT NULL,
    mes_referencia         SMALLINT NOT NULL,
    remessa_id             INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AEX.10
    cod_orgao              VARCHAR(2),
    cod_unidade            VARCHAR(2),
    categoria              VARCHAR(1),
    tipo_lancamento        VARCHAR(2),
    sub_tipo               VARCHAR(3),
    desdobra_sub_tipo      VARCHAR(3),
    nr_extra_orcamentaria  VARCHAR(6),
    dt_anulacao            DATE,
    vl_anulacao            NUMERIC(15,2)
);

-- =============================================================
-- AEX.11 → fato_anulacao_extraorcamentario_deducao
-- =============================================================
CREATE TABLE fato_anulacao_extraorcamentario_deducao (
    id                        SERIAL PRIMARY KEY,
    municipio_id              INTEGER NOT NULL,
    orgao_id                  INTEGER,
    ano_referencia            SMALLINT NOT NULL,
    mes_referencia            SMALLINT NOT NULL,
    remessa_id                INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AEX.11
    cod_orgao                 VARCHAR(2),
    cod_unidade               VARCHAR(2),
    categoria                 VARCHAR(1),
    tipo_lancamento           VARCHAR(2),
    sub_tipo                  VARCHAR(3),
    desdobra_sub_tipo         VARCHAR(3),
    nr_extra_orcamentaria     VARCHAR(6),
    dt_anulacao               DATE,
    cod_und_financeira        VARCHAR(2),
    banco                     VARCHAR(3),
    agencia                   VARCHAR(4),
    conta_corrente            VARCHAR(12),
    conta_corrente_dv         VARCHAR(1),
    tipo_conta                VARCHAR(2),
    vl_anulacao_movimentacao  NUMERIC(15,2)
);

-- =============================================================
-- AEX.12 → fato_anulacao_extraorcamentario_fonte
-- =============================================================
CREATE TABLE fato_anulacao_extraorcamentario_fonte (
    id                     SERIAL PRIMARY KEY,
    municipio_id           INTEGER NOT NULL,
    orgao_id               INTEGER,
    ano_referencia         SMALLINT NOT NULL,
    mes_referencia         SMALLINT NOT NULL,
    remessa_id             INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AEX.12
    cod_orgao              VARCHAR(2),
    cod_unidade            VARCHAR(2),
    categoria              VARCHAR(1),
    tipo_lancamento        VARCHAR(2),
    sub_tipo               VARCHAR(3),
    desdobra_sub_tipo      VARCHAR(3),
    nr_extra_orcamentaria  VARCHAR(6),
    dt_anulacao            DATE,
    cod_und_financeira     VARCHAR(2),
    banco                  VARCHAR(3),
    agencia                VARCHAR(4),
    conta_corrente         VARCHAR(12),
    conta_corrente_dv      VARCHAR(1),
    tipo_conta             VARCHAR(2),
    cod_fonte_recurso      VARCHAR(6),
    vl_anulacao_fr         NUMERIC(15,2)
);

-- =============================================================
-- RSP.10 → fato_restos_pagar
-- =============================================================
CREATE TABLE fato_restos_pagar (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout RSP.10
    cod_orgao         VARCHAR(2),
    dot_orig_p2001    VARCHAR(21),
    dot_orig_p2002    VARCHAR(23),
    nro_empenho       VARCHAR(20),
    dt_empenho        DATE,
    nome_credor       VARCHAR(50),
    vl_original       NUMERIC(15,2),
    vl_saldo_ant      NUMERIC(15,2),
    vl_baixa_pgto     NUMERIC(15,2)
);

-- =============================================================
-- RSP.11 → fato_restos_pagar_liquidacao  (cancelamento)
-- =============================================================
CREATE TABLE fato_restos_pagar_liquidacao (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL,
    orgao_id                INTEGER,
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout RSP.11
    cod_orgao               VARCHAR(2),
    dot_orig_p2001          VARCHAR(21),
    dot_orig_p2002          VARCHAR(23),
    nro_empenho             VARCHAR(20),
    dt_empenho              DATE,
    nome_credor             VARCHAR(50),
    dt_cancelamento         DATE,
    nr_cancelamento         VARCHAR(3),
    vl_baixa_cancelamento   NUMERIC(15,2)
);

-- =============================================================
-- RSP.12 → fato_restos_pagar_encampacao
-- =============================================================
CREATE TABLE fato_restos_pagar_encampacao (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout RSP.12
    cod_orgao           VARCHAR(2),
    dot_orig_p2001      VARCHAR(21),
    dot_orig_p2002      VARCHAR(23),
    nro_empenho         VARCHAR(20),
    dt_empenho          DATE,
    nome_credor         VARCHAR(50),
    tipo_encampacao     VARCHAR(2),
    cod_orgao_destino   VARCHAR(2),
    cod_unidade         VARCHAR(2),
    vl_encampacao       NUMERIC(15,2)
);

-- =============================================================
-- CTB.10 → fato_conta_bancaria
-- =============================================================
CREATE TABLE fato_conta_bancaria (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CTB.10
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    banco             VARCHAR(3),
    agencia           VARCHAR(4),
    conta_corrente    VARCHAR(12),
    conta_corrente_dv VARCHAR(1),
    tipo_conta        VARCHAR(2),
    saldo_inicial     NUMERIC(15,2),
    vl_entradas       NUMERIC(15,2),
    vl_saidas         NUMERIC(15,2),
    saldo_final       NUMERIC(15,2)
);

-- =============================================================
-- CTB.11 → fato_conta_bancaria_aplicacao  (saldos por fonte)
-- =============================================================
CREATE TABLE fato_conta_bancaria_aplicacao (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CTB.11
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    banco             VARCHAR(3),
    agencia           VARCHAR(4),
    conta_corrente    VARCHAR(12),
    conta_corrente_dv VARCHAR(1),
    tipo_conta        VARCHAR(2),
    cod_fonte_recurso VARCHAR(6),
    saldo_inicial     NUMERIC(15,2),
    vl_entradas       NUMERIC(15,2),
    vl_saidas         NUMERIC(15,2),
    saldo_final       NUMERIC(15,2)
);

-- =============================================================
-- CTB.90 → fato_conta_bancaria_encerramento
-- =============================================================
CREATE TABLE fato_conta_bancaria_encerramento (
    id                          SERIAL PRIMARY KEY,
    municipio_id                INTEGER NOT NULL,
    orgao_id                    INTEGER,
    ano_referencia              SMALLINT NOT NULL,
    mes_referencia              SMALLINT NOT NULL,
    remessa_id                  INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CTB.90
    cod_orgao                   VARCHAR(2),
    cod_unidade                 VARCHAR(2),
    vl_saldo_exerc_ant_caixa    NUMERIC(15,2),
    vl_saldo_exerc_ant_banco    NUMERIC(15,2),
    vl_saldo_exerc_ant_vinc     NUMERIC(15,2),
    vl_saldo_mes_seg_caixa      NUMERIC(15,2),
    vl_saldo_mes_seg_banco      NUMERIC(15,2),
    vl_saldo_mes_seg_vinc       NUMERIC(15,2)
);

-- =============================================================
-- CTB.91 → fato_conta_bancaria_saldo  (saldo por fonte)
-- =============================================================
CREATE TABLE fato_conta_bancaria_saldo (
    id                          SERIAL PRIMARY KEY,
    municipio_id                INTEGER NOT NULL,
    orgao_id                    INTEGER,
    ano_referencia              SMALLINT NOT NULL,
    mes_referencia              SMALLINT NOT NULL,
    remessa_id                  INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CTB.91
    cod_orgao                   VARCHAR(2),
    cod_unidade                 VARCHAR(2),
    cod_fonte_recurso           VARCHAR(6),
    vl_saldo_exerc_ant_caixa    NUMERIC(15,2),
    vl_saldo_exerc_ant_banco    NUMERIC(15,2),
    vl_saldo_exerc_ant_vinc     NUMERIC(15,2),
    vl_saldo_mes_seg_caixa      NUMERIC(15,2),
    vl_saldo_mes_seg_banco      NUMERIC(15,2),
    vl_saldo_mes_seg_vinc       NUMERIC(15,2)
);

-- =============================================================
-- TRB.10 → fato_transferencia_bancaria
-- =============================================================
CREATE TABLE fato_transferencia_bancaria (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout TRB.10
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    banco_origem        VARCHAR(3),
    agencia_origem      VARCHAR(4),
    conta_origem        VARCHAR(12),
    conta_origem_dv     VARCHAR(1),
    tipo_conta_origem   VARCHAR(2),
    cod_fonte_recurso   VARCHAR(6),
    vl_transf_origem    NUMERIC(15,2)
);

-- =============================================================
-- TRB.11 → fato_transferencia_bancaria_destino
-- =============================================================
CREATE TABLE fato_transferencia_bancaria_destino (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout TRB.11
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    banco_origem        VARCHAR(3),
    agencia_origem      VARCHAR(4),
    conta_origem        VARCHAR(12),
    conta_origem_dv     VARCHAR(1),
    tipo_conta_origem   VARCHAR(2),
    cod_fonte_recurso   VARCHAR(6),
    cod_unidade_dest    VARCHAR(2),
    banco_destino       VARCHAR(3),
    agencia_destino     VARCHAR(4),
    conta_destino       VARCHAR(12),
    conta_destino_dv    VARCHAR(1),
    tipo_conta_destino  VARCHAR(2),
    vl_transf_destino   NUMERIC(15,2)
);

-- =============================================================
-- TFR.10 → fato_transferencia_fonte
-- =============================================================
CREATE TABLE fato_transferencia_fonte (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout TFR.10
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    banco               VARCHAR(3),
    agencia             VARCHAR(4),
    conta_corrente      VARCHAR(12),
    conta_corrente_dv   VARCHAR(1),
    tipo_conta          VARCHAR(2),
    fonte_origem        VARCHAR(6),
    vl_transferencia    NUMERIC(15,2)
);

-- =============================================================
-- TFR.11 → fato_transferencia_fonte_destino
-- =============================================================
CREATE TABLE fato_transferencia_fonte_destino (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout TFR.11
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    banco               VARCHAR(3),
    agencia             VARCHAR(4),
    conta_corrente      VARCHAR(12),
    conta_corrente_dv   VARCHAR(1),
    tipo_conta          VARCHAR(2),
    fonte_origem        VARCHAR(6),
    fonte_destino       VARCHAR(6),
    vl_transferencia    NUMERIC(15,2)
);

-- =============================================================
-- DFR.10 → fato_detalhamento_fonte_recurso
-- =============================================================
CREATE TABLE fato_detalhamento_fonte_recurso (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout DFR.10
    cod_orgao         VARCHAR(2),
    cod_det_fr        VARCHAR(3),
    descricao         TEXT            -- 200 chars
);

-- =============================================================
-- DIC.10 → fato_divida_consolidada
-- =============================================================
CREATE TABLE fato_divida_consolidada (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout DIC.10
    cod_orgao             VARCHAR(2),
    cod_unidade           VARCHAR(2),
    tp_lancamento         VARCHAR(2),
    nro_lei_autorizacao   VARCHAR(8),
    dt_lei_autorizacao    DATE,
    nome_credor           VARCHAR(80),
    tipo_pessoa           VARCHAR(1),
    cpf_cnpj_credor       VARCHAR(14),
    vl_saldo_anterior     NUMERIC(15,2),
    vl_contratacao        NUMERIC(15,2),
    vl_amortizacao        NUMERIC(15,2),
    vl_cancelamento       NUMERIC(15,2),
    vl_encampacao         NUMERIC(15,2),
    vl_atualizacao        NUMERIC(15,2),
    vl_saldo_atual        NUMERIC(15,2)
);

-- =============================================================
-- DCL.10 → fato_declaracao
-- =============================================================
CREATE TABLE fato_declaracao (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout DCL.10
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    tipo_dado         VARCHAR(2),
    valor             NUMERIC(15,2),
    descricao         VARCHAR(63)
);

-- =============================================================
-- PAR.10 → fato_projecao_atuarial
-- =============================================================
CREATE TABLE fato_projecao_atuarial (
    id                          SERIAL PRIMARY KEY,
    municipio_id                INTEGER NOT NULL,
    orgao_id                    INTEGER,
    ano_referencia              SMALLINT NOT NULL,
    mes_referencia              SMALLINT NOT NULL,
    remessa_id                  INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout PAR.10
    cod_orgao                   VARCHAR(2),
    ano_projecao                SMALLINT,
    vl_receita_previdenciaria   NUMERIC(15,2),
    vl_despesa_previdenciaria   NUMERIC(15,2),
    vl_resultado                NUMERIC(15,2)
);

-- =============================================================
-- CVC.10 → fato_veiculo
-- =============================================================
CREATE TABLE fato_veiculo (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CVC.10
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    placa_veiculo     VARCHAR(10),
    tipo_veiculo      VARCHAR(2),
    marca             VARCHAR(20),
    modelo            VARCHAR(20),
    ano_fabricacao    SMALLINT,
    combustivel       VARCHAR(2),
    lotacao           VARCHAR(50),
    km_inicial        VARCHAR(7),
    km_final          VARCHAR(7)
);

-- =============================================================
-- CVC.20 → fato_veiculo_uso
-- =============================================================
CREATE TABLE fato_veiculo_uso (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CVC.20
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    placa_veiculo       VARCHAR(10),
    dt_abastecimento    DATE,
    tipo_combustivel    VARCHAR(2),
    qtd_litros          VARCHAR(8),
    vl_total            NUMERIC(15,2),
    km_abastecimento    VARCHAR(7),
    nro_empenho         VARCHAR(20)
);

-- =============================================================
-- ECL.10 → fato_estoque_combustivel
-- =============================================================
CREATE TABLE fato_estoque_combustivel (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL,
    orgao_id                INTEGER,
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ECL.10
    cod_orgao               VARCHAR(2),
    cod_unidade             VARCHAR(2),
    tipo_combustivel        VARCHAR(2),
    qtd_estoque_anterior    VARCHAR(8),
    qtd_entrada             VARCHAR(8),
    qtd_saida               VARCHAR(8),
    qtd_estoque_atual       VARCHAR(8)
);

-- =============================================================
-- ECL.20 → fato_estoque_combustivel_saida
-- =============================================================
CREATE TABLE fato_estoque_combustivel_saida (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ECL.20
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    tipo_combustivel  VARCHAR(2),
    dt_entrada        DATE,
    qtd_litros        VARCHAR(8),
    vl_unitario       NUMERIC(15,2),
    vl_total          NUMERIC(15,2),
    nro_nota_fiscal   VARCHAR(15)
);

-- =============================================================
-- AAL.10 → fato_alteracao_ativo
-- =============================================================
CREATE TABLE fato_alteracao_ativo (
    id                          SERIAL PRIMARY KEY,
    municipio_id                INTEGER NOT NULL,
    orgao_id                    INTEGER,
    ano_referencia              SMALLINT NOT NULL,
    mes_referencia              SMALLINT NOT NULL,
    remessa_id                  INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AAL.10
    cod_orgao                   VARCHAR(2),
    cod_unidade                 VARCHAR(2),
    cod_fonte_recurso_origem    VARCHAR(6),
    cod_fonte_recurso_destino   VARCHAR(6),
    vl_alocacao                 NUMERIC(15,2)
);

-- =============================================================
-- PCT.10 → fato_plano_contas_envio
-- =============================================================
CREATE TABLE fato_plano_contas_envio (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout PCT.10
    tipo_unidade        VARCHAR(2),
    envio_plano_contas  VARCHAR(1)
);

-- =============================================================
-- PCT.11 → fato_plano_contas_conta  (nível sintético)
-- =============================================================
CREATE TABLE fato_plano_contas_conta (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout PCT.11
    tipo_unidade      VARCHAR(2),
    nivel             VARCHAR(2),
    qt_digitos_nivel  VARCHAR(2)
);

-- =============================================================
-- PCT.12 → fato_plano_contas_conta_analitica
-- =============================================================
CREATE TABLE fato_plano_contas_conta_analitica (
    id                        SERIAL PRIMARY KEY,
    municipio_id              INTEGER NOT NULL,
    orgao_id                  INTEGER,
    ano_referencia            SMALLINT NOT NULL,
    mes_referencia            SMALLINT NOT NULL,
    remessa_id                INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout PCT.12
    tipo_unidade              VARCHAR(2),
    cod_conta                 VARCHAR(30),
    ind_calc_sup_financeiro   VARCHAR(1),
    cod_conta_superior        VARCHAR(30),
    nivel                     VARCHAR(2),
    descricao                 VARCHAR(100),
    natureza_conta            VARCHAR(1),
    tipo_conta                VARCHAR(1),
    conta_pcasp               VARCHAR(9),
    ind_calc_sup_fin_pcasp    VARCHAR(1)
);

-- =============================================================
-- PCT.13 → fato_plano_contas_conta_fonte
-- =============================================================
CREATE TABLE fato_plano_contas_conta_fonte (
    id                        SERIAL PRIMARY KEY,
    municipio_id              INTEGER NOT NULL,
    orgao_id                  INTEGER,
    ano_referencia            SMALLINT NOT NULL,
    mes_referencia            SMALLINT NOT NULL,
    remessa_id                INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout PCT.13
    tipo_unidade              VARCHAR(2),
    cod_conta                 VARCHAR(30),
    ind_calc_sup_financeiro   VARCHAR(1),
    descricao                 VARCHAR(100),
    conta_pcasp               VARCHAR(9),
    ind_calc_sup_fin_pcasp    VARCHAR(1)
);

-- =============================================================
-- PCT.14 → fato_plano_contas_conta_vinculacao
-- =============================================================
CREATE TABLE fato_plano_contas_conta_vinculacao (
    id                        SERIAL PRIMARY KEY,
    municipio_id              INTEGER NOT NULL,
    orgao_id                  INTEGER,
    ano_referencia            SMALLINT NOT NULL,
    mes_referencia            SMALLINT NOT NULL,
    remessa_id                INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout PCT.14
    tipo_unidade              VARCHAR(2),
    cod_conta                 VARCHAR(30),
    ind_calc_sup_financeiro   VARCHAR(1)
);

-- =============================================================
-- LNC.10 → fato_lancamento_contabil
-- =============================================================
CREATE TABLE fato_lancamento_contabil (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout LNC.10
    tipo_unidade      VARCHAR(2),
    num_controle      VARCHAR(13),
    mes_ref           SMALLINT,
    data_registro     DATE,
    tipo_lancamento   VARCHAR(1),
    data_transacao    DATE,
    historico         TEXT            -- 1000 chars
);

-- =============================================================
-- LNC.11 → fato_item_lancamento_contabil
-- =============================================================
CREATE TABLE fato_item_lancamento_contabil (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout LNC.11
    tipo_unidade          VARCHAR(2),
    num_controle          VARCHAR(13),
    cod_conta             VARCHAR(30),
    atributo_conta        VARCHAR(1),
    nat_lancamento        VARCHAR(1),
    valor                 NUMERIC(15,2),
    tipo_arquivo_sicom    VARCHAR(2),
    chave_arquivo         VARCHAR(150)
);

-- =============================================================
-- CON.10 → fato_contrato
-- =============================================================
CREATE TABLE fato_contrato (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CON.10
    cod_orgao             VARCHAR(2),
    cod_unidade           VARCHAR(2),
    nro_contrato          VARCHAR(20),
    ano_contrato          SMALLINT,
    tipo_ajuste           VARCHAR(1),
    objeto                TEXT,           -- 500 chars
    cpf_cnpj_contratado   VARCHAR(14),
    tipo_pessoa           VARCHAR(1),
    nome_contratado       VARCHAR(100),
    dt_assinatura         DATE,
    dt_inicio_vigencia    DATE,
    dt_fim_vigencia       DATE,
    vl_contrato           NUMERIC(15,2),
    id_colare             VARCHAR(15)
);

-- =============================================================
-- CON.11 → fato_contrato_responsavel  (aditivo contratual)
-- =============================================================
CREATE TABLE fato_contrato_responsavel (
    id                       SERIAL PRIMARY KEY,
    municipio_id             INTEGER NOT NULL,
    orgao_id                 INTEGER,
    ano_referencia           SMALLINT NOT NULL,
    mes_referencia           SMALLINT NOT NULL,
    remessa_id               INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CON.11
    cod_orgao                VARCHAR(2),
    cod_unidade              VARCHAR(2),
    nro_contrato             VARCHAR(20),
    ano_contrato             SMALLINT,
    nro_aditivo              VARCHAR(4),
    dt_aditivo               DATE,
    objeto_aditivo           VARCHAR(200),
    vl_aditivo               NUMERIC(15,2),
    dt_fim_vigencia_aditivo  DATE
);

-- =============================================================
-- CON.20 → fato_contrato_item  (empenho vinculado ao contrato)
-- =============================================================
CREATE TABLE fato_contrato_item (
    id                 SERIAL PRIMARY KEY,
    municipio_id       INTEGER NOT NULL,
    orgao_id           INTEGER,
    ano_referencia     SMALLINT NOT NULL,
    mes_referencia     SMALLINT NOT NULL,
    remessa_id         INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CON.20
    cod_orgao          VARCHAR(2),
    cod_unidade        VARCHAR(2),
    nro_contrato       VARCHAR(20),
    ano_contrato       SMALLINT,
    nro_empenho        VARCHAR(20),
    exercicio_empenho  SMALLINT
);

-- =============================================================
-- CON.21 → fato_contrato_item_unidade  (licitação vinculada)
-- =============================================================
CREATE TABLE fato_contrato_item_unidade (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CON.21
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    nro_contrato         VARCHAR(20),
    ano_contrato         SMALLINT,
    nro_proc_licitacao   VARCHAR(8),
    ano_proc_licitacao   SMALLINT
);

-- =============================================================
-- CON.22 → fato_contrato_aditivo  (fiscal do contrato)
-- =============================================================
CREATE TABLE fato_contrato_aditivo (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CON.22
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    nro_contrato      VARCHAR(20),
    ano_contrato      SMALLINT,
    cpf_fiscal        VARCHAR(11),
    nome_fiscal       VARCHAR(50)
);

-- =============================================================
-- CON.23 → fato_contrato_publicacao  (garantia do contrato)
-- =============================================================
CREATE TABLE fato_contrato_publicacao (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout CON.23
    cod_orgao             VARCHAR(2),
    cod_unidade           VARCHAR(2),
    nro_contrato          VARCHAR(20),
    ano_contrato          SMALLINT,
    cpf_cnpj_garantidor   VARCHAR(14),
    tipo_garantia         VARCHAR(2),
    vl_garantia           NUMERIC(15,2)
);

-- =============================================================
-- ISI.10 → fato_informacao_sistema
-- =============================================================
CREATE TABLE fato_informacao_sistema (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ISI.10
    cpf_cnpj_proprietario VARCHAR(14),
    tipo_pessoa           VARCHAR(1),
    nome_razao_social     VARCHAR(50),
    logra_proprietario    VARCHAR(50),
    setor_logra           VARCHAR(20),
    cidade_logra          VARCHAR(20),
    uf                    VARCHAR(2),
    cep                   VARCHAR(8),
    telefone              VARCHAR(10),
    email_proprietario    VARCHAR(80),
    cpf_resp_tecnico      VARCHAR(11),
    nome_resp_tecnico     VARCHAR(50),
    email_resp_tecnico    VARCHAR(80),
    nome_sistema          VARCHAR(50),
    versao_sistema        VARCHAR(50)
);

-- =============================================================
-- DMR.10 → fato_decreto
-- =============================================================
CREATE TABLE fato_decreto (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout DMR.10
    cod_orgao         VARCHAR(2),
    nro_decreto       VARCHAR(10),
    dt_decreto        DATE
);

-- =============================================================
-- ABL.10 → fato_licitacao
-- =============================================================
CREATE TABLE fato_licitacao (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ABL.10
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    nro_proc_licitacao   VARCHAR(8),
    ano_proc_licitacao   SMALLINT,
    modalidade           VARCHAR(2),
    tipo_licitacao       VARCHAR(2),
    objeto               TEXT,           -- 500 chars
    dt_abertura          DATE,
    vl_estimado          NUMERIC(15,2)
);

-- =============================================================
-- ABL.11 → fato_licitacao_responsavel  (item da licitação)
-- =============================================================
CREATE TABLE fato_licitacao_responsavel (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL,
    orgao_id                INTEGER,
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ABL.11
    cod_orgao               VARCHAR(2),
    cod_unidade             VARCHAR(2),
    nro_proc_licitacao      VARCHAR(8),
    ano_proc_licitacao      SMALLINT,
    nro_item                VARCHAR(4),
    desc_item               VARCHAR(200),
    unidade_item            VARCHAR(10),
    qtd_item                VARCHAR(10),
    vl_unitario_estimado    NUMERIC(15,2)
);

-- =============================================================
-- ABL.12 → fato_licitacao_item  (responsável pela licitação)
-- =============================================================
CREATE TABLE fato_licitacao_item (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ABL.12
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    nro_proc_licitacao   VARCHAR(8),
    ano_proc_licitacao   SMALLINT,
    cpf_responsavel      VARCHAR(11),
    nome_responsavel     VARCHAR(50),
    funcao               VARCHAR(30)
);

-- =============================================================
-- ABL.13 → fato_licitacao_publicacao  (elemento de despesa)
-- =============================================================
CREATE TABLE fato_licitacao_publicacao (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ABL.13
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    nro_proc_licitacao   VARCHAR(8),
    ano_proc_licitacao   SMALLINT,
    elemento_despesa     VARCHAR(6)
);

-- =============================================================
-- DSI.10 → fato_dispensa_inexigibilidade
-- =============================================================
CREATE TABLE fato_dispensa_inexigibilidade (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout DSI.10
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    nro_processo      VARCHAR(8),
    ano_processo      SMALLINT,
    tipo_processo     VARCHAR(2),
    objeto            TEXT,           -- 500 chars
    vl_estimado       NUMERIC(15,2),
    dt_ratificacao    DATE,
    fundamentacao     TEXT            -- 200 chars
);

-- =============================================================
-- DSI.11 → fato_dispensa_responsavel  (item da dispensa)
-- =============================================================
CREATE TABLE fato_dispensa_responsavel (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout DSI.11
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    nro_processo      VARCHAR(8),
    ano_processo      SMALLINT,
    nro_item          VARCHAR(4),
    desc_item         VARCHAR(200),
    unidade_item      VARCHAR(10),
    qtd_item          VARCHAR(10),
    vl_unitario       NUMERIC(15,2)
);

-- =============================================================
-- DSI.12 → fato_dispensa_item  (fornecedor/credor)
-- =============================================================
CREATE TABLE fato_dispensa_item (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout DSI.12
    cod_orgao             VARCHAR(2),
    cod_unidade           VARCHAR(2),
    nro_processo          VARCHAR(8),
    ano_processo          SMALLINT,
    cpf_cnpj_fornecedor   VARCHAR(14),
    tipo_pessoa           VARCHAR(1),
    nome_fornecedor       VARCHAR(50)
);

-- =============================================================
-- DSI.13 → fato_dispensa_publicacao  (responsável pela dispensa)
-- =============================================================
CREATE TABLE fato_dispensa_publicacao (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout DSI.13
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    nro_processo      VARCHAR(8),
    ano_processo      SMALLINT,
    cpf_responsavel   VARCHAR(11),
    nome_responsavel  VARCHAR(50),
    funcao            VARCHAR(30)
);

-- =============================================================
-- DSI.14 → fato_dispensa_credor  (elemento de despesa)
-- =============================================================
CREATE TABLE fato_dispensa_credor (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout DSI.14
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    nro_processo      VARCHAR(8),
    ano_processo      SMALLINT,
    elemento_despesa  VARCHAR(6)
);

-- =============================================================
-- DSI.15 → fato_dispensa_aditivo  (item x fornecedor)
-- =============================================================
CREATE TABLE fato_dispensa_aditivo (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout DSI.15
    cod_orgao             VARCHAR(2),
    cod_unidade           VARCHAR(2),
    nro_processo          VARCHAR(8),
    ano_processo          SMALLINT,
    nro_item              VARCHAR(4),
    cpf_cnpj_fornecedor   VARCHAR(14),
    qtd_item              VARCHAR(10),
    vl_unitario           NUMERIC(15,2),
    vl_total              NUMERIC(15,2)
);

-- =============================================================
-- RPL.10 → fato_responsavel_licitacao
-- =============================================================
CREATE TABLE fato_responsavel_licitacao (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout RPL.10
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    nro_proc_licitacao   VARCHAR(8),
    ano_proc_licitacao   SMALLINT,
    situacao             VARCHAR(2),
    dt_resultado         DATE
);

-- =============================================================
-- HBL.10 → fato_habilitacao_licitacao
-- =============================================================
CREATE TABLE fato_habilitacao_licitacao (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout HBL.10
    cod_orgao             VARCHAR(2),
    cod_unidade           VARCHAR(2),
    nro_proc_licitacao    VARCHAR(8),
    ano_proc_licitacao    SMALLINT,
    cpf_cnpj_licitante    VARCHAR(14),
    tipo_pessoa           VARCHAR(1),
    nome_licitante        VARCHAR(50),
    situacao_habilitacao  VARCHAR(2)
);

-- =============================================================
-- HBL.20 → fato_habilitacao_socio  (proposta do licitante por item)
-- =============================================================
CREATE TABLE fato_habilitacao_socio (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout HBL.20
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    nro_proc_licitacao   VARCHAR(8),
    ano_proc_licitacao   SMALLINT,
    cpf_cnpj_licitante   VARCHAR(14),
    nro_item             VARCHAR(4),
    vl_proposta          NUMERIC(15,2),
    classificacao        VARCHAR(3)
);

-- =============================================================
-- JGL.10 → fato_julgamento_licitacao
-- =============================================================
CREATE TABLE fato_julgamento_licitacao (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout JGL.10
    cod_orgao             VARCHAR(2),
    cod_unidade           VARCHAR(2),
    nro_proc_licitacao    VARCHAR(8),
    ano_proc_licitacao    SMALLINT,
    nro_item              VARCHAR(4),
    cpf_cnpj_vencedor     VARCHAR(14),
    vl_unitario_vencedor  NUMERIC(15,2),
    qtd_adjudicada        VARCHAR(10)
);

-- =============================================================
-- JGL.30 → fato_julgamento_publicacao  (data de adjudicação)
-- =============================================================
CREATE TABLE fato_julgamento_publicacao (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout JGL.30
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    nro_proc_licitacao   VARCHAR(8),
    ano_proc_licitacao   SMALLINT,
    dt_adjudicacao       DATE
);

-- =============================================================
-- HML.10 → fato_homologacao_licitacao
-- =============================================================
CREATE TABLE fato_homologacao_licitacao (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout HML.10
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    nro_proc_licitacao   VARCHAR(8),
    ano_proc_licitacao   SMALLINT,
    dt_homologacao       DATE
);

-- =============================================================
-- HML.20 → fato_homologacao_item
-- =============================================================
CREATE TABLE fato_homologacao_item (
    id                       SERIAL PRIMARY KEY,
    municipio_id             INTEGER NOT NULL,
    orgao_id                 INTEGER,
    ano_referencia           SMALLINT NOT NULL,
    mes_referencia           SMALLINT NOT NULL,
    remessa_id               INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout HML.20
    cod_orgao                VARCHAR(2),
    cod_unidade              VARCHAR(2),
    nro_proc_licitacao       VARCHAR(8),
    ano_proc_licitacao       SMALLINT,
    nro_item                 VARCHAR(4),
    cpf_cnpj_vencedor        VARCHAR(14),
    vl_unitario_homologado   NUMERIC(15,2),
    qtd_homologada           VARCHAR(10)
);

-- =============================================================
-- HML.30 → fato_homologacao_publicacao
-- =============================================================
CREATE TABLE fato_homologacao_publicacao (
    id                         SERIAL PRIMARY KEY,
    municipio_id               INTEGER NOT NULL,
    orgao_id                   INTEGER,
    ano_referencia             SMALLINT NOT NULL,
    mes_referencia             SMALLINT NOT NULL,
    remessa_id                 INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout HML.30
    cod_orgao                  VARCHAR(2),
    cod_unidade                VARCHAR(2),
    nro_proc_licitacao         VARCHAR(8),
    ano_proc_licitacao         SMALLINT,
    cpf_cnpj_vencedor_global   VARCHAR(14),
    vl_total_homologado        NUMERIC(15,2)
);

-- =============================================================
-- ARP.10 → fato_ata_registro_precos
-- =============================================================
CREATE TABLE fato_ata_registro_precos (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ARP.10
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    nro_proc_licitacao   VARCHAR(8),
    ano_proc_licitacao   SMALLINT,
    nro_ata              VARCHAR(6),
    ano_ata              SMALLINT,
    dt_assinatura        DATE,
    dt_vigencia          DATE,
    vl_total_ata         NUMERIC(15,2)
);

-- =============================================================
-- ARP.12 → fato_ata_registro_precos_item  (fornecedor da ata)
-- =============================================================
CREATE TABLE fato_ata_registro_precos_item (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ARP.12
    cod_orgao             VARCHAR(2),
    cod_unidade           VARCHAR(2),
    nro_proc_licitacao    VARCHAR(8),
    ano_proc_licitacao    SMALLINT,
    nro_ata               VARCHAR(6),
    ano_ata               SMALLINT,
    cpf_cnpj_fornecedor   VARCHAR(14),
    tipo_pessoa           VARCHAR(1),
    nome_fornecedor       VARCHAR(50)
);

-- =============================================================
-- ARP.20 → fato_ata_registro_precos_orgao  (item da ata)
-- =============================================================
CREATE TABLE fato_ata_registro_precos_orgao (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ARP.20
    cod_orgao             VARCHAR(2),
    cod_unidade           VARCHAR(2),
    nro_proc_licitacao    VARCHAR(8),
    ano_proc_licitacao    SMALLINT,
    nro_ata               VARCHAR(6),
    ano_ata               SMALLINT,
    cpf_cnpj_fornecedor   VARCHAR(14),
    nro_item              VARCHAR(4),
    desc_item             VARCHAR(200),
    unidade_item          VARCHAR(10),
    qtd_item              VARCHAR(10),
    vl_unitario           NUMERIC(15,2)
);

-- =============================================================
-- ÍNDICES — remessa_id + municipio_id em todas as tabelas
-- =============================================================
CREATE INDEX idx_ide_remessa         ON fato_identificacao_remessa(remessa_id);
CREATE INDEX idx_ide_municipio       ON fato_identificacao_remessa(municipio_id);

CREATE INDEX idx_orgao_remessa       ON fato_orgao(remessa_id);
CREATE INDEX idx_orgao_municipio     ON fato_orgao(municipio_id);
CREATE INDEX idx_orgao_cod           ON fato_orgao(cod_orgao);

CREATE INDEX idx_uoc_remessa         ON fato_unidade_orcamentaria(remessa_id);
CREATE INDEX idx_uoc_municipio       ON fato_unidade_orcamentaria(municipio_id);
CREATE INDEX idx_uoc_orgao_und       ON fato_unidade_orcamentaria(cod_orgao, cod_unidade);

CREATE INDEX idx_uoc_resp_remessa    ON fato_uoc_responsavel(remessa_id);
CREATE INDEX idx_uoc_resp_municipio  ON fato_uoc_responsavel(municipio_id);

CREATE INDEX idx_uoc_cont_remessa    ON fato_uoc_contador(remessa_id);
CREATE INDEX idx_uoc_adv_remessa     ON fato_uoc_advogado_oab(remessa_id);
CREATE INDEX idx_uoc_advn_remessa    ON fato_uoc_advogado_nao_oab(remessa_id);

CREATE INDEX idx_rec_remessa         ON fato_receita(remessa_id);
CREATE INDEX idx_rec_municipio       ON fato_receita(municipio_id);
CREATE INDEX idx_rec_orgao_und       ON fato_receita(cod_orgao, cod_unidade);
CREATE INDEX idx_rec_rubrica         ON fato_receita(rubrica);

CREATE INDEX idx_recd_remessa        ON fato_receita_deducao(remessa_id);
CREATE INDEX idx_recf_remessa        ON fato_receita_fonte(remessa_id);

CREATE INDEX idx_are_remessa         ON fato_anulacao_receita(remessa_id);
CREATE INDEX idx_are_municipio       ON fato_anulacao_receita(municipio_id);
CREATE INDEX idx_ared_remessa        ON fato_anulacao_receita_deducao(remessa_id);
CREATE INDEX idx_aref_remessa        ON fato_anulacao_receita_fonte(remessa_id);

CREATE INDEX idx_aoc_remessa         ON fato_alteracao_orcamentaria(remessa_id);
CREATE INDEX idx_aoc_municipio       ON fato_alteracao_orcamentaria(municipio_id);
CREATE INDEX idx_aocu_remessa        ON fato_alteracao_orcamentaria_unidade(remessa_id);
CREATE INDEX idx_aocf_remessa        ON fato_alteracao_orcamentaria_fonte(remessa_id);
CREATE INDEX idx_aoc_ato_remessa     ON fato_aoc_ato(remessa_id);
CREATE INDEX idx_aoc_ato_municipio   ON fato_aoc_ato(municipio_id);

CREATE INDEX idx_cob_remessa         ON fato_credito_orcamentario(remessa_id);
CREATE INDEX idx_cob_municipio       ON fato_credito_orcamentario(municipio_id);

CREATE INDEX idx_emp_remessa         ON fato_empenho(remessa_id);
CREATE INDEX idx_emp_municipio       ON fato_empenho(municipio_id);
CREATE INDEX idx_emp_nro             ON fato_empenho(nro_empenho);
CREATE INDEX idx_emp_orgao_und       ON fato_empenho(cod_orgao, cod_unidade);
CREATE INDEX idx_emp_credor          ON fato_empenho(cpf_cnpj_credor);
CREATE INDEX idx_emp_dt              ON fato_empenho(dt_empenho);

CREATE INDEX idx_empb_remessa        ON fato_empenho_beneficiario(remessa_id);
CREATE INDEX idx_empb_nro            ON fato_empenho_beneficiario(nro_empenho);
CREATE INDEX idx_empf_remessa        ON fato_empenho_fonte(remessa_id);
CREATE INDEX idx_empc_remessa        ON fato_empenho_contrato(remessa_id);
CREATE INDEX idx_emps_remessa        ON fato_empenho_subelemento(remessa_id);

CREATE INDEX idx_anl_remessa         ON fato_anulacao_empenho(remessa_id);
CREATE INDEX idx_anl_municipio       ON fato_anulacao_empenho(municipio_id);
CREATE INDEX idx_anl_nro             ON fato_anulacao_empenho(nro_empenho);
CREATE INDEX idx_anlf_remessa        ON fato_anulacao_empenho_fonte(remessa_id);
CREATE INDEX idx_anls_remessa        ON fato_anulacao_empenho_subelemento(remessa_id);
CREATE INDEX idx_anlc_remessa        ON fato_anulacao_empenho_contrato(remessa_id);
CREATE INDEX idx_anlb_remessa        ON fato_anulacao_empenho_beneficiario(remessa_id);

CREATE INDEX idx_eoc_remessa         ON fato_estorno_contabilizacao(remessa_id);
CREATE INDEX idx_eocf_remessa        ON fato_estorno_contabilizacao_fonte(remessa_id);
CREATE INDEX idx_eocd_remessa        ON fato_estorno_contabilizacao_documento(remessa_id);

CREATE INDEX idx_lqd_remessa         ON fato_liquidacao(remessa_id);
CREATE INDEX idx_lqd_municipio       ON fato_liquidacao(municipio_id);
CREATE INDEX idx_lqd_nro_emp         ON fato_liquidacao(nro_empenho);
CREATE INDEX idx_lqd_nr_liq          ON fato_liquidacao(nr_liquidacao);
CREATE INDEX idx_lqd_dt              ON fato_liquidacao(dt_liquidacao);
CREATE INDEX idx_lqdd_remessa        ON fato_liquidacao_deducao(remessa_id);
CREATE INDEX idx_lqdc_remessa        ON fato_liquidacao_credor_rsp(remessa_id);

CREATE INDEX idx_alq_remessa         ON fato_anulacao_liquidacao(remessa_id);
CREATE INDEX idx_alq_municipio       ON fato_anulacao_liquidacao(municipio_id);
CREATE INDEX idx_alqd_remessa        ON fato_anulacao_liquidacao_deducao(remessa_id);
CREATE INDEX idx_alqc_remessa        ON fato_anulacao_liquidacao_credor(remessa_id);

CREATE INDEX idx_ops_remessa         ON fato_pagamento(remessa_id);
CREATE INDEX idx_ops_municipio       ON fato_pagamento(municipio_id);
CREATE INDEX idx_ops_nro_emp         ON fato_pagamento(nro_empenho);
CREATE INDEX idx_ops_nro_op          ON fato_pagamento(nro_op);
CREATE INDEX idx_ops_credor          ON fato_pagamento(cpf_cnpj);
CREATE INDEX idx_opsb_remessa        ON fato_pagamento_banco(remessa_id);
CREATE INDEX idx_opsd_remessa        ON fato_pagamento_documento(remessa_id);
CREATE INDEX idx_opsf_remessa        ON fato_pagamento_fonte(remessa_id);
CREATE INDEX idx_opsr_remessa        ON fato_pagamento_deducao(remessa_id);

CREATE INDEX idx_aop_remessa         ON fato_anulacao_pagamento(remessa_id);
CREATE INDEX idx_aop_municipio       ON fato_anulacao_pagamento(municipio_id);
CREATE INDEX idx_aopb_remessa        ON fato_anulacao_pagamento_banco(remessa_id);
CREATE INDEX idx_aopd_remessa        ON fato_anulacao_pagamento_documento(remessa_id);
CREATE INDEX idx_aopf_remessa        ON fato_anulacao_pagamento_fonte(remessa_id);
CREATE INDEX idx_aopr_remessa        ON fato_anulacao_pagamento_deducao(remessa_id);

CREATE INDEX idx_ext_remessa         ON fato_extraorcamentario(remessa_id);
CREATE INDEX idx_ext_municipio       ON fato_extraorcamentario(municipio_id);
CREATE INDEX idx_extd_remessa        ON fato_extraorcamentario_deducao(remessa_id);
CREATE INDEX idx_extf_remessa        ON fato_extraorcamentario_fonte(remessa_id);

CREATE INDEX idx_aex_remessa         ON fato_anulacao_extraorcamentario(remessa_id);
CREATE INDEX idx_aexd_remessa        ON fato_anulacao_extraorcamentario_deducao(remessa_id);
CREATE INDEX idx_aexf_remessa        ON fato_anulacao_extraorcamentario_fonte(remessa_id);

CREATE INDEX idx_rsp_remessa         ON fato_restos_pagar(remessa_id);
CREATE INDEX idx_rsp_municipio       ON fato_restos_pagar(municipio_id);
CREATE INDEX idx_rsp_nro_emp         ON fato_restos_pagar(nro_empenho);
CREATE INDEX idx_rspl_remessa        ON fato_restos_pagar_liquidacao(remessa_id);
CREATE INDEX idx_rspe_remessa        ON fato_restos_pagar_encampacao(remessa_id);

CREATE INDEX idx_ctb_remessa         ON fato_conta_bancaria(remessa_id);
CREATE INDEX idx_ctb_municipio       ON fato_conta_bancaria(municipio_id);
CREATE INDEX idx_ctb_orgao_und       ON fato_conta_bancaria(cod_orgao, cod_unidade);
CREATE INDEX idx_ctba_remessa        ON fato_conta_bancaria_aplicacao(remessa_id);
CREATE INDEX idx_ctbe_remessa        ON fato_conta_bancaria_encerramento(remessa_id);
CREATE INDEX idx_ctbs_remessa        ON fato_conta_bancaria_saldo(remessa_id);

CREATE INDEX idx_trb_remessa         ON fato_transferencia_bancaria(remessa_id);
CREATE INDEX idx_trbd_remessa        ON fato_transferencia_bancaria_destino(remessa_id);
CREATE INDEX idx_tfr_remessa         ON fato_transferencia_fonte(remessa_id);
CREATE INDEX idx_tfrd_remessa        ON fato_transferencia_fonte_destino(remessa_id);

CREATE INDEX idx_dfr_remessa         ON fato_detalhamento_fonte_recurso(remessa_id);
CREATE INDEX idx_dic_remessa         ON fato_divida_consolidada(remessa_id);
CREATE INDEX idx_dic_municipio       ON fato_divida_consolidada(municipio_id);
CREATE INDEX idx_dcl_remessa         ON fato_declaracao(remessa_id);
CREATE INDEX idx_par_remessa         ON fato_projecao_atuarial(remessa_id);
CREATE INDEX idx_cvc_remessa         ON fato_veiculo(remessa_id);
CREATE INDEX idx_cvcu_remessa        ON fato_veiculo_uso(remessa_id);
CREATE INDEX idx_ecl_remessa         ON fato_estoque_combustivel(remessa_id);
CREATE INDEX idx_ecls_remessa        ON fato_estoque_combustivel_saida(remessa_id);
CREATE INDEX idx_aal_remessa         ON fato_alteracao_ativo(remessa_id);

CREATE INDEX idx_pct_remessa         ON fato_plano_contas_envio(remessa_id);
CREATE INDEX idx_pctc_remessa        ON fato_plano_contas_conta(remessa_id);
CREATE INDEX idx_pcta_remessa        ON fato_plano_contas_conta_analitica(remessa_id);
CREATE INDEX idx_pctf_remessa        ON fato_plano_contas_conta_fonte(remessa_id);
CREATE INDEX idx_pctv_remessa        ON fato_plano_contas_conta_vinculacao(remessa_id);

CREATE INDEX idx_lnc_remessa         ON fato_lancamento_contabil(remessa_id);
CREATE INDEX idx_lnc_municipio       ON fato_lancamento_contabil(municipio_id);
CREATE INDEX idx_lnc_controle        ON fato_lancamento_contabil(num_controle);
CREATE INDEX idx_lnci_remessa        ON fato_item_lancamento_contabil(remessa_id);
CREATE INDEX idx_lnci_controle       ON fato_item_lancamento_contabil(num_controle);

CREATE INDEX idx_con_remessa         ON fato_contrato(remessa_id);
CREATE INDEX idx_con_municipio       ON fato_contrato(municipio_id);
CREATE INDEX idx_con_nro             ON fato_contrato(nro_contrato, ano_contrato);
CREATE INDEX idx_con_credor          ON fato_contrato(cpf_cnpj_contratado);
CREATE INDEX idx_conr_remessa        ON fato_contrato_responsavel(remessa_id);
CREATE INDEX idx_coni_remessa        ON fato_contrato_item(remessa_id);
CREATE INDEX idx_coniu_remessa       ON fato_contrato_item_unidade(remessa_id);
CREATE INDEX idx_cona_remessa        ON fato_contrato_aditivo(remessa_id);
CREATE INDEX idx_conp_remessa        ON fato_contrato_publicacao(remessa_id);

CREATE INDEX idx_isi_remessa         ON fato_informacao_sistema(remessa_id);
CREATE INDEX idx_dmr_remessa         ON fato_decreto(remessa_id);

CREATE INDEX idx_abl_remessa         ON fato_licitacao(remessa_id);
CREATE INDEX idx_abl_municipio       ON fato_licitacao(municipio_id);
CREATE INDEX idx_abl_proc            ON fato_licitacao(nro_proc_licitacao, ano_proc_licitacao);
CREATE INDEX idx_ablr_remessa        ON fato_licitacao_responsavel(remessa_id);
CREATE INDEX idx_abli_remessa        ON fato_licitacao_item(remessa_id);
CREATE INDEX idx_ablp_remessa        ON fato_licitacao_publicacao(remessa_id);

CREATE INDEX idx_dsi_remessa         ON fato_dispensa_inexigibilidade(remessa_id);
CREATE INDEX idx_dsi_municipio       ON fato_dispensa_inexigibilidade(municipio_id);
CREATE INDEX idx_dsi_proc            ON fato_dispensa_inexigibilidade(nro_processo, ano_processo);
CREATE INDEX idx_dsir_remessa        ON fato_dispensa_responsavel(remessa_id);
CREATE INDEX idx_dsii_remessa        ON fato_dispensa_item(remessa_id);
CREATE INDEX idx_dsip_remessa        ON fato_dispensa_publicacao(remessa_id);
CREATE INDEX idx_dsic_remessa        ON fato_dispensa_credor(remessa_id);
CREATE INDEX idx_dsia_remessa        ON fato_dispensa_aditivo(remessa_id);

CREATE INDEX idx_rpl_remessa         ON fato_responsavel_licitacao(remessa_id);
CREATE INDEX idx_hbl_remessa         ON fato_habilitacao_licitacao(remessa_id);
CREATE INDEX idx_hbl_proc            ON fato_habilitacao_licitacao(nro_proc_licitacao, ano_proc_licitacao);
CREATE INDEX idx_hbls_remessa        ON fato_habilitacao_socio(remessa_id);

CREATE INDEX idx_jgl_remessa         ON fato_julgamento_licitacao(remessa_id);
CREATE INDEX idx_jgl_proc            ON fato_julgamento_licitacao(nro_proc_licitacao, ano_proc_licitacao);
CREATE INDEX idx_jglp_remessa        ON fato_julgamento_publicacao(remessa_id);

CREATE INDEX idx_hml_remessa         ON fato_homologacao_licitacao(remessa_id);
CREATE INDEX idx_hml_proc            ON fato_homologacao_licitacao(nro_proc_licitacao, ano_proc_licitacao);
CREATE INDEX idx_hmli_remessa        ON fato_homologacao_item(remessa_id);
CREATE INDEX idx_hmlp_remessa        ON fato_homologacao_publicacao(remessa_id);

CREATE INDEX idx_arp_remessa         ON fato_ata_registro_precos(remessa_id);
CREATE INDEX idx_arp_municipio       ON fato_ata_registro_precos(municipio_id);
CREATE INDEX idx_arp_proc            ON fato_ata_registro_precos(nro_proc_licitacao, ano_proc_licitacao);
CREATE INDEX idx_arpi_remessa        ON fato_ata_registro_precos_item(remessa_id);
CREATE INDEX idx_arpo_remessa        ON fato_ata_registro_precos_orgao(remessa_id);

COMMIT;
