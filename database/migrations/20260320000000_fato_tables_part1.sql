-- =============================================================
-- TCM-GO: Criação das tabelas fato_* (Parte 1/2)
-- Gerado em: 2026-03-20
-- Baseado em: server/src/lib/tcmgoLayouts.ts
-- =============================================================

BEGIN;

-- =============================================================
-- DROP de todas as tabelas fato_* (CASCADE)
-- =============================================================
DROP TABLE IF EXISTS fato_identificacao_remessa CASCADE;
DROP TABLE IF EXISTS fato_orgao CASCADE;
DROP TABLE IF EXISTS fato_unidade_orcamentaria CASCADE;
DROP TABLE IF EXISTS fato_uoc_responsavel CASCADE;
DROP TABLE IF EXISTS fato_uoc_contador CASCADE;
DROP TABLE IF EXISTS fato_uoc_advogado_oab CASCADE;
DROP TABLE IF EXISTS fato_uoc_advogado_nao_oab CASCADE;
DROP TABLE IF EXISTS fato_receita CASCADE;
DROP TABLE IF EXISTS fato_receita_deducao CASCADE;
DROP TABLE IF EXISTS fato_receita_fonte CASCADE;
DROP TABLE IF EXISTS fato_anulacao_receita CASCADE;
DROP TABLE IF EXISTS fato_anulacao_receita_deducao CASCADE;
DROP TABLE IF EXISTS fato_anulacao_receita_fonte CASCADE;
DROP TABLE IF EXISTS fato_alteracao_orcamentaria CASCADE;
DROP TABLE IF EXISTS fato_alteracao_orcamentaria_unidade CASCADE;
DROP TABLE IF EXISTS fato_alteracao_orcamentaria_fonte CASCADE;
DROP TABLE IF EXISTS fato_aoc_ato CASCADE;
DROP TABLE IF EXISTS fato_credito_orcamentario CASCADE;
DROP TABLE IF EXISTS fato_empenho CASCADE;
DROP TABLE IF EXISTS fato_empenho_beneficiario CASCADE;
DROP TABLE IF EXISTS fato_empenho_fonte CASCADE;
DROP TABLE IF EXISTS fato_empenho_contrato CASCADE;
DROP TABLE IF EXISTS fato_empenho_subelemento CASCADE;
DROP TABLE IF EXISTS fato_anulacao_empenho CASCADE;
DROP TABLE IF EXISTS fato_anulacao_empenho_fonte CASCADE;
DROP TABLE IF EXISTS fato_anulacao_empenho_subelemento CASCADE;
DROP TABLE IF EXISTS fato_anulacao_empenho_contrato CASCADE;
DROP TABLE IF EXISTS fato_anulacao_empenho_beneficiario CASCADE;
DROP TABLE IF EXISTS fato_estorno_contabilizacao CASCADE;
DROP TABLE IF EXISTS fato_estorno_contabilizacao_fonte CASCADE;
DROP TABLE IF EXISTS fato_estorno_contabilizacao_documento CASCADE;
DROP TABLE IF EXISTS fato_liquidacao CASCADE;
DROP TABLE IF EXISTS fato_liquidacao_deducao CASCADE;
DROP TABLE IF EXISTS fato_liquidacao_credor_rsp CASCADE;
DROP TABLE IF EXISTS fato_anulacao_liquidacao CASCADE;
DROP TABLE IF EXISTS fato_anulacao_liquidacao_deducao CASCADE;
DROP TABLE IF EXISTS fato_anulacao_liquidacao_credor CASCADE;
DROP TABLE IF EXISTS fato_pagamento CASCADE;
DROP TABLE IF EXISTS fato_pagamento_banco CASCADE;
DROP TABLE IF EXISTS fato_pagamento_documento CASCADE;
DROP TABLE IF EXISTS fato_pagamento_fonte CASCADE;
DROP TABLE IF EXISTS fato_pagamento_deducao CASCADE;
DROP TABLE IF EXISTS fato_anulacao_pagamento CASCADE;
DROP TABLE IF EXISTS fato_anulacao_pagamento_banco CASCADE;
DROP TABLE IF EXISTS fato_anulacao_pagamento_documento CASCADE;
DROP TABLE IF EXISTS fato_anulacao_pagamento_fonte CASCADE;
DROP TABLE IF EXISTS fato_anulacao_pagamento_deducao CASCADE;
DROP TABLE IF EXISTS fato_extraorcamentario CASCADE;
DROP TABLE IF EXISTS fato_extraorcamentario_deducao CASCADE;
DROP TABLE IF EXISTS fato_extraorcamentario_fonte CASCADE;
DROP TABLE IF EXISTS fato_anulacao_extraorcamentario CASCADE;
DROP TABLE IF EXISTS fato_anulacao_extraorcamentario_deducao CASCADE;
DROP TABLE IF EXISTS fato_anulacao_extraorcamentario_fonte CASCADE;
DROP TABLE IF EXISTS fato_restos_pagar CASCADE;
DROP TABLE IF EXISTS fato_restos_pagar_liquidacao CASCADE;
DROP TABLE IF EXISTS fato_restos_pagar_encampacao CASCADE;
DROP TABLE IF EXISTS fato_conta_bancaria CASCADE;
DROP TABLE IF EXISTS fato_conta_bancaria_aplicacao CASCADE;
DROP TABLE IF EXISTS fato_conta_bancaria_encerramento CASCADE;
DROP TABLE IF EXISTS fato_conta_bancaria_saldo CASCADE;
DROP TABLE IF EXISTS fato_transferencia_bancaria CASCADE;
DROP TABLE IF EXISTS fato_transferencia_bancaria_destino CASCADE;
DROP TABLE IF EXISTS fato_transferencia_fonte CASCADE;
DROP TABLE IF EXISTS fato_transferencia_fonte_destino CASCADE;
DROP TABLE IF EXISTS fato_detalhamento_fonte_recurso CASCADE;
DROP TABLE IF EXISTS fato_divida_consolidada CASCADE;
DROP TABLE IF EXISTS fato_declaracao CASCADE;
DROP TABLE IF EXISTS fato_projecao_atuarial CASCADE;
DROP TABLE IF EXISTS fato_veiculo CASCADE;
DROP TABLE IF EXISTS fato_veiculo_uso CASCADE;
DROP TABLE IF EXISTS fato_estoque_combustivel CASCADE;
DROP TABLE IF EXISTS fato_estoque_combustivel_saida CASCADE;
DROP TABLE IF EXISTS fato_alteracao_ativo CASCADE;
DROP TABLE IF EXISTS fato_plano_contas_envio CASCADE;
DROP TABLE IF EXISTS fato_plano_contas_conta CASCADE;
DROP TABLE IF EXISTS fato_plano_contas_conta_analitica CASCADE;
DROP TABLE IF EXISTS fato_plano_contas_conta_fonte CASCADE;
DROP TABLE IF EXISTS fato_plano_contas_conta_vinculacao CASCADE;
DROP TABLE IF EXISTS fato_lancamento_contabil CASCADE;
DROP TABLE IF EXISTS fato_item_lancamento_contabil CASCADE;
DROP TABLE IF EXISTS fato_contrato CASCADE;
DROP TABLE IF EXISTS fato_contrato_responsavel CASCADE;
DROP TABLE IF EXISTS fato_contrato_item CASCADE;
DROP TABLE IF EXISTS fato_contrato_item_unidade CASCADE;
DROP TABLE IF EXISTS fato_contrato_aditivo CASCADE;
DROP TABLE IF EXISTS fato_contrato_publicacao CASCADE;
DROP TABLE IF EXISTS fato_informacao_sistema CASCADE;
DROP TABLE IF EXISTS fato_decreto CASCADE;
DROP TABLE IF EXISTS fato_licitacao CASCADE;
DROP TABLE IF EXISTS fato_licitacao_responsavel CASCADE;
DROP TABLE IF EXISTS fato_licitacao_item CASCADE;
DROP TABLE IF EXISTS fato_licitacao_publicacao CASCADE;
DROP TABLE IF EXISTS fato_dispensa_inexigibilidade CASCADE;
DROP TABLE IF EXISTS fato_dispensa_responsavel CASCADE;
DROP TABLE IF EXISTS fato_dispensa_item CASCADE;
DROP TABLE IF EXISTS fato_dispensa_publicacao CASCADE;
DROP TABLE IF EXISTS fato_dispensa_credor CASCADE;
DROP TABLE IF EXISTS fato_dispensa_aditivo CASCADE;
DROP TABLE IF EXISTS fato_responsavel_licitacao CASCADE;
DROP TABLE IF EXISTS fato_habilitacao_licitacao CASCADE;
DROP TABLE IF EXISTS fato_habilitacao_socio CASCADE;
DROP TABLE IF EXISTS fato_julgamento_licitacao CASCADE;
DROP TABLE IF EXISTS fato_julgamento_publicacao CASCADE;
DROP TABLE IF EXISTS fato_homologacao_licitacao CASCADE;
DROP TABLE IF EXISTS fato_homologacao_item CASCADE;
DROP TABLE IF EXISTS fato_homologacao_publicacao CASCADE;
DROP TABLE IF EXISTS fato_ata_registro_precos CASCADE;
DROP TABLE IF EXISTS fato_ata_registro_precos_item CASCADE;
DROP TABLE IF EXISTS fato_ata_registro_precos_orgao CASCADE;

