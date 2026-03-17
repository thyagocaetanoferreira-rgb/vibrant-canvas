
CREATE TABLE public.tcmgo_ppaloa_status (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id          UUID NOT NULL REFERENCES clientes(id),
  municipio_tcmgo_id  INTEGER NOT NULL REFERENCES tcmgo_municipios(id),
  nome_municipio      TEXT,
  ano_referencia      INTEGER NOT NULL,
  enviado             BOOLEAN NOT NULL DEFAULT FALSE,
  data_envio          TIMESTAMPTZ,
  numero_recibo       TEXT,
  reenvios            JSONB DEFAULT '[]'::jsonb,
  total_reenvios      INTEGER DEFAULT 0,
  ultimo_reenvio_em   TIMESTAMPTZ,
  verificado_em       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cliente_id, ano_referencia)
);

CREATE INDEX idx_ppaloa_cliente   ON public.tcmgo_ppaloa_status(cliente_id);
CREATE INDEX idx_ppaloa_ano       ON public.tcmgo_ppaloa_status(ano_referencia);
CREATE INDEX idx_ppaloa_enviado   ON public.tcmgo_ppaloa_status(enviado);

ALTER TABLE public.tcmgo_ppaloa_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura tcmgo_ppaloa_status" ON public.tcmgo_ppaloa_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserção tcmgo_ppaloa_status" ON public.tcmgo_ppaloa_status FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Atualização tcmgo_ppaloa_status" ON public.tcmgo_ppaloa_status FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
