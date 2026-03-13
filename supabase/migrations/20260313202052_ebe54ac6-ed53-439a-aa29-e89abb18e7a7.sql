
-- Tabela de status de balancetes
CREATE TABLE public.tcmgo_balancetes_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  municipio_tcmgo_id INTEGER NOT NULL REFERENCES public.tcmgo_municipios(id),
  codigo_orgao TEXT NOT NULL,
  descricao_orgao TEXT,
  mes_referencia INTEGER NOT NULL,
  ano_referencia INTEGER NOT NULL,
  enviado BOOLEAN NOT NULL DEFAULT FALSE,
  numero_recibo TEXT,
  data_envio TIMESTAMPTZ,
  cnpj_municipio TEXT,
  nome_municipio TEXT,
  verificado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cliente_id, codigo_orgao, mes_referencia, ano_referencia)
);

-- Trigger para validar mes_referencia (1-12) ao invés de CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_mes_referencia()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.mes_referencia < 1 OR NEW.mes_referencia > 12 THEN
    RAISE EXCEPTION 'mes_referencia deve estar entre 1 e 12, recebido: %', NEW.mes_referencia;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_mes_referencia
BEFORE INSERT OR UPDATE ON public.tcmgo_balancetes_status
FOR EACH ROW EXECUTE FUNCTION public.validate_mes_referencia();

-- Índices para performance
CREATE INDEX idx_balancetes_cliente ON public.tcmgo_balancetes_status(cliente_id);
CREATE INDEX idx_balancetes_periodo ON public.tcmgo_balancetes_status(ano_referencia, mes_referencia);
CREATE INDEX idx_balancetes_enviado ON public.tcmgo_balancetes_status(enviado);

-- RLS
ALTER TABLE public.tcmgo_balancetes_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura tcmgo_balancetes_status"
ON public.tcmgo_balancetes_status FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Inserção tcmgo_balancetes_status"
ON public.tcmgo_balancetes_status FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Atualização tcmgo_balancetes_status"
ON public.tcmgo_balancetes_status FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
