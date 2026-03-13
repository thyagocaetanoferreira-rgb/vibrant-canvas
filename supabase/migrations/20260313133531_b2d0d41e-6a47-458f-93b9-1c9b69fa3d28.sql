
-- Table to store consolidated financial data from Google Sheets
CREATE TABLE public.municipios_financeiro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio TEXT NOT NULL,
  ibge TEXT,
  mes_referencia TEXT NOT NULL,
  receita_prevista_ano NUMERIC,
  receita_prevista_mes NUMERIC,
  receita_realizada NUMERIC,
  despesa_fixada NUMERIC,
  despesa_empenhada_fonte1 NUMERIC,
  despesa_empenhada_fonte2 NUMERIC,
  despesa_liquidada NUMERIC,
  despesa_paga NUMERIC,
  caixa NUMERIC,
  despesa_nao_processada NUMERIC,
  despesa_processada NUMERIC,
  consignacoes_tesouraria NUMERIC,
  resto_nao_processado NUMERIC,
  resto_processado NUMERIC,
  res_financeiro_empenhado NUMERIC,
  res_financeiro_liquidado NUMERIC,
  perc_suplementacao_anulacao NUMERIC,
  suplementacao_autorizada_anulacao NUMERIC,
  credito_utilizado_anulacao NUMERIC,
  perc_suplementacao_superavit NUMERIC,
  superavit_apurado_anterior NUMERIC,
  suplementacao_autorizada_superavit NUMERIC,
  credito_utilizado_superavit NUMERIC,
  perc_suplementacao_excesso NUMERIC,
  valor_excesso_projetado NUMERIC,
  credito_utilizado_excesso NUMERIC,
  aplicacao_educacao NUMERIC,
  indice_educacao NUMERIC,
  receita_fundeb NUMERIC,
  aplicacao_70_fundeb NUMERIC,
  indice_fundeb NUMERIC,
  aplicacao_saude NUMERIC,
  indice_saude NUMERIC,
  receita_corrente_liquida NUMERIC,
  gasto_pessoal NUMERIC,
  indice_pessoal NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(municipio, mes_referencia)
);

-- Enable RLS
ALTER TABLE public.municipios_financeiro ENABLE ROW LEVEL SECURITY;

-- Allow public read access (this is public financial data)
CREATE POLICY "Anyone can read financial data"
  ON public.municipios_financeiro FOR SELECT USING (true);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can insert financial data"
  ON public.municipios_financeiro FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update financial data"
  ON public.municipios_financeiro FOR UPDATE
  USING (true);

-- Indexes for common queries
CREATE INDEX idx_municipios_financeiro_municipio ON public.municipios_financeiro(municipio);
CREATE INDEX idx_municipios_financeiro_mes ON public.municipios_financeiro(mes_referencia);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_municipios_financeiro_updated_at
  BEFORE UPDATE ON public.municipios_financeiro
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
