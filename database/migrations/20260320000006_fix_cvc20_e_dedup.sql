-- =============================================================
-- Correção 1: stg_cvc_20 remessa 5 — posições erradas no parser
--   dt_abastecimento e km_abastecimento estavam trocados
--   qtd_litros lia 8 chars (correto: 7)
-- Correção 2: fn_limpar_dados_remessa — limpa fato_* e stg_*
--   sem alterar status, para uso na substituição de remessas
-- Correção 3: fn_desativar_remessa_anterior — ao substituir
--   uma remessa, limpa os dados analíticos e de staging da
--   remessa anterior para evitar DUPLICAÇÃO nos relatórios
-- =============================================================

-- -----------------------------------------------------------
-- 0. Corrigir tipo da coluna km_abastecimento (era VARCHAR(7), precisa VARCHAR(8))
-- -----------------------------------------------------------
ALTER TABLE stg_cvc_20 ALTER COLUMN km_abastecimento TYPE VARCHAR(8);

-- -----------------------------------------------------------
-- 1. Reprocessar stg_cvc_20 da remessa 5 com posições corretas
-- -----------------------------------------------------------
DELETE FROM stg_cvc_20 WHERE remessa_id = 5;

INSERT INTO stg_cvc_20 (
  remessa_id, arquivo_remessa_id, numero_linha, linha_bruta,
  tipo_registro, cod_orgao, cod_unidade, placa_veiculo,
  km_abastecimento, tipo_combustivel, qtd_litros,
  dt_abastecimento, vl_total, nro_empenho, nro_sequencial
)
SELECT
  remessa_id,
  arquivo_remessa_id,
  numero_linha,
  conteudo_linha,
  substring(conteudo_linha,  1,  2),   -- tipo_registro
  substring(conteudo_linha,  3,  2),   -- cod_orgao
  substring(conteudo_linha,  5,  2),   -- cod_unidade
  substring(conteudo_linha,  7, 10),   -- placa_veiculo (codVeiculo 10c)
  substring(conteudo_linha, 17,  8),   -- km_abastecimento (odômetro) — estava como dt
  substring(conteudo_linha, 25,  2),   -- tipo_combustivel
  substring(conteudo_linha, 27,  7),   -- qtd_litros (7c, não 8)
  substring(conteudo_linha, 34,  8),   -- dt_abastecimento — estava como km
  substring(conteudo_linha, 42, 13),   -- vl_total
  substring(conteudo_linha, 55,  6),   -- nro_empenho
  substring(conteudo_linha, 257, 6)::integer  -- nro_sequencial
FROM stg_linha_bruta
WHERE remessa_id = 5 AND sigla_arquivo = 'CVC' AND tipo_registro = '20';

-- -----------------------------------------------------------
-- 2. Re-rodar ETL da remessa 5 para atualizar fato_veiculo_uso
-- -----------------------------------------------------------
SELECT fn_limpar_dados_analiticos(5);
SELECT * FROM fn_processar_remessa(5);

