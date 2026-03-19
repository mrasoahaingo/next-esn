-- Add email variant columns to positionings table
ALTER TABLE positionings
  ADD COLUMN IF NOT EXISTS email_first_contact JSONB,
  ADD COLUMN IF NOT EXISTS email_bullet_points JSONB;
