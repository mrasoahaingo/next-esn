-- Gabarits PDF : globaux (plus de rattachement org sur `templates.org_id`).
-- Le défaut par organisation est `organization_settings.default_template_id`.

ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS default_template_id UUID REFERENCES templates(id) ON DELETE SET NULL;

-- Avant de vider org_id : recopier l’ancien gabarit « défaut org ».
UPDATE organization_settings os
SET default_template_id = t.id
FROM templates t
WHERE t.org_id = os.org_id
  AND t.is_default = true
  AND os.default_template_id IS NULL;

UPDATE templates SET org_id = NULL;

-- Un seul gabarit « plateforme » reste `is_default` (repli PDF si aucune sélection org).
UPDATE templates SET is_default = false;

UPDATE templates t
SET is_default = true
FROM (
  SELECT id
  FROM templates
  WHERE name = 'Gabarit plateforme (défaut)'
  ORDER BY created_at ASC
  LIMIT 1
) p
WHERE t.id = p.id;

-- Liste des gabarits globaux pour les clients authentifiés (JWT).
DROP POLICY IF EXISTS "org_select_templates" ON templates;
CREATE POLICY "templates_select_global" ON templates
  FOR SELECT TO authenticated
  USING (org_id IS NULL OR org_id = (SELECT auth.jwt() ->> 'org_id'));
