-- ============================================================
-- SCRIPT SQL CONSOLIDADO FINAL v5.2
-- Sistema de Importação TCM-GO 2025
-- PostgreSQL
--
-- Integrado ao sistema existente:
--   tcmgo_municipios, tcmgo_orgaos, clientes, users
--
-- CHANGELOG v5.2 (sobre v5.1):
--   1. Dimensões (dim_*): remessa_id agora é nullable +
--      ON DELETE SET NULL (dimensões sobrevivem à exclusão
--      da remessa que as criou)
--   2. fn_limpar_staging_antigas: corrigido bug de contagem
--      (v_staging_removidas era sempre 0); agora itera
--      dinamicamente sobre TODAS as ~100 tabelas stg_* via
--      information_schema, contando corretamente as linhas
--   3. fn_excluir_remessa mantida como uso excepcional
--   4. Revisão futura sugerida: avaliar se dim_* devem
--      manter remessa_id ou se basta municipio_id +
--      ano_referencia para rastreabilidade
--
-- CHANGELOG v5.1 (sobre v5.0):
--   1. dim_tempo: removida definição duplicada/quebrada
--   2. TIMESTAMPTZ em todos os campos de data/hora
--   3. importado_por_user_id FK + importado_por_nome textual
--   4. UNIQUE em fato_movimentacao_bancaria
--   5. tcmgo_auditoria sem CASCADE
--   6. fn_excluir_remessa registra em tcmgo_auditoria
--   7. fn_reimportar_balancete sem opção de exclusão
--   8. fn_limpar_staging_antigas (política 90 dias)
--   9. Nenhum DROP INDEX; UNIQUE inline desde a criação
--  10. Nenhuma definição duplicada ou bloco incompleto
--
-- PREMISSA: As tabelas tcmgo_municipios, tcmgo_orgaos,
-- clientes e users já existem no banco.
-- ============================================================

BEGIN;

-- ============================================================
-- CAMADA 2: CONTROLE (Remessa e Rastreabilidade)
-- ============================================================

CREATE TABLE IF NOT EXISTS tcmgo_remessa (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    tipo_balancete          VARCHAR(2),
    versao                  SMALLINT NOT NULL DEFAULT 1,
    ativa                   BOOLEAN NOT NULL DEFAULT TRUE,
    remessa_anterior_id     INTEGER REFERENCES tcmgo_remessa(id),
    hash_zip                VARCHAR(64),
    nome_arquivo_zip        VARCHAR(255),
    tamanho_zip_bytes       BIGINT,
    total_arquivos_txt      SMALLINT DEFAULT 0,
    total_linhas            INTEGER DEFAULT 0,
    total_erros             INTEGER DEFAULT 0,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pendente'
                            CHECK (status IN (
                                'pendente','recebida','processando',
                                'staging_pronta','concluida','erro','substituida'
                            )),
    importado_por_user_id   UUID REFERENCES usuarios(id),
    importado_por_nome      VARCHAR(100),
    iniciado_em             TIMESTAMPTZ,
    concluido_em            TIMESTAMPTZ,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(orgao_id, ano_referencia, mes_referencia, versao)
);

CREATE INDEX idx_remessa_municipio ON tcmgo_remessa(municipio_id);
CREATE INDEX idx_remessa_orgao_periodo ON tcmgo_remessa(orgao_id, ano_referencia, mes_referencia);

-- Índice único parcial: GARANTE no máximo UMA remessa ativa
-- por município + órgão + ano + mês
CREATE UNIQUE INDEX idx_remessa_unica_ativa
    ON tcmgo_remessa (municipio_id, orgao_id, ano_referencia, mes_referencia)
    WHERE ativa = TRUE;

CREATE TABLE IF NOT EXISTS tcmgo_arquivo_remessa (
    id                      SERIAL PRIMARY KEY,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    sigla_arquivo           VARCHAR(5) NOT NULL,
    nome_arquivo            VARCHAR(50) NOT NULL,
    tamanho_bytes           BIGINT,
    total_linhas            INTEGER DEFAULT 0,
    total_registros         INTEGER DEFAULT 0,
    total_erros             INTEGER DEFAULT 0,
    ordem_processamento     SMALLINT,
    hash_arquivo            VARCHAR(64),
    status                  VARCHAR(20) NOT NULL DEFAULT 'pendente'
                            CHECK (status IN ('pendente','processando','concluido','erro')),
    tempo_processamento_ms  INTEGER,
    mensagem_tecnica        TEXT,
    processado_em           TIMESTAMPTZ,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_arq_remessa ON tcmgo_arquivo_remessa(remessa_id);
CREATE INDEX idx_arq_sigla ON tcmgo_arquivo_remessa(sigla_arquivo);

CREATE TABLE IF NOT EXISTS tcmgo_erro_importacao (
    id                      SERIAL PRIMARY KEY,
    arquivo_remessa_id      INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha            INTEGER NOT NULL,
    tipo_registro           VARCHAR(2),
    campo_erro              VARCHAR(50),
    valor_encontrado        TEXT,
    valor_esperado          TEXT,
    mensagem_erro           TEXT NOT NULL,
    severidade              VARCHAR(10) NOT NULL DEFAULT 'erro'
                            CHECK (severidade IN ('aviso','erro','critico')),
    tipo_erro               VARCHAR(20) NOT NULL DEFAULT 'parse'
                            CHECK (tipo_erro IN ('estrutural','parse','validacao','regra_negocio')),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_erro_arquivo ON tcmgo_erro_importacao(arquivo_remessa_id);

CREATE TABLE IF NOT EXISTS tcmgo_historico_processamento (
    id                      SERIAL PRIMARY KEY,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    evento                  VARCHAR(50) NOT NULL,
    descricao               TEXT,
    dados_extras            JSONB,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hist_remessa ON tcmgo_historico_processamento(remessa_id);

-- Tabela de auditoria independente (SEM FK CASCADE)
-- Sobrevive à exclusão física da remessa
CREATE TABLE IF NOT EXISTS tcmgo_auditoria (
    id                      SERIAL PRIMARY KEY,
    remessa_id              INTEGER,
    municipio_id            INTEGER,
    orgao_id                INTEGER,
    ano_referencia          SMALLINT,
    mes_referencia          SMALLINT,
    versao                  SMALLINT,
    evento                  VARCHAR(50) NOT NULL,
    descricao               TEXT,
    dados_extras            JSONB,
    executado_por_user_id   UUID,
    executado_por_nome      VARCHAR(100),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auditoria_remessa ON tcmgo_auditoria(remessa_id);
CREATE INDEX idx_auditoria_municipio ON tcmgo_auditoria(municipio_id, ano_referencia, mes_referencia);

-- ============================================================
-- CAMADA 2.5: METADADOS DO LAYOUT
-- ============================================================

CREATE TABLE IF NOT EXISTS tcmgo_layout_arquivo (
    id              SERIAL PRIMARY KEY,
    sigla           VARCHAR(5) NOT NULL UNIQUE,
    descricao       VARCHAR(120) NOT NULL,
    grupo           VARCHAR(30),
    obrigatorio     BOOLEAN NOT NULL DEFAULT TRUE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    ano_layout      SMALLINT NOT NULL DEFAULT 2025,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tcmgo_layout_registro (
    id                  SERIAL PRIMARY KEY,
    layout_arquivo_id   INTEGER NOT NULL REFERENCES tcmgo_layout_arquivo(id),
    tipo_registro       VARCHAR(2) NOT NULL,
    descricao           VARCHAR(120) NOT NULL,
    ocorrencia          VARCHAR(20) DEFAULT 'multipla',
    tabela_staging      VARCHAR(60),
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(layout_arquivo_id, tipo_registro)
);

CREATE TABLE IF NOT EXISTS tcmgo_layout_campo (
    id                  SERIAL PRIMARY KEY,
    layout_registro_id  INTEGER NOT NULL REFERENCES tcmgo_layout_registro(id),
    nome_campo          VARCHAR(60) NOT NULL,
    posicao_inicio      SMALLINT NOT NULL,
    posicao_fim         SMALLINT NOT NULL,
    tamanho             SMALLINT NOT NULL,
    tipo_dado           VARCHAR(20) NOT NULL DEFAULT 'texto',
    obrigatorio         BOOLEAN NOT NULL DEFAULT FALSE,
    observacao          VARCHAR(200),
    ordem               SMALLINT NOT NULL,
    UNIQUE(layout_registro_id, nome_campo)
);

CREATE INDEX idx_layout_campo_registro ON tcmgo_layout_campo(layout_registro_id);

INSERT INTO tcmgo_layout_arquivo (sigla, descricao, grupo) VALUES
    ('IDE', 'Identificação do Município', 'orcamento'),
    ('ORGAO', 'Órgão e Gestor', 'orcamento'),
    ('UOC', 'Unidades Orçamentárias', 'orcamento'),
    ('REC', 'Receita Orçamentária', 'orcamento'),
    ('ARE', 'Anulação de Receita', 'orcamento'),
    ('AOC', 'Alteração Orçamentária', 'orcamento'),
    ('COB', 'Obras', 'orcamento'),
    ('EMP', 'Empenhos', 'despesa'),
    ('ANL', 'Anulação de Empenhos', 'despesa'),
    ('EOC', 'Empenho de Obras', 'despesa'),
    ('LQD', 'Liquidações', 'despesa'),
    ('ALQ', 'Anulação de Liquidações', 'despesa'),
    ('OPS', 'Ordens de Pagamento', 'despesa'),
    ('AOP', 'Anulação de Ordens de Pagamento', 'despesa'),
    ('EXT', 'Extraorçamentárias', 'despesa'),
    ('AEX', 'Anulação de Extraorçamentárias', 'despesa'),
    ('RSP', 'Restos a Pagar', 'despesa'),
    ('CTB', 'Contas Bancárias', 'contabilidade'),
    ('TRB', 'Transferências Bancárias', 'contabilidade'),
    ('TFR', 'Transferências de Fonte de Recurso', 'contabilidade'),
    ('DFR', 'Detalhamento de Fonte de Recurso', 'contabilidade'),
    ('DIC', 'Dívida Consolidada Interna', 'contabilidade'),
    ('DCL', 'Dados Complementares', 'contabilidade'),
    ('PAR', 'Projeção Atuarial', 'contabilidade'),
    ('CVC', 'Cadastro de Veículos e Combustíveis', 'contabilidade'),
    ('ECL', 'Estoque de Combustíveis e Lubrificantes', 'contabilidade'),
    ('AAL', 'Alteração de Alocação', 'contabilidade'),
    ('PCT', 'Plano de Contas', 'contabilidade'),
    ('LNC', 'Lançamentos Contábeis', 'contabilidade'),
    ('CON', 'Contratos', 'contabilidade'),
    ('ISI', 'Identificação do Sistema', 'contabilidade'),
    ('ABL', 'Abertura de Licitação', 'licitacao'),
    ('DSI', 'Dispensa/Inexigibilidade', 'licitacao'),
    ('DMR', 'Decreto de Abertura de Crédito', 'licitacao'),
    ('RPL', 'Resultado Preliminar de Licitação', 'licitacao'),
    ('HBL', 'Habilitação de Licitação', 'licitacao'),
    ('JGL', 'Julgamento de Licitação', 'licitacao'),
    ('HML', 'Homologação de Licitação', 'licitacao'),
    ('ARP', 'Ata de Registro de Preços', 'licitacao')
ON CONFLICT (sigla) DO NOTHING;

-- ============================================================
-- CAMADA 3.0: STAGING BRUTA UNIVERSAL
-- ============================================================

CREATE TABLE IF NOT EXISTS stg_linha_bruta (
    id                      SERIAL PRIMARY KEY,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id      INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha            INTEGER NOT NULL,
    tipo_registro           VARCHAR(2),
    conteudo_linha          TEXT NOT NULL,
    sigla_arquivo           VARCHAR(3),
    hash_linha              VARCHAR(64),
    status_parse            VARCHAR(20) NOT NULL DEFAULT 'pendente'
                            CHECK (status_parse IN (
                                'pendente','parseado','erro_estrutural',
                                'erro_tipo','erro_regra_negocio','ignorado'
                            )),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stg_bruta_remessa ON stg_linha_bruta(remessa_id);
CREATE INDEX idx_stg_bruta_arquivo ON stg_linha_bruta(arquivo_remessa_id);
CREATE INDEX idx_stg_bruta_pendente ON stg_linha_bruta(status_parse) WHERE status_parse = 'pendente';
CREATE INDEX idx_stg_bruta_sigla_status ON stg_linha_bruta(remessa_id, sigla_arquivo, status_parse);
CREATE INDEX idx_stg_bruta_hash ON stg_linha_bruta(hash_linha);

-- CAMADA 3.1: STAGING PARSEADA - GRUPO 1: Estrutura Orçamentária
-- ============================================================

-- IDE.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_ide_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_municipio VARCHAR(4), tipo_balancete VARCHAR(2),
    ano_referencia VARCHAR(4), mes_referencia VARCHAR(2), data_geracao VARCHAR(8),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ide_10_remessa ON stg_ide_10(remessa_id);

-- ORGAO.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_orgao_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cpf_gestor VARCHAR(11),
    dt_inicio VARCHAR(8), dt_final VARCHAR(8), desc_orgao VARCHAR(50),
    tipo_orgao VARCHAR(2), cnpj_orgao VARCHAR(14), nome_gestor VARCHAR(50),
    cargo_gestor VARCHAR(50), logra_res_gestor VARCHAR(50), setor_logra_gestor VARCHAR(20),
    cidade_logra_gestor VARCHAR(20), uf_cidade_gestor VARCHAR(2), cep_logra_gestor VARCHAR(8),
    fone_gestor VARCHAR(10), email_gestor VARCHAR(100),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_orgao_10_remessa ON stg_orgao_10(remessa_id);

-- UOC.txt Reg 10-14
CREATE TABLE IF NOT EXISTS stg_uoc_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    descricao VARCHAR(50), num_consolidacao VARCHAR(2),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_uoc_10_remessa ON stg_uoc_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_uoc_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    cpf_ordenador VARCHAR(11), data_inicio VARCHAR(8), tipo_responsavel VARCHAR(1),
    nome_ordenador VARCHAR(50), cargo_ordenador VARCHAR(50), data_final VARCHAR(8),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_uoc_11_remessa ON stg_uoc_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_uoc_12 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    cpf_controle_int VARCHAR(11), data_inicio VARCHAR(8),
    nome_controle_int VARCHAR(50), cargo_controle_int VARCHAR(50), data_final VARCHAR(8),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_uoc_12_remessa ON stg_uoc_12(remessa_id);

CREATE TABLE IF NOT EXISTS stg_uoc_13 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    cpf_ordenador_desp VARCHAR(11), data_inicio VARCHAR(8),
    nome_ordenador_desp VARCHAR(50), cargo_ordenador_desp VARCHAR(50), data_final VARCHAR(8),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_uoc_13_remessa ON stg_uoc_13(remessa_id);

CREATE TABLE IF NOT EXISTS stg_uoc_14 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    cpf_contador VARCHAR(11), crc_contador VARCHAR(15), data_inicio VARCHAR(8),
    nome_contador VARCHAR(50), data_final VARCHAR(8),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_uoc_14_remessa ON stg_uoc_14(remessa_id);

-- REC.txt Reg 10-12
CREATE TABLE IF NOT EXISTS stg_rec_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    rubrica VARCHAR(9), especificacao VARCHAR(100),
    vl_previsto_atualizado VARCHAR(13), vl_arrecadado VARCHAR(13), vl_acumulado VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rec_10_remessa ON stg_rec_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_rec_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    rubrica VARCHAR(9), banco VARCHAR(3), agencia VARCHAR(4),
    conta_corrente VARCHAR(12), conta_corrente_dv VARCHAR(1), tipo_conta VARCHAR(2),
    vl_recolhimento VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rec_11_remessa ON stg_rec_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_rec_12 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    rubrica VARCHAR(9), banco VARCHAR(3), agencia VARCHAR(4),
    conta_corrente VARCHAR(12), conta_corrente_dv VARCHAR(1), tipo_conta VARCHAR(2),
    cod_fonte_recurso VARCHAR(6), vl_fonte_recurso VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rec_12_remessa ON stg_rec_12(remessa_id);

-- ARE.txt Reg 10-11
CREATE TABLE IF NOT EXISTS stg_are_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    rubrica VARCHAR(9), dt_anulacao VARCHAR(8), vl_anulacao VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_are_10_remessa ON stg_are_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_are_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    rubrica VARCHAR(9), dt_anulacao VARCHAR(8),
    cod_fonte_recurso VARCHAR(6), vl_anulacao_fonte VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_are_11_remessa ON stg_are_11(remessa_id);

-- AOC.txt Reg 10, 11, 90-94
CREATE TABLE IF NOT EXISTS stg_aoc_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_programa VARCHAR(4), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    cod_funcao VARCHAR(2), cod_subfuncao VARCHAR(3), natureza_acao VARCHAR(1),
    nro_proj_ativ VARCHAR(3), elemento_despesa VARCHAR(6), sub_elemento VARCHAR(2),
    vl_dotacao_inicial VARCHAR(13), vl_suplementacao VARCHAR(13), vl_reducao VARCHAR(13),
    vl_credito_especial VARCHAR(13), vl_credito_extraordinario VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_aoc_10_remessa ON stg_aoc_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_aoc_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_programa VARCHAR(4), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    cod_funcao VARCHAR(2), cod_subfuncao VARCHAR(3), natureza_acao VARCHAR(1),
    nro_proj_ativ VARCHAR(3), elemento_despesa VARCHAR(6), sub_elemento VARCHAR(2),
    cod_fonte_recurso VARCHAR(6), vl_dotacao_inicial VARCHAR(13), vl_suplementacao VARCHAR(13),
    vl_reducao VARCHAR(13), vl_credito_especial VARCHAR(13), vl_credito_extraordinario VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_aoc_11_remessa ON stg_aoc_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_aoc_90 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), nr_lei_suplementacao VARCHAR(6),
    data_lei_suplementacao VARCHAR(8), vl_autorizado VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stg_aoc_91 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), nr_lei_credito_esp VARCHAR(6),
    data_lei_credito_esp VARCHAR(8), vl_autorizado VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stg_aoc_92 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), nr_lei_realoc VARCHAR(6),
    data_lei_realoc VARCHAR(8), vl_autorizado VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stg_aoc_93 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), nr_lei_alt_ppa VARCHAR(6),
    data_lei_alt_ppa VARCHAR(8),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stg_aoc_94 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), nr_decreto VARCHAR(6), data_decreto VARCHAR(8),
    vl_decreto VARCHAR(13), tipo_credito VARCHAR(1),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- COB.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_cob_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    cod_obra VARCHAR(4), ano_obra VARCHAR(4), especificacao VARCHAR(100),
    latitude VARCHAR(8), longitude VARCHAR(8), unidade_medida VARCHAR(2),
    quantidade VARCHAR(5), endereco_obra VARCHAR(100), bairro_obra VARCHAR(20),
    nome_fiscal VARCHAR(50), cpf_fiscal VARCHAR(11),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_cob_10_remessa ON stg_cob_10(remessa_id);


-- ============================================================
-- CAMADA 3.1: STAGING PARSEADA - GRUPO 2: Despesa
-- ============================================================

-- EMP.txt Reg 10-14
CREATE TABLE IF NOT EXISTS stg_emp_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    cod_programa VARCHAR(4), cod_funcao VARCHAR(2), cod_subfuncao VARCHAR(3),
    natureza_acao VARCHAR(1), nro_proj_ativ VARCHAR(3), elemento_despesa VARCHAR(6),
    sub_elemento VARCHAR(2), nro_empenho VARCHAR(6), modalidade_licitacao VARCHAR(2),
    tp_empenho VARCHAR(1), dt_empenho VARCHAR(8), vl_bruto VARCHAR(13),
    tipo_credor VARCHAR(1), cpf_cnpj_credor VARCHAR(14), nome_credor VARCHAR(50),
    especificacao VARCHAR(255), nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    id_colare VARCHAR(15),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_emp_10_remessa ON stg_emp_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_emp_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), nro_item VARCHAR(4), desc_item VARCHAR(200),
    unidade_item VARCHAR(10), qtd_item VARCHAR(10), vl_unitario VARCHAR(13),
    vl_total VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_emp_11_remessa ON stg_emp_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_emp_12 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), cod_fonte_recurso VARCHAR(6), vl_recurso VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_emp_12_remessa ON stg_emp_12(remessa_id);

