-- =============================================================================
-- Migration: ETL CTB.11, CTB.90, CTB.91 → fato_conta_bancaria_aplicacao,
--            fato_conta_bancaria_encerramento, fato_conta_bancaria_saldo
--
-- Adiciona 3 blocos à fn_processar_remessa (após bloco 19 CTB.10) e
-- reprocessa remessas já importadas.
-- =============================================================================

-- ── 1. Adicionar os 3 INSERTs à fn_processar_remessa ─────────────────────────
--    Estratégia: criar função auxiliar que executa os novos blocos,
--    e depois chamar no corpo principal via wrapper.
--    (Evita ter que re-escrever 500+ linhas da função existente.)

CREATE OR REPLACE FUNCTION fn_processar_remessa_ctb_extra(p_remessa_id INTEGER)
RETURNS TABLE(tabela VARCHAR, linhas_inseridas INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_municipio_id  INTEGER;
    v_orgao_id      INTEGER;
    v_ano           SMALLINT;
    v_mes           SMALLINT;
    v_count         INTEGER;
BEGIN
    SELECT r.municipio_id, r.orgao_id, r.ano_referencia, r.mes_referencia
    INTO v_municipio_id, v_orgao_id, v_ano, v_mes
    FROM tcmgo_remessa r
    WHERE r.id = p_remessa_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Remessa % não encontrada.', p_remessa_id;
    END IF;

    -- ── CTB.11 → fato_conta_bancaria_aplicacao ───────────────────────────────
    -- Movimentação bancária por fonte de recurso (mesmos campos do CTB.10 + fonte)
    DELETE FROM fato_conta_bancaria_aplicacao WHERE remessa_id = p_remessa_id;

    INSERT INTO fato_conta_bancaria_aplicacao (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, banco, agencia,
        conta_corrente, conta_corrente_dv, tipo_conta,
        cod_fonte_recurso,
        saldo_inicial, vl_entradas, vl_saidas, saldo_final
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.banco), TRIM(s.agencia),
        TRIM(s.conta_corrente), TRIM(s.conta_corrente_dv), TRIM(s.tipo_conta),
        TRIM(s.cod_fonte_recurso),
        fn_parse_valor(s.saldo_inicial),
        fn_parse_valor(s.vl_entradas),
        fn_parse_valor(s.vl_saidas),
        fn_parse_valor(s.saldo_final)
    FROM stg_ctb_11 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_conta_bancaria_aplicacao'; linhas_inseridas := v_count; RETURN NEXT;

    -- ── CTB.90 → fato_conta_bancaria_encerramento ────────────────────────────
    -- Saldos de encerramento sem fonte de recurso
    DELETE FROM fato_conta_bancaria_encerramento WHERE remessa_id = p_remessa_id;

    INSERT INTO fato_conta_bancaria_encerramento (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade,
        vl_saldo_exerc_ant_caixa, vl_saldo_exerc_ant_banco, vl_saldo_exerc_ant_vinc,
        vl_saldo_mes_seg_caixa,   vl_saldo_mes_seg_banco,   vl_saldo_mes_seg_vinc
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        fn_parse_valor(s.vl_saldo_exerc_ant_caixa),
        fn_parse_valor(s.vl_saldo_exerc_ant_banco),
        fn_parse_valor(s.vl_saldo_exerc_ant_vinc),
        fn_parse_valor(s.vl_saldo_mes_seg_caixa),
        fn_parse_valor(s.vl_saldo_mes_seg_banco),
        fn_parse_valor(s.vl_saldo_mes_seg_vinc)
    FROM stg_ctb_90 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_conta_bancaria_encerramento'; linhas_inseridas := v_count; RETURN NEXT;

    -- ── CTB.91 → fato_conta_bancaria_saldo ───────────────────────────────────
    -- Saldos de encerramento por fonte de recurso
    DELETE FROM fato_conta_bancaria_saldo WHERE remessa_id = p_remessa_id;

    INSERT INTO fato_conta_bancaria_saldo (
        municipio_id, orgao_id, ano_referencia, mes_referencia, remessa_id,
        cod_orgao, cod_unidade, cod_fonte_recurso,
        vl_saldo_exerc_ant_caixa, vl_saldo_exerc_ant_banco, vl_saldo_exerc_ant_vinc,
        vl_saldo_mes_seg_caixa,   vl_saldo_mes_seg_banco,   vl_saldo_mes_seg_vinc
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes, p_remessa_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade), TRIM(s.cod_fonte_recurso),
        fn_parse_valor(s.vl_saldo_exerc_ant_caixa),
        fn_parse_valor(s.vl_saldo_exerc_ant_banco),
        fn_parse_valor(s.vl_saldo_exerc_ant_vinc),
        fn_parse_valor(s.vl_saldo_mes_seg_caixa),
        fn_parse_valor(s.vl_saldo_mes_seg_banco),
        fn_parse_valor(s.vl_saldo_mes_seg_vinc)
    FROM stg_ctb_91 s
    WHERE s.remessa_id = p_remessa_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_conta_bancaria_saldo'; linhas_inseridas := v_count; RETURN NEXT;

END;
$$;

-- ── 2. Reprocessar todas as remessas já importadas ───────────────────────────
DO $$
DECLARE
    r RECORD;
    resultado RECORD;
    total_aplicacao   INTEGER := 0;
    total_encerramento INTEGER := 0;
    total_saldo       INTEGER := 0;
BEGIN
    FOR r IN
        SELECT DISTINCT remessa_id FROM stg_ctb_11
        ORDER BY remessa_id
    LOOP
        FOR resultado IN
            SELECT * FROM fn_processar_remessa_ctb_extra(r.remessa_id)
        LOOP
            IF resultado.tabela = 'fato_conta_bancaria_aplicacao' THEN
                total_aplicacao := total_aplicacao + resultado.linhas_inseridas;
            ELSIF resultado.tabela = 'fato_conta_bancaria_encerramento' THEN
                total_encerramento := total_encerramento + resultado.linhas_inseridas;
            ELSIF resultado.tabela = 'fato_conta_bancaria_saldo' THEN
                total_saldo := total_saldo + resultado.linhas_inseridas;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'CTB extra reprocessado: aplicacao=%, encerramento=%, saldo=%',
        total_aplicacao, total_encerramento, total_saldo;
END;
$$;
