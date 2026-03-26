-- Snapshots d’analyse avant une relance (« Relancer ») pour conserver l’historique.

CREATE TABLE IF NOT EXISTS positioning_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  positioning_id UUID NOT NULL REFERENCES positionings(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  analysis JSONB NOT NULL,
  answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positioning_analysis_history_positioning_created
  ON positioning_analysis_history (positioning_id, created_at DESC);

ALTER TABLE positioning_analysis_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON positioning_analysis_history FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON positioning_analysis_history TO authenticated;

CREATE POLICY "org_select_positioning_analysis_history" ON positioning_analysis_history
  FOR SELECT TO authenticated
  USING (org_id = (SELECT auth.jwt() ->> 'org_id'));

CREATE POLICY "org_insert_positioning_analysis_history" ON positioning_analysis_history
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (SELECT auth.jwt() ->> 'org_id'));

CREATE POLICY "org_update_positioning_analysis_history" ON positioning_analysis_history
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT auth.jwt() ->> 'org_id'))
  WITH CHECK (org_id = (SELECT auth.jwt() ->> 'org_id'));

CREATE POLICY "org_delete_positioning_analysis_history" ON positioning_analysis_history
  FOR DELETE TO authenticated
  USING (org_id = (SELECT auth.jwt() ->> 'org_id'));
