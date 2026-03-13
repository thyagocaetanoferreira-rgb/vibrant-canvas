
-- Junction table for users with multiple municipalities
CREATE TABLE public.usuario_municipios (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  municipio_id BIGINT NOT NULL REFERENCES public.municipios(id) ON DELETE CASCADE,
  UNIQUE(usuario_id, municipio_id)
);

ALTER TABLE public.usuario_municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública usuario_municipios" ON public.usuario_municipios
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inserção usuario_municipios" ON public.usuario_municipios
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Exclusão usuario_municipios" ON public.usuario_municipios
  FOR DELETE TO anon, authenticated USING (true);
