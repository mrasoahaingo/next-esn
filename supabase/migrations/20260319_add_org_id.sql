-- Add org_id to all tenant-scoped tables for Clerk Organization multi-tenancy
-- org_id stores the Clerk Organization ID (e.g. "org_2abc123...")

-- candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_candidates_org_id ON candidates(org_id);

-- positionings
ALTER TABLE positionings ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_positionings_org_id ON positionings(org_id);

-- missions
ALTER TABLE missions ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_missions_org_id ON missions(org_id);

-- templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_templates_org_id ON templates(org_id);

-- extraction_history (inherits org scope through candidate, but add for direct queries)
ALTER TABLE extraction_history ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_extraction_history_org_id ON extraction_history(org_id);

-- ai_usage_log
ALTER TABLE ai_usage_log ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_id ON ai_usage_log(org_id);
