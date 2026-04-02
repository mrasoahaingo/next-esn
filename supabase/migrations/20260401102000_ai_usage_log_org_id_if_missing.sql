-- Bases où la migration 20260319_add_org_id.sql n’a pas été appliquée (erreur 42703 sur ai_usage_log.org_id).
ALTER TABLE ai_usage_log ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_id ON ai_usage_log(org_id);
