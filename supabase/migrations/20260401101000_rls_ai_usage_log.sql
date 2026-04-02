-- RLS for ai_usage_log (same pattern as other tables)

REVOKE SELECT ON ai_usage_log FROM anon;
REVOKE ALL PRIVILEGES ON ai_usage_log FROM authenticated;
GRANT SELECT, INSERT ON ai_usage_log TO authenticated;

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_deny_all" ON ai_usage_log;
CREATE POLICY "anon_deny_all" ON ai_usage_log FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "org_select_ai_usage_log" ON ai_usage_log;
CREATE POLICY "org_select_ai_usage_log" ON ai_usage_log
  FOR SELECT TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

DROP POLICY IF EXISTS "org_insert_ai_usage_log" ON ai_usage_log;
CREATE POLICY "org_insert_ai_usage_log" ON ai_usage_log
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));
