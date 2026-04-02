-- État de l’appel LLM + branche parallèle (ex. mission fiche : executive | keyPoints)
ALTER TABLE ai_usage_log ADD COLUMN IF NOT EXISTS call_status TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE ai_usage_log ADD COLUMN IF NOT EXISTS branch TEXT;

COMMENT ON COLUMN ai_usage_log.call_status IS 'completed | failed | cancelled — état connu au moment du log';
COMMENT ON COLUMN ai_usage_log.branch IS 'Sous-flux parallèle si applicable (ex. executive, keyPoints)';

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_call_status ON ai_usage_log(call_status);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_branch ON ai_usage_log(branch) WHERE branch IS NOT NULL;
