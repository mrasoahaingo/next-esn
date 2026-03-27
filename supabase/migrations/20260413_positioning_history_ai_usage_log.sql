-- Historique d’analyse de positionnement : snapshots dans ai_usage_log.output_payload
-- (task_key = positioning.analysis.snapshot). Remplace positioning_analysis_history.

ALTER TABLE ai_usage_log ADD COLUMN IF NOT EXISTS output_payload JSONB;
ALTER TABLE ai_usage_log ADD COLUMN IF NOT EXISTS input_payload JSONB;
ALTER TABLE ai_usage_log ADD COLUMN IF NOT EXISTS workflow_run_id TEXT;

COMMENT ON COLUMN ai_usage_log.output_payload IS
  'Sortie structurée ou snapshot (ex. positioning_analysis_snapshot v1 pour l’historique).';

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_positioning_snapshot
  ON ai_usage_log (positioning_id, created_at DESC)
  WHERE task_key = 'positioning.analysis.snapshot';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'positioning_analysis_history'
  ) THEN
    INSERT INTO ai_usage_log (
      candidate_id,
      positioning_id,
      org_id,
      operation,
      ai_model,
      task_key,
      duration_ms,
      input_tokens,
      output_tokens,
      raw_usage,
      output_payload,
      created_at,
      call_status
    )
    SELECT
      p.candidate_id,
      p.id,
      COALESCE(h.org_id, p.org_id),
      'analysis',
      'workflow/no-llm',
      'positioning.analysis.snapshot',
      0,
      0,
      0,
      '{}'::jsonb,
      jsonb_build_object(
        'kind', 'positioning_analysis_snapshot',
        'version', 1,
        'reason', 'migrated_from_history_table',
        'analysis', h.analysis,
        'answers', h.answers,
        'ai_analysis_models', h.ai_analysis_models
      ),
      h.created_at,
      'completed'
    FROM positioning_analysis_history h
    INNER JOIN positionings p ON p.id = h.positioning_id;

    DROP TABLE positioning_analysis_history;
  END IF;
END $$;