CREATE TABLE IF NOT EXISTS stg_emp_13 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), nro_contrato VARCHAR(20), ano_contrato VARCHAR(4),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_emp_13_remessa ON stg_emp_13(remessa_id);

CREATE TABLE IF NOT EXISTS stg_emp_14 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), nro_convenio VARCHAR(20), ano_convenio VARCHAR(4),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_emp_14_remessa ON stg_emp_14(remessa_id);

-- ANL.txt Reg 10-14
CREATE TABLE IF NOT EXISTS stg_anl_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), dt_anulacao VARCHAR(8), nr_anulacao VARCHAR(3),
    vl_original VARCHAR(13), vl_anulacao VARCHAR(13),
    tipo_credor VARCHAR(1), cpf_cnpj_credor VARCHAR(14), nome_credor VARCHAR(50),
    especificacao VARCHAR(200),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_anl_10_remessa ON stg_anl_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_anl_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), nr_anulacao VARCHAR(3), nro_item VARCHAR(4),
    desc_item VARCHAR(200), unidade_item VARCHAR(10), qtd_item VARCHAR(10),
    vl_unitario VARCHAR(13), vl_total VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_anl_11_remessa ON stg_anl_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_anl_12 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), nr_anulacao VARCHAR(3),
    cod_fonte_recurso VARCHAR(6), vl_recurso VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_anl_12_remessa ON stg_anl_12(remessa_id);

CREATE TABLE IF NOT EXISTS stg_anl_13 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), nr_anulacao VARCHAR(3),
    nro_contrato VARCHAR(20), ano_contrato VARCHAR(4),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_anl_13_remessa ON stg_anl_13(remessa_id);

CREATE TABLE IF NOT EXISTS stg_anl_14 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), nr_anulacao VARCHAR(3),
    nro_convenio VARCHAR(20), ano_convenio VARCHAR(4),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_anl_14_remessa ON stg_anl_14(remessa_id);

-- EOC.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_eoc_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), cod_obra VARCHAR(4), ano_obra VARCHAR(4),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_eoc_10_remessa ON stg_eoc_10(remessa_id);

-- LQD.txt Reg 10-12
CREATE TABLE IF NOT EXISTS stg_lqd_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_liquidacao VARCHAR(6), dt_liquidacao VARCHAR(8), vl_liquidacao VARCHAR(13),
    tipo_doc_fiscal VARCHAR(2), nro_doc_fiscal VARCHAR(15),
    tipo_credor VARCHAR(1), cpf_cnpj_credor VARCHAR(14), nome_credor VARCHAR(50),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_lqd_10_remessa ON stg_lqd_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_lqd_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_liquidacao VARCHAR(6), cpf_cnpj_retencao VARCHAR(14),
    tipo_retencao VARCHAR(2), vl_retencao VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_lqd_11_remessa ON stg_lqd_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_lqd_12 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_liquidacao VARCHAR(6), cod_fonte_recurso VARCHAR(6), vl_fonte_recurso VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_lqd_12_remessa ON stg_lqd_12(remessa_id);

-- ALQ.txt Reg 10-11
CREATE TABLE IF NOT EXISTS stg_alq_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_liquidacao VARCHAR(6), dt_anulacao VARCHAR(8), vl_anulacao VARCHAR(13),
    tipo_credor VARCHAR(1), cpf_cnpj_credor VARCHAR(14), nome_credor VARCHAR(50),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_alq_10_remessa ON stg_alq_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_alq_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_liquidacao VARCHAR(6), dt_anulacao VARCHAR(8),
    cod_fonte_recurso VARCHAR(6), vl_anulacao_fonte VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_alq_11_remessa ON stg_alq_11(remessa_id);