-- =============================================================
-- IDE.10 → fato_identificacao_remessa
-- =============================================================
CREATE TABLE fato_identificacao_remessa (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout IDE.10
    cod_municipio     VARCHAR(4),
    tipo_balancete    VARCHAR(2),
    data_geracao      DATE
);

-- =============================================================
-- ORGAO.10 → fato_orgao
-- =============================================================
CREATE TABLE fato_orgao (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ORGAO.10
    cod_orgao             VARCHAR(2),
    cpf_gestor            VARCHAR(11),
    dt_inicio             DATE,
    dt_final              DATE,
    desc_orgao            VARCHAR(50),
    tipo_orgao            VARCHAR(2),
    cnpj_orgao            VARCHAR(14),
    nome_gestor           VARCHAR(50),
    cargo_gestor          VARCHAR(50),
    logra_res_gestor      VARCHAR(50),
    setor_logra_gestor    VARCHAR(20),
    cidade_logra_gestor   VARCHAR(20),
    uf_cidade_gestor      VARCHAR(2),
    cep_logra_gestor      VARCHAR(8),
    fone_gestor           VARCHAR(10),
    email_gestor          TEXT         -- 100 chars
);

-- =============================================================
-- UOC.10 → fato_unidade_orcamentaria
-- =============================================================
CREATE TABLE fato_unidade_orcamentaria (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout UOC.10
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    descricao         VARCHAR(50),
    num_consolidacao  VARCHAR(2)
);

