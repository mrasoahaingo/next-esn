-- Gabarit de repli lorsqu’une organisation n’a aucune ligne `templates`.
-- Lu par `getTemplateConfig` via `org_id IS NULL` + `is_default = true` (service role).

INSERT INTO templates (name, config, is_default, org_id)
SELECT
  'Gabarit plateforme (défaut)',
  '{}'::jsonb,
  true,
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM templates
  WHERE org_id IS NULL
    AND is_default = true
);
