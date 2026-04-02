-- Suivi « compris » transversal par techno (clé canonique), pour toutes les missions de l’org

CREATE TABLE IF NOT EXISTS recruiter_skill_understood (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  skill_key TEXT NOT NULL,
  understood_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, user_id, skill_key)
);

CREATE INDEX IF NOT EXISTS idx_recruiter_skill_understood_org_user
  ON recruiter_skill_understood(org_id, user_id);

COMMENT ON TABLE recruiter_skill_understood IS 'Technos marquées « comprises » par recruteur, partagées entre missions (skill_key canonique)';
COMMENT ON COLUMN recruiter_skill_understood.skill_key IS 'Clé stable (ex. react, nodejs, aws) — alignée avec job_analysis.keyPoints[].canonicalSkillKey';

GRANT SELECT, INSERT, UPDATE, DELETE ON recruiter_skill_understood TO authenticated;

ALTER TABLE recruiter_skill_understood ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_deny_all" ON recruiter_skill_understood;
CREATE POLICY "anon_deny_all" ON recruiter_skill_understood FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "org_select_recruiter_skill_understood" ON recruiter_skill_understood;
CREATE POLICY "org_select_recruiter_skill_understood" ON recruiter_skill_understood
  FOR SELECT TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

DROP POLICY IF EXISTS "org_insert_recruiter_skill_understood" ON recruiter_skill_understood;
CREATE POLICY "org_insert_recruiter_skill_understood" ON recruiter_skill_understood
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

DROP POLICY IF EXISTS "org_update_recruiter_skill_understood" ON recruiter_skill_understood;
CREATE POLICY "org_update_recruiter_skill_understood" ON recruiter_skill_understood
  FOR UPDATE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'))
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

DROP POLICY IF EXISTS "org_delete_recruiter_skill_understood" ON recruiter_skill_understood;
CREATE POLICY "org_delete_recruiter_skill_understood" ON recruiter_skill_understood
  FOR DELETE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));
