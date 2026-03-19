-- ============================================================
-- Enable Row Level Security on all tenant-scoped tables
-- ============================================================
-- The app uses service_role key (bypasses RLS) for API routes.
-- These policies protect against:
--   1. Direct access via anon/authenticated keys
--   2. Supabase Dashboard data browser (uses anon by default)
--   3. Future Clerk JWT → Supabase integration
--
-- To activate full RLS enforcement with Clerk:
--   1. Create a Supabase JWT template in Clerk Dashboard
--   2. Include org_id claim: { "org_id": "{{org.id}}" }
--   3. Use the Clerk-issued JWT to initialize the Supabase client
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Revoke overly permissive grants from initial migrations
-- ────────────────────────────────────────────────────────────

REVOKE SELECT ON candidates FROM anon;
REVOKE ALL PRIVILEGES ON candidates FROM authenticated;
REVOKE SELECT ON extraction_history FROM anon;
REVOKE ALL PRIVILEGES ON extraction_history FROM authenticated;

-- Grant minimal privileges (RLS policies will further restrict)
GRANT SELECT, INSERT, UPDATE, DELETE ON candidates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON extraction_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON positionings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON missions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON templates TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. Enable RLS on all tables
-- ────────────────────────────────────────────────────────────

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE positionings ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 3. Deny all for anon (no anonymous access to data)
-- ────────────────────────────────────────────────────────────

CREATE POLICY "anon_deny_all" ON candidates FOR ALL TO anon USING (false);
CREATE POLICY "anon_deny_all" ON extraction_history FOR ALL TO anon USING (false);
CREATE POLICY "anon_deny_all" ON positionings FOR ALL TO anon USING (false);
CREATE POLICY "anon_deny_all" ON missions FOR ALL TO anon USING (false);
CREATE POLICY "anon_deny_all" ON templates FOR ALL TO anon USING (false);

-- ────────────────────────────────────────────────────────────
-- 4. Org-scoped policies for authenticated role
--    Uses (select auth.jwt() ->> 'org_id') wrapped in SELECT
--    for performance (evaluated once, not per row)
-- ────────────────────────────────────────────────────────────

-- candidates
CREATE POLICY "org_select_candidates" ON candidates
  FOR SELECT TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_insert_candidates" ON candidates
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_update_candidates" ON candidates
  FOR UPDATE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'))
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_delete_candidates" ON candidates
  FOR DELETE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

-- extraction_history
CREATE POLICY "org_select_extraction_history" ON extraction_history
  FOR SELECT TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_insert_extraction_history" ON extraction_history
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_update_extraction_history" ON extraction_history
  FOR UPDATE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'))
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_delete_extraction_history" ON extraction_history
  FOR DELETE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

-- positionings
CREATE POLICY "org_select_positionings" ON positionings
  FOR SELECT TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_insert_positionings" ON positionings
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_update_positionings" ON positionings
  FOR UPDATE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'))
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_delete_positionings" ON positionings
  FOR DELETE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

-- missions
CREATE POLICY "org_select_missions" ON missions
  FOR SELECT TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_insert_missions" ON missions
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_update_missions" ON missions
  FOR UPDATE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'))
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_delete_missions" ON missions
  FOR DELETE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

-- templates
CREATE POLICY "org_select_templates" ON templates
  FOR SELECT TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_insert_templates" ON templates
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_update_templates" ON templates
  FOR UPDATE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'))
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_delete_templates" ON templates
  FOR DELETE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

-- ────────────────────────────────────────────────────────────
-- 5. Storage: org-scoped policies
--    Files are stored as {org_id}/filename
--    The first path segment must match the JWT org_id
-- ────────────────────────────────────────────────────────────

-- Drop old overly permissive storage policies
DROP POLICY IF EXISTS "Allow upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow read formatted" ON storage.objects;

-- cv-original: authenticated users can upload/read within their org folder
CREATE POLICY "org_upload_cv_original" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cv-original'
    AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'org_id')
  );

CREATE POLICY "org_read_cv_original" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cv-original'
    AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'org_id')
  );

-- cv-formatted: authenticated users can upload/read within their org folder
CREATE POLICY "org_upload_cv_formatted" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cv-formatted'
    AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'org_id')
  );

CREATE POLICY "org_read_cv_formatted" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cv-formatted'
    AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'org_id')
  );

-- service_role bypasses all RLS — current API routes continue to work unchanged
