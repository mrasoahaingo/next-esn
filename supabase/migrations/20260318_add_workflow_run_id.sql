-- Workflow run tracking for durable background jobs
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS workflow_run_id text;
ALTER TABLE positionings ADD COLUMN IF NOT EXISTS workflow_run_id text;
