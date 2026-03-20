-- =============================================================
-- Remove todas as FKs de fato_* → dom_*
-- As tabelas dom_* servem como lookup no Power BI (LEFT JOIN),
-- não como constraint de integridade. Municípios podem enviar
-- códigos válidos no TCM-GO que ainda não constam nas dom_*.
-- =============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
    JOIN information_schema.table_constraints tc2 ON tc2.constraint_name = rc.unique_constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name LIKE 'fato_%'
      AND tc2.table_name LIKE 'dom_%'
  LOOP
    EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
  END LOOP;
END $$;
