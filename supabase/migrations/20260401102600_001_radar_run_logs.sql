DO $$ BEGIN
  CREATE TYPE radar_source AS ENUM ('jobs', 'boamp', 'press', 'linkedin', 'scoring', 'enrichment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS radar_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  source radar_source NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_radar_run_logs_org ON radar_run_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_radar_run_logs_source ON radar_run_logs(source);
CREATE INDEX IF NOT EXISTS idx_radar_run_logs_logged_at ON radar_run_logs(logged_at DESC);

ALTER TABLE radar_run_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS radar_run_logs_select ON radar_run_logs;
CREATE POLICY radar_run_logs_select ON radar_run_logs
  FOR SELECT USING (org_id = auth.jwt() ->> 'org_id');

DROP POLICY IF EXISTS radar_run_logs_write ON radar_run_logs;
CREATE POLICY radar_run_logs_write ON radar_run_logs
  FOR INSERT WITH CHECK (org_id = auth.jwt() ->> 'org_id');
