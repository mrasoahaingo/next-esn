-- Missions: reusable job descriptions for positioning multiple candidates on the same offer
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  job_description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add mission_id FK to positionings (nullable for backward compat with existing rows)
ALTER TABLE positionings ADD COLUMN mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;

-- Backfill: create a mission for each distinct job_description already in positionings
INSERT INTO missions (id, title, job_description, created_at)
SELECT
  uuid_generate_v4(),
  CASE
    WHEN LENGTH(SPLIT_PART(p.job_description, E'\n', 1)) > 100
    THEN LEFT(SPLIT_PART(p.job_description, E'\n', 1), 97) || '...'
    ELSE SPLIT_PART(p.job_description, E'\n', 1)
  END,
  p.job_description,
  MIN(p.created_at)
FROM positionings p
GROUP BY p.job_description;

-- Link existing positionings to their newly created missions
UPDATE positionings p
SET mission_id = m.id
FROM missions m
WHERE m.job_description = p.job_description;