-- =============================================================
-- UOC.11 → fato_uoc_responsavel
-- =============================================================
CREATE TABLE fato_uoc_responsavel (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout UOC.11
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    cpf_ordenador     VARCHAR(11),
    dt_inicio         DATE,
    tipo_responsavel  VARCHAR(1),
    dt_fim            DATE,
    nome_ordenador    VARCHAR(50),
    cargo_ordenador   VARCHAR(50),
    logra_res         VARCHAR(50),
    setor_logra       VARCHAR(20),
    cidade_logra      VARCHAR(20),
    uf_cidade         VARCHAR(2),
    cep               VARCHAR(8),
    fone              VARCHAR(10),
    email             TEXT,           -- 80 chars
    escolaridade      VARCHAR(2)
);

-- =============================================================
-- UOC.12 → fato_uoc_contador
-- =============================================================
CREATE TABLE fato_uoc_contador (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout UOC.12
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    cpf               VARCHAR(11),
    dt_inicio         DATE,
    dt_final          DATE,
    nome              VARCHAR(50),
    crc               VARCHAR(11),
    uf_crc            VARCHAR(2),
    provimento        VARCHAR(2),
    cnpj_empresa      VARCHAR(14),
    razao_social      VARCHAR(80),
    logra_res         VARCHAR(50),
    setor_logra       VARCHAR(20),
    cidade_logra      VARCHAR(20),
    uf_cidade         VARCHAR(2),
    cep               VARCHAR(8),
    fone              VARCHAR(10),
    email             TEXT,           -- 80 chars
    escolaridade      VARCHAR(2)
);

-- =============================================================
-- UOC.13 → fato_uoc_advogado_oab  (Responsável Controle Interno)
-- =============================================================
CREATE TABLE fato_uoc_advogado_oab (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout UOC.13
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    cpf               VARCHAR(11),
    dt_inicio         DATE,
    dt_final          DATE,
    nome              VARCHAR(50),
    logra_res         VARCHAR(50),
    setor_logra       VARCHAR(20),
    cidade_logra      VARCHAR(20),
    uf_cidade         VARCHAR(2),
    cep               VARCHAR(8),
    fone              VARCHAR(10),
    email             TEXT,           -- 80 chars
    escolaridade      VARCHAR(2)
);

-- =============================================================
-- UOC.14 → fato_uoc_advogado_nao_oab  (Responsável Setor Jurídico)
-- =============================================================
CREATE TABLE fato_uoc_advogado_nao_oab (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout UOC.14
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    cpf               VARCHAR(11),
    dt_inicio         DATE,
    dt_final          DATE,
    nome              VARCHAR(50),
    oab               VARCHAR(8),
    uf_oab            VARCHAR(2),
    provimento        VARCHAR(2),
    cnpj_empresa      VARCHAR(14),
    razao_social      VARCHAR(80),
    logra_res         VARCHAR(50),
    setor_logra       VARCHAR(20),
    cidade_logra      VARCHAR(20),
    uf_cidade         VARCHAR(2),
    cep               VARCHAR(8),
    fone              VARCHAR(10),
    email             TEXT            -- 80 chars
);

-- =============================================================
-- REC.10 → fato_receita
-- =============================================================
CREATE TABLE fato_receita (
    id                       SERIAL PRIMARY KEY,
    municipio_id             INTEGER NOT NULL,
    orgao_id                 INTEGER,
    ano_referencia           SMALLINT NOT NULL,
    mes_referencia           SMALLINT NOT NULL,
    remessa_id               INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout REC.10
    cod_orgao                VARCHAR(2),
    cod_unidade              VARCHAR(2),
    rubrica                  VARCHAR(9),
    especificacao            VARCHAR(100),
    vl_previsto_atualizado   NUMERIC(15,2),
    vl_arrecadado            NUMERIC(15,2),
    vl_acumulado             NUMERIC(15,2)
);

