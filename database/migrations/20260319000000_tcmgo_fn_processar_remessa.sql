-- =============================================================
-- TCM-GO 2025 — Etapa 3: Pipeline stg_* → fato_*
-- Função fn_processar_remessa: transforma dados da staging
-- parseada nas tabelas analíticas (fato_*).
-- Cria também helpers fn_parse_valor e fn_parse_data.
-- =============================================================

-- Adiciona status 'analitico_pronto' ao CHECK constraint
-- (drop + recreate, pois PostgreSQL não suporta ADD CHECK se
--  a constraint inline já existir sem nome explícito)
ALTER TABLE tcmgo_remessa
    DROP CONSTRAINT IF EXISTS tcmgo_remessa_status_check;

ALTER TABLE tcmgo_remessa
    ADD CONSTRAINT tcmgo_remessa_status_check
    CHECK (status IN (
        'pendente','recebida','processando',
        'staging_pronta','concluida',
        'analitico_pronto','erro','substituida'
    ));

-- =============================================================
-- Helper: converte VARCHAR(13) monetário TCM-GO → DECIMAL(18,2)
-- Formato: [sinal][11 dígitos inteiros][2 dígitos centavos]
-- Sinal pode ser '-' (negativo), '+' ou espaço (positivo).
-- =============================================================
CREATE OR REPLACE FUNCTION fn_parse_valor(p_texto VARCHAR)
RETURNS DECIMAL(18,2) AS $$
DECLARE
    v_texto TEXT;
    v_sinal INTEGER := 1;
