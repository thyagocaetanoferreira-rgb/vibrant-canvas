-- Reestrutura dom_natureza_receita: substitui colunas antigas (exercicio, codigo, descricao)
-- pelas colunas do domínio TCM-GO de natureza de receita.

DROP TABLE IF EXISTS dom_natureza_receita;

CREATE TABLE dom_natureza_receita (
    id                    BIGSERIAL     PRIMARY KEY,
    c                     SMALLINT,
    o                     SMALLINT,
    e                     SMALLINT,
    d1                    SMALLINT,
    dd2                   SMALLINT,
    d3                    SMALLINT,
    t                     SMALLINT,
    nr                    VARCHAR(20),
    especificacao         VARCHAR(500),
    portaria              VARCHAR(200),
    descricao             TEXT,
    norma_correspondente  VARCHAR(500),
    status                VARCHAR(100),
    ativo                 BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