-- =============================================================
-- REC.11 → fato_receita_deducao
-- =============================================================
CREATE TABLE fato_receita_deducao (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout REC.11
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    rubrica           VARCHAR(9),
    banco             VARCHAR(3),
    agencia           VARCHAR(4),
    conta_corrente    VARCHAR(12),
    conta_corrente_dv VARCHAR(1),
    tipo_conta        VARCHAR(2),
    vl_recolhimento   NUMERIC(15,2)
);

-- =============================================================
-- REC.12 → fato_receita_fonte
-- =============================================================
CREATE TABLE fato_receita_fonte (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout REC.12
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    rubrica           VARCHAR(9),
    banco             VARCHAR(3),
    agencia           VARCHAR(4),
    conta_corrente    VARCHAR(12),
    conta_corrente_dv VARCHAR(1),
    tipo_conta        VARCHAR(2),
    cod_fonte_recurso VARCHAR(6),
    vl_fonte_recurso  NUMERIC(15,2)
);

-- =============================================================
-- ARE.10 → fato_anulacao_receita
-- =============================================================
CREATE TABLE fato_anulacao_receita (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ARE.10
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    rubrica           VARCHAR(9),
    vl_anulacao       NUMERIC(15,2),
    justificativa     TEXT            -- 255 chars
);

-- =============================================================
-- ARE.11 → fato_anulacao_receita_deducao
-- =============================================================
CREATE TABLE fato_anulacao_receita_deducao (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ARE.11
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    rubrica           VARCHAR(9),
    banco             VARCHAR(3),
    agencia           VARCHAR(4),
    conta_corrente    VARCHAR(12),
    conta_corrente_dv VARCHAR(1),
    tipo_conta        VARCHAR(2),
    vl_anulado        NUMERIC(15,2)
);

-- =============================================================
-- ARE.12 → fato_anulacao_receita_fonte
-- =============================================================
CREATE TABLE fato_anulacao_receita_fonte (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ARE.12
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    rubrica           VARCHAR(9),
    banco             VARCHAR(3),
    agencia           VARCHAR(4),
    conta_corrente    VARCHAR(12),
    conta_corrente_dv VARCHAR(1),
    tipo_conta        VARCHAR(2),
    cod_fonte_recurso VARCHAR(6),
    vl_anulado_fonte  NUMERIC(15,2)
);

-- =============================================================
-- AOC.10 → fato_alteracao_orcamentaria
-- =============================================================
CREATE TABLE fato_alteracao_orcamentaria (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AOC.10
    cod_programa         VARCHAR(4),
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    cod_funcao           VARCHAR(2),
    cod_subfuncao        VARCHAR(3),
    natureza_acao        VARCHAR(1),
    nro_proj_ativ        VARCHAR(3),
    vl_saldo_ant_orcado  NUMERIC(15,2),
    vl_saldo_atual       NUMERIC(15,2)
);

-- =============================================================
-- AOC.11 → fato_alteracao_orcamentaria_unidade
-- =============================================================
CREATE TABLE fato_alteracao_orcamentaria_unidade (
    id                    SERIAL PRIMARY KEY,
    municipio_id          INTEGER NOT NULL,
    orgao_id              INTEGER,
    ano_referencia        SMALLINT NOT NULL,
    mes_referencia        SMALLINT NOT NULL,
    remessa_id            INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AOC.11
    cod_programa          VARCHAR(4),
    cod_orgao             VARCHAR(2),
    cod_unidade           VARCHAR(2),
    cod_funcao            VARCHAR(2),
    cod_subfuncao         VARCHAR(3),
    natureza_acao         VARCHAR(1),
    nro_proj_ativ         VARCHAR(3),
    cod_natureza_despesa  VARCHAR(6),
    dt_alteracao          DATE,
    nr_alteracao          VARCHAR(3),
    tipo_alteracao        VARCHAR(2),
    vl_alteracao          NUMERIC(15,2),
    vl_saldo_ant_dotacao  NUMERIC(15,2),
    vl_saldo_atual        NUMERIC(15,2)
);

-- =============================================================
-- AOC.12 → fato_alteracao_orcamentaria_fonte
-- =============================================================
CREATE TABLE fato_alteracao_orcamentaria_fonte (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout AOC.12
    cod_programa         VARCHAR(4),
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    cod_funcao           VARCHAR(2),
    cod_subfuncao        VARCHAR(3),
    natureza_acao        VARCHAR(1),
    nro_proj_ativ        VARCHAR(3),
    cod_natureza_despesa VARCHAR(6),
    dt_alteracao         DATE,
    nr_alteracao         VARCHAR(3),
    tipo_alteracao       VARCHAR(2),
    cod_fonte_recurso    VARCHAR(3),
    vl_alteracao_fonte   NUMERIC(15,2),
    vl_saldo_ant_fonte   NUMERIC(15,2),
    vl_saldo_atual_fonte NUMERIC(15,2)
);

