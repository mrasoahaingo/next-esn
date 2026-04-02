-- radar_org_settings peut ne pas encore exister (créée dans une migration ultérieure)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'radar_org_settings'
  ) THEN
    ALTER TABLE radar_org_settings
      ADD COLUMN IF NOT EXISTS linkedin_discovery JSONB NOT NULL DEFAULT '{
        "enabled": false,
        "sectors": ["banque","assurance","retail","sante","industrie","services publics"],
        "regions": ["Ile-de-France","Lyon","Bordeaux","Nantes","Marseille"],
        "keywords": ["informatique","digital","IT","DSI","transformation numerique"],
        "minExternalRatio": 0.05,
        "minHeadcount": 200,
        "maxHeadcount": 10000,
        "maxCompaniesPerRun": 50
      }'::jsonb;
  END IF;
END $$;
