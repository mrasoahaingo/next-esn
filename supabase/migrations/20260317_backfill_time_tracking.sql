-- Backfill time tracking for existing records that were created
-- before the tracking feature was added.
-- Uses conservative estimates based on average observed durations.

-- Candidates: estimate AI extraction ~25s, user review ~5min for reviewed CVs
UPDATE candidates
SET ai_extraction_duration_ms = 25000
WHERE ai_extraction_duration_ms IS NULL
  AND status IN ('reviewing', 'ready', 'generated');

UPDATE candidates
SET user_review_time_seconds = 300
WHERE user_review_time_seconds = 0
  AND status IN ('ready', 'generated');

-- Positionings: estimate AI analysis ~20s, AI generation ~45s, user time ~10min
UPDATE positionings
SET ai_analysis_duration_ms = 20000
WHERE ai_analysis_duration_ms IS NULL
  AND status IN ('analyzed', 'generating', 'generated', 'exported');

UPDATE positionings
SET ai_generation_duration_ms = 45000
WHERE ai_generation_duration_ms IS NULL
  AND status IN ('generated', 'exported');

UPDATE positionings
SET user_time_seconds = 600
WHERE user_time_seconds = 0
  AND status IN ('generated', 'exported');
