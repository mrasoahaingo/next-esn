-- Snapshot des réponses recruteur (phase analyse) utilisées pour le dernier calcul de score affiché.

ALTER TABLE positionings
  ADD COLUMN IF NOT EXISTS analysis_recruiter_answers JSONB;

COMMENT ON COLUMN positionings.analysis_recruiter_answers IS
  'Clés candidat:/client: injectées dans les prompts au démarrage du dernier run d''analyse terminé.';
