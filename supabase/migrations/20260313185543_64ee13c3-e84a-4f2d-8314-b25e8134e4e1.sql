
-- Tabela de municípios do TCM-GO
CREATE TABLE public.tcmgo_municipios (
  id            INTEGER PRIMARY KEY,
  descricao     TEXT NOT NULL,
  cnpj          TEXT,
  regiao        TEXT,
  importado_em  TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tcmgo_municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura tcmgo_municipios" ON public.tcmgo_municipios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inserção tcmgo_municipios" ON public.tcmgo_municipios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Atualização tcmgo_municipios" ON public.tcmgo_municipios
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Trigger para atualizado_em
CREATE TRIGGER trg_tcmgo_municipios_atualizado
  BEFORE UPDATE ON public.tcmgo_municipios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de log de sincronização
CREATE TABLE public.tcmgo_sync_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id      UUID REFERENCES public.usuarios(id),
  iniciado_em     TIMESTAMPTZ DEFAULT NOW(),
  finalizado_em   TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'em_andamento',
  total_registros INTEGER DEFAULT 0,
  mensagem_erro   TEXT
);

ALTER TABLE public.tcmgo_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura tcmgo_sync_log" ON public.tcmgo_sync_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inserção tcmgo_sync_log" ON public.tcmgo_sync_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Atualização tcmgo_sync_log" ON public.tcmgo_sync_log
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_tcmgo_sync_status()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('em_andamento', 'sucesso', 'erro') THEN
    RAISE EXCEPTION 'Status inválido: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_tcmgo_sync_status
  BEFORE INSERT OR UPDATE ON public.tcmgo_sync_log
  FOR EACH ROW EXECUTE FUNCTION public.validate_tcmgo_sync_status();
