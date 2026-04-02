-- Missions: reusable job descriptions for positioning multiple candidates on the same offer
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  job_description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add mission_id FK to positionings (nullable for backward compat with existing rows)
ALTER TABLE positionings ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;

-- Backfill: create a mission for each distinct job_description already in positionings
INSERT INTO missions (id, title, job_description, created_at)
SELECT
  gen_random_uuid(),
  CASE
    WHEN LENGTH(SPLIT_PART(p.job_description, E'\n', 1)) > 100
    THEN LEFT(SPLIT_PART(p.job_description, E'\n', 1), 97) || '...'
    ELSE SPLIT_PART(p.job_description, E'\n', 1)
  END,
  p.job_description,
  MIN(p.created_at)
FROM positionings p
WHERE p.job_description NOT IN (SELECT job_description FROM missions)
GROUP BY p.job_description;

-- Link existing positionings to their newly created missions
UPDATE positionings p
SET mission_id = m.id
FROM missions m
WHERE m.job_description = p.job_description
  AND p.mission_id IS NULL;