-- =============================================================
-- AOC.90-94 → fato_aoc_ato  (ato legal/publicação)
-- Consolida os 5 subtipos: suplementação, crédito especial,
-- remanejamento, alteração PPA, decreto
-- =============================================================
CREATE TABLE fato_aoc_ato (
    id                     SERIAL PRIMARY KEY,
    municipio_id           INTEGER NOT NULL,
    orgao_id               INTEGER,
    ano_referencia         SMALLINT NOT NULL,
    mes_referencia         SMALLINT NOT NULL,
    remessa_id             INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- discriminador
    subtipo                VARCHAR(2),   -- '90','91','92','93','94'
    -- AOC.90: lei suplementação
    nr_lei_suplementacao   VARCHAR(6),
    data_lei_suplementacao DATE,
    -- AOC.91: crédito especial
    nr_lei_credito_esp     VARCHAR(6),
    data_lei_credito_esp   DATE,
    -- AOC.92: remanejamento
    nr_lei_realoc          VARCHAR(6),
    data_lei_realoc        DATE,
    -- AOC.93: alt PPA
    nr_lei_alt_ppa         VARCHAR(6),
    data_lei_alt_ppa       DATE,
    -- AOC.94: decreto
    nr_decreto             VARCHAR(6),
    data_decreto           DATE,
    tipo_credito           VARCHAR(1),
    -- valor (presente em 90,91,92,94)
    vl_autorizado          NUMERIC(15,2),
    vl_decreto             NUMERIC(15,2)
);

-- =============================================================
-- COB.10 → fato_credito_orcamentario
-- =============================================================
CREATE TABLE fato_credito_orcamentario (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout COB.10
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    cod_obra          VARCHAR(4),
    ano_obra          SMALLINT,
    especificacao     VARCHAR(100),
    latitude          VARCHAR(8),
    longitude         VARCHAR(8),
    unidade_medida    VARCHAR(2),
    quantidade        VARCHAR(5),
    endereco_obra     VARCHAR(100),
    bairro_obra       VARCHAR(20),
    nome_fiscal       VARCHAR(50),
    cpf_fiscal        VARCHAR(11)
);

-- =============================================================
-- EMP.10 → fato_empenho
-- =============================================================
CREATE TABLE fato_empenho (
    id                        SERIAL PRIMARY KEY,
    municipio_id              INTEGER NOT NULL,
    orgao_id                  INTEGER,
    ano_referencia            SMALLINT NOT NULL,
    mes_referencia            SMALLINT NOT NULL,
    remessa_id                INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout EMP.10
    cod_programa              VARCHAR(4),
    cod_orgao                 VARCHAR(2),
    cod_unidade               VARCHAR(2),
    cod_funcao                VARCHAR(2),
    cod_subfuncao             VARCHAR(3),
    natureza_acao             VARCHAR(1),
    nro_proj_ativ             VARCHAR(3),
    elemento_despesa          VARCHAR(6),
    sub_elemento              VARCHAR(2),
    nro_empenho               VARCHAR(20),
    modalidade_licitacao      VARCHAR(2),
    fundamentacao_legal       VARCHAR(2),
    justificativa_dispensa    TEXT,       -- 213 chars
    razao_escolha             TEXT,       -- 282 chars
    nro_proc_licitacao        VARCHAR(8),
    ano_proc_licitacao        SMALLINT,
    nro_proc_adm              VARCHAR(20),
    nro_instrumento_contrato  VARCHAR(3),
    assunto                   VARCHAR(2),
    tp_empenho                VARCHAR(2),
    dt_empenho                DATE,
    vl_bruto                  NUMERIC(15,2),
    nome_credor               VARCHAR(50),
    tipo_credor               VARCHAR(1),
    cpf_cnpj_credor           VARCHAR(14),
    especificacao             TEXT,       -- 255 chars
    cpf_resp_empenho          VARCHAR(11),
    nome_resp_empenho         VARCHAR(35),
    id_colare                 VARCHAR(15)
);

-- =============================================================
-- EMP.11 → fato_empenho_beneficiario  (fonte de recurso do empenho)
-- =============================================================
CREATE TABLE fato_empenho_beneficiario (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout EMP.11
    cod_programa      VARCHAR(4),
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    cod_funcao        VARCHAR(2),
    cod_subfuncao     VARCHAR(3),
    natureza_acao     VARCHAR(1),
    nro_proj_ativ     VARCHAR(3),
    elemento_despesa  VARCHAR(6),
    sub_elemento      VARCHAR(2),
    nro_empenho       VARCHAR(20),
    cod_fonte_recurso VARCHAR(6),
    vl_recurso        NUMERIC(15,2)
);