-- OPS.txt Reg 10-14
CREATE TABLE IF NOT EXISTS stg_ops_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_liquidacao VARCHAR(6), nro_op VARCHAR(6), dt_pagamento VARCHAR(8),
    vl_pagamento VARCHAR(13), tipo_credor VARCHAR(1),
    cpf_cnpj_credor VARCHAR(14), nome_credor VARCHAR(50),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ops_10_remessa ON stg_ops_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_ops_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_op VARCHAR(6), banco VARCHAR(3), agencia VARCHAR(4),
    conta_corrente VARCHAR(12), conta_corrente_dv VARCHAR(1), tipo_conta VARCHAR(2),
    vl_conta VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ops_11_remessa ON stg_ops_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_ops_12 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_op VARCHAR(6), cpf_cnpj_retencao VARCHAR(14),
    tipo_retencao VARCHAR(2), vl_retencao VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ops_12_remessa ON stg_ops_12(remessa_id);

CREATE TABLE IF NOT EXISTS stg_ops_13 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_op VARCHAR(6), cod_fonte_recurso VARCHAR(6), vl_fonte_recurso VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ops_13_remessa ON stg_ops_13(remessa_id);

CREATE TABLE IF NOT EXISTS stg_ops_14 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_op VARCHAR(6), tipo_doc_pagamento VARCHAR(2), nro_doc_pagamento VARCHAR(20),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ops_14_remessa ON stg_ops_14(remessa_id);

-- AOP.txt Reg 10-11
CREATE TABLE IF NOT EXISTS stg_aop_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_op VARCHAR(6), dt_anulacao VARCHAR(8), vl_anulacao VARCHAR(13),
    tipo_credor VARCHAR(1), cpf_cnpj_credor VARCHAR(14), nome_credor VARCHAR(50),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_aop_10_remessa ON stg_aop_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_aop_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_op VARCHAR(6), dt_anulacao VARCHAR(8),
    cod_fonte_recurso VARCHAR(6), vl_anulacao_fonte VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_aop_11_remessa ON stg_aop_11(remessa_id);

-- EXT.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_ext_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_extra VARCHAR(6), dt_pagamento VARCHAR(8), vl_pagamento VARCHAR(13),
    tipo_credor VARCHAR(1), cpf_cnpj_credor VARCHAR(14), nome_credor VARCHAR(50),
    conta_contabil VARCHAR(20), especificacao VARCHAR(255),
    banco VARCHAR(3), agencia VARCHAR(4), conta_corrente VARCHAR(12),
    conta_corrente_dv VARCHAR(1), tipo_conta VARCHAR(2),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ext_10_remessa ON stg_ext_10(remessa_id);

-- AEX.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_aex_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_extra VARCHAR(6), dt_anulacao VARCHAR(8), vl_anulacao VARCHAR(13),
    tipo_credor VARCHAR(1), cpf_cnpj_credor VARCHAR(14), nome_credor VARCHAR(50),
    conta_contabil VARCHAR(20), especificacao VARCHAR(255),
    banco VARCHAR(3), agencia VARCHAR(4), conta_corrente VARCHAR(12),
    conta_corrente_dv VARCHAR(1), tipo_conta VARCHAR(2),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_aex_10_remessa ON stg_aex_10(remessa_id);

-- RSP.txt Reg 10-17
CREATE TABLE IF NOT EXISTS stg_rsp_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    exercicio_empenho VARCHAR(4), nro_empenho VARCHAR(6),
    tipo_rsp VARCHAR(1), elemento_despesa VARCHAR(6),
    tipo_credor VARCHAR(1), cpf_cnpj_credor VARCHAR(14), nome_credor VARCHAR(50),
    vl_inscrito VARCHAR(13), vl_cancelado VARCHAR(13),
    vl_liquidado VARCHAR(13), vl_pago VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rsp_10_remessa ON stg_rsp_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_rsp_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    exercicio_empenho VARCHAR(4), nro_empenho VARCHAR(6),
    nro_liquidacao VARCHAR(6), dt_liquidacao VARCHAR(8), vl_liquidacao VARCHAR(13),
    tipo_doc_fiscal VARCHAR(2), nro_doc_fiscal VARCHAR(15),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rsp_11_remessa ON stg_rsp_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_rsp_12 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    exercicio_empenho VARCHAR(4), nro_empenho VARCHAR(6),
    nro_liquidacao VARCHAR(6), cpf_cnpj_retencao VARCHAR(14),
    tipo_retencao VARCHAR(2), vl_retencao VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rsp_12_remessa ON stg_rsp_12(remessa_id);

CREATE TABLE IF NOT EXISTS stg_rsp_13 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    exercicio_empenho VARCHAR(4), nro_empenho VARCHAR(6),
    nro_op VARCHAR(6), dt_pagamento VARCHAR(8), vl_pagamento VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rsp_13_remessa ON stg_rsp_13(remessa_id);

CREATE TABLE IF NOT EXISTS stg_rsp_14 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    exercicio_empenho VARCHAR(4), nro_empenho VARCHAR(6),
    nro_op VARCHAR(6), banco VARCHAR(3), agencia VARCHAR(4),
    conta_corrente VARCHAR(12), conta_corrente_dv VARCHAR(1), tipo_conta VARCHAR(2),
    vl_conta VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rsp_14_remessa ON stg_rsp_14(remessa_id);

CREATE TABLE IF NOT EXISTS stg_rsp_15 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    exercicio_empenho VARCHAR(4), nro_empenho VARCHAR(6),
    nro_op VARCHAR(6), cpf_cnpj_retencao VARCHAR(14),
    tipo_retencao VARCHAR(2), vl_retencao VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rsp_15_remessa ON stg_rsp_15(remessa_id);

CREATE TABLE IF NOT EXISTS stg_rsp_16 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    exercicio_empenho VARCHAR(4), nro_empenho VARCHAR(6),
    cod_fonte_recurso VARCHAR(6), vl_inscrito_fonte VARCHAR(13),
    vl_cancelado_fonte VARCHAR(13), vl_liquidado_fonte VARCHAR(13), vl_pago_fonte VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rsp_16_remessa ON stg_rsp_16(remessa_id);

CREATE TABLE IF NOT EXISTS stg_rsp_17 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    exercicio_empenho VARCHAR(4), nro_empenho VARCHAR(6),
    nro_op VARCHAR(6), cod_fonte_recurso VARCHAR(6), vl_pago_fonte VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rsp_17_remessa ON stg_rsp_17(remessa_id);


-- ============================================================
-- CAMADA 3.1: STAGING PARSEADA - GRUPO 3: Contabilidade
-- ============================================================

-- CTB.txt Reg 10, 11, 91
CREATE TABLE IF NOT EXISTS stg_ctb_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    banco VARCHAR(3), agencia VARCHAR(4), conta_corrente VARCHAR(12),
    conta_corrente_dv VARCHAR(1), tipo_conta VARCHAR(2), desc_conta VARCHAR(50),
    saldo_anterior VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ctb_10_remessa ON stg_ctb_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_ctb_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    banco VARCHAR(3), agencia VARCHAR(4), conta_corrente VARCHAR(12),
    conta_corrente_dv VARCHAR(1), tipo_conta VARCHAR(2),
    cod_fonte_recurso VARCHAR(6), saldo_fonte VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ctb_11_remessa ON stg_ctb_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_ctb_91 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    banco VARCHAR(3), agencia VARCHAR(4), conta_corrente VARCHAR(12),
    conta_corrente_dv VARCHAR(1), tipo_conta VARCHAR(2),
    tipo_aplicacao VARCHAR(2), dt_aplicacao VARCHAR(8), vl_aplicacao VARCHAR(13),
    dt_resgate VARCHAR(8), vl_resgate VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ctb_91_remessa ON stg_ctb_91(remessa_id);

-- TRB.txt Reg 10-11
CREATE TABLE IF NOT EXISTS stg_trb_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    banco_origem VARCHAR(3), agencia_origem VARCHAR(4), conta_origem VARCHAR(12),
    conta_origem_dv VARCHAR(1), tipo_conta_origem VARCHAR(2),
    banco_destino VARCHAR(3), agencia_destino VARCHAR(4), conta_destino VARCHAR(12),
    conta_destino_dv VARCHAR(1), tipo_conta_destino VARCHAR(2),
    dt_transferencia VARCHAR(8), vl_transferencia VARCHAR(13),
    tipo_transferencia VARCHAR(2),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_trb_10_remessa ON stg_trb_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_trb_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    banco_origem VARCHAR(3), agencia_origem VARCHAR(4), conta_origem VARCHAR(12),
    conta_origem_dv VARCHAR(1), tipo_conta_origem VARCHAR(2),
    banco_destino VARCHAR(3), agencia_destino VARCHAR(4), conta_destino VARCHAR(12),
    conta_destino_dv VARCHAR(1), tipo_conta_destino VARCHAR(2),
    dt_transferencia VARCHAR(8), cod_fonte_recurso VARCHAR(6), vl_fonte VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_trb_11_remessa ON stg_trb_11(remessa_id);

-- TFR.txt Reg 10-11
CREATE TABLE IF NOT EXISTS stg_tfr_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    banco VARCHAR(3), agencia VARCHAR(4), conta_corrente VARCHAR(12),
    conta_corrente_dv VARCHAR(1), tipo_conta VARCHAR(2),
    fonte_origem VARCHAR(6), fonte_destino VARCHAR(6),
    dt_transferencia VARCHAR(8), vl_transferencia VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_tfr_10_remessa ON stg_tfr_10(remessa_id);

-- DFR.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_dfr_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    cod_fonte_recurso VARCHAR(6), especificacao VARCHAR(120),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_dfr_10_remessa ON stg_dfr_10(remessa_id);

-- DIC.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_dic_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_contrato_divida VARCHAR(20), tipo_divida VARCHAR(2),
    credor_divida VARCHAR(50), dt_contratacao VARCHAR(8),
    vl_contratado VARCHAR(13), vl_saldo_anterior VARCHAR(13),
    vl_amortizacao VARCHAR(13), vl_encargos VARCHAR(13), vl_saldo_atual VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_dic_10_remessa ON stg_dic_10(remessa_id);

-- DCL.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_dcl_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    tipo_dado VARCHAR(2), valor VARCHAR(13), descricao VARCHAR(200),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_dcl_10_remessa ON stg_dcl_10(remessa_id);

-- PAR.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_par_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    ano_projecao VARCHAR(4), vl_receita_previdenciaria VARCHAR(13),
    vl_despesa_previdenciaria VARCHAR(13), vl_resultado VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_par_10_remessa ON stg_par_10(remessa_id);

-- CVC.txt Reg 10-20
CREATE TABLE IF NOT EXISTS stg_cvc_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    placa_veiculo VARCHAR(7), tipo_veiculo VARCHAR(2), marca VARCHAR(20),
    modelo VARCHAR(20), ano_fabricacao VARCHAR(4), combustivel VARCHAR(2),
    lotacao VARCHAR(50), km_inicial VARCHAR(7), km_final VARCHAR(7),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_cvc_10_remessa ON stg_cvc_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_cvc_20 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    placa_veiculo VARCHAR(7), dt_abastecimento VARCHAR(8),
    tipo_combustivel VARCHAR(2), qtd_litros VARCHAR(8), vl_total VARCHAR(13),
    km_abastecimento VARCHAR(7), nro_empenho VARCHAR(6),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_cvc_20_remessa ON stg_cvc_20(remessa_id);

-- ECL.txt Reg 10-20
CREATE TABLE IF NOT EXISTS stg_ecl_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    tipo_combustivel VARCHAR(2), qtd_estoque_anterior VARCHAR(8),
    qtd_entrada VARCHAR(8), qtd_saida VARCHAR(8), qtd_estoque_atual VARCHAR(8),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ecl_10_remessa ON stg_ecl_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_ecl_20 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    tipo_combustivel VARCHAR(2), dt_entrada VARCHAR(8),
    qtd_litros VARCHAR(8), vl_unitario VARCHAR(13), vl_total VARCHAR(13),
    nro_nota_fiscal VARCHAR(15), fornecedor VARCHAR(50),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_ecl_20_remessa ON stg_ecl_20(remessa_id);

