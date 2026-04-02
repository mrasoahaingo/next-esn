-- Pondérations matching par organisation (récence des expériences, etc.)

ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS matching_weights JSONB DEFAULT NULL;

COMMENT ON COLUMN organization_settings.matching_weights IS 'Pondérations matching (ex. récence expériences : decay, plancher, poids explicites). NULL = valeurs code par défaut.';
