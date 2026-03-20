-- =============================================================
-- TCM-GO: Correções nas tabelas dom_*
-- Adiciona código '00' (Não se aplica) em dom_fundamentacao_legal
-- que é enviado pelo SIAFIC em empenhos com licitação normal.
-- =============================================================

INSERT INTO dom_fundamentacao_legal (codigo, descricao) VALUES
  ('00', 'Não se aplica / Licitação normal'),
  ('80', 'Lei 14.133/2021 – Art. 75 – Dispensa de licitação (nova lei)')
ON CONFLICT (codigo) DO NOTHING;

-- CVC: placa_veiculo é na verdade codVeiculo (10 chars), não placa (7 chars)
ALTER TABLE stg_cvc_10 ALTER COLUMN placa_veiculo TYPE VARCHAR(15);
ALTER TABLE stg_cvc_20 ALTER COLUMN placa_veiculo TYPE VARCHAR(15);
ALTER TABLE fato_veiculo     ALTER COLUMN placa_veiculo TYPE VARCHAR(15);
ALTER TABLE fato_veiculo_uso ALTER COLUMN placa_veiculo TYPE VARCHAR(15);