-- AAL.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_aal_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    cod_programa VARCHAR(4), cod_funcao VARCHAR(2), cod_subfuncao VARCHAR(3),
    natureza_acao VARCHAR(1), nro_proj_ativ VARCHAR(3),
    elemento_despesa VARCHAR(6), sub_elemento VARCHAR(2),
    cod_fonte_recurso_origem VARCHAR(6), cod_fonte_recurso_destino VARCHAR(6),
    vl_alocacao VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_aal_10_remessa ON stg_aal_10(remessa_id);

-- PCT.txt Reg 12-14
CREATE TABLE IF NOT EXISTS stg_pct_12 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    conta_contabil VARCHAR(20), titulo_conta VARCHAR(80),
    natureza_info VARCHAR(1), escrituracao VARCHAR(1),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_pct_12_remessa ON stg_pct_12(remessa_id);

-- LNC.txt Reg 10-11
CREATE TABLE IF NOT EXISTS stg_lnc_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_lancamento VARCHAR(6), dt_lancamento VARCHAR(8),
    tipo_lancamento VARCHAR(2), historico VARCHAR(400),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_lnc_10_remessa ON stg_lnc_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_lnc_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_lancamento VARCHAR(6), conta_debito VARCHAR(20), conta_credito VARCHAR(20),
    vl_lancamento VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_lnc_11_remessa ON stg_lnc_11(remessa_id);

-- CON.txt Reg 10-23
CREATE TABLE IF NOT EXISTS stg_con_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_contrato VARCHAR(20), ano_contrato VARCHAR(4), tipo_ajuste VARCHAR(1),
    objeto VARCHAR(500), cpf_cnpj_contratado VARCHAR(14), tipo_pessoa VARCHAR(1),
    nome_contratado VARCHAR(100), dt_assinatura VARCHAR(8),
    dt_inicio_vigencia VARCHAR(8), dt_fim_vigencia VARCHAR(8),
    vl_contrato VARCHAR(13), id_colare VARCHAR(15),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_con_10_remessa ON stg_con_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_con_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_contrato VARCHAR(20), ano_contrato VARCHAR(4),
    nro_aditivo VARCHAR(4), dt_aditivo VARCHAR(8), objeto_aditivo VARCHAR(200),
    vl_aditivo VARCHAR(13), dt_fim_vigencia_aditivo VARCHAR(8),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_con_11_remessa ON stg_con_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_con_20 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_contrato VARCHAR(20), ano_contrato VARCHAR(4),
    nro_empenho VARCHAR(6), exercicio_empenho VARCHAR(4),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_con_20_remessa ON stg_con_20(remessa_id);

CREATE TABLE IF NOT EXISTS stg_con_21 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_contrato VARCHAR(20), ano_contrato VARCHAR(4),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_con_21_remessa ON stg_con_21(remessa_id);

CREATE TABLE IF NOT EXISTS stg_con_22 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_contrato VARCHAR(20), ano_contrato VARCHAR(4),
    cpf_fiscal VARCHAR(11), nome_fiscal VARCHAR(50),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_con_22_remessa ON stg_con_22(remessa_id);

CREATE TABLE IF NOT EXISTS stg_con_23 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_contrato VARCHAR(20), ano_contrato VARCHAR(4),
    cpf_cnpj_garantidor VARCHAR(14), tipo_garantia VARCHAR(2), vl_garantia VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_con_23_remessa ON stg_con_23(remessa_id);

-- ISI.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_isi_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), nome_sistema VARCHAR(50), versao_sistema VARCHAR(20),
    empresa_desenvolvedora VARCHAR(50), cnpj_empresa VARCHAR(14),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_isi_10_remessa ON stg_isi_10(remessa_id);

-- DMR.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_dmr_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_decreto VARCHAR(10), dt_decreto VARCHAR(8), objeto VARCHAR(250),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_dmr_10_remessa ON stg_dmr_10(remessa_id);


-- ============================================================
-- CAMADA 3.1: STAGING PARSEADA - GRUPO 4: Licitações
-- ============================================================

-- ABL.txt Reg 10-13
CREATE TABLE IF NOT EXISTS stg_abl_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    modalidade VARCHAR(2), tipo_licitacao VARCHAR(2), objeto VARCHAR(500),
    dt_abertura VARCHAR(8), vl_estimado VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_abl_10_remessa ON stg_abl_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_abl_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    nro_item VARCHAR(4), desc_item VARCHAR(200), unidade_item VARCHAR(10),
    qtd_item VARCHAR(10), vl_unitario_estimado VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_abl_11_remessa ON stg_abl_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_abl_12 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    cpf_responsavel VARCHAR(11), nome_responsavel VARCHAR(50), funcao VARCHAR(30),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_abl_12_remessa ON stg_abl_12(remessa_id);

CREATE TABLE IF NOT EXISTS stg_abl_13 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    elemento_despesa VARCHAR(6),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_abl_13_remessa ON stg_abl_13(remessa_id);

-- DSI.txt Reg 10-15
CREATE TABLE IF NOT EXISTS stg_dsi_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_processo VARCHAR(8), ano_processo VARCHAR(4), tipo_processo VARCHAR(2),
    objeto VARCHAR(500), vl_estimado VARCHAR(13), dt_ratificacao VARCHAR(8),
    fundamentacao VARCHAR(200),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_dsi_10_remessa ON stg_dsi_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_dsi_11 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_processo VARCHAR(8), ano_processo VARCHAR(4),
    nro_item VARCHAR(4), desc_item VARCHAR(200), unidade_item VARCHAR(10),
    qtd_item VARCHAR(10), vl_unitario VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_dsi_11_remessa ON stg_dsi_11(remessa_id);

CREATE TABLE IF NOT EXISTS stg_dsi_12 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_processo VARCHAR(8), ano_processo VARCHAR(4),
    cpf_cnpj_fornecedor VARCHAR(14), tipo_pessoa VARCHAR(1),
    nome_fornecedor VARCHAR(50),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_dsi_12_remessa ON stg_dsi_12(remessa_id);

CREATE TABLE IF NOT EXISTS stg_dsi_13 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_processo VARCHAR(8), ano_processo VARCHAR(4),
    cpf_responsavel VARCHAR(11), nome_responsavel VARCHAR(50), funcao VARCHAR(30),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_dsi_13_remessa ON stg_dsi_13(remessa_id);

CREATE TABLE IF NOT EXISTS stg_dsi_14 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_processo VARCHAR(8), ano_processo VARCHAR(4),
    elemento_despesa VARCHAR(6),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_dsi_14_remessa ON stg_dsi_14(remessa_id);

CREATE TABLE IF NOT EXISTS stg_dsi_15 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_processo VARCHAR(8), ano_processo VARCHAR(4),
    nro_item VARCHAR(4), cpf_cnpj_fornecedor VARCHAR(14),
    qtd_item VARCHAR(10), vl_unitario VARCHAR(13), vl_total VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_dsi_15_remessa ON stg_dsi_15(remessa_id);

-- RPL.txt Reg 10
CREATE TABLE IF NOT EXISTS stg_rpl_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    situacao VARCHAR(2), dt_resultado VARCHAR(8),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_rpl_10_remessa ON stg_rpl_10(remessa_id);

-- HBL.txt Reg 10-20
CREATE TABLE IF NOT EXISTS stg_hbl_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    cpf_cnpj_licitante VARCHAR(14), tipo_pessoa VARCHAR(1),
    nome_licitante VARCHAR(50), situacao_habilitacao VARCHAR(2),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_hbl_10_remessa ON stg_hbl_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_hbl_20 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    cpf_cnpj_licitante VARCHAR(14), nro_item VARCHAR(4),
    vl_proposta VARCHAR(13), classificacao VARCHAR(3),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_hbl_20_remessa ON stg_hbl_20(remessa_id);

-- JGL.txt Reg 10-30
CREATE TABLE IF NOT EXISTS stg_jgl_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    nro_item VARCHAR(4), cpf_cnpj_vencedor VARCHAR(14),
    vl_unitario_vencedor VARCHAR(13), qtd_adjudicada VARCHAR(10),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_jgl_10_remessa ON stg_jgl_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_jgl_30 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    dt_adjudicacao VARCHAR(8),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_jgl_30_remessa ON stg_jgl_30(remessa_id);

-- HML.txt Reg 10-30
CREATE TABLE IF NOT EXISTS stg_hml_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    dt_homologacao VARCHAR(8),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_hml_10_remessa ON stg_hml_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_hml_20 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    nro_item VARCHAR(4), cpf_cnpj_vencedor VARCHAR(14),
    vl_unitario_homologado VARCHAR(13), qtd_homologada VARCHAR(10),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_hml_20_remessa ON stg_hml_20(remessa_id);

CREATE TABLE IF NOT EXISTS stg_hml_30 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    cpf_cnpj_vencedor_global VARCHAR(14), vl_total_homologado VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_hml_30_remessa ON stg_hml_30(remessa_id);

-- ARP.txt Reg 10-20
CREATE TABLE IF NOT EXISTS stg_arp_10 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    nro_ata VARCHAR(6), ano_ata VARCHAR(4), dt_assinatura VARCHAR(8),
    dt_vigencia VARCHAR(8), vl_total_ata VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_arp_10_remessa ON stg_arp_10(remessa_id);

CREATE TABLE IF NOT EXISTS stg_arp_12 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    nro_ata VARCHAR(6), ano_ata VARCHAR(4),
    cpf_cnpj_fornecedor VARCHAR(14), tipo_pessoa VARCHAR(1),
    nome_fornecedor VARCHAR(50),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_arp_12_remessa ON stg_arp_12(remessa_id);