BEGIN
    IF p_texto IS NULL OR TRIM(p_texto) = '' THEN
        RETURN 0;
    END IF;

    v_texto := TRIM(p_texto);

    IF LEFT(v_texto, 1) = '-' THEN
        v_sinal := -1;
        v_texto := SUBSTR(v_texto, 2);
    ELSIF LEFT(v_texto, 1) = '+' THEN
        v_texto := SUBSTR(v_texto, 2);
    END IF;

    -- Remove qualquer caracter não numérico
    v_texto := REGEXP_REPLACE(v_texto, '[^0-9]', '', 'g');

    IF v_texto = '' OR v_texto = '0000000000000' THEN
        RETURN 0;
    END IF;

    RETURN v_sinal * (v_texto::BIGINT / 100.0);
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================
-- Helper: converte VARCHAR(8) data DDMMAAAA → DATE
-- Retorna NULL para datas inválidas ou zeradas.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_parse_data(p_texto VARCHAR)
RETURNS DATE AS $$
BEGIN
    IF p_texto IS NULL OR TRIM(p_texto) = '' OR TRIM(p_texto) = '00000000' THEN
        RETURN NULL;
    END IF;
    RETURN TO_DATE(TRIM(p_texto), 'DDMMYYYY');
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================
-- fn_processar_remessa: stg_* → fato_*
-- Retorna uma linha por tabela com o número de registros inseridos.
-- Chama fn_popular_tempo_evento ao final.
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
    v_tempo_id      INTEGER;
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

    -- Dim_tempo: dia 1 da competência
    SELECT id INTO v_tempo_id
    FROM dim_tempo
    WHERE ano = v_ano AND mes = v_mes AND dia = 1
    LIMIT 1;

    -- ==========================================================
    -- 1. RECEITA ORÇAMENTÁRIA (REC.10)
    -- ==========================================================
    INSERT INTO fato_receita (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade, rubrica, especificacao,
        vl_previsto_atualizado, vl_arrecadado, vl_acumulado
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.rubrica), TRIM(s.especificacao),
        fn_parse_valor(s.vl_previsto_atualizado),
        fn_parse_valor(s.vl_arrecadado),
        fn_parse_valor(s.vl_acumulado)
    FROM stg_rec_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, rubrica) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_receita'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 2. EMPENHO (EMP.10)
    -- ==========================================================
    INSERT INTO fato_empenho (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade, nro_empenho,
        dt_empenho, tp_empenho,
        cod_funcao, cod_subfuncao, cod_programa, cod_acao,
        elemento_despesa, sub_elemento,
        cpf_cnpj_credor, nome_credor, especificacao,
        modalidade_licitacao, nro_licitacao,
        vl_bruto
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade), TRIM(s.nro_empenho),
        fn_parse_data(s.dt_empenho), TRIM(s.tp_empenho),
        TRIM(s.cod_funcao), TRIM(s.cod_subfuncao), TRIM(s.cod_programa),
        TRIM(COALESCE(s.natureza_acao, '')) || TRIM(COALESCE(s.nro_proj_ativ, '')),
        TRIM(s.elemento_despesa), TRIM(s.sub_elemento),
        TRIM(s.cpf_cnpj_credor), TRIM(s.nome_credor), TRIM(s.especificacao),
        TRIM(s.modalidade_licitacao), TRIM(s.nro_proc_licitacao),
        fn_parse_valor(s.vl_bruto)
    FROM stg_emp_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, nro_empenho) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_empenho'; linhas_inseridas := v_count; RETURN NEXT;

    -- Enriquece nro_contrato via EMP.13
    UPDATE fato_empenho fe
    SET nro_contrato = TRIM(s.nro_contrato)
    FROM stg_emp_13 s
    WHERE fe.remessa_id = p_remessa_id
      AND s.remessa_id  = p_remessa_id
      AND fe.cod_orgao  = TRIM(s.cod_orgao)
      AND fe.cod_unidade = TRIM(s.cod_unidade)
      AND fe.nro_empenho = TRIM(s.nro_empenho)
      AND fe.nro_contrato IS NULL;

    -- ==========================================================
    -- 3. EMPENHO POR FONTE DE RECURSO (EMP.12)
    -- ==========================================================
    INSERT INTO fato_empenho_fonte (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade, nro_empenho,
        fonte_recurso, vl_fonte
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade), TRIM(s.nro_empenho),
        TRIM(s.cod_fonte_recurso), fn_parse_valor(s.vl_recurso)
    FROM stg_emp_12 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, nro_empenho, fonte_recurso) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_empenho_fonte'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 4. ANULAÇÃO DE EMPENHO (ANL.10)
    -- ==========================================================
    INSERT INTO fato_anulacao_empenho (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade, nro_empenho,
        nr_anulacao, dt_anulacao, vl_anulacao
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade), TRIM(s.nro_empenho),
        TRIM(s.nr_anulacao),
        fn_parse_data(s.dt_anulacao),
        fn_parse_valor(s.vl_anulacao)
    FROM stg_anl_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, nro_empenho, nr_anulacao) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_anulacao_empenho'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 5. LIQUIDAÇÃO (LQD.10)
    -- ==========================================================
    INSERT INTO fato_liquidacao (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade, nro_empenho,
        exercicio_empenho, nro_liquidacao,
        dt_liquidacao, vl_liquidacao,
        nro_nota_fiscal, tipo_documento
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade), TRIM(s.nro_empenho),
        COALESCE(NULLIF(TRIM(s.exercicio_empenho), '')::SMALLINT, 0),
        TRIM(s.nro_liquidacao),
        fn_parse_data(s.dt_liquidacao),
        fn_parse_valor(s.vl_liquidacao),
        TRIM(s.nro_doc_fiscal), TRIM(s.tipo_doc_fiscal)
    FROM stg_lqd_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, nro_empenho, exercicio_empenho, nro_liquidacao) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_liquidacao'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 6. PAGAMENTO / ORDEM DE PAGAMENTO (OPS.10)
    -- ==========================================================
    INSERT INTO fato_pagamento (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade, nro_empenho,
        exercicio_empenho, nro_op,
        dt_pagamento, vl_pagamento
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade), TRIM(s.nro_empenho),
        COALESCE(NULLIF(TRIM(s.exercicio_empenho), '')::SMALLINT, 0),
        TRIM(s.nro_op),
        fn_parse_data(s.dt_pagamento),
        fn_parse_valor(s.vl_pagamento)
    FROM stg_ops_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, nro_empenho, exercicio_empenho, nro_op) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_pagamento'; linhas_inseridas := v_count; RETURN NEXT;

    -- Enriquece banco/agência/conta via OPS.11
    UPDATE fato_pagamento fp
    SET banco          = TRIM(s.banco),
        agencia        = TRIM(s.agencia),
        conta_corrente = TRIM(s.conta_corrente)
    FROM stg_ops_11 s
    WHERE fp.remessa_id  = p_remessa_id
      AND s.remessa_id   = p_remessa_id
      AND fp.cod_orgao   = TRIM(s.cod_orgao)
      AND fp.cod_unidade = TRIM(s.cod_unidade)
      AND fp.nro_empenho = TRIM(s.nro_empenho)
      AND fp.nro_op      = TRIM(s.nro_op)
      AND fp.banco IS NULL;

    -- Enriquece fonte_recurso via OPS.13
    UPDATE fato_pagamento fp
    SET fonte_recurso = TRIM(s.cod_fonte_recurso)
    FROM stg_ops_13 s
    WHERE fp.remessa_id  = p_remessa_id
      AND s.remessa_id   = p_remessa_id
      AND fp.cod_orgao   = TRIM(s.cod_orgao)
      AND fp.cod_unidade = TRIM(s.cod_unidade)
      AND fp.nro_empenho = TRIM(s.nro_empenho)
      AND fp.nro_op      = TRIM(s.nro_op)
      AND fp.fonte_recurso IS NULL;

    -- ==========================================================
    -- 7. ALTERAÇÃO ORÇAMENTÁRIA (AOC.10)
    -- ==========================================================
    INSERT INTO fato_alteracao_orcamentaria (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade,
        cod_programa, cod_funcao, cod_subfuncao, cod_acao,
        elemento_despesa, sub_elemento,
        vl_dotacao_inicial, vl_suplementacao, vl_reducao,
        vl_credito_especial, vl_credito_extraordinario
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.cod_programa), TRIM(s.cod_funcao), TRIM(s.cod_subfuncao),
        TRIM(COALESCE(s.natureza_acao, '')) || TRIM(COALESCE(s.nro_proj_ativ, '')),
        TRIM(s.elemento_despesa), TRIM(s.sub_elemento),
        fn_parse_valor(s.vl_dotacao_inicial),
        fn_parse_valor(s.vl_suplementacao),
        fn_parse_valor(s.vl_reducao),
        fn_parse_valor(s.vl_credito_especial),
        fn_parse_valor(s.vl_credito_extraordinario)
    FROM stg_aoc_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade,
                 cod_programa, cod_funcao, cod_subfuncao, cod_acao,
                 elemento_despesa, sub_elemento, fonte_recurso) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_alteracao_orcamentaria'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 8. RESTOS A PAGAR (RSP.10)
    -- ==========================================================
    INSERT INTO fato_restos_pagar (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade,
        exercicio_empenho, nro_empenho, tipo_rsp,
        elemento_despesa, cpf_cnpj_credor, nome_credor,
        vl_inscrito, vl_cancelado, vl_liquidado, vl_pago
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        COALESCE(NULLIF(TRIM(s.exercicio_empenho), '')::SMALLINT, 0),
        TRIM(s.nro_empenho), TRIM(s.tipo_rsp),
        TRIM(s.elemento_despesa),
        TRIM(s.cpf_cnpj_credor), TRIM(s.nome_credor),
        fn_parse_valor(s.vl_inscrito),
        fn_parse_valor(s.vl_cancelado),
        fn_parse_valor(s.vl_liquidado),
        fn_parse_valor(s.vl_pago)
    FROM stg_rsp_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, exercicio_empenho, nro_empenho, tipo_rsp) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_restos_pagar'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 9. EXTRAORÇAMENTÁRIO — Pagamentos (EXT.10)
    -- ==========================================================
    INSERT INTO fato_extraorcamentario (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade,
        nro_extra, tipo_movimento, dt_movimento,
        cpf_cnpj_credor, nome_credor,
        conta_contabil, vl_movimento, especificacao
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.nro_extra), 'PAGO',
        fn_parse_data(s.dt_pagamento),
        TRIM(s.cpf_cnpj_credor), TRIM(s.nome_credor),
        TRIM(s.conta_contabil),
        fn_parse_valor(s.vl_pagamento),
        TRIM(s.especificacao)
    FROM stg_ext_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, nro_extra, tipo_movimento) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_extraorcamentario'; linhas_inseridas := v_count; RETURN NEXT;

    -- Anulações extraorçamentárias (AEX.10)
    INSERT INTO fato_extraorcamentario (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade,
        nro_extra, tipo_movimento, dt_movimento,
        cpf_cnpj_credor, nome_credor,
        conta_contabil, vl_movimento, especificacao
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.nro_extra), 'ANULADO',
        fn_parse_data(s.dt_anulacao),
        TRIM(s.cpf_cnpj_credor), TRIM(s.nome_credor),
        TRIM(s.conta_contabil),
        fn_parse_valor(s.vl_anulacao),
        TRIM(s.especificacao)
    FROM stg_aex_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, nro_extra, tipo_movimento) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_extraorcamentario_anulacao'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 10. SALDO DE CONTA BANCÁRIA (CTB.10)
    -- ==========================================================
    INSERT INTO fato_conta_bancaria (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade,
        banco, agencia, conta_corrente, tipo_conta,
        vl_saldo_anterior
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.banco), TRIM(s.agencia), TRIM(s.conta_corrente), TRIM(s.tipo_conta),
        fn_parse_valor(s.saldo_anterior)
    FROM stg_ctb_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, banco, agencia, conta_corrente) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_conta_bancaria'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 11. MOVIMENTAÇÃO BANCÁRIA — Transferência entre fontes (TFR.10)
    -- nro_transferencia sintético = número de linha (sem campo no layout)
    -- ==========================================================
    INSERT INTO fato_movimentacao_bancaria (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade,
        tipo_movimentacao, nro_transferencia,
        banco, agencia, conta_corrente,
        fonte_origem, fonte_destino,
        dt_movimentacao, vl_movimentacao
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        'TFR_FONTE', LPAD(s.numero_linha::TEXT, 15, '0'),
        TRIM(s.banco), TRIM(s.agencia), TRIM(s.conta_corrente),
        TRIM(s.fonte_origem), TRIM(s.fonte_destino),
        fn_parse_data(s.dt_transferencia),
        fn_parse_valor(s.vl_transferencia)
    FROM stg_tfr_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, nro_transferencia, tipo_movimentacao, dt_movimentacao) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_movimentacao_bancaria_tfr'; linhas_inseridas := v_count; RETURN NEXT;

    -- Transferência entre contas bancárias (TRB.10)
    INSERT INTO fato_movimentacao_bancaria (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade,
        tipo_movimentacao, nro_transferencia,
        banco, agencia, conta_corrente,
        banco_destino, agencia_destino, conta_destino,
        dt_movimentacao, vl_movimentacao
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        COALESCE(NULLIF(TRIM(s.tipo_transferencia), ''), 'TRB'),
        LPAD(s.numero_linha::TEXT, 15, '0'),
        TRIM(s.banco_origem), TRIM(s.agencia_origem), TRIM(s.conta_origem),
        TRIM(s.banco_destino), TRIM(s.agencia_destino), TRIM(s.conta_destino),
        fn_parse_data(s.dt_transferencia),
        fn_parse_valor(s.vl_transferencia)
    FROM stg_trb_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, nro_transferencia, tipo_movimentacao, dt_movimentacao) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_movimentacao_bancaria_trb'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 12. LANÇAMENTO CONTÁBIL (LNC.10)
    -- ==========================================================
    INSERT INTO fato_lancamento_contabil (
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        cod_orgao, cod_unidade,
        nro_lancamento, dt_lancamento, tipo_lancamento, historico
    )
    SELECT
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        TRIM(s.cod_orgao), TRIM(s.cod_unidade),
        TRIM(s.nro_lancamento),
        fn_parse_data(s.dt_lancamento),
        TRIM(s.tipo_lancamento),
        TRIM(s.historico)
    FROM stg_lnc_10 s
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (remessa_id, cod_orgao, cod_unidade, nro_lancamento) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_lancamento_contabil'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- 13. ITENS DO LANÇAMENTO CONTÁBIL (LNC.11)
    -- ordem_item = ROW_NUMBER() dentro de cada lançamento
    -- ==========================================================
    INSERT INTO fato_item_lancamento_contabil (
        lancamento_id,
        municipio_id, orgao_id, ano_referencia, mes_referencia,
        remessa_id, tempo_id,
        ordem_item, conta_debito, conta_credito, vl_lancamento
    )
    SELECT
        fl.id,
        v_municipio_id, v_orgao_id, v_ano, v_mes,
        p_remessa_id, v_tempo_id,
        ROW_NUMBER() OVER (
            PARTITION BY s.nro_lancamento, s.cod_orgao, s.cod_unidade
            ORDER BY s.numero_linha
        )::SMALLINT,
        TRIM(s.conta_debito),
        TRIM(s.conta_credito),
        fn_parse_valor(s.vl_lancamento)
    FROM stg_lnc_11 s
    JOIN fato_lancamento_contabil fl
        ON fl.remessa_id  = p_remessa_id
       AND fl.cod_orgao   = TRIM(s.cod_orgao)
       AND fl.cod_unidade = TRIM(s.cod_unidade)
       AND fl.nro_lancamento = TRIM(s.nro_lancamento)
    WHERE s.remessa_id = p_remessa_id
    ON CONFLICT (lancamento_id, ordem_item) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    tabela := 'fato_item_lancamento_contabil'; linhas_inseridas := v_count; RETURN NEXT;

    -- ==========================================================
    -- Pós-processamento: popula tempo_evento_id
    -- ==========================================================
    PERFORM fn_popular_tempo_evento(p_remessa_id);

    -- Atualiza status da remessa
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
        'Pipeline stg_* → fato_* concluído com sucesso.'
    );

    RAISE NOTICE 'fn_processar_remessa(%) concluído.', p_remessa_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_processar_remessa(INTEGER) IS
    'ETL Etapa 3: transforma dados da staging parseada (stg_*) nas tabelas '
    'analíticas (fato_*). Retorna set de (tabela, linhas_inseridas). '
    'Aceita remessas com status "concluida". Define status final = "analitico_pronto".';
