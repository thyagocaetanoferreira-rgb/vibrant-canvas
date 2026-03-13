
CREATE TABLE public.municipios (
  id BIGINT PRIMARY KEY,
  codigo_ibge BIGINT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  capital BOOLEAN NOT NULL DEFAULT false,
  codigo_uf INTEGER NOT NULL,
  siafi_id INTEGER,
  ddd INTEGER,
  fuso_horario TEXT
);

ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública dos municípios"
  ON public.municipios
  FOR SELECT
  TO anon, authenticated
  USING (true);