CREATE TABLE IF NOT EXISTS stg_arp_20 (
    id SERIAL PRIMARY KEY,
    remessa_id INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha INTEGER NOT NULL, linha_bruta TEXT,
    tipo_registro VARCHAR(2), cod_orgao VARCHAR(2), cod_unidade VARCHAR(2),
    nro_proc_licitacao VARCHAR(8), ano_proc_licitacao VARCHAR(4),
    nro_ata VARCHAR(6), ano_ata VARCHAR(4),
    cpf_cnpj_fornecedor VARCHAR(14), nro_item VARCHAR(4),
    desc_item VARCHAR(200), unidade_item VARCHAR(10),
    qtd_item VARCHAR(10), vl_unitario VARCHAR(13),
    nro_sequencial INTEGER, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_arp_20_remessa ON stg_arp_20(remessa_id);


-- ============================================================


-- ============================================================
-- CAMADA 4: ANALÍTICO - Dimensões
-- dim_tempo com granularidade DIÁRIA (definição única)
-- ============================================================

CREATE TABLE IF NOT EXISTS dim_tempo (
    id              SERIAL PRIMARY KEY,
    data_completa   DATE NOT NULL UNIQUE,
    ano             SMALLINT NOT NULL,
    mes             SMALLINT NOT NULL,
    dia             SMALLINT NOT NULL,
    dia_semana      SMALLINT NOT NULL,
    nome_dia_semana VARCHAR(20) NOT NULL,
    nome_mes        VARCHAR(20) NOT NULL,
    bimestre        SMALLINT NOT NULL,
    trimestre       SMALLINT NOT NULL,
    quadrimestre    SMALLINT NOT NULL,
    semestre        SMALLINT NOT NULL,
    dia_util        BOOLEAN DEFAULT TRUE,
    ano_mes         VARCHAR(7) NOT NULL
);

INSERT INTO dim_tempo (
    data_completa, ano, mes, dia, dia_semana, nome_dia_semana,
    nome_mes, bimestre, trimestre, quadrimestre, semestre, dia_util, ano_mes
)
SELECT
    d::DATE,
    EXTRACT(YEAR FROM d)::SMALLINT,
    EXTRACT(MONTH FROM d)::SMALLINT,
    EXTRACT(DAY FROM d)::SMALLINT,
    EXTRACT(DOW FROM d)::SMALLINT,
    CASE EXTRACT(DOW FROM d)
        WHEN 0 THEN 'Domingo' WHEN 1 THEN 'Segunda' WHEN 2 THEN 'Terça'
        WHEN 3 THEN 'Quarta' WHEN 4 THEN 'Quinta' WHEN 5 THEN 'Sexta'
        WHEN 6 THEN 'Sábado'
    END,
    CASE EXTRACT(MONTH FROM d)
        WHEN 1 THEN 'Janeiro' WHEN 2 THEN 'Fevereiro' WHEN 3 THEN 'Março'
        WHEN 4 THEN 'Abril' WHEN 5 THEN 'Maio' WHEN 6 THEN 'Junho'
        WHEN 7 THEN 'Julho' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Setembro'
        WHEN 10 THEN 'Outubro' WHEN 11 THEN 'Novembro' WHEN 12 THEN 'Dezembro'
    END,
    CEIL(EXTRACT(MONTH FROM d)::NUMERIC / 2)::SMALLINT,
    CEIL(EXTRACT(MONTH FROM d)::NUMERIC / 3)::SMALLINT,
    CEIL(EXTRACT(MONTH FROM d)::NUMERIC / 4)::SMALLINT,
    CEIL(EXTRACT(MONTH FROM d)::NUMERIC / 6)::SMALLINT,
    CASE WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN FALSE ELSE TRUE END,
    TO_CHAR(d, 'YYYY-MM')
FROM generate_series('2020-01-01'::DATE, '2035-12-31'::DATE, '1 day'::INTERVAL) AS d
ON CONFLICT (data_completa) DO NOTHING;

CREATE INDEX idx_dim_tempo_ano_mes ON dim_tempo(ano, mes);
CREATE INDEX idx_dim_tempo_ano_mes_str ON dim_tempo(ano_mes);
CREATE INDEX idx_dim_tempo_trimestre ON dim_tempo(ano, trimestre);
CREATE INDEX idx_dim_tempo_quadrimestre ON dim_tempo(ano, quadrimestre);

-- Dimensão Credor
-- remessa_id é nullable + ON DELETE SET NULL: a dimensão sobrevive
-- à exclusão da remessa que a criou (dimensões são compartilhadas)
CREATE TABLE IF NOT EXISTS dim_credor (
    id              SERIAL PRIMARY KEY,
    cpf_cnpj        VARCHAR(14) NOT NULL UNIQUE,
    tipo_credor     SMALLINT,
    nome_credor     VARCHAR(200),
    municipio_id    INTEGER REFERENCES tcmgo_municipios(id),
    orgao_id        INTEGER REFERENCES tcmgo_orgaos(id),
    ano_referencia  SMALLINT,
    mes_referencia  SMALLINT,
    remessa_id      INTEGER REFERENCES tcmgo_remessa(id) ON DELETE SET NULL,
    atualizado_em   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Dimensão Unidade Orçamentária
CREATE TABLE IF NOT EXISTS dim_unidade_orcamentaria (
    id              SERIAL PRIMARY KEY,
    cod_orgao       VARCHAR(10) NOT NULL,
    cod_unidade     VARCHAR(10) NOT NULL,
    descricao       VARCHAR(200),
    municipio_id    INTEGER REFERENCES tcmgo_municipios(id),
    orgao_id        INTEGER REFERENCES tcmgo_orgaos(id),
    ano_referencia  SMALLINT,
    mes_referencia  SMALLINT,
    remessa_id      INTEGER REFERENCES tcmgo_remessa(id) ON DELETE SET NULL,
    atualizado_em   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cod_orgao, cod_unidade, municipio_id, ano_referencia)
);

-- Dimensão Fonte de Recurso
CREATE TABLE IF NOT EXISTS dim_fonte_recurso (
    id              SERIAL PRIMARY KEY,
    cod_fonte       VARCHAR(20) NOT NULL,
    descricao       VARCHAR(200),
    municipio_id    INTEGER REFERENCES tcmgo_municipios(id),
    orgao_id        INTEGER REFERENCES tcmgo_orgaos(id),
    ano_referencia  SMALLINT,
    mes_referencia  SMALLINT,
    remessa_id      INTEGER REFERENCES tcmgo_remessa(id) ON DELETE SET NULL,
    atualizado_em   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cod_fonte, municipio_id, ano_referencia)
);

-- Dimensão Conta Contábil
CREATE TABLE IF NOT EXISTS dim_conta_contabil (
    id              SERIAL PRIMARY KEY,
    cod_conta       VARCHAR(20) NOT NULL,
    descricao       VARCHAR(200),
    natureza        VARCHAR(1),
    nivel           SMALLINT,
    municipio_id    INTEGER REFERENCES tcmgo_municipios(id),
    orgao_id        INTEGER REFERENCES tcmgo_orgaos(id),
    ano_referencia  SMALLINT,
    mes_referencia  SMALLINT,
    remessa_id      INTEGER REFERENCES tcmgo_remessa(id) ON DELETE SET NULL,
    atualizado_em   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cod_conta, municipio_id, ano_referencia)
);

-- Dimensão Conta Bancária
CREATE TABLE IF NOT EXISTS dim_conta_bancaria (
    id              SERIAL PRIMARY KEY,
    banco           VARCHAR(10) NOT NULL,
    agencia         VARCHAR(15) NOT NULL,
    conta_corrente  VARCHAR(20) NOT NULL,
    tipo_conta      VARCHAR(30),
    descricao       VARCHAR(200),
    municipio_id    INTEGER REFERENCES tcmgo_municipios(id),
    orgao_id        INTEGER REFERENCES tcmgo_orgaos(id),
    ano_referencia  SMALLINT,
    mes_referencia  SMALLINT,
    remessa_id      INTEGER REFERENCES tcmgo_remessa(id) ON DELETE SET NULL,
    atualizado_em   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(banco, agencia, conta_corrente, orgao_id)
);

-- Dimensão Contrato
CREATE TABLE IF NOT EXISTS dim_contrato (
    id              SERIAL PRIMARY KEY,
    nro_contrato    VARCHAR(30) NOT NULL,
    tipo_contrato   VARCHAR(30),
    objeto          TEXT,
    cpf_cnpj_contratado VARCHAR(14),
    nome_contratado VARCHAR(200),
    dt_inicio       DATE,
    dt_fim          DATE,
    vl_contrato     DECIMAL(18,2),
    municipio_id    INTEGER REFERENCES tcmgo_municipios(id),
    orgao_id        INTEGER REFERENCES tcmgo_orgaos(id),
    ano_referencia  SMALLINT,
    mes_referencia  SMALLINT,
    remessa_id      INTEGER REFERENCES tcmgo_remessa(id) ON DELETE SET NULL,
    atualizado_em   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nro_contrato, orgao_id, ano_referencia)
);

COMMENT ON COLUMN dim_credor.remessa_id IS
    'Referência à remessa que criou/atualizou esta dimensão. '
    'ON DELETE SET NULL: a dimensão sobrevive à exclusão da remessa. '
    'Dimensões são compartilhadas entre remessas e não devem ser '
    'destruídas quando uma remessa específica é removida.';
-- (O mesmo COMMENT se aplica a todas as dim_* acima)


-- ============================================================
-- CAMADA 4: ANALÍTICO - Tabelas Fato
-- Todas possuem: municipio_id, orgao_id, ano_referencia,
-- mes_referencia, remessa_id, tempo_id, tempo_evento_id
-- UNIQUE de negócio inline (sem DROP INDEX)
-- TIMESTAMPTZ em todos os campos de data/hora
-- ============================================================

-- FATO: Empenho
CREATE TABLE IF NOT EXISTS fato_empenho (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    tempo_evento_id         INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    nro_empenho             VARCHAR(15) NOT NULL,
    dt_empenho              DATE,
    tp_empenho              VARCHAR(2),
    cod_funcao              VARCHAR(5),
    cod_subfuncao           VARCHAR(5),
    cod_programa            VARCHAR(10),
    cod_acao                VARCHAR(10),
    elemento_despesa        VARCHAR(20),
    sub_elemento            VARCHAR(20),
    fonte_recurso           VARCHAR(20),
    cpf_cnpj_credor         VARCHAR(14),
    nome_credor             VARCHAR(200),
    especificacao           TEXT,
    modalidade_licitacao    VARCHAR(5),
    nro_licitacao           VARCHAR(20),
    nro_contrato            VARCHAR(30),
    vl_bruto                DECIMAL(18,2) NOT NULL DEFAULT 0,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, nro_empenho)
);

CREATE INDEX idx_fato_empenho_municipio ON fato_empenho(municipio_id);
CREATE INDEX idx_fato_empenho_orgao ON fato_empenho(orgao_id);
CREATE INDEX idx_fato_empenho_periodo ON fato_empenho(ano_referencia, mes_referencia);
CREATE INDEX idx_fato_empenho_remessa ON fato_empenho(remessa_id);
CREATE INDEX idx_fato_empenho_credor ON fato_empenho(cpf_cnpj_credor);
CREATE INDEX idx_fato_empenho_elemento ON fato_empenho(elemento_despesa);

-- FATO: Empenho por Fonte de Recurso (detalhamento)
CREATE TABLE IF NOT EXISTS fato_empenho_fonte (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    nro_empenho             VARCHAR(15) NOT NULL,
    fonte_recurso           VARCHAR(20) NOT NULL,
    vl_fonte                DECIMAL(18,2) NOT NULL DEFAULT 0,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, nro_empenho, fonte_recurso)
);

CREATE INDEX idx_fato_empenho_fonte_remessa ON fato_empenho_fonte(remessa_id);

-- FATO: Anulação de Empenho
CREATE TABLE IF NOT EXISTS fato_anulacao_empenho (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    tempo_evento_id         INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    nro_empenho             VARCHAR(15) NOT NULL,
    exercicio_empenho       SMALLINT,
    nr_anulacao             VARCHAR(15),
    dt_anulacao             DATE,
    vl_anulacao             DECIMAL(18,2) NOT NULL DEFAULT 0,
    motivo                  TEXT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, nro_empenho, nr_anulacao)
);

CREATE INDEX idx_fato_anulacao_remessa ON fato_anulacao_empenho(remessa_id);

-- FATO: Liquidação
CREATE TABLE IF NOT EXISTS fato_liquidacao (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    tempo_evento_id         INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    nro_empenho             VARCHAR(15) NOT NULL,
    exercicio_empenho       SMALLINT,
    nro_liquidacao          VARCHAR(15),
    dt_liquidacao           DATE,
    vl_liquidacao           DECIMAL(18,2) NOT NULL DEFAULT 0,
    nro_nota_fiscal         VARCHAR(30),
    tipo_documento          VARCHAR(5),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, nro_empenho, exercicio_empenho, nro_liquidacao)
);

CREATE INDEX idx_fato_liquidacao_remessa ON fato_liquidacao(remessa_id);
CREATE INDEX idx_fato_liquidacao_periodo ON fato_liquidacao(ano_referencia, mes_referencia);

-- FATO: Pagamento (Ordem de Pagamento)
CREATE TABLE IF NOT EXISTS fato_pagamento (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    tempo_evento_id         INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    nro_empenho             VARCHAR(15) NOT NULL,
    exercicio_empenho       SMALLINT,
    nro_op                  VARCHAR(15) NOT NULL,
    dt_pagamento            DATE,
    vl_pagamento            DECIMAL(18,2) NOT NULL DEFAULT 0,
    banco                   VARCHAR(10),
    agencia                 VARCHAR(15),
    conta_corrente          VARCHAR(20),
    fonte_recurso           VARCHAR(20),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, nro_empenho, exercicio_empenho, nro_op)
);

CREATE INDEX idx_fato_pagamento_remessa ON fato_pagamento(remessa_id);
CREATE INDEX idx_fato_pagamento_periodo ON fato_pagamento(ano_referencia, mes_referencia);

-- FATO: Receita Orçamentária
CREATE TABLE IF NOT EXISTS fato_receita (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    rubrica                 VARCHAR(20) NOT NULL,
    especificacao           VARCHAR(200),
    fonte_recurso           VARCHAR(20),
    vl_previsto_inicial     DECIMAL(18,2) DEFAULT 0,
    vl_previsto_atualizado  DECIMAL(18,2) DEFAULT 0,
    vl_arrecadado           DECIMAL(18,2) DEFAULT 0,
    vl_acumulado            DECIMAL(18,2) DEFAULT 0,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, rubrica)
);