-- =============================================================
-- EMP.12 → fato_empenho_fonte  (obra vinculada ao empenho)
-- =============================================================
CREATE TABLE fato_empenho_fonte (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout EMP.12
    cod_programa        VARCHAR(4),
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    cod_funcao          VARCHAR(2),
    cod_subfuncao       VARCHAR(3),
    natureza_acao       VARCHAR(1),
    nro_proj_ativ       VARCHAR(3),
    elemento_despesa    VARCHAR(6),
    sub_elemento        VARCHAR(2),
    nro_empenho         VARCHAR(20),
    cod_unidade_obra    VARCHAR(2),
    cod_obra            VARCHAR(4),
    ano_obra            SMALLINT,
    vl_associado_obra   NUMERIC(15,2)
);

-- =============================================================
-- EMP.13 → fato_empenho_contrato
-- =============================================================
CREATE TABLE fato_empenho_contrato (
    id                       SERIAL PRIMARY KEY,
    municipio_id             INTEGER NOT NULL,
    orgao_id                 INTEGER,
    ano_referencia           SMALLINT NOT NULL,
    mes_referencia           SMALLINT NOT NULL,
    remessa_id               INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout EMP.13
    cod_programa             VARCHAR(4),
    cod_orgao                VARCHAR(2),
    cod_unidade              VARCHAR(2),
    cod_funcao               VARCHAR(2),
    cod_subfuncao            VARCHAR(3),
    natureza_acao            VARCHAR(1),
    nro_proj_ativ            VARCHAR(3),
    elemento_despesa         VARCHAR(6),
    sub_elemento             VARCHAR(1),
    nro_empenho              VARCHAR(20),
    cod_unidade_contrato     VARCHAR(2),
    nro_contrato             VARCHAR(20),
    ano_contrato             SMALLINT,
    tipo_ajuste              VARCHAR(1),
    vl_associado_contrato    NUMERIC(15,2),
    id_colare                VARCHAR(15)
);

-- =============================================================
-- EMP.14 → fato_empenho_subelemento  (beneficiário/credor do empenho)
-- =============================================================
CREATE TABLE fato_empenho_subelemento (
    id                   SERIAL PRIMARY KEY,
    municipio_id         INTEGER NOT NULL,
    orgao_id             INTEGER,
    ano_referencia       SMALLINT NOT NULL,
    mes_referencia       SMALLINT NOT NULL,
    remessa_id           INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout EMP.14
    cod_programa         VARCHAR(4),
    cod_orgao            VARCHAR(2),
    cod_unidade          VARCHAR(2),
    cod_funcao           VARCHAR(2),
    cod_subfuncao        VARCHAR(3),
    natureza_acao        VARCHAR(1),
    nro_proj_ativ        VARCHAR(3),
    elemento_despesa     VARCHAR(6),
    sub_elemento         VARCHAR(2),
    nro_empenho          VARCHAR(20),
    cpf_cnpj_credor      VARCHAR(14),
    tipo_credor          VARCHAR(1),
    nome_credor          VARCHAR(50),
    vl_associado_credor  NUMERIC(15,2)
);

-- =============================================================
-- ANL.10 → fato_anulacao_empenho
-- =============================================================
CREATE TABLE fato_anulacao_empenho (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ANL.10
    cod_programa      VARCHAR(4),
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    cod_funcao        VARCHAR(2),
    cod_subfuncao     VARCHAR(3),
    natureza_acao     VARCHAR(1),
    nro_proj_ativ     VARCHAR(3),
    elemento_despesa  VARCHAR(6),
    sub_elemento      VARCHAR(2),
    nro_empenho       VARCHAR(20),
    dt_anulacao       DATE,
    nr_anulacao       VARCHAR(3),
    dt_empenho        DATE,
    vl_original       NUMERIC(15,2),
    vl_anulacao       NUMERIC(15,2),
    nome_credor       VARCHAR(50),
    tipo_credor       VARCHAR(1),
    cpf_cnpj          VARCHAR(14),
    especificacao     TEXT            -- 200 chars
);

-- =============================================================
-- ANL.11 → fato_anulacao_empenho_fonte
-- =============================================================
CREATE TABLE fato_anulacao_empenho_fonte (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ANL.11
    cod_programa        VARCHAR(4),
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    cod_funcao          VARCHAR(2),
    cod_subfuncao       VARCHAR(3),
    natureza_acao       VARCHAR(1),
    nro_proj_ativ       VARCHAR(3),
    elemento_despesa    VARCHAR(6),
    sub_elemento        VARCHAR(2),
    nro_empenho         VARCHAR(20),
    dt_anulacao         DATE,
    nr_anulacao         VARCHAR(3),
    cod_fonte_recurso   VARCHAR(6),
    vl_emp_fonte        NUMERIC(15,2),
    vl_anulacao_fonte   NUMERIC(15,2)
);

