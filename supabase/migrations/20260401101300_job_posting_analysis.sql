-- Analyse IA de la fiche de poste (mission) + suivi « compris » par recruteur

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS job_analysis JSONB,
  ADD COLUMN IF NOT EXISTS job_analysis_input_hash TEXT,
  ADD COLUMN IF NOT EXISTS job_analysis_workflow_run_id TEXT;

COMMENT ON COLUMN missions.job_analysis IS 'Résultat structuré (synthèse + points clés) pour le recruteur';
COMMENT ON COLUMN missions.job_analysis_input_hash IS 'SHA-256 du job_description au moment de l''analyse';
COMMENT ON COLUMN missions.job_analysis_workflow_run_id IS 'Run Workflow DevKit pendant l''analyse';

-- Log IA : lien mission (optionnel)
ALTER TABLE ai_usage_log
  ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_mission ON ai_usage_log(mission_id);

CREATE TABLE IF NOT EXISTS mission_skill_understood (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  point_id TEXT NOT NULL,
  understood_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (mission_id, user_id, point_id)
);

CREATE INDEX IF NOT EXISTS idx_mission_skill_understood_lookup
  ON mission_skill_understood(mission_id, user_id);

COMMENT ON TABLE mission_skill_understood IS 'Points clés de l''analyse marqués « compris » par utilisateur Clerk';

GRANT SELECT, INSERT, UPDATE, DELETE ON mission_skill_understood TO authenticated;

ALTER TABLE mission_skill_understood ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_deny_all" ON mission_skill_understood;
CREATE POLICY "anon_deny_all" ON mission_skill_understood FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "org_select_mission_skill_understood" ON mission_skill_understood;
CREATE POLICY "org_select_mission_skill_understood" ON mission_skill_understood
  FOR SELECT TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

DROP POLICY IF EXISTS "org_insert_mission_skill_understood" ON mission_skill_understood;
CREATE POLICY "org_insert_mission_skill_understood" ON mission_skill_understood
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

DROP POLICY IF EXISTS "org_update_mission_skill_understood" ON mission_skill_understood;
CREATE POLICY "org_update_mission_skill_understood" ON mission_skill_understood
  FOR UPDATE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'))
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

DROP POLICY IF EXISTS "org_delete_mission_skill_understood" ON mission_skill_understood;
CREATE POLICY "org_delete_mission_skill_understood" ON mission_skill_understood
  FOR DELETE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));
