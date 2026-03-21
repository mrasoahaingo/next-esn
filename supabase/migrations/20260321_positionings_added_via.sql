-- Source d'ajout sur une mission (carte mission + pipeline UI)
ALTER TABLE positionings
  ADD COLUMN IF NOT EXISTS added_via TEXT CHECK (added_via IN ('cv_upload', 'existing_candidate'));

COMMENT ON COLUMN positionings.added_via IS 'cv_upload: import fichier mission ; existing_candidate: bibliothèque';

UPDATE positionings SET added_via = 'cv_upload' WHERE added_via IS NULL AND mission_id IS NOT NULL;
UPDATE positionings SET added_via = 'existing_candidate' WHERE added_via IS NULL;