-- =============================================================
-- ANL.12 → fato_anulacao_empenho_subelemento  (obra)
-- =============================================================
CREATE TABLE fato_anulacao_empenho_subelemento (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ANL.12
    cod_programa      VARCHAR(4),
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    cod_funcao        VARCHAR(2),
    cod_subfuncao     VARCHAR(3),
    natureza_acao     VARCHAR(1),
    nro_proj_ativ     VARCHAR(3),
    elemento_despesa  VARCHAR(6),
    sub_elemento      VARCHAR(2),
    nro_empenho       VARCHAR(20),
    dt_anulacao       DATE,
    nr_anulacao       VARCHAR(3),
    cod_unidade_obra  VARCHAR(2),
    cod_obra          VARCHAR(4),
    ano_obra          SMALLINT,
    vl_anulado_obra   NUMERIC(15,2)
);

-- =============================================================
-- ANL.13 → fato_anulacao_empenho_contrato
-- =============================================================
CREATE TABLE fato_anulacao_empenho_contrato (
    id                     SERIAL PRIMARY KEY,
    municipio_id           INTEGER NOT NULL,
    orgao_id               INTEGER,
    ano_referencia         SMALLINT NOT NULL,
    mes_referencia         SMALLINT NOT NULL,
    remessa_id             INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ANL.13
    cod_programa           VARCHAR(4),
    cod_orgao              VARCHAR(2),
    cod_unidade            VARCHAR(2),
    cod_funcao             VARCHAR(2),
    cod_subfuncao          VARCHAR(3),
    natureza_acao          VARCHAR(1),
    nro_proj_ativ          VARCHAR(3),
    elemento_despesa       VARCHAR(6),
    sub_elemento           VARCHAR(2),
    nro_empenho            VARCHAR(20),
    dt_anulacao            DATE,
    nr_anulacao            VARCHAR(3),
    cod_unidade_contrato   VARCHAR(2),
    nro_contrato           VARCHAR(20),
    ano_contrato           SMALLINT,
    tipo_ajuste            VARCHAR(1),
    vl_anulado_contrato    NUMERIC(15,2)
);

-- =============================================================
-- ANL.14 → fato_anulacao_empenho_beneficiario
-- =============================================================
CREATE TABLE fato_anulacao_empenho_beneficiario (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout ANL.14
    cod_programa        VARCHAR(4),
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    cod_funcao          VARCHAR(2),
    cod_subfuncao       VARCHAR(3),
    natureza_acao       VARCHAR(1),
    nro_proj_ativ       VARCHAR(3),
    elemento_despesa    VARCHAR(6),
    sub_elemento        VARCHAR(2),
    nro_empenho         VARCHAR(20),
    dt_anulacao         DATE,
    nr_anulacao         VARCHAR(3),
    cpf_cnpj_credor     VARCHAR(14),
    tipo_credor         VARCHAR(1),
    nome_credor         VARCHAR(50),
    vl_anulado_credor   NUMERIC(15,2)
);

-- =============================================================
-- EOC.10 → fato_estorno_contabilizacao
-- =============================================================
CREATE TABLE fato_estorno_contabilizacao (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout EOC.10
    cod_programa      VARCHAR(4),
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    cod_funcao        VARCHAR(2),
    cod_subfuncao     VARCHAR(3),
    natureza_acao     VARCHAR(1),
    nro_proj_ativ     VARCHAR(3),
    elemento_despesa  VARCHAR(6),
    sub_elemento      VARCHAR(2),
    nro_empenho       VARCHAR(20)
);

-- =============================================================
-- EOC.11 → fato_estorno_contabilizacao_fonte  (vínculo empenho x obra)
-- =============================================================
CREATE TABLE fato_estorno_contabilizacao_fonte (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout EOC.11
    cod_programa        VARCHAR(4),
    cod_orgao           VARCHAR(2),
    cod_unidade         VARCHAR(2),
    cod_funcao          VARCHAR(2),
    cod_subfuncao       VARCHAR(3),
    natureza_acao       VARCHAR(1),
    nro_proj_ativ       VARCHAR(3),
    elemento_despesa    VARCHAR(6),
    sub_elemento        VARCHAR(2),
    nro_empenho         VARCHAR(20),
    cod_unidade_obra    VARCHAR(2),
    cod_obra            VARCHAR(4),
    ano_obra            SMALLINT,
    vl_associado_obra   NUMERIC(15,2)
);

