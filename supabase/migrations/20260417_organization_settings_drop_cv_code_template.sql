-- Gabarit CV : source de vérité = `templates` (défaut org `is_default`, puis repli plateforme `org_id IS NULL`).
-- Cette colonne ne servait plus qu’en historique après la fin des layouts versionnés par clé dans le code.

ALTER TABLE organization_settings
  DROP COLUMN IF EXISTS cv_code_template;
