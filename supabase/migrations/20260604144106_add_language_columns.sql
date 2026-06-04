-- Phase 6: DB + Schema Foundation — LANG-05
-- Ajoute les colonnes de langue sur candidates, missions, et organization_settings.
-- NOT NULL DEFAULT 'fr' : les lignes existantes sont inchangées, comportement prod identique.
-- Toutes les instructions sont idempotentes (ADD COLUMN IF NOT EXISTS).

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fr'
    CHECK (language IN ('fr', 'en'));

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fr'
    CHECK (language IN ('fr', 'en'));

ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS default_language TEXT NOT NULL DEFAULT 'fr'
    CHECK (default_language IN ('fr', 'en'));