-- =============================================================
-- EOC.12 → fato_estorno_contabilizacao_documento  (vínculo empenho x contrato)
-- =============================================================
CREATE TABLE fato_estorno_contabilizacao_documento (
    id                       SERIAL PRIMARY KEY,
    municipio_id             INTEGER NOT NULL,
    orgao_id                 INTEGER,
    ano_referencia           SMALLINT NOT NULL,
    mes_referencia           SMALLINT NOT NULL,
    remessa_id               INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout EOC.12
    cod_programa             VARCHAR(4),
    cod_orgao                VARCHAR(2),
    cod_unidade              VARCHAR(2),
    cod_funcao               VARCHAR(2),
    cod_subfuncao            VARCHAR(3),
    natureza_acao            VARCHAR(1),
    nro_proj_ativ            VARCHAR(3),
    elemento_despesa         VARCHAR(6),
    sub_elemento             VARCHAR(2),
    nro_empenho              VARCHAR(20),
    cod_unidade_contrato     VARCHAR(2),
    nro_contrato             VARCHAR(20),
    ano_contrato             SMALLINT,
    tipo_ajuste              VARCHAR(1),
    vl_associado_contrato    NUMERIC(15,2)
);

-- =============================================================
-- LQD.10 → fato_liquidacao
-- =============================================================
CREATE TABLE fato_liquidacao (
    id                        SERIAL PRIMARY KEY,
    municipio_id              INTEGER NOT NULL,
    orgao_id                  INTEGER,
    ano_referencia            SMALLINT NOT NULL,
    mes_referencia            SMALLINT NOT NULL,
    remessa_id                INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout LQD.10
    cod_programa              VARCHAR(4),
    cod_orgao                 VARCHAR(2),
    cod_unidade               VARCHAR(2),
    cod_funcao                VARCHAR(2),
    cod_subfuncao             VARCHAR(3),
    natureza_acao             VARCHAR(1),
    nro_proj_ativ             VARCHAR(3),
    elemento_despesa          VARCHAR(6),
    sub_elemento              VARCHAR(2),
    dot_orig_p2001            VARCHAR(21),
    nro_empenho               VARCHAR(20),
    dt_empenho                DATE,
    nr_liquidacao             VARCHAR(6),
    dt_liquidacao             DATE,
    tp_liquidacao             VARCHAR(1),
    vl_liquidado              NUMERIC(15,2),
    resp_liquidacao           VARCHAR(50),
    cpf_resp_liquidacao       VARCHAR(11),
    especificacao_liquidacao  TEXT        -- 200 chars
);

-- =============================================================
-- LQD.11 → fato_liquidacao_deducao  (fonte de recurso da liquidação)
-- =============================================================
CREATE TABLE fato_liquidacao_deducao (
    id                SERIAL PRIMARY KEY,
    municipio_id      INTEGER NOT NULL,
    orgao_id          INTEGER,
    ano_referencia    SMALLINT NOT NULL,
    mes_referencia    SMALLINT NOT NULL,
    remessa_id        INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout LQD.11
    cod_programa      VARCHAR(4),
    cod_orgao         VARCHAR(2),
    cod_unidade       VARCHAR(2),
    cod_funcao        VARCHAR(2),
    cod_subfuncao     VARCHAR(3),
    natureza_acao     VARCHAR(1),
    nro_proj_ativ     VARCHAR(3),
    elemento_despesa  VARCHAR(6),
    sub_elemento      VARCHAR(2),
    dot_orig_p2001    VARCHAR(21),
    nro_empenho       VARCHAR(20),
    dt_empenho        DATE,
    nr_liquidacao     VARCHAR(6),
    dt_liquidacao     DATE,
    cod_fonte_recurso VARCHAR(6),
    vl_despesa_fr     NUMERIC(15,2)
);

-- =============================================================
-- LQD.12 → fato_liquidacao_credor_rsp  (documento fiscal)
-- =============================================================
CREATE TABLE fato_liquidacao_credor_rsp (
    id                  SERIAL PRIMARY KEY,
    municipio_id        INTEGER NOT NULL,
    orgao_id            INTEGER,
    ano_referencia      SMALLINT NOT NULL,
    mes_referencia      SMALLINT NOT NULL,
    remessa_id          INTEGER NOT NULL REFERENCES tcmgo_remessa(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos do layout LQD.12
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
    dt_empenho          DATE,
    nr_liquidacao       VARCHAR(6),
    dt_liquidacao       DATE,
    tipo_doc_fiscal     VARCHAR(2),
    nro_doc_fiscal      VARCHAR(10),
    serie_doc_fiscal    VARCHAR(8),
    dt_doc_fiscal       DATE,
    chave_acesso        VARCHAR(44),
    vl_doc_valor_total  NUMERIC(15,2),
    vl_doc_associado    NUMERIC(15,2),
    cnpj_cpf_credor     VARCHAR(14),
    tipo_credor         VARCHAR(1),
    nr_insc_estadual    VARCHAR(15),
    nr_insc_municipal   VARCHAR(15),
    cep_municipio       VARCHAR(8),
    uf_credor           VARCHAR(2),
    nome_credor         VARCHAR(50)
);

COMMIT;
