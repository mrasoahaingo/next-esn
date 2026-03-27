-- Remplacement de extraction_history par des lignes ai_usage_log (task_key = cv.extraction.snapshot).

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_candidate_snapshot
  ON ai_usage_log (candidate_id, created_at DESC)
  WHERE task_key = 'cv.extraction.snapshot';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'extraction_history'
  ) THEN
    INSERT INTO ai_usage_log (
      candidate_id,
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
      h.candidate_id,
      COALESCE(h.org_id, c.org_id),
      'extraction',
      'workflow/no-llm',
      'cv.extraction.snapshot',
      0,
      0,
      0,
      '{}'::jsonb,
      jsonb_build_object(
        'kind', 'cv_extraction_snapshot',
        'version', 1,
        'reason', 'migrated_from_extraction_history',
        'extracted_data', h.extraction_result,
        'ai_models', jsonb_build_object(
          'byTask', jsonb_build_object('cv.legacy.migrated', h.ai_model),
          'uniqueModels', jsonb_build_array(h.ai_model)
        )
      ),
      h.created_at,
      'completed'
    FROM extraction_history h
    LEFT JOIN candidates c ON c.id = h.candidate_id;

    DROP TABLE extraction_history;
  END IF;
END $$;
