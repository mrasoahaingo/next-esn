CREATE TABLE IF NOT EXISTS radar_org_settings (
  org_id TEXT PRIMARY KEY,
  enabled_sources JSONB NOT NULL DEFAULT '{"jobs": true, "boamp": true, "press": true, "linkedin": true}'::jsonb,
  job_search_queries JSONB NOT NULL DEFAULT '["developpeur java Paris","developpeur angular France","devops cloud Paris","data engineer France","tech lead java France"]'::jsonb,
  press_rss_urls JSONB NOT NULL DEFAULT '["https://www.usine-digitale.fr/rss/","https://www.lemondeinformatique.fr/flux-rss/thematique/toutes-les-actualites/rss.xml"]'::jsonb,
  linkedin_company_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  match_threshold REAL NOT NULL DEFAULT 0.7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE radar_org_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS radar_org_settings_select ON radar_org_settings;
CREATE POLICY radar_org_settings_select ON radar_org_settings
  FOR SELECT USING (org_id = auth.jwt() ->> 'org_id');

DROP POLICY IF EXISTS radar_org_settings_write ON radar_org_settings;
CREATE POLICY radar_org_settings_write ON radar_org_settings
  FOR ALL USING (org_id = auth.jwt() ->> 'org_id')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id');
