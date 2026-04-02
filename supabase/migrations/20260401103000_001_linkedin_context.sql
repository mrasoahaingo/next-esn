-- radar_org_settings peut ne pas encore exister (créée dans une migration ultérieure)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'radar_org_settings'
  ) THEN
    ALTER TABLE radar_org_settings ADD COLUMN IF NOT EXISTS linkedin_context_id TEXT;
  END IF;
END $$;
