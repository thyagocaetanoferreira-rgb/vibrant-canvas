
-- Tabela de lançamentos mensais
CREATE TABLE public.lancamentos_mensais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Contexto
  cliente_id          UUID NOT NULL REFERENCES public.clientes(id),
  mes_referencia      INTEGER NOT NULL,
  ano_referencia      INTEGER NOT NULL,

  -- BLOCO 1: RECEITAS
  receita_prevista_ano      NUMERIC(18,2),
  receita_realizada         NUMERIC(18,2),

  -- BLOCO 2: DESPESAS
  despesa_fixada            NUMERIC(18,2),
  despesa_empenhada_f1      NUMERIC(18,2),
  despesa_empenhada_f2      NUMERIC(18,2),
  despesa_liquidada         NUMERIC(18,2),
  despesa_paga              NUMERIC(18,2),

  -- BLOCO 3: DISPONIBILIDADE DE CAIXA
  caixa                     NUMERIC(18,2),
  despesa_nao_processada    NUMERIC(18,2),
  despesa_processada        NUMERIC(18,2),
  consignacoes_tesouraria   NUMERIC(18,2),
  resto_nao_processado      NUMERIC(18,2),
  resto_processado          NUMERIC(18,2),

  -- BLOCO 4: SUPLEMENTAÇÃO
  supl_anulacao_perc        NUMERIC(8,4),
  supl_anulacao_autorizada  NUMERIC(18,2),
  supl_anulacao_utilizado   NUMERIC(18,2),
  supl_superavit_perc       NUMERIC(8,4),
  superavit_exerc_anterior  NUMERIC(18,2),
  supl_superavit_autorizada NUMERIC(18,2),
  supl_superavit_utilizado  NUMERIC(18,2),
  supl_excesso_perc         NUMERIC(8,4),
  excesso_projetado         NUMERIC(18,2),
  supl_excesso_utilizado    NUMERIC(18,2),

  -- BLOCO 5: ÍNDICES LRF
  aplicacao_educacao        NUMERIC(18,2),
  receita_fundeb            NUMERIC(18,2),
  aplicacao_fundeb_70       NUMERIC(18,2),
  aplicacao_saude           NUMERIC(18,2),
  receita_corrente_liquida  NUMERIC(18,2),
  gasto_pessoal             NUMERIC(18,2),

  -- CONTROLE
  status          TEXT DEFAULT 'rascunho',
  observacoes     TEXT,
  criado_por      UUID REFERENCES public.usuarios(id),
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (cliente_id, mes_referencia, ano_referencia)
);

-- Validation trigger for mes_referencia
CREATE OR REPLACE FUNCTION public.validate_lancamento_mes()
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

CREATE TRIGGER trg_validate_lancamento_mes
BEFORE INSERT OR UPDATE ON public.lancamentos_mensais
FOR EACH ROW EXECUTE FUNCTION public.validate_lancamento_mes();

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_lancamento_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('rascunho', 'finalizado') THEN
    RAISE EXCEPTION 'Status inválido: %. Deve ser rascunho ou finalizado', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_lancamento_status
BEFORE INSERT OR UPDATE ON public.lancamentos_mensais
FOR EACH ROW EXECUTE FUNCTION public.validate_lancamento_status();

-- Trigger atualizado_em
CREATE TRIGGER trg_lancamentos_atualizado
BEFORE UPDATE ON public.lancamentos_mensais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.lancamentos_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura lancamentos_mensais"
ON public.lancamentos_mensais FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Inserção lancamentos_mensais"
ON public.lancamentos_mensais FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Atualização lancamentos_mensais"
ON public.lancamentos_mensais FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
