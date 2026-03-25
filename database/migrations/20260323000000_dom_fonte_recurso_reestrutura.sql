-- Reestrutura dom_fonte_recurso: substitui colunas antigas (exercicio, codigo,
-- descricao, codigo_stn, descricao_stn) pelas colunas do domínio TCM-GO.

DROP TABLE IF EXISTS dom_fonte_recurso;

CREATE TABLE dom_fonte_recurso (
    id                      BIGSERIAL       PRIMARY KEY,
    fonte_stn               INTEGER         NOT NULL,
    descricao_fonte_tcm     VARCHAR(500)    NOT NULL,
    esp_fonte_tcm           INTEGER,
    det_fonte_tcm           INTEGER,
    fonte_tcm               INTEGER,
    especificacao_fonte_tcm VARCHAR(1000),
    ativo                   BOOLEAN         NOT NULL DEFAULT TRUE,
    criado_em               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