CREATE INDEX idx_fato_receita_remessa ON fato_receita(remessa_id);
CREATE INDEX idx_fato_receita_periodo ON fato_receita(ano_referencia, mes_referencia);

-- FATO: Alteração Orçamentária
CREATE TABLE IF NOT EXISTS fato_alteracao_orcamentaria (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    tempo_evento_id         INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    cod_programa            VARCHAR(10),
    cod_funcao              VARCHAR(5),
    cod_subfuncao           VARCHAR(5),
    cod_acao                VARCHAR(10),
    elemento_despesa        VARCHAR(20),
    sub_elemento            VARCHAR(20),
    fonte_recurso           VARCHAR(20),
    tipo_credito            VARCHAR(5),
    nro_lei_decreto         VARCHAR(30),
    dt_lei_decreto          DATE,
    vl_dotacao_inicial      DECIMAL(18,2) DEFAULT 0,
    vl_suplementacao        DECIMAL(18,2) DEFAULT 0,
    vl_reducao              DECIMAL(18,2) DEFAULT 0,
    vl_credito_especial     DECIMAL(18,2) DEFAULT 0,
    vl_credito_extraordinario DECIMAL(18,2) DEFAULT 0,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, cod_programa, cod_funcao, cod_subfuncao, cod_acao, elemento_despesa, sub_elemento, fonte_recurso)
);

CREATE INDEX idx_fato_alteracao_remessa ON fato_alteracao_orcamentaria(remessa_id);

-- FATO: Restos a Pagar
CREATE TABLE IF NOT EXISTS fato_restos_pagar (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    exercicio_empenho       SMALLINT NOT NULL,
    nro_empenho             VARCHAR(15) NOT NULL,
    tipo_rsp                VARCHAR(5),
    elemento_despesa        VARCHAR(20),
    cpf_cnpj_credor         VARCHAR(14),
    nome_credor             VARCHAR(200),
    vl_inscrito             DECIMAL(18,2) DEFAULT 0,
    vl_cancelado            DECIMAL(18,2) DEFAULT 0,
    vl_liquidado            DECIMAL(18,2) DEFAULT 0,
    vl_pago                 DECIMAL(18,2) DEFAULT 0,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, exercicio_empenho, nro_empenho, tipo_rsp)
);

CREATE INDEX idx_fato_rsp_remessa ON fato_restos_pagar(remessa_id);
CREATE INDEX idx_fato_rsp_periodo ON fato_restos_pagar(ano_referencia, mes_referencia);

-- FATO: Extraorçamentário
CREATE TABLE IF NOT EXISTS fato_extraorcamentario (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    tempo_evento_id         INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    nro_extra               VARCHAR(15),
    tipo_movimento          VARCHAR(5),
    dt_movimento            DATE,
    cpf_cnpj_credor         VARCHAR(14),
    nome_credor             VARCHAR(200),
    conta_contabil          VARCHAR(20),
    vl_movimento            DECIMAL(18,2) NOT NULL DEFAULT 0,
    especificacao           TEXT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, nro_extra, tipo_movimento)
);

CREATE INDEX idx_fato_extra_remessa ON fato_extraorcamentario(remessa_id);

-- FATO: Conta Bancária (saldo mensal)
CREATE TABLE IF NOT EXISTS fato_conta_bancaria (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    banco                   VARCHAR(10),
    agencia                 VARCHAR(15),
    conta_corrente          VARCHAR(20),
    tipo_conta              VARCHAR(30),
    fonte_recurso           VARCHAR(20),
    vl_saldo_anterior       DECIMAL(18,2) DEFAULT 0,
    vl_entrada              DECIMAL(18,2) DEFAULT 0,
    vl_saida                DECIMAL(18,2) DEFAULT 0,
    vl_saldo_atual          DECIMAL(18,2) DEFAULT 0,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, banco, agencia, conta_corrente)
);

CREATE INDEX idx_fato_conta_bancaria_remessa ON fato_conta_bancaria(remessa_id);

-- FATO: Movimentação Bancária
CREATE TABLE IF NOT EXISTS fato_movimentacao_bancaria (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    tempo_evento_id         INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    tipo_movimentacao       VARCHAR(5),
    nro_transferencia       VARCHAR(15),
    banco                   VARCHAR(10),
    agencia                 VARCHAR(15),
    conta_corrente          VARCHAR(20),
    fonte_origem            VARCHAR(20),
    fonte_destino           VARCHAR(20),
    dt_movimentacao         DATE,
    vl_movimentacao         DECIMAL(18,2) NOT NULL DEFAULT 0,
    banco_destino           VARCHAR(10),
    agencia_destino         VARCHAR(15),
    conta_destino           VARCHAR(20),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, nro_transferencia, tipo_movimentacao, dt_movimentacao)
);

CREATE INDEX idx_fato_mov_bancaria_remessa ON fato_movimentacao_bancaria(remessa_id);
CREATE INDEX idx_fato_mov_bancaria_periodo ON fato_movimentacao_bancaria(ano_referencia, mes_referencia);

-- FATO: Lançamento Contábil
CREATE TABLE IF NOT EXISTS fato_lancamento_contabil (
    id                      SERIAL PRIMARY KEY,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    tempo_evento_id         INTEGER REFERENCES dim_tempo(id),
    cod_orgao               VARCHAR(10),
    cod_unidade             VARCHAR(10),
    nro_lancamento          VARCHAR(15) NOT NULL,
    dt_lancamento           DATE,
    tipo_lancamento         VARCHAR(5),
    historico               TEXT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(remessa_id, cod_orgao, cod_unidade, nro_lancamento)
);

CREATE INDEX idx_fato_lancamento_remessa ON fato_lancamento_contabil(remessa_id);

-- FATO: Item de Lançamento Contábil (partidas)
CREATE TABLE IF NOT EXISTS fato_item_lancamento_contabil (
    id                      SERIAL PRIMARY KEY,
    lancamento_id           INTEGER NOT NULL REFERENCES fato_lancamento_contabil(id) ON DELETE CASCADE,
    municipio_id            INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
    orgao_id                INTEGER NOT NULL REFERENCES tcmgo_orgaos(id),
    ano_referencia          SMALLINT NOT NULL,
    mes_referencia          SMALLINT NOT NULL,
    remessa_id              INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    tempo_id                INTEGER REFERENCES dim_tempo(id),
    ordem_item              SMALLINT NOT NULL,
    conta_debito            VARCHAR(20),
    conta_credito           VARCHAR(20),
    vl_lancamento           DECIMAL(18,2) NOT NULL DEFAULT 0,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lancamento_id, ordem_item)
);

CREATE INDEX idx_fato_item_lanc_remessa ON fato_item_lancamento_contabil(remessa_id);


-- ============================================================
-- FUNÇÕES SQL
-- Filosofia: substituição lógica, NUNCA exclusão física como padrão
-- Auditoria registrada em tcmgo_auditoria (sem CASCADE)
-- ============================================================

-- Função: Desativar remessa anterior
CREATE OR REPLACE FUNCTION fn_desativar_remessa_anterior(
    p_municipio_id   INTEGER,
    p_orgao_id       INTEGER,
    p_ano_referencia SMALLINT,
    p_mes_referencia SMALLINT
)
RETURNS INTEGER AS $$
DECLARE
    v_remessa_anterior_id INTEGER;
BEGIN
    SELECT id INTO v_remessa_anterior_id
    FROM tcmgo_remessa
    WHERE municipio_id = p_municipio_id
      AND orgao_id = p_orgao_id
      AND ano_referencia = p_ano_referencia
      AND mes_referencia = p_mes_referencia
      AND ativa = TRUE;

    IF v_remessa_anterior_id IS NOT NULL THEN
        UPDATE tcmgo_remessa
        SET ativa = FALSE,
            status = 'substituida',
            atualizado_em = CURRENT_TIMESTAMP
        WHERE id = v_remessa_anterior_id;

        RAISE NOTICE 'Remessa % desativada (substituída)', v_remessa_anterior_id;
    END IF;

    RETURN v_remessa_anterior_id;
END;
$$ LANGUAGE plpgsql;

