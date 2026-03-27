-- Organization-level branding and defaults (Clerk org_id).
-- `cv_code_template` : historique ; retiré par `20260417_organization_settings_drop_cv_code_template.sql`.
-- Gabarits PDF : table `templates` (défaut org + repli plateforme).

CREATE TABLE IF NOT EXISTS organization_settings (
    org_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    contact_email TEXT,
    website_url TEXT,
    app_logo_url TEXT,
    positioning_brand_context TEXT,
    cv_code_template TEXT NOT NULL DEFAULT 'himeo',
    extra JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_settings_updated_at ON organization_settings(updated_at DESC);

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON organization_settings TO authenticated;
CREATE POLICY "anon_deny_all_organization_settings" ON organization_settings FOR ALL TO anon USING (false);

CREATE POLICY "org_select_organization_settings" ON organization_settings
  FOR SELECT TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_insert_organization_settings" ON organization_settings
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_update_organization_settings" ON organization_settings
  FOR UPDATE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'))
  WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'));

CREATE POLICY "org_delete_organization_settings" ON organization_settings
  FOR DELETE TO authenticated
  USING (org_id = (select auth.jwt() ->> 'org_id'));

-- Public bucket for org logos (PDF preview + UI need stable URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-branding', 'org-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Public read so PDF engine and browsers can load logo URLs
CREATE POLICY "public_read_org_branding" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'org-branding');

-- Org-scoped read/write for authenticated users (first path segment = org_id)
CREATE POLICY "org_read_org_branding" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'org-branding'
    AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'org_id')
  );

CREATE POLICY "org_upload_org_branding" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org-branding'
    AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'org_id')
  );

CREATE POLICY "org_update_org_branding" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'org-branding'
    AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'org_id')
  )
  WITH CHECK (
    bucket_id = 'org-branding'
    AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'org_id')
  );

CREATE POLICY "org_delete_org_branding" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'org-branding'
    AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'org_id')
  );
