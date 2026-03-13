
-- Fix overly permissive INSERT/UPDATE policies
-- Only the service role (edge functions) should be able to write
DROP POLICY "Service role can insert financial data" ON public.municipios_financeiro;
DROP POLICY "Service role can update financial data" ON public.municipios_financeiro;

-- Restrict writes to service_role only (edge functions use service_role key)
CREATE POLICY "Service role can insert financial data"
  ON public.municipios_financeiro FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update financial data"
  ON public.municipios_financeiro FOR UPDATE
  TO service_role
  USING (true);