-- -----------------------------------------------------------
-- 3. Função para limpar dados de remessa substituída
--    (fato_* e stg_*) SEM alterar o status da remessa
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_limpar_dados_remessa_substituida(p_remessa_id INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  stg_tables TEXT[] := ARRAY[
    'stg_ide_10','stg_orgao_10',
    'stg_uoc_10','stg_uoc_11','stg_uoc_12','stg_uoc_13','stg_uoc_14',
    'stg_rec_10','stg_rec_11','stg_rec_12',
    'stg_are_10','stg_are_11','stg_are_12',
    'stg_aoc_10','stg_aoc_11','stg_aoc_12',
    'stg_aoc_90','stg_aoc_91','stg_aoc_92','stg_aoc_93','stg_aoc_94',
    'stg_cob_10',
    'stg_emp_10','stg_emp_11','stg_emp_12','stg_emp_13','stg_emp_14',
    'stg_anl_10','stg_anl_11','stg_anl_12','stg_anl_13','stg_anl_14',
    'stg_eoc_10','stg_eoc_11','stg_eoc_12',
    'stg_lqd_10','stg_lqd_11','stg_lqd_12',
    'stg_alq_10','stg_alq_11','stg_alq_12',
    'stg_ops_10','stg_ops_11','stg_ops_12','stg_ops_13','stg_ops_14',
    'stg_aop_10','stg_aop_11','stg_aop_12','stg_aop_13','stg_aop_14',
    'stg_ext_10','stg_ext_11','stg_ext_12',
    'stg_aex_10','stg_aex_11','stg_aex_12',
    'stg_rsp_10','stg_rsp_11','stg_rsp_12',
    'stg_ctb_10','stg_ctb_11','stg_ctb_90','stg_ctb_91',
    'stg_trb_10','stg_trb_11','stg_trb_99',
    'stg_tfr_10','stg_tfr_11','stg_tfr_99',
    'stg_dfr_10','stg_dfr_99',
    'stg_dic_10','stg_dic_99',
    'stg_dcl_10',
    'stg_par_10',
    'stg_cvc_10','stg_cvc_20',
    'stg_ecl_10','stg_ecl_20',
    'stg_aal_10',
    'stg_pct_10','stg_pct_11','stg_pct_12','stg_pct_13','stg_pct_14','stg_pct_99',
    'stg_lnc_10','stg_lnc_11','stg_lnc_99',
    'stg_con_10','stg_con_11','stg_con_20','stg_con_21','stg_con_22','stg_con_23',
    'stg_isi_10',
    'stg_dmr_10',
    'stg_abl_10','stg_abl_11','stg_abl_12','stg_abl_13',
    'stg_dsi_10','stg_dsi_11','stg_dsi_12','stg_dsi_13','stg_dsi_14','stg_dsi_15',
    'stg_rpl_10',
    'stg_hbl_10','stg_hbl_20',
    'stg_jgl_10','stg_jgl_30',
    'stg_hml_10','stg_hml_20','stg_hml_30',
    'stg_arp_10','stg_arp_12','stg_arp_20',
    'stg_isi_10'
  ];
  t TEXT;
BEGIN
  -- Limpa fato_* dinamicamente
  FOR r IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'fato_%'
  LOOP
    EXECUTE 'DELETE FROM ' || r.table_name || ' WHERE remessa_id = $1'
    USING p_remessa_id;
  END LOOP;

  -- Limpa stg_linha_bruta
  DELETE FROM stg_linha_bruta WHERE remessa_id = p_remessa_id;

  -- Limpa stg_* específicas
  FOREACH t IN ARRAY stg_tables LOOP
    EXECUTE 'DELETE FROM ' || t || ' WHERE remessa_id = $1'
    USING p_remessa_id;
  END LOOP;

  -- Limpa arquivos associados
  DELETE FROM tcmgo_arquivo_remessa WHERE remessa_id = p_remessa_id;

  RAISE NOTICE 'Dados da remessa substituída % limpos (fato_*, stg_*, linha_bruta).', p_remessa_id;
END;
$$;

-- -----------------------------------------------------------
-- 4. Atualizar fn_desativar_remessa_anterior para limpar
--    dados da remessa substituída e evitar duplicação
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_desativar_remessa_anterior(
  p_municipio_id   INTEGER,
  p_orgao_id       INTEGER,
  p_ano_referencia SMALLINT,
  p_mes_referencia SMALLINT
) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_remessa_anterior_id INTEGER;
BEGIN
  SELECT id INTO v_remessa_anterior_id
  FROM tcmgo_remessa
  WHERE municipio_id    = p_municipio_id
    AND orgao_id        = p_orgao_id
    AND ano_referencia  = p_ano_referencia
    AND mes_referencia  = p_mes_referencia
    AND ativa           = TRUE;

  IF v_remessa_anterior_id IS NOT NULL THEN
    -- Limpa todos os dados associados antes de substituir
    PERFORM fn_limpar_dados_remessa_substituida(v_remessa_anterior_id);

    -- Marca como substituída
    UPDATE tcmgo_remessa
    SET ativa         = FALSE,
        status        = 'substituida',
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = v_remessa_anterior_id;

    INSERT INTO tcmgo_historico_processamento (remessa_id, evento, descricao)
    VALUES (v_remessa_anterior_id, 'remessa_substituida',
            'Remessa desativada e dados limpos — substituída por nova importação');

    RAISE NOTICE 'Remessa % substituída e dados limpos', v_remessa_anterior_id;
  END IF;

  RETURN v_remessa_anterior_id;
END;
$$;
