-- Time tracking columns for ROI calculation
-- AI processing durations (set server-side in API routes)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_extraction_duration_ms integer;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS user_review_time_seconds integer NOT NULL DEFAULT 0;

ALTER TABLE positionings ADD COLUMN IF NOT EXISTS ai_analysis_duration_ms integer;
ALTER TABLE positionings ADD COLUMN IF NOT EXISTS ai_generation_duration_ms integer;
ALTER TABLE positionings ADD COLUMN IF NOT EXISTS user_time_seconds integer NOT NULL DEFAULT 0;

-- RPC functions for atomic increment of user time
CREATE OR REPLACE FUNCTION increment_candidate_time(p_id uuid, p_seconds integer)
RETURNS void AS $$
  UPDATE candidates
  SET user_review_time_seconds = COALESCE(user_review_time_seconds, 0) + p_seconds
  WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_positioning_time(p_id uuid, p_seconds integer)
RETURNS void AS $$
  UPDATE positionings
  SET user_time_seconds = COALESCE(user_time_seconds, 0) + p_seconds
  WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;
