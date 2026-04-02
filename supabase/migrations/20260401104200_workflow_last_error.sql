-- Dernière erreur de workflow par entité (diagnostic ERR-03 : étape + message après rechargement)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS workflow_last_error JSONB;
COMMENT ON COLUMN candidates.workflow_last_error IS 'Dernière erreur workflow : { stepKey, message } pour affichage diagnostic côté client';

ALTER TABLE positionings ADD COLUMN IF NOT EXISTS workflow_last_error JSONB;
COMMENT ON COLUMN positionings.workflow_last_error IS 'Dernière erreur workflow : { stepKey, message } pour affichage diagnostic côté client';

ALTER TABLE missions ADD COLUMN IF NOT EXISTS workflow_last_error JSONB;
COMMENT ON COLUMN missions.workflow_last_error IS 'Dernière erreur workflow (analyse fiche de poste) : { stepKey, message } pour affichage diagnostic côté client';
