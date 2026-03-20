-- =============================================================
-- TCM-GO: fn_processar_remessa v2
-- Reescrita completa compatível com o schema fato_* de 2026-03-20.
-- Remove tempo_id. Mapeia 23 tabelas stg_* → fato_*.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_processar_remessa(
    p_remessa_id INTEGER
)
RETURNS TABLE (
    tabela           VARCHAR,
    linhas_inseridas INTEGER
) AS $$
DECLARE
    v_municipio_id  INTEGER;
    v_orgao_id      INTEGER;
    v_ano           SMALLINT;
    v_mes           SMALLINT;
    v_count         INTEGER;
BEGIN
    -- ── Metadados da remessa ──────────────────────────────────
    SELECT r.municipio_id, r.orgao_id, r.ano_referencia, r.mes_referencia
    INTO v_municipio_id, v_orgao_id, v_ano, v_mes
    FROM tcmgo_remessa r
    WHERE r.id = p_remessa_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Remessa % não encontrada.', p_remessa_id;
    END IF;

    -- ==========================================================
    -- 1. IDENTIFICAÇÃO DA REMESSA (IDE.10)
    -- ==========================================================
    INSERT INTO fato_identificacao_remessa (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_municipio, tipo_balancete, data_geracao
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_municipio),
        TRIM(s.tipo_balancete),
        fn_parse_data(s.data_geracao)
    FROM stg_ide_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_identificacao_remessa'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 2. ÓRGÃO (ORGAO.10)
    -- ==========================================================
    INSERT INTO fato_orgao (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cpf_gestor, dt_inicio, dt_final,
        desc_orgao, tipo_orgao, cnpj_orgao,
        nome_gestor, cargo_gestor,
        logra_res_gestor, setor_logra_gestor, cidade_logra_gestor,
        uf_cidade_gestor, cep_logra_gestor, fone_gestor, email_gestor
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cpf_gestor),
        fn_parse_data(s.dt_inicio), fn_parse_data(s.dt_final),
        TRIM(s.desc_orgao), TRIM(s.tipo_orgao), TRIM(s.cnpj_orgao),
        TRIM(s.nome_gestor), TRIM(s.cargo_gestor),
        TRIM(s.logra_res_gestor), TRIM(s.setor_logra_gestor), TRIM(s.cidade_logra_gestor),
        TRIM(s.uf_cidade_gestor), TRIM(s.cep_logra_gestor), TRIM(s.fone_gestor), TRIM(s.email_gestor)
    FROM stg_orgao_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_orgao'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 3. UNIDADE ORÇAMENTÁRIA (UOC.10)
    -- ==========================================================
    INSERT INTO fato_unidade_orcamentaria (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, descricao, num_consolidacao
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.descricao), TRIM(s.num_consolidacao)
    FROM stg_uoc_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_unidade_orcamentaria'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 4. RESPONSÁVEL DA UOC (UOC.11)
    -- ==========================================================
    INSERT INTO fato_uoc_responsavel (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, cpf_ordenador, dt_inicio, tipo_responsavel,
        dt_fim, nome_ordenador, cargo_ordenador,
        logra_res, setor_logra, cidade_logra, uf_cidade, cep, fone, email, escolaridade
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade), TRIM(s.cpf_ordenador),
        fn_parse_data(s.dt_inicio), TRIM(s.tipo_responsavel),
        fn_parse_data(s.dt_fim), TRIM(s.nome_ordenador), TRIM(s.cargo_ordenador),
        TRIM(s.logra_res), TRIM(s.setor_logra), TRIM(s.cidade_logra),
        TRIM(s.uf_cidade), TRIM(s.cep), TRIM(s.fone), TRIM(s.email), TRIM(s.escolaridade)
    FROM stg_uoc_11 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_uoc_responsavel'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 5. CONTADOR (UOC.12)
    -- ==========================================================
    INSERT INTO fato_uoc_contador (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, cpf, dt_inicio, dt_final,
        nome, crc, uf_crc, provimento, cnpj_empresa, razao_social,
        logra_res, setor_logra, cidade_logra, uf_cidade, cep, fone, email, escolaridade
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade), TRIM(s.cpf),
        fn_parse_data(s.dt_inicio), fn_parse_data(s.dt_final),
        TRIM(s.nome), TRIM(s.crc), TRIM(s.uf_crc), TRIM(s.provimento),
        TRIM(s.cnpj_empresa), TRIM(s.razao_social),
        TRIM(s.logra_res), TRIM(s.setor_logra), TRIM(s.cidade_logra),
        TRIM(s.uf_cidade), TRIM(s.cep), TRIM(s.fone), TRIM(s.email), TRIM(s.escolaridade)
    FROM stg_uoc_12 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_uoc_contador'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 6. CONTROLE INTERNO (UOC.13 → fato_uoc_advogado_oab)
    -- ==========================================================
    INSERT INTO fato_uoc_advogado_oab (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, cpf, dt_inicio, dt_final,
        nome, logra_res, setor_logra, cidade_logra, uf_cidade, cep, fone, email, escolaridade
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade), TRIM(s.cpf),
        fn_parse_data(s.dt_inicio), fn_parse_data(s.dt_final),
        TRIM(s.nome),
        TRIM(s.logra_res), TRIM(s.setor_logra), TRIM(s.cidade_logra),
        TRIM(s.uf_cidade), TRIM(s.cep), TRIM(s.fone), TRIM(s.email), TRIM(s.escolaridade)
    FROM stg_uoc_13 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_uoc_advogado_oab'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 7. RESPONSÁVEL JURÍDICO (UOC.14 → fato_uoc_advogado_nao_oab)
    -- ==========================================================
    INSERT INTO fato_uoc_advogado_nao_oab (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, cpf, dt_inicio, dt_final,
        nome, oab, uf_oab, provimento, cnpj_empresa, razao_social,
        logra_res, setor_logra, cidade_logra, uf_cidade, cep, fone, email
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade), TRIM(s.cpf),
        fn_parse_data(s.dt_inicio), fn_parse_data(s.dt_final),
        TRIM(s.nome), TRIM(s.oab), TRIM(s.uf_oab), TRIM(s.provimento),
        TRIM(s.cnpj_empresa), TRIM(s.razao_social),
        TRIM(s.logra_res), TRIM(s.setor_logra), TRIM(s.cidade_logra),
        TRIM(s.uf_cidade), TRIM(s.cep), TRIM(s.fone), TRIM(s.email)
    FROM stg_uoc_14 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_uoc_advogado_nao_oab'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 8. RECEITA ORÇAMENTÁRIA (REC.10)
    -- ==========================================================
    INSERT INTO fato_receita (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, rubrica, especificacao,
        vl_previsto_atualizado, vl_arrecadado, vl_acumulado
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.rubrica), TRIM(s.especificacao),
        fn_parse_valor(s.vl_previsto_atualizado),
        fn_parse_valor(s.vl_arrecadado),
        fn_parse_valor(s.vl_acumulado)
    FROM stg_rec_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_receita'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 9. EMPENHO (EMP.10)
    -- ==========================================================
    INSERT INTO fato_empenho (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_programa, cod_orgao, cod_unidade, cod_funcao, cod_subfuncao,
        natureza_acao, nro_proj_ativ, elemento_despesa, sub_elemento,
        nro_empenho, modalidade_licitacao, fundamentacao_legal,
        justificativa_dispensa, razao_escolha,
        nro_proc_licitacao, ano_proc_licitacao, nro_proc_adm,
        nro_instrumento_contrato, assunto, tp_empenho, dt_empenho, vl_bruto,
        nome_credor, tipo_credor, cpf_cnpj_credor, especificacao,
        cpf_resp_empenho, nome_resp_empenho, id_colare
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_programa), TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.cod_funcao), TRIM(s.cod_subfuncao),
        TRIM(s.natureza_acao), TRIM(s.nro_proj_ativ),
        TRIM(s.elemento_despesa), TRIM(s.sub_elemento),
        TRIM(s.nro_empenho), TRIM(s.modalidade_licitacao), TRIM(s.fundamentacao_legal),
        TRIM(s.justificativa_dispensa), TRIM(s.razao_escolha),
        TRIM(s.nro_proc_licitacao),
        NULLIF(TRIM(s.ano_proc_licitacao), '')::SMALLINT,
        TRIM(s.nro_proc_adm),
        TRIM(s.nro_instrumento_contrato), TRIM(s.assunto),
        TRIM(s.tp_empenho), fn_parse_data(s.dt_empenho), fn_parse_valor(s.vl_bruto),
        TRIM(s.nome_credor), TRIM(s.tipo_credor), TRIM(s.cpf_cnpj_credor),
        TRIM(s.especificacao),
        TRIM(s.cpf_resp_empenho), TRIM(s.nome_resp_empenho), TRIM(s.id_colare)
    FROM stg_emp_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_empenho'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 10. EMPENHO POR FONTE DE RECURSO (EMP.11 → fato_empenho_beneficiario)
    -- ==========================================================
    INSERT INTO fato_empenho_beneficiario (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_programa, cod_orgao, cod_unidade, cod_funcao, cod_subfuncao,
        natureza_acao, nro_proj_ativ, elemento_despesa, sub_elemento,
        nro_empenho, cod_fonte_recurso, vl_recurso
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_programa), TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.cod_funcao), TRIM(s.cod_subfuncao),
        TRIM(s.natureza_acao), TRIM(s.nro_proj_ativ),
        TRIM(s.elemento_despesa), TRIM(s.sub_elemento),
        TRIM(s.nro_empenho), TRIM(s.cod_fonte_recurso),
        fn_parse_valor(s.vl_recurso)
    FROM stg_emp_11 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_empenho_beneficiario'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 11. EMPENHO VINCULADO A OBRA (EMP.12 → fato_empenho_fonte)
    -- ==========================================================
    INSERT INTO fato_empenho_fonte (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_programa, cod_orgao, cod_unidade, cod_funcao, cod_subfuncao,
        natureza_acao, nro_proj_ativ, elemento_despesa, sub_elemento,
        nro_empenho, cod_unidade_obra, cod_obra, ano_obra, vl_associado_obra
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_programa), TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.cod_funcao), TRIM(s.cod_subfuncao),
        TRIM(s.natureza_acao), TRIM(s.nro_proj_ativ),
        TRIM(s.elemento_despesa), TRIM(s.sub_elemento),
        TRIM(s.nro_empenho), TRIM(s.cod_unidade_obra),
        TRIM(s.cod_obra),
        NULLIF(TRIM(s.ano_obra), '')::SMALLINT,
        fn_parse_valor(s.vl_associado_obra)
    FROM stg_emp_12 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_empenho_fonte'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 12. EMPENHO VINCULADO A CONTRATO (EMP.13 → fato_empenho_contrato)
    -- ==========================================================
    INSERT INTO fato_empenho_contrato (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_programa, cod_orgao, cod_unidade, cod_funcao, cod_subfuncao,
        natureza_acao, nro_proj_ativ, elemento_despesa, sub_elemento,
        nro_empenho, cod_unidade_contrato, nro_contrato, ano_contrato,
        tipo_ajuste, vl_associado_contrato, id_colare
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_programa), TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.cod_funcao), TRIM(s.cod_subfuncao),
        TRIM(s.natureza_acao), TRIM(s.nro_proj_ativ),
        TRIM(s.elemento_despesa), TRIM(s.sub_elemento),
        TRIM(s.nro_empenho), TRIM(s.cod_unidade_contrato),
        TRIM(s.nro_contrato),
        NULLIF(TRIM(s.ano_contrato), '')::SMALLINT,
        TRIM(s.tipo_ajuste),
        fn_parse_valor(s.vl_associado_contrato),
        TRIM(s.id_colare)
    FROM stg_emp_13 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_empenho_contrato'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 13. ANULAÇÃO DE EMPENHO (ANL.10)
    -- ==========================================================
    INSERT INTO fato_anulacao_empenho (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_programa, cod_orgao, cod_unidade, cod_funcao, cod_subfuncao,
        natureza_acao, nro_proj_ativ, elemento_despesa, sub_elemento,
        nro_empenho, dt_anulacao, nr_anulacao, dt_empenho,
        vl_original, vl_anulacao, nome_credor, tipo_credor, cpf_cnpj, especificacao
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_programa), TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.cod_funcao), TRIM(s.cod_subfuncao),
        TRIM(s.natureza_acao), TRIM(s.nro_proj_ativ),
        TRIM(s.elemento_despesa), TRIM(s.sub_elemento),
        TRIM(s.nro_empenho),
        fn_parse_data(s.dt_anulacao), TRIM(s.nr_anulacao),
        fn_parse_data(s.dt_empenho),
        fn_parse_valor(s.vl_original), fn_parse_valor(s.vl_anulacao),
        TRIM(s.nome_credor), TRIM(s.tipo_credor), TRIM(s.cpf_cnpj), TRIM(s.especificacao)
    FROM stg_anl_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_anulacao_empenho'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 14. LIQUIDAÇÃO (LQD.10)
    -- ==========================================================
    INSERT INTO fato_liquidacao (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_programa, cod_orgao, cod_unidade, cod_funcao, cod_subfuncao,
        natureza_acao, nro_proj_ativ, elemento_despesa, sub_elemento,
        dot_orig_p2001, nro_empenho, dt_empenho,
        nr_liquidacao, dt_liquidacao, tp_liquidacao, vl_liquidado,
        resp_liquidacao, cpf_resp_liquidacao, especificacao_liquidacao
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_programa), TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.cod_funcao), TRIM(s.cod_subfuncao),
        TRIM(s.natureza_acao), TRIM(s.nro_proj_ativ),
        TRIM(s.elemento_despesa), TRIM(s.sub_elemento),
        TRIM(s.dot_orig_p2001), TRIM(s.nro_empenho),
        fn_parse_data(s.dt_empenho),
        TRIM(s.nr_liquidacao), fn_parse_data(s.dt_liquidacao),
        TRIM(s.tp_liquidacao), fn_parse_valor(s.vl_liquidado),
        TRIM(s.resp_liquidacao), TRIM(s.cpf_resp_liquidacao),
        TRIM(s.especificacao_liquidacao)
    FROM stg_lqd_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_liquidacao'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 15. ORDEM DE PAGAMENTO (OPS.10 → fato_pagamento)
    -- ==========================================================
    INSERT INTO fato_pagamento (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_programa, cod_orgao, cod_unidade, cod_funcao, cod_subfuncao,
        natureza_acao, nro_proj_ativ, elemento_despesa, sub_elemento,
        dot_orig_p2001, nro_empenho, nro_op, tipo_op,
        dt_inscricao, dt_emissao, vl_op,
        nome_credor, tipo_credor, cpf_cnpj,
        especificacao_op, cpf_resp_op, nome_resp_op,
        nr_extra_orcamentaria, id_colare
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_programa), TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.cod_funcao), TRIM(s.cod_subfuncao),
        TRIM(s.natureza_acao), TRIM(s.nro_proj_ativ),
        TRIM(s.elemento_despesa), TRIM(s.sub_elemento),
        TRIM(s.dot_orig_p2001), TRIM(s.nro_empenho),
        TRIM(s.nro_op), TRIM(s.tipo_op),
        fn_parse_data(s.dt_inscricao), fn_parse_data(s.dt_emissao),
        fn_parse_valor(s.vl_op),
        TRIM(s.nome_credor), TRIM(s.tipo_credor), TRIM(s.cpf_cnpj),
        TRIM(s.especificacao_op), TRIM(s.cpf_resp_op), TRIM(s.nome_resp_op),
        TRIM(s.nr_extra_orcamentaria), TRIM(s.id_colare)
    FROM stg_ops_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_pagamento'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 16. ALTERAÇÃO ORÇAMENTÁRIA (AOC.10)
    -- ==========================================================
    INSERT INTO fato_alteracao_orcamentaria (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_programa, cod_orgao, cod_unidade, cod_funcao, cod_subfuncao,
        natureza_acao, nro_proj_ativ,
        vl_saldo_ant_orcado, vl_saldo_atual
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_programa), TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.cod_funcao), TRIM(s.cod_subfuncao),
        TRIM(s.natureza_acao), TRIM(s.nro_proj_ativ),
        fn_parse_valor(s.vl_saldo_ant_orcado),
        fn_parse_valor(s.vl_saldo_atual)
    FROM stg_aoc_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_alteracao_orcamentaria'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 17. RESTOS A PAGAR (RSP.10)
    -- ==========================================================
    INSERT INTO fato_restos_pagar (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, dot_orig_p2001, dot_orig_p2002, nro_empenho,
        dt_empenho, nome_credor, vl_original, vl_saldo_ant, vl_baixa_pgto
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.dot_orig_p2001), TRIM(s.dot_orig_p2002),
        TRIM(s.nro_empenho),
        fn_parse_data(s.dt_empenho), TRIM(s.nome_credor),
        fn_parse_valor(s.vl_original),
        fn_parse_valor(s.vl_saldo_ant),
        fn_parse_valor(s.vl_baixa_pgto)
    FROM stg_rsp_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_restos_pagar'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 18. EXTRAORÇAMENTÁRIO (EXT.10)
    -- ==========================================================
    INSERT INTO fato_extraorcamentario (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, categoria, tipo_lancamento,
        sub_tipo, desdobra_sub_tipo, nr_extra_orcamentaria,
        desc_extra_orc, vl_lancamento
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade), TRIM(s.categoria),
        TRIM(s.tipo_lancamento), TRIM(s.sub_tipo), TRIM(s.desdobra_sub_tipo),
        TRIM(s.nr_extra_orcamentaria), TRIM(s.desc_extra_orc),
        fn_parse_valor(s.vl_lancamento)
    FROM stg_ext_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_extraorcamentario'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 19. CONTA BANCÁRIA (CTB.10)
    -- ==========================================================
    INSERT INTO fato_conta_bancaria (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, banco, agencia,
        conta_corrente, conta_corrente_dv, tipo_conta,
        saldo_inicial, vl_entradas, vl_saidas, saldo_final
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.banco), TRIM(s.agencia),
        TRIM(s.conta_corrente), TRIM(s.conta_corrente_dv), TRIM(s.tipo_conta),
        fn_parse_valor(s.saldo_inicial),
        fn_parse_valor(s.vl_entradas),
        fn_parse_valor(s.vl_saidas),
        fn_parse_valor(s.saldo_final)
    FROM stg_ctb_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_conta_bancaria'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 20. LANÇAMENTO CONTÁBIL (LNC.10)
    -- ==========================================================
    INSERT INTO fato_lancamento_contabil (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        tipo_unidade, num_controle, mes_ref,
        data_registro, tipo_lancamento, data_transacao, historico
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.tipo_unidade), TRIM(s.num_controle),
        NULLIF(TRIM(s.mes_referencia), '')::SMALLINT,
        fn_parse_data(s.data_registro),
        TRIM(s.tipo_lancamento),
        fn_parse_data(s.data_transacao),
        TRIM(s.historico)
    FROM stg_lnc_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_lancamento_contabil'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 21. ITENS DO LANÇAMENTO CONTÁBIL (LNC.11)
    -- ==========================================================
    INSERT INTO fato_item_lancamento_contabil (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        tipo_unidade, num_controle, cod_conta, atributo_conta,
        nat_lancamento, valor, tipo_arquivo_sicom, chave_arquivo
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.tipo_unidade), TRIM(s.num_controle),
        TRIM(s.cod_conta), TRIM(s.atributo_conta),
        TRIM(s.nat_lancamento),
        fn_parse_valor(s.valor),
        TRIM(s.tipo_arquivo_sicom), TRIM(s.chave_arquivo)
    FROM stg_lnc_11 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_item_lancamento_contabil'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 22. TRANSFERÊNCIA ENTRE FONTES (TFR.10 → fato_transferencia_fonte)
    -- ==========================================================
    INSERT INTO fato_transferencia_fonte (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, banco, agencia,
        conta_corrente, conta_corrente_dv, tipo_conta,
        fonte_origem, vl_transferencia
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.banco), TRIM(s.agencia),
        TRIM(s.conta_corrente), TRIM(s.conta_corrente_dv), TRIM(s.tipo_conta),
        TRIM(s.fonte_origem),
        fn_parse_valor(s.vl_transferencia)
    FROM stg_tfr_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_transferencia_fonte'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 23. TRANSFERÊNCIA ENTRE CONTAS BANCÁRIAS (TRB.10 → fato_transferencia_bancaria)
    -- ==========================================================
    INSERT INTO fato_transferencia_bancaria (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, banco_origem, agencia_origem,
        conta_origem, conta_origem_dv, tipo_conta_origem,
        cod_fonte_recurso, vl_transf_origem
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.banco_origem), TRIM(s.agencia_origem),
        TRIM(s.conta_origem), TRIM(s.conta_origem_dv), TRIM(s.tipo_conta_origem),
        TRIM(s.cod_fonte_recurso),
        fn_parse_valor(s.vl_transf_origem)
    FROM stg_trb_10 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_transferencia_bancaria'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- Pós-processamento
    -- ==========================================================
    UPDATE tcmgo_remessa
    SET status        = 'analitico_pronto',
        concluido_em  = NOW(),
        atualizado_em = NOW()
    WHERE id = p_remessa_id;

    INSERT INTO tcmgo_historico_processamento
        (remessa_id, evento, descricao)
    VALUES (
        p_remessa_id,
        'etl_concluido',
        'Pipeline stg_* → fato_* (v2) concluído. 23 tabelas processadas.'
    );

    RAISE NOTICE 'fn_processar_remessa(%) v2 concluído.', p_remessa_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_processar_remessa(INTEGER) IS
    'ETL v2: transforma stg_* → fato_* (23 tabelas). '
    'Compatível com schema 2026-03-20 (sem tempo_id). '
    'Status final = analitico_pronto.';
