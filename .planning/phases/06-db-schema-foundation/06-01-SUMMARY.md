---
phase: 06-db-schema-foundation
plan: 01
subsystem: database
tags: [supabase, postgres, migration, sql, multi-langue]

# Dependency graph
requires: []
provides:
  - "Column candidates.language TEXT NOT NULL DEFAULT 'fr' CHECK IN ('fr','en')"
  - "Column missions.language TEXT NOT NULL DEFAULT 'fr' CHECK IN ('fr','en')"
  - "Column organization_settings.default_language TEXT NOT NULL DEFAULT 'fr' CHECK IN ('fr','en')"
affects: [07-schema-types, 08-workflow-language-detection, 09-llm-prompts, 10-pdf-labels]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotent ADD COLUMN IF NOT EXISTS migration with NOT NULL DEFAULT and CHECK constraint"

key-files:
  created:
    - supabase/migrations/20260604144106_add_language_columns.sql
  modified: []

key-decisions:
  - "Colonnes language/default_language avec CHECK IN ('fr','en') pour contrainte DB dès le départ — pas de validation applicative uniquement"
  - "Pas d'index sur les colonnes de langue dans cette phase — elles ne servent pas encore de critère de filtre"
  - "RLS existantes non modifiées — les politiques org_id couvrent déjà ces tables"

patterns-established:
  - "Migration pattern: ADD COLUMN IF NOT EXISTS + NOT NULL DEFAULT + CHECK — garantit idempotence et intégrité DB en une seule instruction"

requirements-completed: [LANG-05]

# Metrics
duration: 2min
completed: 2026-06-04
---

# Phase 06 Plan 01: DB Schema Foundation Summary

**Migration idempotente ajoutant les colonnes de langue (`language`, `default_language`) sur `candidates`, `missions`, et `organization_settings` avec CHECK IN ('fr','en') et DEFAULT 'fr'**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-04T12:47:00Z
- **Completed:** 2026-06-04T12:48:23Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Colonne `candidates.language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en'))` ajoutée de façon idempotente
- Colonne `missions.language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en'))` ajoutée de façon idempotente
- Colonne `organization_settings.default_language TEXT NOT NULL DEFAULT 'fr' CHECK (default_language IN ('fr', 'en'))` ajoutée de façon idempotente
- Aucune ligne existante affectée — DEFAULT appliqué silencieusement, comportement prod identique

## Task Commits

1. **Task 1: Créer la migration SQL pour les colonnes de langue** - `eb49e41` (feat)

**Plan metadata:** _(to be filled after metadata commit)_

## Files Created/Modified
- `supabase/migrations/20260604144106_add_language_columns.sql` - Migration idempotente ajoutant les 3 colonnes de langue

## Decisions Made
- Utiliser `CHECK (language IN ('fr', 'en'))` directement en DB pour contraindre les valeurs dès le départ — garantit l'intégrité sans dépendre uniquement de la validation applicative
- Ne pas créer d'index sur ces colonnes dans cette phase — elles ne servent pas encore de critère de filtre (les phases 7–8 décideront si un index est pertinent)
- Ne pas modifier les RLS — les politiques `org_id` existantes couvrent déjà les 3 tables

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. La migration sera appliquée via `supabase db push` ou `supabase migration up` lors du déploiement.

## Next Phase Readiness

- Les 3 colonnes de langue sont prêtes en DB pour les phases suivantes
- Phase 07 (schema-types) peut ajouter les types TypeScript correspondants (`'fr' | 'en'`)
- Phase 08 (workflow-language-detection) peut persister la langue détectée dans `candidates.language` et `missions.language`
- Phase 09 (llm-prompts) peut lire `organization_settings.default_language` pour la directive `{{language}}`

---
*Phase: 06-db-schema-foundation*
*Completed: 2026-06-04*
