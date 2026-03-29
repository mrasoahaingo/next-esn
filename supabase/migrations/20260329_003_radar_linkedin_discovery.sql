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