-- Função: Criar nova remessa
CREATE OR REPLACE FUNCTION fn_criar_remessa(
    p_municipio_id   INTEGER,
    p_orgao_id       INTEGER,
    p_ano_referencia SMALLINT,
    p_mes_referencia SMALLINT,
    p_hash_zip       VARCHAR(64),
    p_nome_zip       VARCHAR(255),
    p_user_id        UUID DEFAULT NULL,
    p_user_nome      VARCHAR(100) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_remessa_anterior_id INTEGER;
    v_nova_versao         SMALLINT;
    v_nova_remessa_id     INTEGER;
BEGIN
    v_remessa_anterior_id := fn_desativar_remessa_anterior(
        p_municipio_id, p_orgao_id, p_ano_referencia, p_mes_referencia
    );

    SELECT COALESCE(MAX(versao), 0) + 1 INTO v_nova_versao
    FROM tcmgo_remessa
    WHERE municipio_id = p_municipio_id
      AND orgao_id = p_orgao_id
      AND ano_referencia = p_ano_referencia
      AND mes_referencia = p_mes_referencia;

    INSERT INTO tcmgo_remessa (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        versao, remessa_anterior_id, hash_zip, nome_arquivo_zip,
        status, ativa, importado_por_user_id, importado_por_nome
    ) VALUES (
        p_municipio_id, p_orgao_id, p_ano_referencia, p_mes_referencia,
        v_nova_versao, v_remessa_anterior_id, p_hash_zip, p_nome_zip,
        'pendente', TRUE, p_user_id, p_user_nome
    )
    RETURNING id INTO v_nova_remessa_id;

    RAISE NOTICE 'Nova remessa criada: id=%, versao=%, anterior=%',
        v_nova_remessa_id, v_nova_versao, v_remessa_anterior_id;

    RETURN v_nova_remessa_id;
END;
$$ LANGUAGE plpgsql;

-- Função: Limpar dados analíticos (fatos) de uma remessa
-- Permite reprocessar staging -> analítico sem reimportar ZIP
CREATE OR REPLACE FUNCTION fn_limpar_dados_analiticos(
    p_remessa_id INTEGER
)
RETURNS VOID AS $$
BEGIN
    DELETE FROM fato_item_lancamento_contabil WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_lancamento_contabil      WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_movimentacao_bancaria    WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_conta_bancaria           WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_extraorcamentario        WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_restos_pagar             WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_alteracao_orcamentaria   WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_empenho_fonte            WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_anulacao_empenho         WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_pagamento                WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_liquidacao               WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_empenho                  WHERE remessa_id = p_remessa_id;
    DELETE FROM fato_receita                  WHERE remessa_id = p_remessa_id;

    UPDATE tcmgo_remessa
    SET status = 'processando',
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = p_remessa_id;

    INSERT INTO tcmgo_historico_processamento (remessa_id, evento, descricao)
    VALUES (p_remessa_id, 'analiticos_limpos',
            'Dados da camada analítica removidos para reprocessamento');

    RAISE NOTICE 'Dados analíticos da remessa % removidos.', p_remessa_id;
END;
$$ LANGUAGE plpgsql;

-- Função: Excluir remessa completa (USO EXCEPCIONAL - emergência administrativa)
-- Registra em tcmgo_auditoria (SEM CASCADE) ANTES de excluir
CREATE OR REPLACE FUNCTION fn_excluir_remessa(
    p_remessa_id INTEGER,
    p_motivo     TEXT DEFAULT 'Exclusão administrativa excepcional',
    p_user_id    UUID DEFAULT NULL,
    p_user_nome  VARCHAR(100) DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_info RECORD;
BEGIN
    SELECT municipio_id, orgao_id, ano_referencia, mes_referencia, versao,
           hash_zip, nome_arquivo_zip, status, importado_por_nome
    INTO v_info
    FROM tcmgo_remessa WHERE id = p_remessa_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Remessa % não encontrada', p_remessa_id;
    END IF;

    -- Registra na tabela de AUDITORIA INDEPENDENTE (sem CASCADE)
    -- Este registro PERSISTE mesmo após a exclusão da remessa
    INSERT INTO tcmgo_auditoria (
        remessa_id, municipio_id, orgao_id, ano_referencia,
        mes_referencia, versao, evento, descricao, dados_extras,
        executado_por_user_id, executado_por_nome
    ) VALUES (
        p_remessa_id, v_info.municipio_id, v_info.orgao_id,
        v_info.ano_referencia, v_info.mes_referencia, v_info.versao,
        'remessa_excluida',
        p_motivo,
        jsonb_build_object(
            'hash_zip', v_info.hash_zip,
            'nome_arquivo', v_info.nome_arquivo_zip,
            'status_antes_exclusao', v_info.status,
            'importado_por', v_info.importado_por_nome,
            'excluida_em', CURRENT_TIMESTAMP::TEXT
        ),
        p_user_id, p_user_nome
    );

    -- CASCADE cuida de: staging, fatos, erros, arquivos, histórico
    DELETE FROM tcmgo_remessa WHERE id = p_remessa_id;

    RAISE NOTICE 'Remessa % excluída. Log preservado em tcmgo_auditoria.',
        p_remessa_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_excluir_remessa IS
    'USO EXCEPCIONAL. Exclui fisicamente uma remessa e TODOS os dados '
    'vinculados (via CASCADE). O registro de auditoria é preservado em '
    'tcmgo_auditoria (tabela sem CASCADE). O padrão operacional é '
    'INATIVAR (substituição lógica), não excluir.';

-- Função: Reimportar balancete (workflow completo)
-- Padrão operacional: INATIVA a remessa anterior (nunca exclui)
CREATE OR REPLACE FUNCTION fn_reimportar_balancete(
    p_municipio_id     INTEGER,
    p_orgao_id         INTEGER,
    p_ano_referencia   SMALLINT,
    p_mes_referencia   SMALLINT,
    p_hash_zip         VARCHAR(64),
    p_nome_zip         VARCHAR(255),
    p_user_id          UUID DEFAULT NULL,
    p_user_nome        VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    nova_remessa_id     INTEGER,
    remessa_anterior_id INTEGER,
    versao              SMALLINT
) AS $$
DECLARE
    v_anterior_id INTEGER;
    v_nova_id     INTEGER;
    v_versao      SMALLINT;
BEGIN
    -- 1. Busca remessa ativa anterior (se existir)
    SELECT id INTO v_anterior_id
    FROM tcmgo_remessa
    WHERE municipio_id = p_municipio_id
      AND orgao_id = p_orgao_id
      AND ano_referencia = p_ano_referencia
      AND mes_referencia = p_mes_referencia
      AND ativa = TRUE;

    -- 2. Cria nova remessa (desativa anterior automaticamente)
    v_nova_id := fn_criar_remessa(
        p_municipio_id, p_orgao_id, p_ano_referencia, p_mes_referencia,
        p_hash_zip, p_nome_zip, p_user_id, p_user_nome
    );

    -- 3. Busca versão da nova remessa
    SELECT r.versao INTO v_versao FROM tcmgo_remessa r WHERE r.id = v_nova_id;

    -- 4. Registra na auditoria independente
    INSERT INTO tcmgo_auditoria (
        remessa_id, municipio_id, orgao_id, ano_referencia,
        mes_referencia, versao, evento, descricao, dados_extras,
        executado_por_user_id, executado_por_nome
    ) VALUES (
        v_nova_id, p_municipio_id, p_orgao_id,
        p_ano_referencia, p_mes_referencia, v_versao,
        'reimportacao',
        'Nova remessa criada por reimportação. Anterior inativada (não excluída).',
        jsonb_build_object(
            'remessa_anterior_id', v_anterior_id,
            'hash_zip', p_hash_zip,
            'nome_arquivo', p_nome_zip
        ),
        p_user_id, p_user_nome
    );

    -- 5. Retorna resultado (sem opção de exclusão)
    RETURN QUERY SELECT
        v_nova_id,
        v_anterior_id,
        v_versao;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_reimportar_balancete IS
    'Workflow completo de reimportação: desativa remessa anterior '
    '(substituição lógica, nunca exclui), cria nova versão, registra '
    'auditoria. Retorna IDs e versão para a aplicação continuar.';

-- Função: Popular tempo_evento_id nos fatos
CREATE OR REPLACE FUNCTION fn_popular_tempo_evento(
    p_remessa_id INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE fato_empenho e
    SET tempo_evento_id = t.id
    FROM dim_tempo t
    WHERE e.dt_empenho = t.data_completa
      AND e.remessa_id = p_remessa_id
      AND e.tempo_evento_id IS NULL;

    UPDATE fato_anulacao_empenho a
    SET tempo_evento_id = t.id
    FROM dim_tempo t
    WHERE a.dt_anulacao = t.data_completa
      AND a.remessa_id = p_remessa_id
      AND a.tempo_evento_id IS NULL;

    UPDATE fato_liquidacao l
    SET tempo_evento_id = t.id
    FROM dim_tempo t
    WHERE l.dt_liquidacao = t.data_completa
      AND l.remessa_id = p_remessa_id
      AND l.tempo_evento_id IS NULL;

    UPDATE fato_pagamento p
    SET tempo_evento_id = t.id
    FROM dim_tempo t
    WHERE p.dt_pagamento = t.data_completa
      AND p.remessa_id = p_remessa_id
      AND p.tempo_evento_id IS NULL;

    UPDATE fato_extraorcamentario x
    SET tempo_evento_id = t.id
    FROM dim_tempo t
    WHERE x.dt_movimento = t.data_completa
      AND x.remessa_id = p_remessa_id
      AND x.tempo_evento_id IS NULL;

    UPDATE fato_lancamento_contabil c
    SET tempo_evento_id = t.id
    FROM dim_tempo t
    WHERE c.dt_lancamento = t.data_completa
      AND c.remessa_id = p_remessa_id
      AND c.tempo_evento_id IS NULL;

    UPDATE fato_movimentacao_bancaria b
    SET tempo_evento_id = t.id
    FROM dim_tempo t
    WHERE b.dt_movimentacao = t.data_completa
      AND b.remessa_id = p_remessa_id
      AND b.tempo_evento_id IS NULL;

    UPDATE fato_alteracao_orcamentaria a
    SET tempo_evento_id = t.id
    FROM dim_tempo t
    WHERE a.dt_lei_decreto = t.data_completa
      AND a.remessa_id = p_remessa_id
      AND a.tempo_evento_id IS NULL;

    RAISE NOTICE 'tempo_evento_id populado para remessa %', p_remessa_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNÇÃO DE LIMPEZA DE STAGING (Política: >90 dias)
-- Remove dados de staging de remessas INATIVAS com mais de
-- 90 dias, mantendo a remessa, os fatos e o histórico.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_limpar_staging_antigas(
    p_dias_retencao INTEGER DEFAULT 90
)
RETURNS TABLE (
    remessas_limpas         INTEGER,
    linhas_brutas_removidas BIGINT,
    linhas_staging_removidas BIGINT
) AS $$
DECLARE
    v_remessas_limpas   INTEGER := 0;
    v_brutas_removidas  BIGINT  := 0;
    v_staging_removidas BIGINT  := 0;
    v_remessa           RECORD;
    v_tabela            RECORD;
    v_count             BIGINT;
    v_brutas_count_log  BIGINT;
    v_stg_count_parcial BIGINT;
BEGIN
    FOR v_remessa IN
        SELECT r.id, r.municipio_id, r.orgao_id,
               r.ano_referencia, r.mes_referencia, r.versao
        FROM tcmgo_remessa r
        WHERE r.ativa = FALSE
          AND r.status = 'substituida'
          AND r.atualizado_em < (CURRENT_TIMESTAMP - (p_dias_retencao || ' days')::INTERVAL)
    LOOP
        v_stg_count_parcial := 0;

        -- 1. Remove staging bruta
        DELETE FROM stg_linha_bruta WHERE remessa_id = v_remessa.id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_brutas_removidas := v_brutas_removidas + v_count;
        v_brutas_count_log := v_count;  -- salva antes do loop sobrescrever v_count

        -- 2. Remove TODAS as tabelas stg_* parseadas (dinâmico)
        --    Busca todas as tabelas cujo nome começa com 'stg_' e
        --    que possuem a coluna 'remessa_id' (exclui stg_linha_bruta já tratada)
        FOR v_tabela IN
            SELECT t.table_name
            FROM information_schema.tables t
            JOIN information_schema.columns c
              ON c.table_schema = t.table_schema
             AND c.table_name = t.table_name
            WHERE t.table_schema = 'public'
              AND t.table_name LIKE 'stg_%'
              AND t.table_name <> 'stg_linha_bruta'
              AND c.column_name = 'remessa_id'
            ORDER BY t.table_name
        LOOP
            EXECUTE format(
                'DELETE FROM %I WHERE remessa_id = $1',
                v_tabela.table_name
            ) USING v_remessa.id;
            GET DIAGNOSTICS v_count = ROW_COUNT;
            v_stg_count_parcial := v_stg_count_parcial + v_count;
        END LOOP;

        v_staging_removidas := v_staging_removidas + v_stg_count_parcial;

        -- 3. Remove arquivos da remessa (cascateia para erros)
        DELETE FROM tcmgo_arquivo_remessa WHERE remessa_id = v_remessa.id;

        -- 4. Registra na auditoria
        INSERT INTO tcmgo_auditoria (
            remessa_id, municipio_id, orgao_id, ano_referencia,
            mes_referencia, versao, evento, descricao, dados_extras
        ) VALUES (
            v_remessa.id, v_remessa.municipio_id, v_remessa.orgao_id,
            v_remessa.ano_referencia, v_remessa.mes_referencia, v_remessa.versao,
            'staging_limpa',
            'Staging bruta, staging parseada e arquivos removidos por política de retenção',
            jsonb_build_object(
                'dias_retencao', p_dias_retencao,
                'linhas_brutas_removidas', v_brutas_count_log,
                'linhas_staging_parseada_removidas', v_stg_count_parcial
            )
        );

        v_remessas_limpas := v_remessas_limpas + 1;
    END LOOP;

    RETURN QUERY SELECT v_remessas_limpas, v_brutas_removidas, v_staging_removidas;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_limpar_staging_antigas IS
    'Remove dados de staging bruta, staging parseada (~100 tabelas stg_*) '
    'e arquivos de remessas inativas com mais de N dias (padrão: 90). '
    'Mantém a remessa, os fatos analíticos, as dimensões e o histórico '
    'administrativo. Registra em tcmgo_auditoria. Usa SQL dinâmico para '
    'iterar sobre todas as tabelas stg_* com coluna remessa_id.';


-- ============================================================
-- VIEWS PARA POWER BI
-- Todas filtram apenas remessa ativa (ativa = TRUE)
-- Todas expõem municipio_id, orgao_id, ano/mes para filtragem direta
-- ============================================================

-- VIEW: Execução da Despesa
CREATE OR REPLACE VIEW vw_pbi_execucao_despesa AS
SELECT
    e.municipio_id,
    e.orgao_id,
    e.ano_referencia,
    e.mes_referencia,
    e.remessa_id,
    m.descricao                     AS municipio,
    o.descricao_orgao               AS orgao_fundo,
    o.tipo_orgao,
    tc.nome_mes, tc.bimestre, tc.trimestre, tc.quadrimestre, tc.semestre,
    te.data_completa                AS data_empenho,
    te.nome_dia_semana              AS dia_semana_empenho,
    e.cod_orgao, e.cod_unidade,
    e.nro_empenho, e.dt_empenho,
    e.tp_empenho, e.cod_funcao, e.cod_subfuncao, e.cod_programa,
    e.elemento_despesa, e.sub_elemento,
    e.cpf_cnpj_credor, e.nome_credor, e.especificacao,
    e.modalidade_licitacao, e.fonte_recurso,
    e.vl_bruto                      AS valor_empenhado,
    COALESCE(anl.total_anulado, 0)  AS valor_anulado,
    COALESCE(lqd.total_liquidado, 0) AS valor_liquidado,
    COALESCE(pag.total_pago, 0)     AS valor_pago,
    e.vl_bruto - COALESCE(anl.total_anulado, 0) AS saldo_empenho,
    r.versao AS versao_remessa
FROM fato_empenho e
JOIN tcmgo_remessa r ON e.remessa_id = r.id AND r.ativa = TRUE
JOIN tcmgo_orgaos o ON e.orgao_id = o.id
JOIN tcmgo_municipios m ON e.municipio_id = m.id
LEFT JOIN dim_tempo tc ON tc.ano = e.ano_referencia AND tc.mes = e.mes_referencia AND tc.dia = 1
LEFT JOIN dim_tempo te ON e.tempo_evento_id = te.id
LEFT JOIN (
    SELECT remessa_id, nro_empenho, cod_orgao, cod_unidade,
           SUM(vl_anulacao) AS total_anulado
    FROM fato_anulacao_empenho GROUP BY 1,2,3,4
) anl ON anl.remessa_id = e.remessa_id AND anl.nro_empenho = e.nro_empenho
         AND anl.cod_orgao = e.cod_orgao AND anl.cod_unidade = e.cod_unidade
LEFT JOIN (
    SELECT remessa_id, nro_empenho, cod_orgao, cod_unidade,
           SUM(vl_liquidacao) AS total_liquidado
    FROM fato_liquidacao GROUP BY 1,2,3,4
) lqd ON lqd.remessa_id = e.remessa_id AND lqd.nro_empenho = e.nro_empenho
         AND lqd.cod_orgao = e.cod_orgao AND lqd.cod_unidade = e.cod_unidade
LEFT JOIN (
    SELECT remessa_id, nro_empenho, cod_orgao, cod_unidade,
           SUM(vl_pagamento) AS total_pago
    FROM fato_pagamento GROUP BY 1,2,3,4
) pag ON pag.remessa_id = e.remessa_id AND pag.nro_empenho = e.nro_empenho
         AND pag.cod_orgao = e.cod_orgao AND pag.cod_unidade = e.cod_unidade;

-- VIEW: Execução da Receita
CREATE OR REPLACE VIEW vw_pbi_execucao_receita AS
SELECT
    rec.municipio_id,
    rec.orgao_id,
    rec.ano_referencia,
    rec.mes_referencia,
    rec.remessa_id,
    m.descricao                     AS municipio,
    o.descricao_orgao               AS orgao_fundo,
    tc.nome_mes, tc.bimestre, tc.trimestre, tc.quadrimestre,
    rec.rubrica,
    rec.especificacao,
    rec.fonte_recurso,
    rec.vl_previsto_inicial,
    rec.vl_previsto_atualizado,
    rec.vl_arrecadado,
    rec.vl_acumulado,
    r.versao AS versao_remessa
FROM fato_receita rec
JOIN tcmgo_remessa r ON rec.remessa_id = r.id AND r.ativa = TRUE
JOIN tcmgo_orgaos o ON rec.orgao_id = o.id
JOIN tcmgo_municipios m ON rec.municipio_id = m.id
LEFT JOIN dim_tempo tc ON tc.ano = rec.ano_referencia AND tc.mes = rec.mes_referencia AND tc.dia = 1;

-- VIEW: Restos a Pagar
CREATE OR REPLACE VIEW vw_pbi_restos_pagar AS
SELECT
    rsp.municipio_id,
    rsp.orgao_id,
    rsp.ano_referencia,
    rsp.mes_referencia,
    rsp.remessa_id,
    m.descricao AS municipio,
    o.descricao_orgao AS orgao_fundo,
    tc.nome_mes,
    rsp.exercicio_empenho, rsp.nro_empenho, rsp.tipo_rsp,
    rsp.elemento_despesa, rsp.nome_credor,
    rsp.vl_inscrito, rsp.vl_cancelado, rsp.vl_liquidado, rsp.vl_pago,
    (rsp.vl_inscrito - COALESCE(rsp.vl_cancelado,0) - COALESCE(rsp.vl_pago,0)) AS saldo_rsp,
    r.versao AS versao_remessa
FROM fato_restos_pagar rsp
JOIN tcmgo_remessa r ON rsp.remessa_id = r.id AND r.ativa = TRUE
JOIN tcmgo_orgaos o ON rsp.orgao_id = o.id
JOIN tcmgo_municipios m ON rsp.municipio_id = m.id
LEFT JOIN dim_tempo tc ON tc.ano = rsp.ano_referencia AND tc.mes = rsp.mes_referencia AND tc.dia = 1;

-- VIEW: Alterações Orçamentárias
CREATE OR REPLACE VIEW vw_pbi_alteracao_orcamentaria AS
SELECT
    aoc.municipio_id,
    aoc.orgao_id,
    aoc.ano_referencia,
    aoc.mes_referencia,
    aoc.remessa_id,
    m.descricao                     AS municipio,
    o.descricao_orgao               AS orgao_fundo,
    tc.nome_mes, tc.bimestre, tc.quadrimestre,
    aoc.cod_unidade, aoc.cod_programa,
    aoc.cod_funcao, aoc.cod_subfuncao,
    aoc.elemento_despesa, aoc.sub_elemento, aoc.fonte_recurso,
    aoc.vl_dotacao_inicial,
    aoc.vl_suplementacao, aoc.vl_reducao,
    aoc.vl_credito_especial, aoc.vl_credito_extraordinario,
    (aoc.vl_dotacao_inicial + aoc.vl_suplementacao + aoc.vl_credito_especial
     + aoc.vl_credito_extraordinario - aoc.vl_reducao) AS dotacao_atualizada,
    r.versao AS versao_remessa
FROM fato_alteracao_orcamentaria aoc
JOIN tcmgo_remessa r ON aoc.remessa_id = r.id AND r.ativa = TRUE
JOIN tcmgo_orgaos o ON aoc.orgao_id = o.id
JOIN tcmgo_municipios m ON aoc.municipio_id = m.id
LEFT JOIN dim_tempo tc ON tc.ano = aoc.ano_referencia AND tc.mes = aoc.mes_referencia AND tc.dia = 1;

-- VIEW: Extraorçamentário
CREATE OR REPLACE VIEW vw_pbi_extraorcamentario AS
SELECT
    ext.municipio_id,
    ext.orgao_id,
    ext.ano_referencia,
    ext.mes_referencia,
    ext.remessa_id,
    m.descricao                     AS municipio,
    o.descricao_orgao               AS orgao_fundo,
    tc.nome_mes,
    te.data_completa                AS data_movimento,
    ext.cod_unidade,
    ext.nro_extra, ext.tipo_movimento,
    ext.dt_movimento,
    ext.cpf_cnpj_credor, ext.nome_credor,
    ext.conta_contabil,
    ext.vl_movimento,
    ext.especificacao,
    r.versao AS versao_remessa
FROM fato_extraorcamentario ext
JOIN tcmgo_remessa r ON ext.remessa_id = r.id AND r.ativa = TRUE
JOIN tcmgo_orgaos o ON ext.orgao_id = o.id
JOIN tcmgo_municipios m ON ext.municipio_id = m.id
LEFT JOIN dim_tempo tc ON tc.ano = ext.ano_referencia AND tc.mes = ext.mes_referencia AND tc.dia = 1
LEFT JOIN dim_tempo te ON ext.tempo_evento_id = te.id;

-- VIEW: Lançamentos Contábeis
CREATE OR REPLACE VIEW vw_pbi_lancamento_contabil AS
SELECT
    lnc.municipio_id,
    lnc.orgao_id,
    lnc.ano_referencia,
    lnc.mes_referencia,
    lnc.remessa_id,
    m.descricao                     AS municipio,
    o.descricao_orgao               AS orgao_fundo,
    tc.nome_mes,
    te.data_completa                AS data_lancamento,
    lnc.cod_unidade,
    lnc.nro_lancamento,
    lnc.dt_lancamento,
    lnc.tipo_lancamento,
    lnc.historico,
    item.conta_debito,
    item.conta_credito,
    item.vl_lancamento,
    item.ordem_item,
    r.versao AS versao_remessa
FROM fato_lancamento_contabil lnc
JOIN fato_item_lancamento_contabil item ON item.lancamento_id = lnc.id
JOIN tcmgo_remessa r ON lnc.remessa_id = r.id AND r.ativa = TRUE
JOIN tcmgo_orgaos o ON lnc.orgao_id = o.id
JOIN tcmgo_municipios m ON lnc.municipio_id = m.id
LEFT JOIN dim_tempo tc ON tc.ano = lnc.ano_referencia AND tc.mes = lnc.mes_referencia AND tc.dia = 1
LEFT JOIN dim_tempo te ON lnc.tempo_evento_id = te.id;

-- VIEW: Movimentação Bancária
CREATE OR REPLACE VIEW vw_pbi_movimentacao_bancaria AS
SELECT
    mov.municipio_id,
    mov.orgao_id,
    mov.ano_referencia,
    mov.mes_referencia,
    mov.remessa_id,
    m.descricao                     AS municipio,
    o.descricao_orgao               AS orgao_fundo,
    tc.nome_mes,
    te.data_completa                AS data_movimentacao,
    mov.cod_unidade,
    mov.tipo_movimentacao,
    mov.nro_transferencia,
    mov.banco, mov.agencia, mov.conta_corrente,
    mov.fonte_origem, mov.fonte_destino,
    mov.dt_movimentacao,
    mov.vl_movimentacao,
    mov.banco_destino, mov.agencia_destino, mov.conta_destino,
    r.versao AS versao_remessa
FROM fato_movimentacao_bancaria mov
JOIN tcmgo_remessa r ON mov.remessa_id = r.id AND r.ativa = TRUE
JOIN tcmgo_orgaos o ON mov.orgao_id = o.id
JOIN tcmgo_municipios m ON mov.municipio_id = m.id
LEFT JOIN dim_tempo tc ON tc.ano = mov.ano_referencia AND tc.mes = mov.mes_referencia AND tc.dia = 1
LEFT JOIN dim_tempo te ON mov.tempo_evento_id = te.id;


COMMIT;

-- ============================================================
-- FIM DO SCRIPT SQL CONSOLIDADO FINAL v5.2
--
-- Objetos criados:
--   Tabelas de controle:       5 (remessa, arquivo, erro, histórico, auditoria)
--   Tabelas de metadados:      3 (layout_arquivo, layout_registro, layout_campo)
--   Tabela staging bruta:      1
--   Tabelas staging parseada: ~100
--   Dimensões:                 7 (tempo, credor, unidade, fonte, conta_contabil,
--                                 conta_bancaria, contrato)
--   Fatos:                    13 (empenho, empenho_fonte, anulação, liquidação,
--                                 pagamento, receita, alteração_orçamentária,
--                                 restos_pagar, extraorçamentário, conta_bancária,
--                                 movimentação_bancária, lançamento_contábil,
--                                 item_lançamento_contábil)
--   Views Power BI:            7
--   Funções:                   7 (desativar, criar, limpar_analiticos, excluir,
--                                 reimportar, popular_tempo, limpar_staging)
--   Índices:                ~170
--
-- Correções v5.1:
--   - dim_tempo: definição única (diária), sem duplicação
--   - TIMESTAMPTZ em todos os campos de data/hora
--   - importado_por_user_id FK + importado_por_nome textual
--   - UNIQUE em fato_movimentacao_bancaria
--   - tcmgo_auditoria sem CASCADE (sobrevive à exclusão)
--   - fn_excluir_remessa registra em tcmgo_auditoria
--   - fn_reimportar_balancete sem opção de exclusão
--   - fn_limpar_staging_antigas (política 90 dias)
--
-- Correções v5.2:
--   - Dimensões (dim_*): remessa_id agora é nullable + ON DELETE SET NULL
--     Dimensões sobrevivem à exclusão da remessa que as criou
--   - fn_limpar_staging_antigas: corrigido bug de contagem
--     (v_staging_removidas era sempre 0); agora itera dinamicamente
--     sobre TODAS as ~100 tabelas stg_* via information_schema
--   - fn_excluir_remessa mantida como uso excepcional (emergência)
--   - Revisão futura sugerida: avaliar se dim_* devem manter remessa_id
--     ou se basta municipio_id + ano_referencia para rastreabilidade
-- ============================================================
