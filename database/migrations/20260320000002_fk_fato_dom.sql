-- =============================================================
-- TCM-GO: Foreign Keys entre tabelas fato_* e domínios dom_*
-- Gerado em: 2026-03-20
-- Todas as FKs são DEFERRABLE INITIALLY DEFERRED para permitir
-- carga em lote sem ordenação topológica.
-- =============================================================

BEGIN;

-- ---------------------------------------------------------------
-- fato_orgao
-- ---------------------------------------------------------------
ALTER TABLE fato_orgao
    ADD CONSTRAINT fk_orgao_tipo_orgao
    FOREIGN KEY (tipo_orgao) REFERENCES dom_tipo_orgao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_uoc_responsavel
-- ---------------------------------------------------------------
ALTER TABLE fato_uoc_responsavel
    ADD CONSTRAINT fk_uoc_resp_tipo_responsavel
    FOREIGN KEY (tipo_responsavel) REFERENCES dom_tipo_responsavel(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_uoc_responsavel
    ADD CONSTRAINT fk_uoc_resp_escolaridade
    FOREIGN KEY (escolaridade) REFERENCES dom_escolaridade(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_uoc_contador
-- ---------------------------------------------------------------
ALTER TABLE fato_uoc_contador
    ADD CONSTRAINT fk_uoc_cont_provimento
    FOREIGN KEY (provimento) REFERENCES dom_provimento(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_uoc_contador
    ADD CONSTRAINT fk_uoc_cont_escolaridade
    FOREIGN KEY (escolaridade) REFERENCES dom_escolaridade(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_uoc_advogado_oab
-- ---------------------------------------------------------------
ALTER TABLE fato_uoc_advogado_oab
    ADD CONSTRAINT fk_uoc_advoab_escolaridade
    FOREIGN KEY (escolaridade) REFERENCES dom_escolaridade(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_receita_deducao
-- banco → dom_instituicao_bancaria
-- tipo_conta → dom_tipo_conta_bancaria
-- ---------------------------------------------------------------
ALTER TABLE fato_receita_deducao
    ADD CONSTRAINT fk_recd_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_receita_deducao
    ADD CONSTRAINT fk_recd_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_receita_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_receita_fonte
    ADD CONSTRAINT fk_recf_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_receita_fonte
    ADD CONSTRAINT fk_recf_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_receita_deducao
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_receita_deducao
    ADD CONSTRAINT fk_ared_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_receita_deducao
    ADD CONSTRAINT fk_ared_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_receita_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_receita_fonte
    ADD CONSTRAINT fk_aref_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_receita_fonte
    ADD CONSTRAINT fk_aref_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_alteracao_orcamentaria
-- ---------------------------------------------------------------
ALTER TABLE fato_alteracao_orcamentaria
    ADD CONSTRAINT fk_aoc_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_alteracao_orcamentaria_unidade
-- ---------------------------------------------------------------
ALTER TABLE fato_alteracao_orcamentaria_unidade
    ADD CONSTRAINT fk_aocu_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_alteracao_orcamentaria_unidade
    ADD CONSTRAINT fk_aocu_tipo_alteracao
    FOREIGN KEY (tipo_alteracao) REFERENCES dom_tipo_alteracao_orcamentaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_alteracao_orcamentaria_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_alteracao_orcamentaria_fonte
    ADD CONSTRAINT fk_aocf_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_alteracao_orcamentaria_fonte
    ADD CONSTRAINT fk_aocf_tipo_alteracao
    FOREIGN KEY (tipo_alteracao) REFERENCES dom_tipo_alteracao_orcamentaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_aoc_ato
-- tipo_credito → dom_tipo_credito_adicional
-- ---------------------------------------------------------------
ALTER TABLE fato_aoc_ato
    ADD CONSTRAINT fk_aoc_ato_tipo_credito
    FOREIGN KEY (tipo_credito) REFERENCES dom_tipo_credito_adicional(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_credito_orcamentario
-- unidade_medida → dom_unidade_medida
-- ---------------------------------------------------------------
ALTER TABLE fato_credito_orcamentario
    ADD CONSTRAINT fk_cob_unidade_medida
    FOREIGN KEY (unidade_medida) REFERENCES dom_unidade_medida(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_empenho
-- ---------------------------------------------------------------
ALTER TABLE fato_empenho
    ADD CONSTRAINT fk_emp_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_empenho
    ADD CONSTRAINT fk_emp_modalidade_licitacao
    FOREIGN KEY (modalidade_licitacao) REFERENCES dom_modalidade_licitacao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_empenho
    ADD CONSTRAINT fk_emp_fundamentacao_legal
    FOREIGN KEY (fundamentacao_legal) REFERENCES dom_fundamentacao_legal(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_empenho
    ADD CONSTRAINT fk_emp_assunto
    FOREIGN KEY (assunto) REFERENCES dom_assunto_contrato(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_empenho
    ADD CONSTRAINT fk_emp_tp_empenho
    FOREIGN KEY (tp_empenho) REFERENCES dom_tipo_empenho(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_empenho
    ADD CONSTRAINT fk_emp_tipo_credor
    FOREIGN KEY (tipo_credor) REFERENCES dom_tipo_credor(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_empenho_beneficiario
-- ---------------------------------------------------------------
ALTER TABLE fato_empenho_beneficiario
    ADD CONSTRAINT fk_empb_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_empenho_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_empenho_fonte
    ADD CONSTRAINT fk_empf_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_empenho_contrato
-- ---------------------------------------------------------------
ALTER TABLE fato_empenho_contrato
    ADD CONSTRAINT fk_empc_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_empenho_contrato
    ADD CONSTRAINT fk_empc_tipo_ajuste
    FOREIGN KEY (tipo_ajuste) REFERENCES dom_tipo_ajuste(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_empenho_subelemento
-- ---------------------------------------------------------------
ALTER TABLE fato_empenho_subelemento
    ADD CONSTRAINT fk_emps_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_empenho_subelemento
    ADD CONSTRAINT fk_emps_tipo_credor
    FOREIGN KEY (tipo_credor) REFERENCES dom_tipo_credor(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_empenho
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_empenho
    ADD CONSTRAINT fk_anl_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_empenho
    ADD CONSTRAINT fk_anl_tipo_credor
    FOREIGN KEY (tipo_credor) REFERENCES dom_tipo_credor(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_empenho_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_empenho_fonte
    ADD CONSTRAINT fk_anlf_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_empenho_subelemento
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_empenho_subelemento
    ADD CONSTRAINT fk_anls_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_empenho_contrato
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_empenho_contrato
    ADD CONSTRAINT fk_anlc_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_empenho_contrato
    ADD CONSTRAINT fk_anlc_tipo_ajuste
    FOREIGN KEY (tipo_ajuste) REFERENCES dom_tipo_ajuste(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_empenho_beneficiario
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_empenho_beneficiario
    ADD CONSTRAINT fk_anlb_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_empenho_beneficiario
    ADD CONSTRAINT fk_anlb_tipo_credor
    FOREIGN KEY (tipo_credor) REFERENCES dom_tipo_credor(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_estorno_contabilizacao
-- ---------------------------------------------------------------
ALTER TABLE fato_estorno_contabilizacao
    ADD CONSTRAINT fk_eoc_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_estorno_contabilizacao_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_estorno_contabilizacao_fonte
    ADD CONSTRAINT fk_eocf_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_estorno_contabilizacao_documento
-- ---------------------------------------------------------------
ALTER TABLE fato_estorno_contabilizacao_documento
    ADD CONSTRAINT fk_eocd_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_estorno_contabilizacao_documento
    ADD CONSTRAINT fk_eocd_tipo_ajuste
    FOREIGN KEY (tipo_ajuste) REFERENCES dom_tipo_ajuste(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_liquidacao
-- ---------------------------------------------------------------
ALTER TABLE fato_liquidacao
    ADD CONSTRAINT fk_lqd_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_liquidacao
    ADD CONSTRAINT fk_lqd_tp_liquidacao
    FOREIGN KEY (tp_liquidacao) REFERENCES dom_tipo_liquidacao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_liquidacao_deducao
-- ---------------------------------------------------------------
ALTER TABLE fato_liquidacao_deducao
    ADD CONSTRAINT fk_lqdd_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_liquidacao_credor_rsp
-- tipo_doc_fiscal VARCHAR(2) → dom_tipo_documento_fiscal PK VARCHAR(1): OMITIDO (incompatibilidade de tamanho)
-- ---------------------------------------------------------------
ALTER TABLE fato_liquidacao_credor_rsp
    ADD CONSTRAINT fk_lqdc_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_liquidacao_credor_rsp
    ADD CONSTRAINT fk_lqdc_tipo_credor
    FOREIGN KEY (tipo_credor) REFERENCES dom_tipo_credor(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_liquidacao
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_liquidacao
    ADD CONSTRAINT fk_alq_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_liquidacao
    ADD CONSTRAINT fk_alq_tp_liquidacao
    FOREIGN KEY (tp_liquidacao) REFERENCES dom_tipo_liquidacao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_liquidacao_deducao
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_liquidacao_deducao
    ADD CONSTRAINT fk_alqd_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_liquidacao_credor
-- tipo_doc_fiscal VARCHAR(2) → dom_tipo_documento_fiscal PK VARCHAR(1): OMITIDO (incompatibilidade de tamanho)
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_liquidacao_credor
    ADD CONSTRAINT fk_alqc_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_liquidacao_credor
    ADD CONSTRAINT fk_alqc_tipo_credor
    FOREIGN KEY (tipo_credor) REFERENCES dom_tipo_credor(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_pagamento
-- ---------------------------------------------------------------
ALTER TABLE fato_pagamento
    ADD CONSTRAINT fk_ops_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_pagamento
    ADD CONSTRAINT fk_ops_tipo_op
    FOREIGN KEY (tipo_op) REFERENCES dom_tipo_op(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_pagamento
    ADD CONSTRAINT fk_ops_tipo_credor
    FOREIGN KEY (tipo_credor) REFERENCES dom_tipo_credor(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_pagamento_banco
-- ---------------------------------------------------------------
ALTER TABLE fato_pagamento_banco
    ADD CONSTRAINT fk_opsb_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_pagamento_documento
-- ---------------------------------------------------------------
ALTER TABLE fato_pagamento_documento
    ADD CONSTRAINT fk_opsd_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_pagamento_documento
    ADD CONSTRAINT fk_opsd_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_pagamento_documento
    ADD CONSTRAINT fk_opsd_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_pagamento_documento
    ADD CONSTRAINT fk_opsd_tipo_documento
    FOREIGN KEY (tipo_documento) REFERENCES dom_tipo_documento_pagamento(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_pagamento_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_pagamento_fonte
    ADD CONSTRAINT fk_opsf_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_pagamento_fonte
    ADD CONSTRAINT fk_opsf_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_pagamento_fonte
    ADD CONSTRAINT fk_opsf_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_pagamento_deducao
-- ---------------------------------------------------------------
ALTER TABLE fato_pagamento_deducao
    ADD CONSTRAINT fk_opsr_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_pagamento_deducao
    ADD CONSTRAINT fk_opsr_tipo_retencao
    FOREIGN KEY (tipo_retencao) REFERENCES dom_tipo_retencao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_pagamento
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_pagamento
    ADD CONSTRAINT fk_aop_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_pagamento
    ADD CONSTRAINT fk_aop_tipo_op
    FOREIGN KEY (tipo_op) REFERENCES dom_tipo_op(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_pagamento
    ADD CONSTRAINT fk_aop_tipo_credor
    FOREIGN KEY (tipo_credor) REFERENCES dom_tipo_credor(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_pagamento_banco
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_pagamento_banco
    ADD CONSTRAINT fk_aopb_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_pagamento_documento
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_pagamento_documento
    ADD CONSTRAINT fk_aopd_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_pagamento_documento
    ADD CONSTRAINT fk_aopd_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_pagamento_documento
    ADD CONSTRAINT fk_aopd_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_pagamento_documento
    ADD CONSTRAINT fk_aopd_tipo_documento
    FOREIGN KEY (tipo_documento) REFERENCES dom_tipo_documento_pagamento(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_pagamento_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_pagamento_fonte
    ADD CONSTRAINT fk_aopf_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_pagamento_fonte
    ADD CONSTRAINT fk_aopf_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_pagamento_fonte
    ADD CONSTRAINT fk_aopf_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_pagamento_deducao
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_pagamento_deducao
    ADD CONSTRAINT fk_aopr_natureza_acao
    FOREIGN KEY (natureza_acao) REFERENCES dom_natureza_acao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_pagamento_deducao
    ADD CONSTRAINT fk_aopr_tipo_retencao
    FOREIGN KEY (tipo_retencao) REFERENCES dom_tipo_retencao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_extraorcamentario
-- ---------------------------------------------------------------
ALTER TABLE fato_extraorcamentario
    ADD CONSTRAINT fk_ext_categoria
    FOREIGN KEY (categoria) REFERENCES dom_categoria_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_extraorcamentario
    ADD CONSTRAINT fk_ext_tipo_lancamento
    FOREIGN KEY (tipo_lancamento) REFERENCES dom_tipo_lancamento_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_extraorcamentario_deducao
-- ---------------------------------------------------------------
ALTER TABLE fato_extraorcamentario_deducao
    ADD CONSTRAINT fk_extd_categoria
    FOREIGN KEY (categoria) REFERENCES dom_categoria_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_extraorcamentario_deducao
    ADD CONSTRAINT fk_extd_tipo_lancamento
    FOREIGN KEY (tipo_lancamento) REFERENCES dom_tipo_lancamento_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_extraorcamentario_deducao
    ADD CONSTRAINT fk_extd_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_extraorcamentario_deducao
    ADD CONSTRAINT fk_extd_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_extraorcamentario_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_extraorcamentario_fonte
    ADD CONSTRAINT fk_extf_categoria
    FOREIGN KEY (categoria) REFERENCES dom_categoria_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_extraorcamentario_fonte
    ADD CONSTRAINT fk_extf_tipo_lancamento
    FOREIGN KEY (tipo_lancamento) REFERENCES dom_tipo_lancamento_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_extraorcamentario_fonte
    ADD CONSTRAINT fk_extf_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_extraorcamentario_fonte
    ADD CONSTRAINT fk_extf_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_extraorcamentario
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_extraorcamentario
    ADD CONSTRAINT fk_aex_categoria
    FOREIGN KEY (categoria) REFERENCES dom_categoria_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_extraorcamentario
    ADD CONSTRAINT fk_aex_tipo_lancamento
    FOREIGN KEY (tipo_lancamento) REFERENCES dom_tipo_lancamento_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_extraorcamentario_deducao
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_extraorcamentario_deducao
    ADD CONSTRAINT fk_aexd_categoria
    FOREIGN KEY (categoria) REFERENCES dom_categoria_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_extraorcamentario_deducao
    ADD CONSTRAINT fk_aexd_tipo_lancamento
    FOREIGN KEY (tipo_lancamento) REFERENCES dom_tipo_lancamento_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_extraorcamentario_deducao
    ADD CONSTRAINT fk_aexd_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_extraorcamentario_deducao
    ADD CONSTRAINT fk_aexd_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_anulacao_extraorcamentario_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_anulacao_extraorcamentario_fonte
    ADD CONSTRAINT fk_aexf_categoria
    FOREIGN KEY (categoria) REFERENCES dom_categoria_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_extraorcamentario_fonte
    ADD CONSTRAINT fk_aexf_tipo_lancamento
    FOREIGN KEY (tipo_lancamento) REFERENCES dom_tipo_lancamento_extra(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_extraorcamentario_fonte
    ADD CONSTRAINT fk_aexf_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_anulacao_extraorcamentario_fonte
    ADD CONSTRAINT fk_aexf_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_restos_pagar_encampacao
-- ---------------------------------------------------------------
ALTER TABLE fato_restos_pagar_encampacao
    ADD CONSTRAINT fk_rspe_tipo_encampacao
    FOREIGN KEY (tipo_encampacao) REFERENCES dom_tipo_encampacao(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_conta_bancaria
-- ---------------------------------------------------------------
ALTER TABLE fato_conta_bancaria
    ADD CONSTRAINT fk_ctb_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_conta_bancaria
    ADD CONSTRAINT fk_ctb_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_conta_bancaria_aplicacao
-- ---------------------------------------------------------------
ALTER TABLE fato_conta_bancaria_aplicacao
    ADD CONSTRAINT fk_ctba_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_conta_bancaria_aplicacao
    ADD CONSTRAINT fk_ctba_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_transferencia_bancaria
-- banco_origem → dom_instituicao_bancaria
-- tipo_conta_origem → dom_tipo_conta_bancaria
-- ---------------------------------------------------------------
ALTER TABLE fato_transferencia_bancaria
    ADD CONSTRAINT fk_trb_banco_origem
    FOREIGN KEY (banco_origem) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_transferencia_bancaria
    ADD CONSTRAINT fk_trb_tipo_conta_origem
    FOREIGN KEY (tipo_conta_origem) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_transferencia_bancaria_destino
-- ---------------------------------------------------------------
ALTER TABLE fato_transferencia_bancaria_destino
    ADD CONSTRAINT fk_trbd_banco_origem
    FOREIGN KEY (banco_origem) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_transferencia_bancaria_destino
    ADD CONSTRAINT fk_trbd_tipo_conta_origem
    FOREIGN KEY (tipo_conta_origem) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_transferencia_bancaria_destino
    ADD CONSTRAINT fk_trbd_banco_destino
    FOREIGN KEY (banco_destino) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_transferencia_bancaria_destino
    ADD CONSTRAINT fk_trbd_tipo_conta_destino
    FOREIGN KEY (tipo_conta_destino) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_transferencia_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_transferencia_fonte
    ADD CONSTRAINT fk_tfr_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_transferencia_fonte
    ADD CONSTRAINT fk_tfr_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_transferencia_fonte_destino
-- ---------------------------------------------------------------
ALTER TABLE fato_transferencia_fonte_destino
    ADD CONSTRAINT fk_tfrd_banco
    FOREIGN KEY (banco) REFERENCES dom_instituicao_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_transferencia_fonte_destino
    ADD CONSTRAINT fk_tfrd_tipo_conta
    FOREIGN KEY (tipo_conta) REFERENCES dom_tipo_conta_bancaria(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_divida_consolidada
-- tp_lancamento → dom_tipo_divida (tipo de operação da dívida consolidada)
-- ---------------------------------------------------------------
ALTER TABLE fato_divida_consolidada
    ADD CONSTRAINT fk_dic_tp_lancamento
    FOREIGN KEY (tp_lancamento) REFERENCES dom_tipo_divida(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_veiculo
-- tipo_veiculo → dom_tipo_veiculo
-- combustivel → dom_tipo_combustivel
-- ---------------------------------------------------------------
ALTER TABLE fato_veiculo
    ADD CONSTRAINT fk_cvc_tipo_veiculo
    FOREIGN KEY (tipo_veiculo) REFERENCES dom_tipo_veiculo(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_veiculo
    ADD CONSTRAINT fk_cvc_combustivel
    FOREIGN KEY (combustivel) REFERENCES dom_tipo_combustivel(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_veiculo_uso
-- tipo_combustivel → dom_tipo_combustivel
-- ---------------------------------------------------------------
ALTER TABLE fato_veiculo_uso
    ADD CONSTRAINT fk_cvcu_tipo_combustivel
    FOREIGN KEY (tipo_combustivel) REFERENCES dom_tipo_combustivel(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_estoque_combustivel
-- ---------------------------------------------------------------
ALTER TABLE fato_estoque_combustivel
    ADD CONSTRAINT fk_ecl_tipo_combustivel
    FOREIGN KEY (tipo_combustivel) REFERENCES dom_tipo_combustivel(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_estoque_combustivel_saida
-- ---------------------------------------------------------------
ALTER TABLE fato_estoque_combustivel_saida
    ADD CONSTRAINT fk_ecls_tipo_combustivel
    FOREIGN KEY (tipo_combustivel) REFERENCES dom_tipo_combustivel(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_plano_contas_envio
-- envio_plano_contas → dom_tipo_envio_plano_contas
-- ---------------------------------------------------------------
ALTER TABLE fato_plano_contas_envio
    ADD CONSTRAINT fk_pct_envio_plano_contas
    FOREIGN KEY (envio_plano_contas) REFERENCES dom_tipo_envio_plano_contas(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_plano_contas_conta_analitica
-- ind_calc_sup_financeiro → dom_indicador_superavit
-- ind_calc_sup_fin_pcasp  → dom_indicador_superavit
-- ---------------------------------------------------------------
ALTER TABLE fato_plano_contas_conta_analitica
    ADD CONSTRAINT fk_pcta_ind_calc_sup_fin
    FOREIGN KEY (ind_calc_sup_financeiro) REFERENCES dom_indicador_superavit(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_plano_contas_conta_analitica
    ADD CONSTRAINT fk_pcta_ind_calc_sup_fin_pcasp
    FOREIGN KEY (ind_calc_sup_fin_pcasp) REFERENCES dom_indicador_superavit(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_plano_contas_conta_fonte
-- ---------------------------------------------------------------
ALTER TABLE fato_plano_contas_conta_fonte
    ADD CONSTRAINT fk_pctf_ind_calc_sup_fin
    FOREIGN KEY (ind_calc_sup_financeiro) REFERENCES dom_indicador_superavit(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE fato_plano_contas_conta_fonte
    ADD CONSTRAINT fk_pctf_ind_calc_sup_fin_pcasp
    FOREIGN KEY (ind_calc_sup_fin_pcasp) REFERENCES dom_indicador_superavit(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_plano_contas_conta_vinculacao
-- ---------------------------------------------------------------
ALTER TABLE fato_plano_contas_conta_vinculacao
    ADD CONSTRAINT fk_pctv_ind_calc_sup_fin
    FOREIGN KEY (ind_calc_sup_financeiro) REFERENCES dom_indicador_superavit(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_lancamento_contabil
-- tipo_lancamento → dom_tipo_lancamento_contabil
-- ---------------------------------------------------------------
ALTER TABLE fato_lancamento_contabil
    ADD CONSTRAINT fk_lnc_tipo_lancamento
    FOREIGN KEY (tipo_lancamento) REFERENCES dom_tipo_lancamento_contabil(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_contrato
-- tipo_ajuste → dom_tipo_ajuste
-- ---------------------------------------------------------------
ALTER TABLE fato_contrato
    ADD CONSTRAINT fk_con_tipo_ajuste
    FOREIGN KEY (tipo_ajuste) REFERENCES dom_tipo_ajuste(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_licitacao
-- modalidade → dom_modalidade_licitacao_abl
-- tipo_licitacao VARCHAR(2): dom_tipo_licitacao PK é VARCHAR(1) — OMITIDO (incompatibilidade de tamanho)
-- ---------------------------------------------------------------
ALTER TABLE fato_licitacao
    ADD CONSTRAINT fk_abl_modalidade
    FOREIGN KEY (modalidade) REFERENCES dom_modalidade_licitacao_abl(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------
-- fato_dispensa_inexigibilidade
-- tipo_processo VARCHAR(2): dom_tipo_processo_dsi PK é VARCHAR(1) — OMITIDO (incompatibilidade de tamanho)
-- Nenhuma FK de domínio aplicável nesta tabela.
-- ---------------------------------------------------------------

COMMIT;
