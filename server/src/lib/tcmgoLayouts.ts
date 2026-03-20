// TCM-GO 2025 — Dicionário posicional dos arquivos prioritários
// Posições são 1-indexadas (conforme spec); parser converte para 0-indexed JS

export interface FieldDef {
  col: string;
  start: number; // 1-indexed
  end: number;   // 1-indexed, inclusive
  type?: "int";
}

export interface RegistroLayout {
  table: string;
  fields: FieldDef[];
}

// Mapa: sigla -> tipo_registro -> layout
export const LAYOUTS: Record<string, Record<string, RegistroLayout>> = {

  // =========================================================
  // IDE.txt — Identificação do Município
  // =========================================================
  IDE: {
    "10": {
      table: "stg_ide_10",
      fields: [
        { col: "tipo_registro",  start:  1, end:  2 },
        { col: "cod_municipio",  start:  3, end:  6 },
        { col: "tipo_balancete", start:  7, end:  8 },
        { col: "ano_referencia", start:  9, end: 12 },
        { col: "mes_referencia", start: 13, end: 14 },
        { col: "data_geracao",   start: 15, end: 22 },
        { col: "nro_sequencial", start: 23, end: 28, type: "int" },
      ],
    },
  },

  // =========================================================
  // ORGAO.txt — Órgão e Gestor
  // =========================================================
  ORGAO: {
    "10": {
      table: "stg_orgao_10",
      fields: [
        { col: "tipo_registro",       start:   1, end:   2 },
        { col: "cod_orgao",           start:   3, end:   4 },
        { col: "cpf_gestor",          start:   5, end:  15 },
        { col: "dt_inicio",           start:  16, end:  23 },
        { col: "dt_final",            start:  24, end:  31 },
        { col: "desc_orgao",          start:  32, end:  81 },
        { col: "tipo_orgao",          start:  82, end:  83 },
        { col: "cnpj_orgao",          start:  84, end:  97 },
        { col: "nome_gestor",         start:  98, end: 147 },
        { col: "cargo_gestor",        start: 148, end: 197 },
        { col: "logra_res_gestor",    start: 198, end: 247 },
        { col: "setor_logra_gestor",  start: 248, end: 267 },
        { col: "cidade_logra_gestor", start: 268, end: 287 },
        { col: "uf_cidade_gestor",    start: 288, end: 289 },
        { col: "cep_logra_gestor",    start: 290, end: 297 },
        { col: "fone_gestor",         start: 298, end: 307 },
        { col: "email_gestor",        start: 308, end: 407 },
        { col: "nro_sequencial",      start: 408, end: 413, type: "int" },
      ],
    },
  },

  // =========================================================
  // UOC.txt — Unidades Orçamentárias e Responsáveis
  // =========================================================
  // =========================================================
  // UOC.txt — Unidades Orçamentárias e Responsáveis
  // 390 chars, nro_sequencial em 385-390
  // =========================================================
  UOC: {
    "10": { // Cadastro da Unidade Orçamentária
      table: "stg_uoc_10",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_orgao",        start:   3, end:   4 },
        { col: "cod_unidade",      start:   5, end:   6 },
        { col: "descricao",        start:   7, end:  56 },
        { col: "num_consolidacao", start:  57, end:  58 },
        { col: "nro_sequencial",   start: 385, end: 390, type: "int" },
      ],
    },
    "11": { // Dados do Gestor/Ordenador de Despesas
      table: "stg_uoc_11",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_orgao",        start:   3, end:   4 },
        { col: "cod_unidade",      start:   5, end:   6 },
        { col: "cpf_ordenador",    start:   7, end:  17 },
        { col: "dt_inicio",        start:  18, end:  25 },
        { col: "tipo_responsavel", start:  26, end:  26 },
        { col: "dt_fim",           start:  27, end:  34 },
        { col: "nome_ordenador",   start:  35, end:  84 },
        { col: "cargo_ordenador",  start:  85, end: 134 },
        { col: "logra_res",        start: 135, end: 184 },
        { col: "setor_logra",      start: 185, end: 204 },
        { col: "cidade_logra",     start: 205, end: 224 },
        { col: "uf_cidade",        start: 225, end: 226 },
        { col: "cep",              start: 227, end: 234 },
        { col: "fone",             start: 235, end: 244 },
        { col: "email",            start: 245, end: 324 },
        { col: "escolaridade",     start: 325, end: 326 },
        { col: "nro_sequencial",   start: 385, end: 390, type: "int" },
      ],
    },
    "12": { // Dados do Contador Responsável
      table: "stg_uoc_12",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_orgao",        start:   3, end:   4 },
        { col: "cod_unidade",      start:   5, end:   6 },
        { col: "cpf",              start:   7, end:  17 },
        { col: "dt_inicio",        start:  18, end:  25 },
        { col: "dt_final",         start:  26, end:  33 },
        { col: "nome",             start:  34, end:  83 },
        { col: "crc",              start:  84, end:  94 },
        { col: "uf_crc",           start:  95, end:  96 },
        { col: "provimento",       start:  97, end:  98 },
        { col: "cnpj_empresa",     start:  99, end: 112 },
        { col: "razao_social",     start: 113, end: 192 },
        { col: "logra_res",        start: 193, end: 242 },
        { col: "setor_logra",      start: 243, end: 262 },
        { col: "cidade_logra",     start: 263, end: 282 },
        { col: "uf_cidade",        start: 283, end: 284 },
        { col: "cep",              start: 285, end: 292 },
        { col: "fone",             start: 293, end: 302 },
        { col: "email",            start: 303, end: 382 },
        { col: "escolaridade",     start: 383, end: 384 },
        { col: "nro_sequencial",   start: 385, end: 390, type: "int" },
      ],
    },
    "13": { // Dados do Responsável do Controle Interno
      table: "stg_uoc_13",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_orgao",        start:   3, end:   4 },
        { col: "cod_unidade",      start:   5, end:   6 },
        { col: "cpf",              start:   7, end:  17 },
        { col: "dt_inicio",        start:  18, end:  25 },
        { col: "dt_final",         start:  26, end:  33 },
        { col: "nome",             start:  34, end:  83 },
        { col: "logra_res",        start:  84, end: 133 },
        { col: "setor_logra",      start: 134, end: 153 },
        { col: "cidade_logra",     start: 154, end: 173 },
        { col: "uf_cidade",        start: 174, end: 175 },
        { col: "cep",              start: 176, end: 183 },
        { col: "fone",             start: 184, end: 193 },
        { col: "email",            start: 194, end: 273 },
        { col: "escolaridade",     start: 274, end: 275 },
        { col: "nro_sequencial",   start: 385, end: 390, type: "int" },
      ],
    },
    "14": { // Dados do Responsável do Setor Jurídico
      table: "stg_uoc_14",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_orgao",        start:   3, end:   4 },
        { col: "cod_unidade",      start:   5, end:   6 },
        { col: "cpf",              start:   7, end:  17 },
        { col: "dt_inicio",        start:  18, end:  25 },
        { col: "dt_final",         start:  26, end:  33 },
        { col: "nome",             start:  34, end:  83 },
        { col: "oab",              start:  84, end:  91 },
        { col: "uf_oab",           start:  92, end:  93 },
        { col: "provimento",       start:  94, end:  95 },
        { col: "cnpj_empresa",     start:  96, end: 109 },
        { col: "razao_social",     start: 110, end: 189 },
        { col: "logra_res",        start: 190, end: 239 },
        { col: "setor_logra",      start: 240, end: 259 },
        { col: "cidade_logra",     start: 260, end: 279 },
        { col: "uf_cidade",        start: 280, end: 281 },
        { col: "cep",              start: 282, end: 289 },
        { col: "fone",             start: 290, end: 299 },
        { col: "email",            start: 300, end: 379 },
        { col: "nro_sequencial",   start: 385, end: 390, type: "int" },
      ],
    },
  },

  // =========================================================
  // REC.txt — Receitas
  // =========================================================
  REC: {
    "10": {
      table: "stg_rec_10",
      fields: [
        { col: "tipo_registro",           start:   1, end:   2 },
        { col: "cod_orgao",               start:   3, end:   4 },
        { col: "cod_unidade",             start:   5, end:   6 },
        { col: "rubrica",                 start:   7, end:  15 },
        { col: "especificacao",           start:  16, end: 115 },
        { col: "vl_previsto_atualizado",  start: 116, end: 128 },
        { col: "vl_arrecadado",           start: 129, end: 141 },
        { col: "vl_acumulado",            start: 142, end: 154 },
        { col: "nro_sequencial",          start: 155, end: 160, type: "int" },
      ],
    },
    "11": { // Movimentação Financeira das Receitas
      table: "stg_rec_11",
      fields: [
        { col: "tipo_registro",     start:   1, end:   2 },
        { col: "cod_orgao",         start:   3, end:   4 },
        { col: "cod_unidade",       start:   5, end:   6 },
        { col: "rubrica",           start:   7, end:  15 },
        { col: "banco",             start:  16, end:  18 },
        { col: "agencia",           start:  19, end:  22 },
        { col: "conta_corrente",    start:  23, end:  34 },
        { col: "conta_corrente_dv", start:  35, end:  35 },
        { col: "tipo_conta",        start:  36, end:  37 },
        { col: "vl_recolhimento",   start:  38, end:  50 },
        { col: "nro_sequencial",    start: 155, end: 160, type: "int" },
      ],
    },
    "12": { // Detalhamento da Fonte de Recursos das Receitas
      table: "stg_rec_12",
      fields: [
        { col: "tipo_registro",     start:   1, end:   2 },
        { col: "cod_orgao",         start:   3, end:   4 },
        { col: "cod_unidade",       start:   5, end:   6 },
        { col: "rubrica",           start:   7, end:  15 },
        { col: "banco",             start:  16, end:  18 },
        { col: "agencia",           start:  19, end:  22 },
        { col: "conta_corrente",    start:  23, end:  34 },
        { col: "conta_corrente_dv", start:  35, end:  35 },
        { col: "tipo_conta",        start:  36, end:  37 },
        { col: "cod_fonte_recurso", start:  38, end:  43 },
        { col: "vl_fonte_recurso",  start:  44, end:  56 },
        { col: "nro_sequencial",    start: 155, end: 160, type: "int" },
      ],
    },
  },

  // =========================================================
  // EMP.txt — Empenhos
  // =========================================================
  EMP: {
    "10": {
      table: "stg_emp_10",
      fields: [
        { col: "tipo_registro",            start:   1, end:   2 },
        { col: "cod_programa",             start:   3, end:   6 },
        { col: "cod_orgao",                start:   7, end:   8 },
        { col: "cod_unidade",              start:   9, end:  10 },
        { col: "cod_funcao",               start:  11, end:  12 },
        { col: "cod_subfuncao",            start:  13, end:  15 },
        { col: "natureza_acao",            start:  16, end:  16 },
        { col: "nro_proj_ativ",            start:  17, end:  19 },
        { col: "elemento_despesa",         start:  20, end:  25 },
        { col: "sub_elemento",             start:  26, end:  27 },
        { col: "nro_empenho",              start:  28, end:  33 },
        { col: "modalidade_licitacao",     start:  34, end:  35 },
        { col: "fundamentacao_legal",      start:  36, end:  37 },
        { col: "justificativa_dispensa",   start:  38, end: 250 },
        { col: "razao_escolha",            start: 251, end: 532 },
        { col: "nro_proc_licitacao",       start: 533, end: 540 },
        { col: "ano_proc_licitacao",       start: 541, end: 544 },
        { col: "nro_proc_adm",             start: 545, end: 564 },
        { col: "nro_instrumento_contrato", start: 565, end: 567 },
        { col: "assunto",                  start: 568, end: 569 },
        { col: "tp_empenho",               start: 570, end: 571 },
        { col: "dt_empenho",               start: 572, end: 579 },
        { col: "vl_bruto",                 start: 580, end: 592 },
        { col: "nome_credor",              start: 593, end: 642 },
        { col: "tipo_credor",              start: 643, end: 643 },
        { col: "cpf_cnpj_credor",          start: 644, end: 657 },
        { col: "especificacao",            start: 658, end: 912 },
        { col: "cpf_resp_empenho",         start: 913, end: 923 },
        { col: "nome_resp_empenho",        start: 924, end: 958 },
        { col: "id_colare",                start: 959, end: 973 },
        { col: "nro_sequencial",           start: 974, end: 979, type: "int" },
      ],
    },
    "11": {
      table: "stg_emp_11",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "nro_empenho",      start:  28, end:  33 },
        { col: "cod_fonte_recurso",start:  34, end:  39 },
        { col: "vl_recurso",       start:  40, end:  52 },
        // pos 53-973: brancos
        { col: "nro_sequencial",   start: 974, end: 979, type: "int" },
      ],
    },
    "12": {
      table: "stg_emp_12",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "nro_empenho",      start:  28, end:  33 },
        { col: "cod_unidade_obra", start:  34, end:  35 },
        { col: "cod_obra",         start:  36, end:  39 },
        { col: "ano_obra",         start:  40, end:  43 },
        { col: "vl_associado_obra",start:  44, end:  56 },
        // pos 57-973: brancos
        { col: "nro_sequencial",   start: 974, end: 979, type: "int" },
      ],
    },
    "13": {
      table: "stg_emp_13",
      fields: [
        { col: "tipo_registro",         start:   1, end:   2 },
        { col: "cod_programa",          start:   3, end:   6 },
        { col: "cod_orgao",             start:   7, end:   8 },
        { col: "cod_unidade",           start:   9, end:  10 },
        { col: "cod_funcao",            start:  11, end:  12 },
        { col: "cod_subfuncao",         start:  13, end:  15 },
        { col: "natureza_acao",         start:  16, end:  16 },
        { col: "nro_proj_ativ",         start:  17, end:  19 },
        { col: "elemento_despesa",      start:  20, end:  25 },
        { col: "sub_elemento",          start:  26, end:  26 }, // 1 char (excepcionalmente)
        { col: "nro_empenho",           start:  27, end:  33 }, // 7 chars (excepcionalmente)
        { col: "cod_unidade_contrato",  start:  34, end:  35 },
        { col: "nro_contrato",          start:  36, end:  55 },
        { col: "ano_contrato",          start:  56, end:  59 },
        { col: "tipo_ajuste",           start:  60, end:  60 },
        { col: "vl_associado_contrato", start:  61, end:  73 },
        { col: "id_colare",             start:  74, end:  88 },
        // pos 89-973: brancos
        { col: "nro_sequencial",        start: 974, end: 979, type: "int" },
      ],
    },
    "14": {
      table: "stg_emp_14",
      fields: [
        { col: "tipo_registro",       start:   1, end:   2 },
        { col: "cod_programa",        start:   3, end:   6 },
        { col: "cod_orgao",           start:   7, end:   8 },
        { col: "cod_unidade",         start:   9, end:  10 },
        { col: "cod_funcao",          start:  11, end:  12 },
        { col: "cod_subfuncao",       start:  13, end:  15 },
        { col: "natureza_acao",       start:  16, end:  16 },
        { col: "nro_proj_ativ",       start:  17, end:  19 },
        { col: "elemento_despesa",    start:  20, end:  25 },
        { col: "sub_elemento",        start:  26, end:  27 },
        { col: "nro_empenho",         start:  28, end:  33 },
        { col: "cpf_cnpj_credor",     start:  34, end:  47 },
        { col: "tipo_credor",         start:  48, end:  48 },
        { col: "nome_credor",         start:  49, end:  98 },
        { col: "vl_associado_credor", start:  99, end: 111 },
        // pos 112-973: brancos
        { col: "nro_sequencial",      start: 974, end: 979, type: "int" },
      ],
    },
  },

  // =========================================================
  // LQD.txt — Liquidações
  // =========================================================
  // Comprimento fixo: 357 chars para todos os tipos (10, 11, 12, 99)
  // nroSequencial sempre em pos 352-357
  // Campos classificatórios padrão (pos 1-27) + dotOrigP2001 (28-48) em todos
  LQD: {
    "10": {
      // Registro principal da liquidação
      table: "stg_lqd_10",
      fields: [
        { col: "tipo_registro",           start:   1, end:   2 },
        { col: "cod_programa",            start:   3, end:   6 },
        { col: "cod_orgao",               start:   7, end:   8 },
        { col: "cod_unidade",             start:   9, end:  10 },
        { col: "cod_funcao",              start:  11, end:  12 },
        { col: "cod_subfuncao",           start:  13, end:  15 },
        { col: "natureza_acao",           start:  16, end:  16 },
        { col: "nro_proj_ativ",           start:  17, end:  19 },
        { col: "elemento_despesa",        start:  20, end:  25 },
        { col: "sub_elemento",            start:  26, end:  27 },
        { col: "dot_orig_p2001",          start:  28, end:  48 },
        { col: "nro_empenho",             start:  49, end:  54 },
        { col: "dt_empenho",              start:  55, end:  62 },
        { col: "nr_liquidacao",           start:  63, end:  68 },
        { col: "dt_liquidacao",           start:  69, end:  76 },
        { col: "tp_liquidacao",           start:  77, end:  77 },
        { col: "vl_liquidado",            start:  78, end:  90 },
        { col: "resp_liquidacao",         start:  91, end: 140 },
        { col: "cpf_resp_liquidacao",     start: 141, end: 151 },
        { col: "especificacao_liquidacao",start: 152, end: 351 },
        { col: "nro_sequencial",          start: 352, end: 357, type: "int" },
      ],
    },
    "11": {
      // Fonte de recurso da liquidação
      table: "stg_lqd_11",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "dot_orig_p2001",   start:  28, end:  48 },
        { col: "nro_empenho",      start:  49, end:  54 },
        { col: "dt_empenho",       start:  55, end:  62 },
        { col: "nr_liquidacao",    start:  63, end:  68 },
        { col: "dt_liquidacao",    start:  69, end:  76 },
        { col: "cod_fonte_recurso",start:  77, end:  82 },
        { col: "vl_despesa_fr",    start:  83, end:  95 },
        { col: "nro_sequencial",   start: 352, end: 357, type: "int" },
      ],
    },
    "12": {
      // Documento fiscal da liquidação
      table: "stg_lqd_12",
      fields: [
        { col: "tipo_registro",      start:   1, end:   2 },
        { col: "cod_programa",       start:   3, end:   6 },
        { col: "cod_orgao",          start:   7, end:   8 },
        { col: "cod_unidade",        start:   9, end:  10 },
        { col: "cod_funcao",         start:  11, end:  12 },
        { col: "cod_subfuncao",      start:  13, end:  15 },
        { col: "natureza_acao",      start:  16, end:  16 },
        { col: "nro_proj_ativ",      start:  17, end:  19 },
        { col: "elemento_despesa",   start:  20, end:  25 },
        { col: "sub_elemento",       start:  26, end:  27 },
        { col: "dot_orig_p2001",     start:  28, end:  48 },
        { col: "nro_empenho",        start:  49, end:  54 },
        { col: "dt_empenho",         start:  55, end:  62 },
        { col: "nr_liquidacao",      start:  63, end:  68 },
        { col: "dt_liquidacao",      start:  69, end:  76 },
        { col: "tipo_doc_fiscal",    start:  77, end:  78 },
        { col: "nro_doc_fiscal",     start:  79, end:  88 },
        { col: "serie_doc_fiscal",   start:  89, end:  96 },
        { col: "dt_doc_fiscal",      start:  97, end: 104 },
        { col: "chave_acesso",       start: 105, end: 148 },
        { col: "vl_doc_valor_total", start: 149, end: 161 },
        { col: "vl_doc_associado",   start: 162, end: 174 },
        { col: "cnpj_cpf_credor",    start: 175, end: 188 },
        { col: "tipo_credor",        start: 189, end: 189 },
        { col: "nr_insc_estadual",   start: 190, end: 204 },
        { col: "nr_insc_municipal",  start: 205, end: 219 },
        { col: "cep_municipio",      start: 220, end: 227 },
        { col: "uf_credor",          start: 228, end: 229 },
        { col: "nome_credor",        start: 230, end: 279 },
        { col: "nro_sequencial",     start: 352, end: 357, type: "int" },
      ],
    },
  },

  // =========================================================
  // OPS.txt — Ordens de Pagamento / Pagamentos
  // =========================================================
  // Comprimento fixo: 443 chars para todos os tipos (10-14, 99)
  // nroSequencial sempre em pos 438-443
  // Campos classificatórios padrão (pos 1-27) + dotOrigP2001 (28-48) em todos
  OPS: {
    "10": {
      // Registro principal da ordem de pagamento
      table: "stg_ops_10",
      fields: [
        { col: "tipo_registro",        start:   1, end:   2 },
        { col: "cod_programa",         start:   3, end:   6 },
        { col: "cod_orgao",            start:   7, end:   8 },
        { col: "cod_unidade",          start:   9, end:  10 },
        { col: "cod_funcao",           start:  11, end:  12 },
        { col: "cod_subfuncao",        start:  13, end:  15 },
        { col: "natureza_acao",        start:  16, end:  16 },
        { col: "nro_proj_ativ",        start:  17, end:  19 },
        { col: "elemento_despesa",     start:  20, end:  25 },
        { col: "sub_elemento",         start:  26, end:  27 },
        { col: "dot_orig_p2001",       start:  28, end:  48 },
        { col: "nro_empenho",          start:  49, end:  54 },
        { col: "nro_op",               start:  55, end:  60 },
        { col: "tipo_op",              start:  61, end:  61 },
        { col: "dt_inscricao",         start:  62, end:  69 },
        { col: "dt_emissao",           start:  70, end:  77 },
        { col: "vl_op",                start:  78, end:  90 },
        { col: "nome_credor",          start:  91, end: 140 },
        { col: "tipo_credor",          start: 141, end: 141 },
        { col: "cpf_cnpj",             start: 142, end: 155 },
        { col: "especificacao_op",     start: 156, end: 355 },
        { col: "cpf_resp_op",          start: 356, end: 366 },
        { col: "nome_resp_op",         start: 367, end: 416 },
        { col: "nr_extra_orcamentaria",start: 417, end: 422 },
        { col: "id_colare",            start: 423, end: 437 },
        { col: "nro_sequencial",       start: 438, end: 443, type: "int" },
      ],
    },
    "11": {
      // Liquidação vinculada à OP
      table: "stg_ops_11",
      fields: [
        { col: "tipo_registro",        start:   1, end:   2 },
        { col: "cod_programa",         start:   3, end:   6 },
        { col: "cod_orgao",            start:   7, end:   8 },
        { col: "cod_unidade",          start:   9, end:  10 },
        { col: "cod_funcao",           start:  11, end:  12 },
        { col: "cod_subfuncao",        start:  13, end:  15 },
        { col: "natureza_acao",        start:  16, end:  16 },
        { col: "nro_proj_ativ",        start:  17, end:  19 },
        { col: "elemento_despesa",     start:  20, end:  25 },
        { col: "sub_elemento",         start:  26, end:  27 },
        { col: "dot_orig_p2001",       start:  28, end:  48 },
        { col: "nro_empenho",          start:  49, end:  54 },
        { col: "nro_op",               start:  55, end:  60 },
        { col: "nr_liquidacao",        start:  61, end:  66 },
        { col: "dt_liquidacao",        start:  67, end:  74 },
        { col: "vl_liquidacao",        start:  75, end:  87 },
        { col: "vl_op_vinculado_liq",  start:  88, end: 100 },
        { col: "nro_sequencial",       start: 438, end: 443, type: "int" },
      ],
    },
    "12": {
      // Conta bancária de débito da OP
      table: "stg_ops_12",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "dot_orig_p2001",   start:  28, end:  48 },
        { col: "nro_empenho",      start:  49, end:  54 },
        { col: "nro_op",           start:  55, end:  60 },
        { col: "cod_und_financeira",start: 61, end:  62 },
        { col: "banco",            start:  63, end:  65 },
        { col: "agencia",          start:  66, end:  69 },
        { col: "conta_corrente",   start:  70, end:  81 },
        { col: "conta_corrente_dv",start:  82, end:  82 },
        { col: "tipo_conta",       start:  83, end:  84 },
        { col: "nr_documento",     start:  85, end:  99 },
        { col: "tipo_documento",   start: 100, end: 101 },
        { col: "vl_documento",     start: 102, end: 114 },
        { col: "dt_emissao",       start: 115, end: 122 },
        { col: "vl_associado",     start: 123, end: 135 },
        { col: "nro_sequencial",   start: 438, end: 443, type: "int" },
      ],
    },
    "13": {
      // Fonte de recurso da conta bancária da OP
      table: "stg_ops_13",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "dot_orig_p2001",   start:  28, end:  48 },
        { col: "nro_empenho",      start:  49, end:  54 },
        { col: "nro_op",           start:  55, end:  60 },
        { col: "cod_und_financeira",start: 61, end:  62 },
        { col: "banco",            start:  63, end:  65 },
        { col: "agencia",          start:  66, end:  69 },
        { col: "conta_corrente",   start:  70, end:  81 },
        { col: "conta_corrente_dv",start:  82, end:  82 },
        { col: "tipo_conta",       start:  83, end:  84 },
        { col: "nr_documento",     start:  85, end:  99 },
        { col: "cod_fonte_recurso",start: 100, end: 105 },
        { col: "vl_fr",            start: 106, end: 118 },
        { col: "nro_sequencial",   start: 438, end: 443, type: "int" },
      ],
    },
    "14": {
      // Retenção vinculada à OP
      table: "stg_ops_14",
      fields: [
        { col: "tipo_registro",        start:   1, end:   2 },
        { col: "cod_programa",         start:   3, end:   6 },
        { col: "cod_orgao",            start:   7, end:   8 },
        { col: "cod_unidade",          start:   9, end:  10 },
        { col: "cod_funcao",           start:  11, end:  12 },
        { col: "cod_subfuncao",        start:  13, end:  15 },
        { col: "natureza_acao",        start:  16, end:  16 },
        { col: "nro_proj_ativ",        start:  17, end:  19 },
        { col: "elemento_despesa",     start:  20, end:  25 },
        { col: "sub_elemento",         start:  26, end:  27 },
        { col: "dot_orig_p2001",       start:  28, end:  48 },
        { col: "nro_empenho",          start:  49, end:  54 },
        { col: "nro_op",               start:  55, end:  60 },
        { col: "tipo_retencao",        start:  61, end:  62 },
        { col: "nr_extra_orcamentaria",start:  63, end:  68 },
        { col: "descricao_retencao",   start:  69, end: 118 },
        { col: "vl_retencao",          start: 119, end: 131 },
        { col: "nro_sequencial",       start: 438, end: 443, type: "int" },
      ],
    },
  },

  // =========================================================
  // PCT.txt — Plano de Contas (185 chars, nro_seq 180-185)
  // Layout homologado: XLSX rows 2127+ + DB dissection 2026-03-20
  // Nota: usa tipoUnidade (não cod_orgao) — arquivo de plano de contas
  // =========================================================
  PCT: {
    // PCT.10: cabeçalho do plano de contas
    "10": {
      table: "stg_pct_10",
      fields: [
        { col: "tipo_registro",       start:  1, end:  2 },
        { col: "tipo_unidade",        start:  3, end:  4 },
        { col: "envio_plano_contas",  start:  5, end:  5 },
        // brancos 6-179
        { col: "nro_sequencial",      start: 180, end: 185, type: "int" },
      ],
    },
    // PCT.11: definição de nível do plano de contas
    "11": {
      table: "stg_pct_11",
      fields: [
        { col: "tipo_registro",       start:  1, end:  2 },
        { col: "tipo_unidade",        start:  3, end:  4 },
        { col: "nivel",               start:  5, end:  6 },
        { col: "qt_digitos_nivel",    start:  7, end:  8 },
        // brancos 9-179
        { col: "nro_sequencial",      start: 180, end: 185, type: "int" },
      ],
    },
    // PCT.12: conta do plano de contas (completo, com conta superior e PCASP)
    "12": {
      table: "stg_pct_12",
      fields: [
        { col: "tipo_registro",            start:   1, end:   2 },
        { col: "tipo_unidade",             start:   3, end:   4 },
        { col: "cod_conta",                start:   5, end:  34 },  // 30 chars
        { col: "ind_calc_sup_financeiro",  start:  35, end:  35 },
        { col: "cod_conta_superior",       start:  36, end:  65 },  // 30 chars
        { col: "nivel",                    start:  66, end:  67 },
        { col: "descricao",                start:  68, end: 167 },  // 100 chars
        { col: "natureza_conta",           start: 168, end: 168 },
        { col: "tipo_conta",               start: 169, end: 169 },
        { col: "conta_pcasp",              start: 170, end: 178 },  // 9 chars
        { col: "ind_calc_sup_fin_pcasp",   start: 179, end: 179 },
        { col: "nro_sequencial",           start: 180, end: 185, type: "int" },
      ],
    },
    // PCT.13: alteração de descrição de conta (sem conta superior, sem natureza/tipo)
    "13": {
      table: "stg_pct_13",
      fields: [
        { col: "tipo_registro",            start:   1, end:   2 },
        { col: "tipo_unidade",             start:   3, end:   4 },
        { col: "cod_conta",                start:   5, end:  34 },
        { col: "ind_calc_sup_financeiro",  start:  35, end:  35 },
        { col: "descricao",                start:  36, end: 135 },  // 100 chars
        { col: "conta_pcasp",              start: 136, end: 144 },
        { col: "ind_calc_sup_fin_pcasp",   start: 145, end: 145 },
        // brancos 146-179
        { col: "nro_sequencial",           start: 180, end: 185, type: "int" },
      ],
    },
    // PCT.14: exclusão de conta
    "14": {
      table: "stg_pct_14",
      fields: [
        { col: "tipo_registro",            start:  1, end:  2 },
        { col: "tipo_unidade",             start:  3, end:  4 },
        { col: "cod_conta",                start:  5, end: 34 },
        { col: "ind_calc_sup_financeiro",  start: 35, end: 35 },
        // brancos 36-179
        { col: "nro_sequencial",           start: 180, end: 185, type: "int" },
      ],
    },
    "99": {
      table: "stg_pct_99",
      fields: [
        { col: "tipo_registro",  start:   1, end:   2 },
        { col: "nro_sequencial", start: 180, end: 185, type: "int" },
      ],
    },
  },

  // =========================================================
  // LNC.txt — Lançamentos Contábeis (1042 chars, nro_seq 1037-1042)
  // Layout homologado: XLSX rows 2202+ + DB dissection 2026-03-20
  // Nota: usa tipoUnidade (não cod_orgao) — arquivo contábil
  // =========================================================
  LNC: {
    // LNC.10: cabeçalho do lançamento contábil
    "10": {
      table: "stg_lnc_10",
      fields: [
        { col: "tipo_registro",   start:    1, end:    2 },
        { col: "tipo_unidade",    start:    3, end:    4 },
        { col: "num_controle",    start:    5, end:   17 },  // 13 chars
        { col: "mes_referencia",  start:   18, end:   19 },
        { col: "data_registro",   start:   20, end:   27 },
        { col: "tipo_lancamento", start:   28, end:   28 },
        { col: "data_transacao",  start:   29, end:   36 },
        { col: "historico",       start:   37, end: 1036 }, // 1000 chars
        { col: "nro_sequencial",  start: 1037, end: 1042, type: "int" },
      ],
    },
    // LNC.11: item do lançamento contábil (débito ou crédito)
    "11": {
      table: "stg_lnc_11",
      fields: [
        { col: "tipo_registro",      start:    1, end:    2 },
        { col: "tipo_unidade",       start:    3, end:    4 },
        { col: "num_controle",       start:    5, end:   17 }, // 13 chars
        { col: "cod_conta",          start:   18, end:   47 }, // 30 chars
        { col: "atributo_conta",     start:   48, end:   48 },
        { col: "nat_lancamento",     start:   49, end:   49 },
        { col: "valor",              start:   50, end:   65 }, // 16 chars
        { col: "tipo_arquivo_sicom", start:   66, end:   67 },
        { col: "chave_arquivo",      start:   68, end:  217 }, // 150 chars
        // brancos 218-1036
        { col: "nro_sequencial",     start: 1037, end: 1042, type: "int" },
      ],
    },
    "99": {
      table: "stg_lnc_99",
      fields: [
        { col: "tipo_registro",  start:    1, end:    2 },
        { col: "nro_sequencial", start: 1037, end: 1042, type: "int" },
      ],
    },
  },

  // =========================================================
  // ARE.txt — Anulação de Receita
  // Layout 2025: registro de 289 chars
  // ARE.10: tipo(1-2) orgao(3-4) unidade(5-6) rubrica(7-15)
  //         vlAnulacao(16-28) justificativa(29-283) seq(284-289)
  // ARE.11: tipo(1-2) orgao(3-4) unidade(5-6) rubrica(7-15)
  //         banco(16-18) agencia(19-22) contaCorrente(23-34)
  //         contaDV(35-35) tipoConta(36-37) vlAnulado(38-50)
  //         brancos(51-283) seq(284-289)
  // ARE.12: idem ARE.11 + codFonteRecurso(38-43) vlAnuladoFonte(44-56)
  //         brancos(57-283) seq(284-289)
  // =========================================================
  ARE: {
    "10": {
      table: "stg_are_10",
      fields: [
        { col: "tipo_registro",  start:   1, end:   2 },
        { col: "cod_orgao",      start:   3, end:   4 },
        { col: "cod_unidade",    start:   5, end:   6 },
        { col: "rubrica",        start:   7, end:  15 },
        { col: "vl_anulacao",    start:  16, end:  28 },
        { col: "justificativa",  start:  29, end: 283 },
        { col: "nro_sequencial", start: 284, end: 289, type: "int" },
      ],
    },
    "11": {
      table: "stg_are_11",
      fields: [
        { col: "tipo_registro",       start:   1, end:   2 },
        { col: "cod_orgao",           start:   3, end:   4 },
        { col: "cod_unidade",         start:   5, end:   6 },
        { col: "rubrica",             start:   7, end:  15 },
        { col: "banco",               start:  16, end:  18 },
        { col: "agencia",             start:  19, end:  22 },
        { col: "conta_corrente",      start:  23, end:  34 },
        { col: "conta_corrente_dv",   start:  35, end:  35 },
        { col: "tipo_conta",          start:  36, end:  37 },
        { col: "vl_anulado",          start:  38, end:  50 },
        { col: "nro_sequencial",      start: 284, end: 289, type: "int" },
      ],
    },
    "12": {
      table: "stg_are_12",
      fields: [
        { col: "tipo_registro",       start:   1, end:   2 },
        { col: "cod_orgao",           start:   3, end:   4 },
        { col: "cod_unidade",         start:   5, end:   6 },
        { col: "rubrica",             start:   7, end:  15 },
        { col: "banco",               start:  16, end:  18 },
        { col: "agencia",             start:  19, end:  22 },
        { col: "conta_corrente",      start:  23, end:  34 },
        { col: "conta_corrente_dv",   start:  35, end:  35 },
        { col: "tipo_conta",          start:  36, end:  37 },
        { col: "cod_fonte_recurso",   start:  38, end:  43 },
        { col: "vl_anulado_fonte",    start:  44, end:  56 },
        { col: "nro_sequencial",      start: 284, end: 289, type: "int" },
      ],
    },
  },

  // =========================================================
  // AOC.txt — Alteração Orçamentária
  // =========================================================
  AOC: {
    "10": {
      table: "stg_aoc_10",
      fields: [
        { col: "tipo_registro",      start:  1, end:  2 },
        { col: "cod_programa",       start:  3, end:  6 },
        { col: "cod_orgao",          start:  7, end:  8 },
        { col: "cod_unidade",        start:  9, end: 10 },
        { col: "cod_funcao",         start: 11, end: 12 },
        { col: "cod_subfuncao",      start: 13, end: 15 },
        { col: "natureza_acao",      start: 16, end: 16 },
        { col: "nro_proj_ativ",      start: 17, end: 19 },
        { col: "vl_saldo_ant_orcado",start: 20, end: 32 },
        { col: "vl_saldo_atual",     start: 33, end: 45 },
        // pos 46-80: brancos
        { col: "nro_sequencial",     start: 81, end: 86, type: "int" },
      ],
    },
    "11": {
      table: "stg_aoc_11",
      fields: [
        { col: "tipo_registro",       start:  1, end:  2 },
        { col: "cod_programa",        start:  3, end:  6 },
        { col: "cod_orgao",           start:  7, end:  8 },
        { col: "cod_unidade",         start:  9, end: 10 },
        { col: "cod_funcao",          start: 11, end: 12 },
        { col: "cod_subfuncao",       start: 13, end: 15 },
        { col: "natureza_acao",       start: 16, end: 16 },
        { col: "nro_proj_ativ",       start: 17, end: 19 },
        { col: "cod_natureza_despesa",start: 20, end: 25 },
        { col: "dt_alteracao",        start: 26, end: 33 },
        { col: "nr_alteracao",        start: 34, end: 36 },
        { col: "tipo_alteracao",      start: 37, end: 38 },
        { col: "vl_alteracao",        start: 39, end: 51 },
        { col: "vl_saldo_ant_dotacao",start: 52, end: 64 },
        { col: "vl_saldo_atual",      start: 65, end: 77 },
        // pos 78-80: brancos
        { col: "nro_sequencial",      start: 81, end: 86, type: "int" },
      ],
    },
    "12": {
      table: "stg_aoc_12",
      fields: [
        { col: "tipo_registro",        start:  1, end:  2 },
        { col: "cod_programa",         start:  3, end:  6 },
        { col: "cod_orgao",            start:  7, end:  8 },
        { col: "cod_unidade",          start:  9, end: 10 },
        { col: "cod_funcao",           start: 11, end: 12 },
        { col: "cod_subfuncao",        start: 13, end: 15 },
        { col: "natureza_acao",        start: 16, end: 16 },
        { col: "nro_proj_ativ",        start: 17, end: 19 },
        { col: "cod_natureza_despesa", start: 20, end: 25 },
        { col: "dt_alteracao",         start: 26, end: 33 },
        { col: "nr_alteracao",         start: 34, end: 36 },
        { col: "tipo_alteracao",       start: 37, end: 38 },
        { col: "cod_fonte_recurso",    start: 39, end: 41 },
        { col: "vl_alteracao_fonte",   start: 42, end: 54 },
        { col: "vl_saldo_ant_fonte",   start: 55, end: 67 },
        { col: "vl_saldo_atual_fonte", start: 68, end: 80 },
        { col: "nro_sequencial",       start: 81, end: 86, type: "int" },
      ],
    },
    "90": {
      table: "stg_aoc_90",
      fields: [
        { col: "tipo_registro",         start:  1, end:  2 },
        { col: "nr_lei_suplementacao",  start:  3, end:  8 },
        { col: "data_lei_suplementacao",start:  9, end: 16 },
        { col: "vl_autorizado",         start: 17, end: 29 },
        { col: "nro_sequencial",        start: 30, end: 35, type: "int" },
      ],
    },
    "91": {
      table: "stg_aoc_91",
      fields: [
        { col: "tipo_registro",       start:  1, end:  2 },
        { col: "nr_lei_credito_esp",  start:  3, end:  8 },
        { col: "data_lei_credito_esp",start:  9, end: 16 },
        { col: "vl_autorizado",       start: 17, end: 29 },
        { col: "nro_sequencial",      start: 30, end: 35, type: "int" },
      ],
    },
    "92": {
      table: "stg_aoc_92",
      fields: [
        { col: "tipo_registro",   start:  1, end:  2 },
        { col: "nr_lei_realoc",   start:  3, end:  8 },
        { col: "data_lei_realoc", start:  9, end: 16 },
        { col: "vl_autorizado",   start: 17, end: 29 },
        { col: "nro_sequencial",  start: 30, end: 35, type: "int" },
      ],
    },
    "93": {
      table: "stg_aoc_93",
      fields: [
        { col: "tipo_registro",   start:  1, end:  2 },
        { col: "nr_lei_alt_ppa",  start:  3, end:  8 },
        { col: "data_lei_alt_ppa",start:  9, end: 16 },
        { col: "nro_sequencial",  start: 17, end: 22, type: "int" },
      ],
    },
    "94": {
      table: "stg_aoc_94",
      fields: [
        { col: "tipo_registro",  start:  1, end:  2 },
        { col: "nr_decreto",     start:  3, end:  8 },
        { col: "data_decreto",   start:  9, end: 16 },
        { col: "vl_decreto",     start: 17, end: 29 },
        { col: "tipo_credito",   start: 30, end: 30 },
        { col: "nro_sequencial", start: 31, end: 36, type: "int" },
      ],
    },
  },

  // =========================================================
  // COB.txt — Obras
  // =========================================================
  COB: {
    "10": {
      table: "stg_cob_10",
      fields: [
        { col: "tipo_registro",  start:   1, end:   2 },
        { col: "cod_orgao",      start:   3, end:   4 },
        { col: "cod_unidade",    start:   5, end:   6 },
        { col: "cod_obra",       start:   7, end:  10 },
        { col: "ano_obra",       start:  11, end:  14 },
        { col: "especificacao",  start:  15, end: 114 },
        { col: "latitude",       start: 115, end: 122 },
        { col: "longitude",      start: 123, end: 130 },
        { col: "unidade_medida", start: 131, end: 132 },
        { col: "quantidade",     start: 133, end: 137 },
        { col: "endereco_obra",  start: 138, end: 237 },
        { col: "bairro_obra",    start: 238, end: 257 },
        { col: "nome_fiscal",    start: 258, end: 307 },
        { col: "cpf_fiscal",     start: 308, end: 318 },
        { col: "nro_sequencial", start: 319, end: 324, type: "int" },
      ],
    },
  },

  // =========================================================
  // ANL.txt — Anulação de Empenhos
  // =========================================================
  ANL: {
    "10": {
      table: "stg_anl_10",
      fields: [
        { col: "tipo_registro",   start:   1, end:   2 },
        { col: "cod_programa",    start:   3, end:   6 },
        { col: "cod_orgao",       start:   7, end:   8 },
        { col: "cod_unidade",     start:   9, end:  10 },
        { col: "cod_funcao",      start:  11, end:  12 },
        { col: "cod_subfuncao",   start:  13, end:  15 },
        { col: "natureza_acao",   start:  16, end:  16 },
        { col: "nro_proj_ativ",   start:  17, end:  19 },
        { col: "elemento_despesa",start:  20, end:  25 },
        { col: "sub_elemento",    start:  26, end:  27 },
        { col: "nro_empenho",     start:  28, end:  33 },
        { col: "dt_anulacao",     start:  34, end:  41 },
        { col: "nr_anulacao",     start:  42, end:  44 },
        { col: "dt_empenho",      start:  45, end:  52 },
        { col: "vl_original",     start:  53, end:  65 },
        { col: "vl_anulacao",     start:  66, end:  78 },
        { col: "nome_credor",     start:  79, end: 128 },
        { col: "tipo_credor",     start: 129, end: 129 },
        { col: "cpf_cnpj",        start: 130, end: 143 },
        { col: "especificacao",   start: 144, end: 343 },
        { col: "nro_sequencial",  start: 344, end: 349, type: "int" },
      ],
    },
    "11": {
      table: "stg_anl_11",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "nro_empenho",      start:  28, end:  33 },
        { col: "dt_anulacao",      start:  34, end:  41 },
        { col: "nr_anulacao",      start:  42, end:  44 },
        { col: "cod_fonte_recurso",start:  45, end:  50 },
        { col: "vl_emp_fonte",     start:  51, end:  63 },
        { col: "vl_anulacao_fonte",start:  64, end:  76 },
        // pos 77-343: brancos
        { col: "nro_sequencial",   start: 344, end: 349, type: "int" },
      ],
    },
    "12": {
      table: "stg_anl_12",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "nro_empenho",      start:  28, end:  33 },
        { col: "dt_anulacao",      start:  34, end:  41 },
        { col: "nr_anulacao",      start:  42, end:  44 },
        { col: "cod_unidade_obra", start:  45, end:  46 },
        { col: "cod_obra",         start:  47, end:  50 },
        { col: "ano_obra",         start:  51, end:  54 },
        { col: "vl_anulado_obra",  start:  55, end:  67 },
        // pos 68-343: brancos
        { col: "nro_sequencial",   start: 344, end: 349, type: "int" },
      ],
    },
    "13": {
      table: "stg_anl_13",
      fields: [
        { col: "tipo_registro",        start:   1, end:   2 },
        { col: "cod_programa",         start:   3, end:   6 },
        { col: "cod_orgao",            start:   7, end:   8 },
        { col: "cod_unidade",          start:   9, end:  10 },
        { col: "cod_funcao",           start:  11, end:  12 },
        { col: "cod_subfuncao",        start:  13, end:  15 },
        { col: "natureza_acao",        start:  16, end:  16 },
        { col: "nro_proj_ativ",        start:  17, end:  19 },
        { col: "elemento_despesa",     start:  20, end:  25 },
        { col: "sub_elemento",         start:  26, end:  27 },
        { col: "nro_empenho",          start:  28, end:  33 },
        { col: "dt_anulacao",          start:  34, end:  41 },
        { col: "nr_anulacao",          start:  42, end:  44 },
        { col: "cod_unidade_contrato", start:  45, end:  46 },
        { col: "nro_contrato",         start:  47, end:  66 },
        { col: "ano_contrato",         start:  67, end:  70 },
        { col: "tipo_ajuste",          start:  71, end:  71 },
        { col: "vl_anulado_contrato",  start:  72, end:  84 },
        // pos 85-343: brancos
        { col: "nro_sequencial",       start: 344, end: 349, type: "int" },
      ],
    },
    "14": {
      table: "stg_anl_14",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "nro_empenho",      start:  28, end:  33 },
        { col: "dt_anulacao",      start:  34, end:  41 },
        { col: "nr_anulacao",      start:  42, end:  44 },
        { col: "cpf_cnpj_credor",  start:  45, end:  58 },
        { col: "tipo_credor",      start:  59, end:  59 },
        { col: "nome_credor",      start:  60, end: 109 },
        { col: "vl_anulado_credor",start: 110, end: 122 },
        // pos 123-343: brancos
        { col: "nro_sequencial",   start: 344, end: 349, type: "int" },
      ],
    },
  },

  // =========================================================
  // EOC.txt — Empenho de Obras
  // =========================================================
  // =========================================================
  // EOC.txt — Vínculo de Empenho com Obra e/ou Contrato
  // 77 chars, nro_sequencial em 72-77
  // Header classificatório padrão (1-27) + nro_empenho (28-33)
  // =========================================================
  EOC: {
    "10": { // Vínculo empenho (sem obra/contrato específico)
      table: "stg_eoc_10",
      fields: [
        { col: "tipo_registro",    start:  1, end:  2 },
        { col: "cod_programa",     start:  3, end:  6 },
        { col: "cod_orgao",        start:  7, end:  8 },
        { col: "cod_unidade",      start:  9, end: 10 },
        { col: "cod_funcao",       start: 11, end: 12 },
        { col: "cod_subfuncao",    start: 13, end: 15 },
        { col: "natureza_acao",    start: 16, end: 16 },
        { col: "nro_proj_ativ",    start: 17, end: 19 },
        { col: "elemento_despesa", start: 20, end: 25 },
        { col: "sub_elemento",     start: 26, end: 27 },
        { col: "nro_empenho",      start: 28, end: 33 },
        { col: "nro_sequencial",   start: 72, end: 77, type: "int" },
      ],
    },
    "11": { // Vínculo empenho x obra
      table: "stg_eoc_11",
      fields: [
        { col: "tipo_registro",    start:  1, end:  2 },
        { col: "cod_programa",     start:  3, end:  6 },
        { col: "cod_orgao",        start:  7, end:  8 },
        { col: "cod_unidade",      start:  9, end: 10 },
        { col: "cod_funcao",       start: 11, end: 12 },
        { col: "cod_subfuncao",    start: 13, end: 15 },
        { col: "natureza_acao",    start: 16, end: 16 },
        { col: "nro_proj_ativ",    start: 17, end: 19 },
        { col: "elemento_despesa", start: 20, end: 25 },
        { col: "sub_elemento",     start: 26, end: 27 },
        { col: "nro_empenho",      start: 28, end: 33 },
        { col: "cod_unidade_obra", start: 34, end: 35 },
        { col: "cod_obra",         start: 36, end: 39 },
        { col: "ano_obra",         start: 40, end: 43 },
        { col: "vl_associado_obra",start: 44, end: 56 },
        { col: "nro_sequencial",   start: 72, end: 77, type: "int" },
      ],
    },
    "12": { // Vínculo empenho x contrato
      table: "stg_eoc_12",
      fields: [
        { col: "tipo_registro",        start:  1, end:  2 },
        { col: "cod_programa",         start:  3, end:  6 },
        { col: "cod_orgao",            start:  7, end:  8 },
        { col: "cod_unidade",          start:  9, end: 10 },
        { col: "cod_funcao",           start: 11, end: 12 },
        { col: "cod_subfuncao",        start: 13, end: 15 },
        { col: "natureza_acao",        start: 16, end: 16 },
        { col: "nro_proj_ativ",        start: 17, end: 19 },
        { col: "elemento_despesa",     start: 20, end: 25 },
        { col: "sub_elemento",         start: 26, end: 27 },
        { col: "nro_empenho",          start: 28, end: 33 },
        { col: "cod_unidade_contrato", start: 34, end: 35 },
        { col: "nro_contrato",         start: 36, end: 55 },
        { col: "ano_contrato",         start: 56, end: 59 },
        { col: "tipo_ajuste",          start: 60, end: 60 },
        { col: "vl_associado_contrato",start: 61, end: 71 },
        { col: "nro_sequencial",       start: 72, end: 77, type: "int" },
      ],
    },
  },

  // =========================================================
  // ALQ.txt — Anulação de Liquidações
  // =========================================================
  // Comprimento fixo: 242 chars para todos os tipos (10, 11, 12, 99)
  // nroSequencial sempre em pos 237-242
  // Campos classificatórios padrão (pos 1-27) + dotOrigP2001 (28-48) em todos
  ALQ: {
    "10": {
      // Registro principal da anulação de liquidação
      table: "stg_alq_10",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "dot_orig_p2001",   start:  28, end:  48 },
        { col: "nro_empenho",      start:  49, end:  54 },
        { col: "dt_empenho",       start:  55, end:  62 },
        { col: "nr_liquidacao",    start:  63, end:  68 },
        { col: "dt_liquidacao",    start:  69, end:  76 },
        { col: "nr_liquidacao_anl",start:  77, end:  82 },
        { col: "dt_anulacao_liq",  start:  83, end:  90 },
        { col: "tp_liquidacao",    start:  91, end:  91 },
        { col: "vl_liquidado",     start:  92, end: 104 },
        { col: "vl_anulado",       start: 105, end: 117 },
        { col: "nro_sequencial",   start: 237, end: 242, type: "int" },
      ],
    },
    "11": {
      // Fonte de recurso da anulação de liquidação
      table: "stg_alq_11",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "dot_orig_p2001",   start:  28, end:  48 },
        { col: "nro_empenho",      start:  49, end:  54 },
        { col: "dt_empenho",       start:  55, end:  62 },
        { col: "nr_liquidacao",    start:  63, end:  68 },
        { col: "dt_liquidacao",    start:  69, end:  76 },
        { col: "nr_liquidacao_anl",start:  77, end:  82 },
        { col: "dt_anulacao_liq",  start:  83, end:  90 },
        { col: "cod_fonte_recurso",start:  91, end:  96 },
        { col: "vl_liquidado_fr",  start:  97, end: 109 },
        { col: "vl_anulado_fr",    start: 110, end: 122 },
        { col: "nro_sequencial",   start: 237, end: 242, type: "int" },
      ],
    },
    "12": {
      // Documento fiscal da anulação de liquidação
      table: "stg_alq_12",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "dot_orig_p2001",   start:  28, end:  48 },
        { col: "nro_empenho",      start:  49, end:  54 },
        { col: "dt_empenho",       start:  55, end:  62 },
        { col: "nr_liquidacao",    start:  63, end:  68 },
        { col: "dt_liquidacao",    start:  69, end:  76 },
        { col: "nr_liquidacao_anl",start:  77, end:  82 },
        { col: "dt_anulacao_liq",  start:  83, end:  90 },
        { col: "tipo_doc_fiscal",  start:  91, end:  92 },
        { col: "nro_doc_fiscal",   start:  93, end: 102 },
        { col: "serie_doc_fiscal", start: 103, end: 110 },
        { col: "dt_doc_fiscal",    start: 111, end: 118 },
        { col: "vl_anulado",       start: 119, end: 131 },
        { col: "cnpj_cpf_credor",  start: 132, end: 145 },
        { col: "tipo_credor",      start: 146, end: 146 },
        { col: "nr_insc_estadual", start: 147, end: 161 },
        { col: "nr_insc_municipal",start: 162, end: 176 },
        { col: "cep_municipio",    start: 177, end: 184 },
        { col: "uf_credor",        start: 185, end: 186 },
        { col: "nome_credor",      start: 187, end: 236 },
        { col: "nro_sequencial",   start: 237, end: 242, type: "int" },
      ],
    },
  },

  // =========================================================
  // AOP.txt — Anulação de Ordens de Pagamento
  // =========================================================
  // Comprimento fixo: 391 chars para todos os tipos (10-14, 99)
  // nroSequencial sempre em pos 386-391
  // Campos classificatórios padrão (pos 1-27) + dotOrigP2001 (28-48) em todos
  // Diferencial vs OPS: nrAnulacaoOP (69-71, 3 chars) após dtAnulacao (61-68)
  AOP: {
    "10": {
      // Registro principal da anulação de OP
      table: "stg_aop_10",
      fields: [
        { col: "tipo_registro",        start:   1, end:   2 },
        { col: "cod_programa",         start:   3, end:   6 },
        { col: "cod_orgao",            start:   7, end:   8 },
        { col: "cod_unidade",          start:   9, end:  10 },
        { col: "cod_funcao",           start:  11, end:  12 },
        { col: "cod_subfuncao",        start:  13, end:  15 },
        { col: "natureza_acao",        start:  16, end:  16 },
        { col: "nro_proj_ativ",        start:  17, end:  19 },
        { col: "elemento_despesa",     start:  20, end:  25 },
        { col: "sub_elemento",         start:  26, end:  27 },
        { col: "dot_orig_p2001",       start:  28, end:  48 },
        { col: "nro_empenho",          start:  49, end:  54 },
        { col: "nro_op",               start:  55, end:  60 },
        { col: "dt_anulacao",          start:  61, end:  68 },
        { col: "nr_anulacao_op",       start:  69, end:  71 },
        { col: "tipo_op",              start:  72, end:  72 },
        { col: "dt_inscricao",         start:  73, end:  80 },
        { col: "dt_emissao",           start:  81, end:  88 },
        { col: "vl_op",                start:  89, end: 101 },
        { col: "vl_anulado_op",        start: 102, end: 114 },
        { col: "nome_credor",          start: 115, end: 164 },
        { col: "tipo_credor",          start: 165, end: 165 },
        { col: "cpf_cnpj",             start: 166, end: 179 },
        { col: "especificacao_op",     start: 180, end: 379 },
        { col: "nr_extra_orcamentaria",start: 380, end: 385 },
        { col: "nro_sequencial",       start: 386, end: 391, type: "int" },
      ],
    },
    "11": {
      // Liquidação vinculada à anulação de OP
      table: "stg_aop_11",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "dot_orig_p2001",   start:  28, end:  48 },
        { col: "nro_empenho",      start:  49, end:  54 },
        { col: "nro_op",           start:  55, end:  60 },
        { col: "dt_anulacao",      start:  61, end:  68 },
        { col: "nr_anulacao_op",   start:  69, end:  71 },
        { col: "nr_liquidacao",    start:  72, end:  77 },
        { col: "dt_liquidacao",    start:  78, end:  85 },
        { col: "vl_anulacao",      start:  86, end:  98 },
        { col: "nro_sequencial",   start: 386, end: 391, type: "int" },
      ],
    },
    "12": {
      // Conta bancária da anulação de OP
      table: "stg_aop_12",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "dot_orig_p2001",   start:  28, end:  48 },
        { col: "nro_empenho",      start:  49, end:  54 },
        { col: "nro_op",           start:  55, end:  60 },
        { col: "dt_anulacao",      start:  61, end:  68 },
        { col: "nr_anulacao_op",   start:  69, end:  71 },
        { col: "cod_und_financeira",start: 72, end:  73 },
        { col: "banco",            start:  74, end:  76 },
        { col: "agencia",          start:  77, end:  80 },
        { col: "conta_corrente",   start:  81, end:  92 },
        { col: "conta_corrente_dv",start:  93, end:  93 },
        { col: "tipo_conta",       start:  94, end:  95 },
        { col: "nr_documento",     start:  96, end: 110 },
        { col: "tipo_documento",   start: 111, end: 112 },
        { col: "vl_documento",     start: 113, end: 125 },
        { col: "dt_emissao",       start: 126, end: 133 },
        { col: "vl_anulacao",      start: 134, end: 146 },
        { col: "nro_sequencial",   start: 386, end: 391, type: "int" },
      ],
    },
    "13": {
      // Fonte de recurso da anulação de OP
      table: "stg_aop_13",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_programa",     start:   3, end:   6 },
        { col: "cod_orgao",        start:   7, end:   8 },
        { col: "cod_unidade",      start:   9, end:  10 },
        { col: "cod_funcao",       start:  11, end:  12 },
        { col: "cod_subfuncao",    start:  13, end:  15 },
        { col: "natureza_acao",    start:  16, end:  16 },
        { col: "nro_proj_ativ",    start:  17, end:  19 },
        { col: "elemento_despesa", start:  20, end:  25 },
        { col: "sub_elemento",     start:  26, end:  27 },
        { col: "dot_orig_p2001",   start:  28, end:  48 },
        { col: "nro_empenho",      start:  49, end:  54 },
        { col: "nro_op",           start:  55, end:  60 },
        { col: "dt_anulacao",      start:  61, end:  68 },
        { col: "nr_anulacao_op",   start:  69, end:  71 },
        { col: "cod_und_financeira",start: 72, end:  73 },
        { col: "banco",            start:  74, end:  76 },
        { col: "agencia",          start:  77, end:  80 },
        { col: "conta_corrente",   start:  81, end:  92 },
        { col: "conta_corrente_dv",start:  93, end:  93 },
        { col: "tipo_conta",       start:  94, end:  95 },
        { col: "nr_documento",     start:  96, end: 110 },
        { col: "cod_fonte_recurso",start: 111, end: 116 },
        { col: "vl_anulacao_fr",   start: 117, end: 129 },
        { col: "nro_sequencial",   start: 386, end: 391, type: "int" },
      ],
    },
    "14": {
      // Retenção da anulação de OP
      table: "stg_aop_14",
      fields: [
        { col: "tipo_registro",        start:   1, end:   2 },
        { col: "cod_programa",         start:   3, end:   6 },
        { col: "cod_orgao",            start:   7, end:   8 },
        { col: "cod_unidade",          start:   9, end:  10 },
        { col: "cod_funcao",           start:  11, end:  12 },
        { col: "cod_subfuncao",        start:  13, end:  15 },
        { col: "natureza_acao",        start:  16, end:  16 },
        { col: "nro_proj_ativ",        start:  17, end:  19 },
        { col: "elemento_despesa",     start:  20, end:  25 },
        { col: "sub_elemento",         start:  26, end:  27 },
        { col: "dot_orig_p2001",       start:  28, end:  48 },
        { col: "nro_empenho",          start:  49, end:  54 },
        { col: "nro_op",               start:  55, end:  60 },
        { col: "dt_anulacao",          start:  61, end:  68 },
        { col: "nr_anulacao_op",       start:  69, end:  71 },
        { col: "tipo_retencao",        start:  72, end:  73 },
        { col: "vl_anulacao_retencao", start:  74, end:  86 },
        { col: "nr_extra_orcamentaria",start:  87, end:  92 },
        { col: "nro_sequencial",       start: 386, end: 391, type: "int" },
      ],
    },
  },

  // =========================================================
  // EXT.txt — Extraorçamentárias
  // 90 chars, nro_sequencial sempre em 85-90 (todos os tipos)
  // Header compartilhado (1-21): tipo_registro, cod_orgao, cod_unidade,
  //   categoria, tipo_lancamento, sub_tipo, desdobra_sub_tipo, nr_extra_orcamentaria
  // =========================================================
  EXT: {
    "10": { // Detalhamento das Extraorçamentárias
      table: "stg_ext_10",
      fields: [
        { col: "tipo_registro",        start:  1, end:  2 },
        { col: "cod_orgao",            start:  3, end:  4 },
        { col: "cod_unidade",          start:  5, end:  6 },
        { col: "categoria",            start:  7, end:  7 },
        { col: "tipo_lancamento",      start:  8, end:  9 },
        { col: "sub_tipo",             start: 10, end: 12 },
        { col: "desdobra_sub_tipo",    start: 13, end: 15 },
        { col: "nr_extra_orcamentaria",start: 16, end: 21 },
        { col: "desc_extra_orc",       start: 22, end: 71 },
        { col: "vl_lancamento",        start: 72, end: 84 },
        { col: "nro_sequencial",       start: 85, end: 90, type: "int" },
      ],
    },
    "11": { // Movimentação Financeira das Extraorçamentárias
      table: "stg_ext_11",
      fields: [
        { col: "tipo_registro",         start:  1, end:  2 },
        { col: "cod_orgao",             start:  3, end:  4 },
        { col: "cod_unidade",           start:  5, end:  6 },
        { col: "categoria",             start:  7, end:  7 },
        { col: "tipo_lancamento",       start:  8, end:  9 },
        { col: "sub_tipo",              start: 10, end: 12 },
        { col: "desdobra_sub_tipo",     start: 13, end: 15 },
        { col: "nr_extra_orcamentaria", start: 16, end: 21 },
        { col: "cod_und_financeira",    start: 22, end: 23 },
        { col: "banco",                 start: 24, end: 26 },
        { col: "agencia",               start: 27, end: 30 },
        { col: "conta_corrente",        start: 31, end: 42 },
        { col: "conta_corrente_dv",     start: 43, end: 43 },
        { col: "tipo_conta",            start: 44, end: 45 },
        { col: "vl_movimentacao",       start: 46, end: 58 },
        { col: "nro_sequencial",        start: 85, end: 90, type: "int" },
      ],
    },
    "12": { // Detalhamento da Fonte de Recursos das Extraorçamentárias
      table: "stg_ext_12",
      fields: [
        { col: "tipo_registro",         start:  1, end:  2 },
        { col: "cod_orgao",             start:  3, end:  4 },
        { col: "cod_unidade",           start:  5, end:  6 },
        { col: "categoria",             start:  7, end:  7 },
        { col: "tipo_lancamento",       start:  8, end:  9 },
        { col: "sub_tipo",              start: 10, end: 12 },
        { col: "desdobra_sub_tipo",     start: 13, end: 15 },
        { col: "nr_extra_orcamentaria", start: 16, end: 21 },
        { col: "cod_und_financeira",    start: 22, end: 23 },
        { col: "banco",                 start: 24, end: 26 },
        { col: "agencia",               start: 27, end: 30 },
        { col: "conta_corrente",        start: 31, end: 42 },
        { col: "conta_corrente_dv",     start: 43, end: 43 },
        { col: "tipo_conta",            start: 44, end: 45 },
        { col: "cod_fonte_recurso",     start: 46, end: 51 },
        { col: "vl_fr",                 start: 52, end: 64 },
        { col: "nro_sequencial",        start: 85, end: 90, type: "int" },
      ],
    },
  },

  // =========================================================
  // AEX.txt — Anulação de Extraorçamentárias
  // 78 chars, nro_sequencial em 73-78
  // Header compartilhado (1-29): tipo_registro, cod_orgao, cod_unidade,
  //   categoria, tipo_lancamento, sub_tipo, desdobra_sub_tipo,
  //   nr_extra_orcamentaria, dt_anulacao
  // =========================================================
  AEX: {
    "10": { // Anulação de Extraorçamentária
      table: "stg_aex_10",
      fields: [
        { col: "tipo_registro",         start:  1, end:  2 },
        { col: "cod_orgao",             start:  3, end:  4 },
        { col: "cod_unidade",           start:  5, end:  6 },
        { col: "categoria",             start:  7, end:  7 },
        { col: "tipo_lancamento",       start:  8, end:  9 },
        { col: "sub_tipo",              start: 10, end: 12 },
        { col: "desdobra_sub_tipo",     start: 13, end: 15 },
        { col: "nr_extra_orcamentaria", start: 16, end: 21 },
        { col: "dt_anulacao",           start: 22, end: 29 },
        { col: "vl_anulacao",           start: 30, end: 42 },
        { col: "nro_sequencial",        start: 73, end: 78, type: "int" },
      ],
    },
    "11": { // Movimentação Financeira da Anulação
      table: "stg_aex_11",
      fields: [
        { col: "tipo_registro",          start:  1, end:  2 },
        { col: "cod_orgao",              start:  3, end:  4 },
        { col: "cod_unidade",            start:  5, end:  6 },
        { col: "categoria",              start:  7, end:  7 },
        { col: "tipo_lancamento",        start:  8, end:  9 },
        { col: "sub_tipo",               start: 10, end: 12 },
        { col: "desdobra_sub_tipo",      start: 13, end: 15 },
        { col: "nr_extra_orcamentaria",  start: 16, end: 21 },
        { col: "dt_anulacao",            start: 22, end: 29 },
        { col: "cod_und_financeira",     start: 30, end: 31 },
        { col: "banco",                  start: 32, end: 34 },
        { col: "agencia",                start: 35, end: 38 },
        { col: "conta_corrente",         start: 39, end: 50 },
        { col: "conta_corrente_dv",      start: 51, end: 51 },
        { col: "tipo_conta",             start: 52, end: 53 },
        { col: "vl_anulacao_movimentacao",start:54, end: 66 },
        { col: "nro_sequencial",         start: 73, end: 78, type: "int" },
      ],
    },
    "12": { // Fonte de Recursos da Anulação
      table: "stg_aex_12",
      fields: [
        { col: "tipo_registro",         start:  1, end:  2 },
        { col: "cod_orgao",             start:  3, end:  4 },
        { col: "cod_unidade",           start:  5, end:  6 },
        { col: "categoria",             start:  7, end:  7 },
        { col: "tipo_lancamento",       start:  8, end:  9 },
        { col: "sub_tipo",              start: 10, end: 12 },
        { col: "desdobra_sub_tipo",     start: 13, end: 15 },
        { col: "nr_extra_orcamentaria", start: 16, end: 21 },
        { col: "dt_anulacao",           start: 22, end: 29 },
        { col: "cod_und_financeira",    start: 30, end: 31 },
        { col: "banco",                 start: 32, end: 34 },
        { col: "agencia",               start: 35, end: 38 },
        { col: "conta_corrente",        start: 39, end: 50 },
        { col: "conta_corrente_dv",     start: 51, end: 51 },
        { col: "tipo_conta",            start: 52, end: 53 },
        { col: "cod_fonte_recurso",     start: 54, end: 59 },
        { col: "vl_anulacao_fr",        start: 60, end: 72 },
        { col: "nro_sequencial",        start: 73, end: 78, type: "int" },
      ],
    },
  },

  // =========================================================
  // RSP.txt — Restos a Pagar
  // =========================================================
  // =========================================================
  // RSP.txt — Restos a Pagar
  // Estrutura diferente: sem cabeçalho classificatório padrão
  // Header compartilhado (1-112): tipo_registro, cod_orgao,
  //   dot_orig_p2001, dot_orig_p2002, nro_empenho, dt_empenho, nome_credor
  // nro_sequencial sempre em 152-157 (157 chars total)
  // =========================================================
  RSP: {
    "10": { // Pagamento
      table: "stg_rsp_10",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_orgao",        start:   3, end:   4 },
        { col: "dot_orig_p2001",   start:   5, end:  25 },
        { col: "dot_orig_p2002",   start:  26, end:  48 },
        { col: "nro_empenho",      start:  49, end:  54 },
        { col: "dt_empenho",       start:  55, end:  62 },
        { col: "nome_credor",      start:  63, end: 112 },
        { col: "vl_original",      start: 113, end: 125 },
        { col: "vl_saldo_ant",     start: 126, end: 138 },
        { col: "vl_baixa_pgto",    start: 139, end: 151 },
        { col: "nro_sequencial",   start: 152, end: 157, type: "int" },
      ],
    },
    "11": { // Cancelamento
      table: "stg_rsp_11",
      fields: [
        { col: "tipo_registro",        start:   1, end:   2 },
        { col: "cod_orgao",            start:   3, end:   4 },
        { col: "dot_orig_p2001",       start:   5, end:  25 },
        { col: "dot_orig_p2002",       start:  26, end:  48 },
        { col: "nro_empenho",          start:  49, end:  54 },
        { col: "dt_empenho",           start:  55, end:  62 },
        { col: "nome_credor",          start:  63, end: 112 },
        { col: "dt_cancelamento",      start: 113, end: 120 },
        { col: "nr_cancelamento",      start: 121, end: 123 },
        { col: "vl_baixa_cancelamento",start: 124, end: 136 },
        { col: "nro_sequencial",       start: 152, end: 157, type: "int" },
      ],
    },
    "12": { // Encampação
      table: "stg_rsp_12",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_orgao",        start:   3, end:   4 },
        { col: "dot_orig_p2001",   start:   5, end:  25 },
        { col: "dot_orig_p2002",   start:  26, end:  48 },
        { col: "nro_empenho",      start:  49, end:  54 },
        { col: "dt_empenho",       start:  55, end:  62 },
        { col: "nome_credor",      start:  63, end: 112 },
        { col: "tipo_encampacao",  start: 113, end: 114 },
        { col: "cod_orgao_destino",start: 115, end: 116 },
        { col: "cod_unidade",      start: 117, end: 118 },
        { col: "vl_encampacao",    start: 119, end: 131 },
        { col: "nro_sequencial",   start: 152, end: 157, type: "int" },
      ],
    },
  },

  // =========================================================
  // CTB.txt — Contas Bancárias (96 chars, nro_seq 91-96)
  // Layout homologado: XLSX + DB dissection 2026-03-20
  // =========================================================
  CTB: {
    // CTB.10: saldos globais da conta bancária
    "10": {
      table: "stg_ctb_10",
      fields: [
        { col: "tipo_registro",     start:  1, end:  2 },
        { col: "cod_orgao",         start:  3, end:  4 },
        { col: "cod_unidade",       start:  5, end:  6 },
        { col: "banco",             start:  7, end:  9 },
        { col: "agencia",           start: 10, end: 13 },
        { col: "conta_corrente",    start: 14, end: 25 },
        { col: "conta_corrente_dv", start: 26, end: 26 },
        { col: "tipo_conta",        start: 27, end: 28 },
        { col: "saldo_inicial",     start: 29, end: 41 },
        { col: "vl_entradas",       start: 42, end: 54 },
        { col: "vl_saidas",         start: 55, end: 67 },
        { col: "saldo_final",       start: 68, end: 80 },
        // brancos 81-90
        { col: "nro_sequencial",    start: 91, end: 96, type: "int" },
      ],
    },
    // CTB.11: saldos por fonte de recurso (saldo_final ocupa 17 chars: 74-90)
    "11": {
      table: "stg_ctb_11",
      fields: [
        { col: "tipo_registro",     start:  1, end:  2 },
        { col: "cod_orgao",         start:  3, end:  4 },
        { col: "cod_unidade",       start:  5, end:  6 },
        { col: "banco",             start:  7, end:  9 },
        { col: "agencia",           start: 10, end: 13 },
        { col: "conta_corrente",    start: 14, end: 25 },
        { col: "conta_corrente_dv", start: 26, end: 26 },
        { col: "tipo_conta",        start: 27, end: 28 },
        { col: "cod_fonte_recurso", start: 29, end: 34 },
        { col: "saldo_inicial",     start: 35, end: 47 },
        { col: "vl_entradas",       start: 48, end: 60 },
        { col: "vl_saidas",         start: 61, end: 73 },
        { col: "saldo_final",       start: 74, end: 90 },  // 17 chars (sem brancos)
        { col: "nro_sequencial",    start: 91, end: 96, type: "int" },
      ],
    },
    // CTB.90: saldo de caixa/banco/vinculado exercício anterior e mês seguinte
    "90": {
      table: "stg_ctb_90",
      fields: [
        { col: "tipo_registro",              start:  1, end:  2 },
        { col: "cod_orgao",                  start:  3, end:  4 },
        { col: "cod_unidade",                start:  5, end:  6 },
        { col: "vl_saldo_exerc_ant_caixa",   start:  7, end: 19 },
        { col: "vl_saldo_exerc_ant_banco",   start: 20, end: 32 },
        { col: "vl_saldo_exerc_ant_vinc",    start: 33, end: 45 },
        { col: "vl_saldo_mes_seg_caixa",     start: 46, end: 58 },
        { col: "vl_saldo_mes_seg_banco",     start: 59, end: 71 },
        { col: "vl_saldo_mes_seg_vinc",      start: 72, end: 84 },
        // brancos 85-90
        { col: "nro_sequencial",             start: 91, end: 96, type: "int" },
      ],
    },
    // CTB.91: saldo de caixa/banco/vinculado por fonte de recurso
    "91": {
      table: "stg_ctb_91",
      fields: [
        { col: "tipo_registro",              start:  1, end:  2 },
        { col: "cod_orgao",                  start:  3, end:  4 },
        { col: "cod_unidade",                start:  5, end:  6 },
        { col: "cod_fonte_recurso",          start:  7, end: 12 },
        { col: "vl_saldo_exerc_ant_caixa",   start: 13, end: 25 },
        { col: "vl_saldo_exerc_ant_banco",   start: 26, end: 38 },
        { col: "vl_saldo_exerc_ant_vinc",    start: 39, end: 51 },
        { col: "vl_saldo_mes_seg_caixa",     start: 52, end: 64 },
        { col: "vl_saldo_mes_seg_banco",     start: 65, end: 77 },
        { col: "vl_saldo_mes_seg_vinc",      start: 78, end: 90 },
        { col: "nro_sequencial",             start: 91, end: 96, type: "int" },
      ],
    },
  },

  // =========================================================
  // TRB.txt — Transferências Bancárias (77 chars, nro_seq 72-77)
  // Layout homologado: XLSX + DB dissection 2026-03-20
  // =========================================================
  TRB: {
    // TRB.10: origem + cod_fonte + valor; destino em branco (48-71)
    "10": {
      table: "stg_trb_10",
      fields: [
        { col: "tipo_registro",     start:  1, end:  2 },
        { col: "cod_orgao",         start:  3, end:  4 },
        { col: "cod_unidade",       start:  5, end:  6 },
        { col: "banco_origem",      start:  7, end:  9 },
        { col: "agencia_origem",    start: 10, end: 13 },
        { col: "conta_origem",      start: 14, end: 25 },
        { col: "conta_origem_dv",   start: 26, end: 26 },
        { col: "tipo_conta_origem", start: 27, end: 28 },
        { col: "cod_fonte_recurso", start: 29, end: 34 },
        { col: "vl_transf_origem",  start: 35, end: 47 },
        // brancos 48-71
        { col: "nro_sequencial",    start: 72, end: 77, type: "int" },
      ],
    },
    // TRB.11: origem + cod_fonte + conta_destino + valor_destino
    "11": {
      table: "stg_trb_11",
      fields: [
        { col: "tipo_registro",     start:  1, end:  2 },
        { col: "cod_orgao",         start:  3, end:  4 },
        { col: "cod_unidade",       start:  5, end:  6 },
        { col: "banco_origem",      start:  7, end:  9 },
        { col: "agencia_origem",    start: 10, end: 13 },
        { col: "conta_origem",      start: 14, end: 25 },
        { col: "conta_origem_dv",   start: 26, end: 26 },
        { col: "tipo_conta_origem", start: 27, end: 28 },
        { col: "cod_fonte_recurso", start: 29, end: 34 },
        { col: "cod_unidade_dest",  start: 35, end: 36 },
        { col: "banco_destino",     start: 37, end: 39 },
        { col: "agencia_destino",   start: 40, end: 43 },
        { col: "conta_destino",     start: 44, end: 55 },
        { col: "conta_destino_dv",  start: 56, end: 56 },
        { col: "tipo_conta_destino",start: 57, end: 58 },
        { col: "vl_transf_destino", start: 59, end: 71 },
        { col: "nro_sequencial",    start: 72, end: 77, type: "int" },
      ],
    },
    "99": {
      table: "stg_trb_99",
      fields: [
        { col: "tipo_registro",  start: 1, end: 2 },
        { col: "nro_sequencial", start: 72, end: 77, type: "int" },
      ],
    },
  },

  // =========================================================
  // TFR.txt — Transferências de Fonte de Recurso (59 chars, nro_seq 54-59)
  // Layout homologado: DB dissection 2026-03-20
  // TFR.10: debit (sem fonte_destino); TFR.11: crédito (tem fonte_destino)
  // =========================================================
  TFR: {
    // TFR.10: saída da fonte de origem (sem fonte_destino)
    "10": {
      table: "stg_tfr_10",
      fields: [
        { col: "tipo_registro",     start:  1, end:  2 },
        { col: "cod_orgao",         start:  3, end:  4 },
        { col: "cod_unidade",       start:  5, end:  6 },
        { col: "banco",             start:  7, end:  9 },
        { col: "agencia",           start: 10, end: 13 },
        { col: "conta_corrente",    start: 14, end: 25 },
        { col: "conta_corrente_dv", start: 26, end: 26 },
        { col: "tipo_conta",        start: 27, end: 28 },
        { col: "fonte_origem",      start: 29, end: 34 },
        { col: "vl_transferencia",  start: 35, end: 47 },
        // brancos 48-53
        { col: "nro_sequencial",    start: 54, end: 59, type: "int" },
      ],
    },
    // TFR.11: entrada na fonte de destino (tem fonte_destino e fonte_origem)
    "11": {
      table: "stg_tfr_11",
      fields: [
        { col: "tipo_registro",     start:  1, end:  2 },
        { col: "cod_orgao",         start:  3, end:  4 },
        { col: "cod_unidade",       start:  5, end:  6 },
        { col: "banco",             start:  7, end:  9 },
        { col: "agencia",           start: 10, end: 13 },
        { col: "conta_corrente",    start: 14, end: 25 },
        { col: "conta_corrente_dv", start: 26, end: 26 },
        { col: "tipo_conta",        start: 27, end: 28 },
        { col: "fonte_origem",      start: 29, end: 34 },
        { col: "fonte_destino",     start: 35, end: 40 },
        { col: "vl_transferencia",  start: 41, end: 53 },
        { col: "nro_sequencial",    start: 54, end: 59, type: "int" },
      ],
    },
    "99": {
      table: "stg_tfr_99",
      fields: [
        { col: "tipo_registro",  start:  1, end:  2 },
        { col: "nro_sequencial", start: 54, end: 59, type: "int" },
      ],
    },
  },

  // =========================================================
  // DFR.txt — Detalhamento de Fonte de Recurso (213 chars, nro_seq 208-213)
  // Layout homologado: XLSX rows 2012-2023 + DB dissection 2026-03-20
  // =========================================================
  DFR: {
    "10": {
      table: "stg_dfr_10",
      fields: [
        { col: "tipo_registro",       start:   1, end:   2 },
        { col: "cod_orgao",           start:   3, end:   4 },
        { col: "cod_det_fr",          start:   5, end:   7 },  // 3 chars, not cod_fonte_recurso
        { col: "descricao",           start:   8, end: 207 },  // 200 chars
        { col: "nro_sequencial",      start: 208, end: 213, type: "int" },
      ],
    },
    "99": {
      table: "stg_dfr_99",
      fields: [
        { col: "tipo_registro",  start:   1, end:   2 },
        // brancos 3-207
        { col: "nro_sequencial", start: 208, end: 213, type: "int" },
      ],
    },
  },

  // =========================================================
  // DIC.txt — Dívida Consolidada (216 chars, nro_seq 211-216)
  // Layout homologado: XLSX rows 2032-2055 + DB dissection 2026-03-20
  // =========================================================
  DIC: {
    "10": {
      table: "stg_dic_10",
      fields: [
        { col: "tipo_registro",     start:   1, end:   2 },
        { col: "cod_orgao",         start:   3, end:   4 },
        { col: "cod_unidade",       start:   5, end:   6 },
        { col: "tp_lancamento",     start:   7, end:   8 },
        { col: "nro_lei_autorizacao",start:  9, end:  16 },
        { col: "dt_lei_autorizacao", start: 17, end:  24 },
        { col: "nome_credor",       start:  25, end: 104 },   // 80 chars
        { col: "tipo_pessoa",       start: 105, end: 105 },
        { col: "cpf_cnpj_credor",   start: 106, end: 119 },  // 14 chars
        { col: "vl_saldo_anterior", start: 120, end: 132 },
        { col: "vl_contratacao",    start: 133, end: 145 },
        { col: "vl_amortizacao",    start: 146, end: 158 },
        { col: "vl_cancelamento",   start: 159, end: 171 },
        { col: "vl_encampacao",     start: 172, end: 184 },
        { col: "vl_atualizacao",    start: 185, end: 197 },
        { col: "vl_saldo_atual",    start: 198, end: 210 },
        { col: "nro_sequencial",    start: 211, end: 216, type: "int" },
      ],
    },
    "99": {
      table: "stg_dic_99",
      fields: [
        { col: "tipo_registro",  start:   1, end:   2 },
        { col: "nro_sequencial", start: 211, end: 216, type: "int" },
      ],
    },
  },

  // =========================================================
  // DCL.txt — Dados Complementares (90 chars, nro_seq 85-90)
  // Sem dados na remessa jan/2026. Posições dos campos internos pendentes.
  // =========================================================
  DCL: {
    "10": {
      table: "stg_dcl_10",
      fields: [
        { col: "tipo_registro",  start:  1, end:  2 },
        { col: "cod_orgao",      start:  3, end:  4 },
        { col: "cod_unidade",    start:  5, end:  6 },
        { col: "tipo_dado",      start:  7, end:  8 },
        { col: "valor",          start:  9, end: 21 },
        { col: "descricao",      start: 22, end: 84 },  // ajustado ao tamanho real
        { col: "nro_sequencial", start: 85, end: 90, type: "int" },
      ],
    },
  },

  // =========================================================
  // PAR.txt — Projeção Atuarial RPPS (62 chars, nro_seq 57-62)
  // exercicio(5-8,4c) + 3 valores monetários 16c cada; sem cod_unidade
  // Sem dados na remessa jan/2026.
  // =========================================================
  PAR: {
    "10": {
      table: "stg_par_10",
      fields: [
        { col: "tipo_registro",              start:  1, end:  2 },
        { col: "cod_orgao",                  start:  3, end:  4 },
        { col: "ano_projecao",               start:  5, end:  8 },  // exercício 4c (sem cod_unidade)
        { col: "vl_receita_previdenciaria",  start:  9, end: 24 },  // 16c
        { col: "vl_despesa_previdenciaria",  start: 25, end: 40 },  // 16c
        { col: "vl_resultado",               start: 41, end: 56 },  // 16c
        { col: "nro_sequencial",             start: 57, end: 62, type: "int" },
      ],
    },
  },

  // =========================================================
  // CVC.txt — Cadastro de Veículos e Combustíveis (262 chars, nro_seq 257-262)
  // codVeiculo(7-16,10c) não placa (7c). Sem dados na remessa jan/2026.
  // =========================================================
  CVC: {
    "10": {
      table: "stg_cvc_10",
      fields: [
        { col: "tipo_registro",  start:   1, end:   2 },
        { col: "cod_orgao",      start:   3, end:   4 },
        { col: "cod_unidade",    start:   5, end:   6 },
        { col: "placa_veiculo",  start:   7, end:  16 },  // codVeiculo 10c (não placa 7c)
        { col: "tipo_veiculo",   start:  17, end:  18 },
        { col: "marca",          start:  19, end:  38 },
        { col: "modelo",         start:  39, end:  58 },
        { col: "ano_fabricacao", start:  59, end:  62 },
        { col: "combustivel",    start:  63, end:  64 },
        { col: "lotacao",        start:  65, end: 114 },
        { col: "km_inicial",     start: 115, end: 121 },
        { col: "km_final",       start: 122, end: 128 },
        { col: "nro_sequencial", start: 257, end: 262, type: "int" },
      ],
    },
    "20": {
      table: "stg_cvc_20",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_orgao",        start:   3, end:   4 },
        { col: "cod_unidade",      start:   5, end:   6 },
        { col: "placa_veiculo",    start:   7, end:  16 },  // codVeiculo 10c
        { col: "km_abastecimento", start:  17, end:  24 },  // odômetro 8c (era dt, estava trocado)
        { col: "tipo_combustivel", start:  25, end:  26 },
        { col: "qtd_litros",       start:  27, end:  33 },  // 7c (não 8 — o 8º era 1º char da data)
        { col: "dt_abastecimento", start:  34, end:  41 },  // data 8c (era km, estava trocado)
        { col: "vl_total",         start:  42, end:  54 },  // 13c
        { col: "nro_empenho",      start:  55, end:  60 },
        { col: "nro_sequencial",   start: 257, end: 262, type: "int" },
      ],
    },
  },

  // =========================================================
  // ECL.txt — Estoque de Combustíveis e Lubrificantes (76 chars, nro_seq 71-76)
  // Sem dados na remessa jan/2026. Posições internas pendentes de verificação.
  // =========================================================
  ECL: {
    "10": {
      table: "stg_ecl_10",
      fields: [
        { col: "tipo_registro",       start:  1, end:  2 },
        { col: "cod_orgao",           start:  3, end:  4 },
        { col: "cod_unidade",         start:  5, end:  6 },
        { col: "tipo_combustivel",    start:  7, end:  8 },
        { col: "qtd_estoque_anterior",start:  9, end: 16 },
        { col: "qtd_entrada",         start: 17, end: 24 },
        { col: "qtd_saida",           start: 25, end: 32 },
        { col: "qtd_estoque_atual",   start: 33, end: 40 },
        // 41-70: campos pendentes (subTipoCombustivelLub + qtds extras)
        { col: "nro_sequencial",      start: 71, end: 76, type: "int" },
      ],
    },
    "20": {
      table: "stg_ecl_20",
      fields: [
        { col: "tipo_registro",    start:  1, end:  2 },
        { col: "cod_orgao",        start:  3, end:  4 },
        { col: "cod_unidade",      start:  5, end:  6 },
        { col: "tipo_combustivel", start:  7, end:  8 },
        { col: "dt_entrada",       start:  9, end: 16 },
        { col: "qtd_litros",       start: 17, end: 24 },
        { col: "vl_unitario",      start: 25, end: 37 },
        { col: "vl_total",         start: 38, end: 50 },
        { col: "nro_nota_fiscal",  start: 51, end: 65 },
        // 66-70: campo pendente
        { col: "nro_sequencial",   start: 71, end: 76, type: "int" },
      ],
    },
  },

  // =========================================================
  // AAL.txt — Alteração de Alocação (287 chars, nro_seq 282-287)
  // codOrgaoOrigem/Destino sem cod_programa. Sem dados jan/2026.
  // =========================================================
  AAL: {
    "10": {
      table: "stg_aal_10",
      fields: [
        { col: "tipo_registro",             start:   1, end:   2 },
        { col: "cod_orgao",                 start:   3, end:   4 },
        { col: "cod_unidade",               start:   5, end:   6 },
        // cod_orgao_origem/destino e demais campos (posições pendentes)
        { col: "cod_fonte_recurso_origem",  start:  28, end:  33 },
        { col: "cod_fonte_recurso_destino", start:  34, end:  39 },
        { col: "vl_alocacao",               start:  40, end:  52 },
        { col: "nro_sequencial",            start: 282, end: 287, type: "int" },
      ],
    },
  },

  // =========================================================
  // CON.txt — Contratos
  // =========================================================
  CON: {
    "10": {
      table: "stg_con_10",
      fields: [
        { col: "tipo_registro",       start:   1, end:   2 },
        { col: "cod_orgao",           start:   3, end:   4 },
        { col: "cod_unidade",         start:   5, end:   6 },
        { col: "nro_contrato",        start:   7, end:  26 },
        { col: "ano_contrato",        start:  27, end:  30 },
        { col: "tipo_ajuste",         start:  31, end:  31 },
        { col: "objeto",              start:  32, end: 531 },
        { col: "cpf_cnpj_contratado", start: 532, end: 545 },
        { col: "tipo_pessoa",         start: 546, end: 546 },
        { col: "nome_contratado",     start: 547, end: 646 },
        { col: "dt_assinatura",       start: 647, end: 654 },
        { col: "dt_inicio_vigencia",  start: 655, end: 662 },
        { col: "dt_fim_vigencia",     start: 663, end: 670 },
        { col: "vl_contrato",         start: 671, end: 683 },
        { col: "id_colare",           start: 684, end: 698 },
        { col: "nro_sequencial",      start: 934, end: 939, type: "int" },
      ],
    },
    "11": {
      table: "stg_con_11",
      fields: [
        { col: "tipo_registro",          start:   1, end:   2 },
        { col: "cod_orgao",              start:   3, end:   4 },
        { col: "cod_unidade",            start:   5, end:   6 },
        { col: "nro_contrato",           start:   7, end:  26 },
        { col: "ano_contrato",           start:  27, end:  30 },
        { col: "nro_aditivo",            start:  31, end:  34 },
        { col: "dt_aditivo",             start:  35, end:  42 },
        { col: "objeto_aditivo",         start:  43, end: 242 },
        { col: "vl_aditivo",             start: 243, end: 255 },
        { col: "dt_fim_vigencia_aditivo",start: 256, end: 263 },
        { col: "nro_sequencial",         start: 934, end: 939, type: "int" },
      ],
    },
    "20": {
      table: "stg_con_20",
      fields: [
        { col: "tipo_registro",    start:  1, end:  2 },
        { col: "cod_orgao",        start:  3, end:  4 },
        { col: "cod_unidade",      start:  5, end:  6 },
        { col: "nro_contrato",     start:  7, end: 26 },
        { col: "ano_contrato",     start: 27, end: 30 },
        { col: "nro_empenho",      start: 31, end: 36 },
        { col: "exercicio_empenho",start: 37, end: 40 },
        { col: "nro_sequencial",   start: 934, end: 939, type: "int" },
      ],
    },
    "21": {
      table: "stg_con_21",
      fields: [
        { col: "tipo_registro",      start:  1, end:  2 },
        { col: "cod_orgao",          start:  3, end:  4 },
        { col: "cod_unidade",        start:  5, end:  6 },
        { col: "nro_contrato",       start:  7, end: 26 },
        { col: "ano_contrato",       start: 27, end: 30 },
        { col: "nro_proc_licitacao", start: 31, end: 38 },
        { col: "ano_proc_licitacao", start: 39, end: 42 },
        { col: "nro_sequencial",     start: 934, end: 939, type: "int" },
      ],
    },
    "22": {
      table: "stg_con_22",
      fields: [
        { col: "tipo_registro",  start:  1, end:  2 },
        { col: "cod_orgao",      start:  3, end:  4 },
        { col: "cod_unidade",    start:  5, end:  6 },
        { col: "nro_contrato",   start:  7, end: 26 },
        { col: "ano_contrato",   start: 27, end: 30 },
        { col: "cpf_fiscal",     start: 31, end: 41 },
        { col: "nome_fiscal",    start: 42, end: 91 },
        { col: "nro_sequencial", start: 934, end: 939, type: "int" },
      ],
    },
    "23": {
      table: "stg_con_23",
      fields: [
        { col: "tipo_registro",      start:  1, end:  2 },
        { col: "cod_orgao",          start:  3, end:  4 },
        { col: "cod_unidade",        start:  5, end:  6 },
        { col: "nro_contrato",       start:  7, end: 26 },
        { col: "ano_contrato",       start: 27, end: 30 },
        { col: "cpf_cnpj_garantidor",start: 31, end: 44 },
        { col: "tipo_garantia",      start: 45, end: 46 },
        { col: "vl_garantia",        start: 47, end: 59 },
        { col: "nro_sequencial",     start: 934, end: 939, type: "int" },
      ],
    },
  },

  // =========================================================
  // ISI.txt — Identificação do Sistema de Informática (638 chars, nro_seq 633-638)
  // Layout homologado via DB dissection 2026-03-20
  // cpfCnpjProprietario(3-16,14c) tipoPessoa(17) nomeRazaoSocial(18-67,50c)
  // logra(118-167,50c) setor(168-187,20c) cidade(188-207,20c)
  // uf(208-209) cep(210-217) tel(218-227) email(228-307,80c)
  // cpfRespTecnico(308-318,11c) nomeResp(319-368,50c) emailResp(369-448,80c)
  // nomeSistema(449-498,50c) versaoSistema(519-568,50c) nro_seq(633-638)
  // =========================================================
  ISI: {
    "10": {
      table: "stg_isi_10",
      fields: [
        { col: "tipo_registro",         start:   1, end:   2 },
        { col: "cpf_cnpj_proprietario", start:   3, end:  16 },  // 14c CNPJ/CPF
        { col: "tipo_pessoa",           start:  17, end:  17 },  // 1=PF, 2=PJ
        { col: "nome_razao_social",     start:  18, end:  67 },  // 50c
        // 68-117: campo sem dados nesta remessa (50c)
        { col: "logra_proprietario",    start: 118, end: 167 },  // 50c endereço
        { col: "setor_logra",           start: 168, end: 187 },  // 20c
        { col: "cidade_logra",          start: 188, end: 207 },  // 20c
        { col: "uf",                    start: 208, end: 209 },  // 2c
        { col: "cep",                   start: 210, end: 217 },  // 8c
        { col: "telefone",              start: 218, end: 227 },  // 10c
        { col: "email_proprietario",    start: 228, end: 307 },  // 80c
        { col: "cpf_resp_tecnico",      start: 308, end: 318 },  // 11c
        { col: "nome_resp_tecnico",     start: 319, end: 368 },  // 50c
        { col: "email_resp_tecnico",    start: 369, end: 448 },  // 80c
        { col: "nome_sistema",          start: 449, end: 498 },  // 50c nome comercial
        { col: "versao_sistema",        start: 519, end: 568 },  // 50c
        // 569-628: url_portal_transparencia (60c) - blank nesta remessa
        // 629-632: flags possuiPortalTransparencia + possuiSistemaIntegrado
        { col: "nro_sequencial",        start: 633, end: 638, type: "int" },
      ],
    },
  },

  // =========================================================
  // DMR.txt — Decreto de Abertura de Crédito (35 chars, nro_seq 30-35)
  // Sem cod_unidade. Sem dados na remessa jan/2026. Posições internas pendentes.
  // =========================================================
  DMR: {
    "10": {
      table: "stg_dmr_10",
      fields: [
        { col: "tipo_registro",  start:  1, end:  2 },
        { col: "cod_orgao",      start:  3, end:  4 },
        { col: "nro_decreto",    start:  5, end: 14 },
        { col: "dt_decreto",     start: 15, end: 22 },
        // brancos 23-29
        { col: "nro_sequencial", start: 30, end: 35, type: "int" },
      ],
    },
  },

  // =========================================================
  // ABL.txt — Abertura de Licitação
  // =========================================================
  ABL: {
    "10": {
      table: "stg_abl_10",
      fields: [
        { col: "tipo_registro",      start:   1, end:   2 },
        { col: "cod_orgao",          start:   3, end:   4 },
        { col: "cod_unidade",        start:   5, end:   6 },
        { col: "nro_proc_licitacao", start:   7, end:  14 },
        { col: "ano_proc_licitacao", start:  15, end:  18 },
        { col: "modalidade",         start:  19, end:  20 },
        { col: "tipo_licitacao",     start:  21, end:  22 },
        { col: "objeto",             start:  23, end: 522 },
        { col: "dt_abertura",        start: 523, end: 530 },
        { col: "vl_estimado",        start: 531, end: 543 },
        { col: "nro_sequencial",     start: 1029, end: 1034, type: "int" },
      ],
    },
    "11": {
      table: "stg_abl_11",
      fields: [
        { col: "tipo_registro",         start:   1, end:   2 },
        { col: "cod_orgao",             start:   3, end:   4 },
        { col: "cod_unidade",           start:   5, end:   6 },
        { col: "nro_proc_licitacao",    start:   7, end:  14 },
        { col: "ano_proc_licitacao",    start:  15, end:  18 },
        { col: "nro_item",              start:  19, end:  22 },
        { col: "desc_item",             start:  23, end: 222 },
        { col: "unidade_item",          start: 223, end: 232 },
        { col: "qtd_item",              start: 233, end: 242 },
        { col: "vl_unitario_estimado",  start: 243, end: 255 },
        { col: "nro_sequencial",        start: 1029, end: 1034, type: "int" },
      ],
    },
    "12": {
      table: "stg_abl_12",
      fields: [
        { col: "tipo_registro",      start:   1, end:   2 },
        { col: "cod_orgao",          start:   3, end:   4 },
        { col: "cod_unidade",        start:   5, end:   6 },
        { col: "nro_proc_licitacao", start:   7, end:  14 },
        { col: "ano_proc_licitacao", start:  15, end:  18 },
        { col: "cpf_responsavel",    start:  19, end:  29 },
        { col: "nome_responsavel",   start:  30, end:  79 },
        { col: "funcao",             start:  80, end: 109 },
        { col: "nro_sequencial",     start: 1029, end: 1034, type: "int" },
      ],
    },
    "13": {
      table: "stg_abl_13",
      fields: [
        { col: "tipo_registro",      start:  1, end:  2 },
        { col: "cod_orgao",          start:  3, end:  4 },
        { col: "cod_unidade",        start:  5, end:  6 },
        { col: "nro_proc_licitacao", start:  7, end: 14 },
        { col: "ano_proc_licitacao", start: 15, end: 18 },
        { col: "elemento_despesa",   start: 19, end: 24 },
        { col: "nro_sequencial",     start: 1029, end: 1034, type: "int" },
      ],
    },
  },

  // =========================================================
  // DSI.txt — Dispensa/Inexigibilidade
  // =========================================================
  DSI: {
    "10": {
      table: "stg_dsi_10",
      fields: [
        { col: "tipo_registro",  start:   1, end:   2 },
        { col: "cod_orgao",      start:   3, end:   4 },
        { col: "cod_unidade",    start:   5, end:   6 },
        { col: "nro_processo",   start:   7, end:  14 },
        { col: "ano_processo",   start:  15, end:  18 },
        { col: "tipo_processo",  start:  19, end:  20 },
        { col: "objeto",         start:  21, end: 520 },
        { col: "vl_estimado",    start: 521, end: 533 },
        { col: "dt_ratificacao", start: 534, end: 541 },
        { col: "fundamentacao",  start: 542, end: 741 },
        { col: "nro_sequencial", start: 1041, end: 1046, type: "int" },
      ],
    },
    "11": {
      table: "stg_dsi_11",
      fields: [
        { col: "tipo_registro",  start:   1, end:   2 },
        { col: "cod_orgao",      start:   3, end:   4 },
        { col: "cod_unidade",    start:   5, end:   6 },
        { col: "nro_processo",   start:   7, end:  14 },
        { col: "ano_processo",   start:  15, end:  18 },
        { col: "nro_item",       start:  19, end:  22 },
        { col: "desc_item",      start:  23, end: 222 },
        { col: "unidade_item",   start: 223, end: 232 },
        { col: "qtd_item",       start: 233, end: 242 },
        { col: "vl_unitario",    start: 243, end: 255 },
        { col: "nro_sequencial", start: 1041, end: 1046, type: "int" },
      ],
    },
    "12": {
      table: "stg_dsi_12",
      fields: [
        { col: "tipo_registro",      start:  1, end:  2 },
        { col: "cod_orgao",          start:  3, end:  4 },
        { col: "cod_unidade",        start:  5, end:  6 },
        { col: "nro_processo",       start:  7, end: 14 },
        { col: "ano_processo",       start: 15, end: 18 },
        { col: "cpf_cnpj_fornecedor",start: 19, end: 32 },
        { col: "tipo_pessoa",        start: 33, end: 33 },
        { col: "nome_fornecedor",    start: 34, end: 83 },
        { col: "nro_sequencial",     start: 1041, end: 1046, type: "int" },
      ],
    },
    "13": {
      table: "stg_dsi_13",
      fields: [
        { col: "tipo_registro",    start:   1, end:   2 },
        { col: "cod_orgao",        start:   3, end:   4 },
        { col: "cod_unidade",      start:   5, end:   6 },
        { col: "nro_processo",     start:   7, end:  14 },
        { col: "ano_processo",     start:  15, end:  18 },
        { col: "cpf_responsavel",  start:  19, end:  29 },
        { col: "nome_responsavel", start:  30, end:  79 },
        { col: "funcao",           start:  80, end: 109 },
        { col: "nro_sequencial",   start: 1041, end: 1046, type: "int" },
      ],
    },
    "14": {
      table: "stg_dsi_14",
      fields: [
        { col: "tipo_registro",    start:  1, end:  2 },
        { col: "cod_orgao",        start:  3, end:  4 },
        { col: "cod_unidade",      start:  5, end:  6 },
        { col: "nro_processo",     start:  7, end: 14 },
        { col: "ano_processo",     start: 15, end: 18 },
        { col: "elemento_despesa", start: 19, end: 24 },
        { col: "nro_sequencial",   start: 1041, end: 1046, type: "int" },
      ],
    },
    "15": {
      table: "stg_dsi_15",
      fields: [
        { col: "tipo_registro",       start:  1, end:  2 },
        { col: "cod_orgao",           start:  3, end:  4 },
        { col: "cod_unidade",         start:  5, end:  6 },
        { col: "nro_processo",        start:  7, end: 14 },
        { col: "ano_processo",        start: 15, end: 18 },
        { col: "nro_item",            start: 19, end: 22 },
        { col: "cpf_cnpj_fornecedor", start: 23, end: 36 },
        { col: "qtd_item",            start: 37, end: 46 },
        { col: "vl_unitario",         start: 47, end: 59 },
        { col: "vl_total",            start: 60, end: 72 },
        { col: "nro_sequencial",      start: 1041, end: 1046, type: "int" },
      ],
    },
  },

  // =========================================================
  // RPL.txt — Resultado Preliminar de Licitação
  // =========================================================
  RPL: {
    "10": {
      table: "stg_rpl_10",
      fields: [
        { col: "tipo_registro",      start:  1, end:  2 },
        { col: "cod_orgao",          start:  3, end:  4 },
        { col: "cod_unidade",        start:  5, end:  6 },
        { col: "nro_proc_licitacao", start:  7, end: 14 },
        { col: "ano_proc_licitacao", start: 15, end: 18 },
        { col: "situacao",           start: 19, end: 20 },
        { col: "dt_resultado",       start: 21, end: 28 },
        { col: "nro_sequencial",     start: 392, end: 397, type: "int" },
      ],
    },
  },

  // =========================================================
  // HBL.txt — Habilitação de Licitação
  // =========================================================
  HBL: {
    "10": {
      table: "stg_hbl_10",
      fields: [
        { col: "tipo_registro",       start:  1, end:  2 },
        { col: "cod_orgao",           start:  3, end:  4 },
        { col: "cod_unidade",         start:  5, end:  6 },
        { col: "nro_proc_licitacao",  start:  7, end: 14 },
        { col: "ano_proc_licitacao",  start: 15, end: 18 },
        { col: "cpf_cnpj_licitante",  start: 19, end: 32 },
        { col: "tipo_pessoa",         start: 33, end: 33 },
        { col: "nome_licitante",      start: 34, end: 83 },
        { col: "situacao_habilitacao",start: 84, end: 85 },
        { col: "nro_sequencial",      start: 924, end: 929, type: "int" },
      ],
    },
    "20": {
      table: "stg_hbl_20",
      fields: [
        { col: "tipo_registro",      start:  1, end:  2 },
        { col: "cod_orgao",          start:  3, end:  4 },
        { col: "cod_unidade",        start:  5, end:  6 },
        { col: "nro_proc_licitacao", start:  7, end: 14 },
        { col: "ano_proc_licitacao", start: 15, end: 18 },
        { col: "cpf_cnpj_licitante", start: 19, end: 32 },
        { col: "nro_item",           start: 33, end: 36 },
        { col: "vl_proposta",        start: 37, end: 49 },
        { col: "classificacao",      start: 50, end: 52 },
        { col: "nro_sequencial",     start: 924, end: 929, type: "int" },
      ],
    },
  },

  // =========================================================
  // JGL.txt — Julgamento de Licitação
  // =========================================================
  JGL: {
    "10": {
      table: "stg_jgl_10",
      fields: [
        { col: "tipo_registro",      start:  1, end:  2 },
        { col: "cod_orgao",          start:  3, end:  4 },
        { col: "cod_unidade",        start:  5, end:  6 },
        { col: "nro_proc_licitacao", start:  7, end: 14 },
        { col: "ano_proc_licitacao", start: 15, end: 18 },
        { col: "nro_item",           start: 19, end: 22 },
        { col: "cpf_cnpj_vencedor",  start: 23, end: 36 },
        { col: "vl_unitario_vencedor",start:37, end: 49 },
        { col: "qtd_adjudicada",     start: 50, end: 59 },
        { col: "nro_sequencial",     start: 324, end: 329, type: "int" },
      ],
    },
    "30": {
      table: "stg_jgl_30",
      fields: [
        { col: "tipo_registro",      start:  1, end:  2 },
        { col: "cod_orgao",          start:  3, end:  4 },
        { col: "cod_unidade",        start:  5, end:  6 },
        { col: "nro_proc_licitacao", start:  7, end: 14 },
        { col: "ano_proc_licitacao", start: 15, end: 18 },
        { col: "dt_adjudicacao",     start: 19, end: 26 },
        { col: "nro_sequencial",     start: 324, end: 329, type: "int" },
      ],
    },
  },

  // =========================================================
  // HML.txt — Homologação de Licitação
  // =========================================================
  HML: {
    "10": {
      table: "stg_hml_10",
      fields: [
        { col: "tipo_registro",      start:  1, end:  2 },
        { col: "cod_orgao",          start:  3, end:  4 },
        { col: "cod_unidade",        start:  5, end:  6 },
        { col: "nro_proc_licitacao", start:  7, end: 14 },
        { col: "ano_proc_licitacao", start: 15, end: 18 },
        { col: "dt_homologacao",     start: 19, end: 26 },
        { col: "nro_sequencial",     start: 324, end: 329, type: "int" },
      ],
    },
    "20": {
      table: "stg_hml_20",
      fields: [
        { col: "tipo_registro",         start:  1, end:  2 },
        { col: "cod_orgao",             start:  3, end:  4 },
        { col: "cod_unidade",           start:  5, end:  6 },
        { col: "nro_proc_licitacao",    start:  7, end: 14 },
        { col: "ano_proc_licitacao",    start: 15, end: 18 },
        { col: "nro_item",              start: 19, end: 22 },
        { col: "cpf_cnpj_vencedor",     start: 23, end: 36 },
        { col: "vl_unitario_homologado",start: 37, end: 49 },
        { col: "qtd_homologada",        start: 50, end: 59 },
        { col: "nro_sequencial",        start: 324, end: 329, type: "int" },
      ],
    },
    "30": {
      table: "stg_hml_30",
      fields: [
        { col: "tipo_registro",           start:  1, end:  2 },
        { col: "cod_orgao",               start:  3, end:  4 },
        { col: "cod_unidade",             start:  5, end:  6 },
        { col: "nro_proc_licitacao",      start:  7, end: 14 },
        { col: "ano_proc_licitacao",      start: 15, end: 18 },
        { col: "cpf_cnpj_vencedor_global",start: 19, end: 32 },
        { col: "vl_total_homologado",     start: 33, end: 45 },
        { col: "nro_sequencial",          start: 324, end: 329, type: "int" },
      ],
    },
  },

  // =========================================================
  // ARP.txt — Ata de Registro de Preços
  // =========================================================
  ARP: {
    "10": {
      table: "stg_arp_10",
      fields: [
        { col: "tipo_registro",      start:  1, end:  2 },
        { col: "cod_orgao",          start:  3, end:  4 },
        { col: "cod_unidade",        start:  5, end:  6 },
        { col: "nro_proc_licitacao", start:  7, end: 14 },
        { col: "ano_proc_licitacao", start: 15, end: 18 },
        { col: "nro_ata",            start: 19, end: 24 },
        { col: "ano_ata",            start: 25, end: 28 },
        { col: "dt_assinatura",      start: 29, end: 36 },
        { col: "dt_vigencia",        start: 37, end: 44 },
        { col: "vl_total_ata",       start: 45, end: 57 },
        { col: "nro_sequencial",     start: 673, end: 678, type: "int" },
      ],
    },
    "12": {
      table: "stg_arp_12",
      fields: [
        { col: "tipo_registro",       start:  1, end:  2 },
        { col: "cod_orgao",           start:  3, end:  4 },
        { col: "cod_unidade",         start:  5, end:  6 },
        { col: "nro_proc_licitacao",  start:  7, end: 14 },
        { col: "ano_proc_licitacao",  start: 15, end: 18 },
        { col: "nro_ata",             start: 19, end: 24 },
        { col: "ano_ata",             start: 25, end: 28 },
        { col: "cpf_cnpj_fornecedor", start: 29, end: 42 },
        { col: "tipo_pessoa",         start: 43, end: 43 },
        { col: "nome_fornecedor",     start: 44, end: 93 },
        { col: "nro_sequencial",      start: 673, end: 678, type: "int" },
      ],
    },
    "20": {
      table: "stg_arp_20",
      fields: [
        { col: "tipo_registro",       start:   1, end:   2 },
        { col: "cod_orgao",           start:   3, end:   4 },
        { col: "cod_unidade",         start:   5, end:   6 },
        { col: "nro_proc_licitacao",  start:   7, end:  14 },
        { col: "ano_proc_licitacao",  start:  15, end:  18 },
        { col: "nro_ata",             start:  19, end:  24 },
        { col: "ano_ata",             start:  25, end:  28 },
        { col: "cpf_cnpj_fornecedor", start:  29, end:  42 },
        { col: "nro_item",            start:  43, end:  46 },
        { col: "desc_item",           start:  47, end: 246 },
        { col: "unidade_item",        start: 247, end: 256 },
        { col: "qtd_item",            start: 257, end: 266 },
        { col: "vl_unitario",         start: 267, end: 279 },
        { col: "nro_sequencial",      start: 673, end: 678, type: "int" },
      ],
    },
  },
};
