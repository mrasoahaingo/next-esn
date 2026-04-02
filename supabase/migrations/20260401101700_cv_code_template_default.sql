-- Historique : normaliser les anciennes clés de thème (`himeo` / `esneo`) avant abandon de la colonne.
-- Le rendu CV ne lit pas `cv_code_template` : résolution via table `templates` (`is_default`, puis gabarit plateforme).
-- Voir `20260417_organization_settings_drop_cv_code_template.sql`.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organization_settings'
      AND column_name = 'cv_code_template'
  ) THEN
    ALTER TABLE organization_settings ALTER COLUMN cv_code_template SET DEFAULT 'default';
    UPDATE organization_settings SET cv_code_template = 'default' WHERE cv_code_template IN ('himeo', 'esneo');
  END IF;
END $$;
