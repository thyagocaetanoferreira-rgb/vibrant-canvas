-- Add authentication columns for standalone Express backend (replacing Supabase GoTrue)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS senha_hash VARCHAR,
  ADD COLUMN IF NOT EXISTS reset_token UUID,
  ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE;
