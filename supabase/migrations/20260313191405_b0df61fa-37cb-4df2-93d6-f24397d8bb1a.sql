
-- Table for TCM-GO órgãos
CREATE TABLE public.tcmgo_orgaos (
  id                SERIAL PRIMARY KEY,
  codigo_orgao      TEXT NOT NULL,
  tipo_orgao        TEXT,
  descricao_orgao   TEXT NOT NULL,
  ativo             BOOLEAN DEFAULT TRUE,
  municipio_tcmgo_id INTEGER NOT NULL REFERENCES public.tcmgo_municipios(id),
  importado_em      TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (codigo_orgao, municipio_tcmgo_id)
);

-- RLS
ALTER TABLE public.tcmgo_orgaos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura tcmgo_orgaos" ON public.tcmgo_orgaos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inserção tcmgo_orgaos" ON public.tcmgo_orgaos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Atualização tcmgo_orgaos" ON public.tcmgo_orgaos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER trg_tcmgo_orgaos_atualizado
  BEFORE UPDATE ON public.tcmgo_orgaos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add tipo column to sync log
ALTER TABLE public.tcmgo_sync_log
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'municipios';
