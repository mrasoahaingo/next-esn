---
phase: 09-db-schema-foundation-proxycurl-audit
plan: 01
subsystem: database
tags: [supabase, postgres, rls, migration, prospection, rgpd, siren]

requires: []
provides:
  - "Migration 20261124150326_prospection_domain.sql : 8 tables prospection_* avec RLS org-scopée"
  - "lib/prospection/constants.ts : DEFAULT_HEAT_THRESHOLD et listes fermées alignées sur les CHECK"
  - "lib/prospection/company-identity.ts : normalizeCompanyName, normalizeSiren, isValidSiren"
  - "lib/types/prospection.ts : types de ligne des 8 tables + ProspectionScoreBreakdownEntry"
  - "lib/prospection/migration-contract.test.ts : contrat statique de la migration"
affects: [09-02, 09-04, phase-10, phase-11, phase-12, phase-13, phase-14]

tech-stack:
  added: []
  patterns:
    - "Listes fermées en TEXT + CHECK nommés prospection_<table>_<col>_check, alignés par test sur des constantes as const"
    - "FK composites (org_id, company_id) pour interdire les liens inter-org"
    - "Test de contrat qui lit le fichier SQL (node:fs) pour figer le schéma"

key-files:
  created:
    - supabase/migrations/20261124150326_prospection_domain.sql
    - lib/prospection/constants.ts
    - lib/prospection/company-identity.ts
    - lib/prospection/company-identity.test.ts
    - lib/prospection/migration-contract.test.ts
    - lib/types/prospection.ts
  modified: []

key-decisions:
  - "siren nullable + CHECK 9 chiffres + UNIQUE(org_id, siren) + index unique partiel (org_id, normalized_name) WHERE siren IS NULL (décision orchestrateur)"
  - "Aucun enum Postgres : TEXT + CHECK nommés (signal_source, heat_level, action_type, action_outcome existent déjà côté radar)"
  - "prospection_scores_company_run_key (company_id, run_id) non partiel pour permettre l'upsert onConflict 'company_id,run_id' (D-05)"
  - "normalizeCompanyName supprime les points avant de retirer les formes juridiques (« S.A.S. » → « sas » → retiré)"

patterns-established:
  - "Extension d'une liste fermée = nouvelle migration DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT + mise à jour de la constante"

requirements-completed: [SIG-04, CONT-04, CONT-05]

duration: 5min
completed: 2026-11-24
---

# Phase 9 Plan 01 : Fondation SQL du domaine prospection Summary

**Migration idempotente `20261124150326_prospection_domain.sql` créant 8 tables prospection_* à RLS org-scopée, SIREN unique par org, provenance/rétention RGPD NOT NULL et un snapshot de score par (entreprise, run), plus constantes, types de ligne et helpers SIREN/nom alignés et testés.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-11-24T14:01:30Z
- **Completed:** 2026-11-24T14:06:00Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments

- Fichier de migration exact (utilisé par 09-04) : **`supabase/migrations/20261124150326_prospection_domain.sql`**
- 8 tables : `prospection_settings`, `prospection_automations`, `prospection_companies`, `prospection_run_logs`, `prospection_signals`, `prospection_scores`, `prospection_contacts`, `prospection_actions` ; RLS activée sur les 8, 40 policies (anon_deny_all + org_select/insert/update/delete TO authenticated)
- SQL de RESEARCH §Migration complète repris à l'identique, avec deux ajouts : les commentaires d'en-tête (décision SIREN, D-05/D-06/D-08) et l'index unique `prospection_scores_company_run_key`
- Helpers d'identité entreprise testés en TDD (10 tests), contrat de migration statique (35 tests), suite complète verte (162 tests)

## Décisions orchestrateur à signaler

- **SIREN nullable** : `siren TEXT` nullable + `CHECK (siren IS NULL OR siren ~ '^[0-9]{9}$')` + `UNIQUE (org_id, siren)` + index unique partiel `(org_id, normalized_name) WHERE siren IS NULL`. La Phase 10 (France Travail) peut persister une entreprise avant que la Phase 11 (SIRENE) ne résolve son SIREN ; les entreprises non résolues sont dédoublonnées sur le nom normalisé, et on ne fusionne jamais sur le nom une entreprise dont le SIREN est connu.
- **Aucun enum Postgres** : les types globaux `signal_source`, `heat_level`, `action_type`, `action_outcome` existent déjà (radar). Toutes les listes fermées sont des `TEXT` + CHECK nommés `prospection_<table>_<col>_check`, alignés par test sur `lib/prospection/constants.ts`.

## Recette Postgres 17 (docker `postgres:17-alpine`, jetable)

Stub : rôles `anon`/`authenticated`, schéma `auth`, `auth.jwt()` lisant `request.jwt.claims`, enums radar `signal_source`/`heat_level`/`action_type` préexistants.

| Vérification | Résultat |
|---|---|
| 1re application (`psql -v ON_ERROR_STOP=1 -1`) | OK (exit 0) |
| 2e application | OK (exit 0, uniquement des NOTICE « already exists, skipping ») |
| Tables `prospection_%` / RLS | 8 / `relrowsecurity = t` partout |
| Policies | 40 |
| Doublon `(org_id, siren)` | `23505` `prospection_companies_org_siren_key` |
| Contact sans `contact_source` | `23502` |
| Rétention par défaut | 1 096 jours (now() + 3 ans) |
| Signal org_b sur entreprise org_a | `23503` `prospection_signals_company_fk` |
| 2e snapshot même (company, run) | `23505` `prospection_scores_company_run_key` |
| 2 snapshots `run_id` NULL | acceptés (2 lignes) |
| `INSERT … ON CONFLICT (company_id, run_id) DO UPDATE` | OK (score mis à jour) |
| Enum radar `signal_source` | intact (`job_offer, public_market, linkedin, press`) |
| `authenticated` claims org_b / org_a | 0 ligne / 1 ligne |
| Insert `authenticated` (org_a) pour org_b | `42501` violation RLS |
| `anon` SELECT | `42501` permission refusée |

Aucune base réelle/distante n'a été touchée (application réelle = plan 09-04).

## Task Commits

1. **Task 1 (RED) : tests helpers d'identité** - `c617e10` (test)
2. **Task 1 (GREEN) : constantes, types de ligne, identité entreprise** - `fb31644` (feat)
3. **Task 2 : migration prospection_domain + test de contrat** - `e55f9ee` (feat)

## Files Created/Modified

- `supabase/migrations/20261124150326_prospection_domain.sql` - schéma complet du domaine prospection (8 tables, index, RLS)
- `lib/prospection/constants.ts` - `DEFAULT_HEAT_THRESHOLD = 60`, bornes 0..100, 6 listes `PROSPECTION_*` as const et unions dérivées
- `lib/prospection/company-identity.ts` - `normalizeCompanyName`, `normalizeSiren`, `isValidSiren` (Luhn)
- `lib/prospection/company-identity.test.ts` - cas du `<behavior>` du plan
- `lib/types/prospection.ts` - 8 types `Prospection*Row` + `ProspectionScoreBreakdownEntry` (D-07)
- `lib/prospection/migration-contract.test.ts` - contrat : nom/timestamp unique, tables, SIREN, RGPD, TTL/D-08, D-05/D-06, interdits (CREATE TYPE, CONCURRENTLY, BEGIN;/COMMIT;, GENERATED ALWAYS), IF NOT EXISTS partout, DROP POLICY avant chaque CREATE POLICY, tableau RLS = 8 tables, CHECK ↔ constantes, seuil 60

## Pour la Phase 13

`gdpr_retention_expires_at` vaut par défaut `now() + interval '3 years'`, calculé **à l'insertion**, pas à partir de `contact_sourced_at`. Tout code qui antidate `contact_sourced_at` (date de collecte fournie par la source) doit renseigner explicitement `gdpr_retention_expires_at = contact_sourced_at + 3 ans`, et la repousser à chaque interaction à l'initiative du prospect (CNIL). Le CHECK `gdpr_retention_expires_at > contact_sourced_at` et l'index `prospection_contacts_retention_idx` (purge) sont déjà posés.

## TDD Gate Compliance

- RED : `c617e10 test(09-01)` — échec constaté (module introuvable) avant implémentation
- GREEN : `fb31644 feat(09-01)` — 10/10 tests verts
- REFACTOR : aucun nécessaire

## Deviations from Plan

None - plan exécuté tel qu'écrit.

Note d'environnement (pas une déviation) : le worktree n'a pas de `node_modules` propre ; vitest, tsc et eslint ont été lancés via les binaires du checkout principal (`../../../node_modules/.bin/*`), la résolution de modules remontant naturellement jusqu'à ce dossier. `tsc --noEmit` exit 0, `eslint lib/prospection lib/types/prospection.ts` exit 0.

## Issues Encountered

None.

## Known Stubs

None : aucun code UI ni flux de données ; les colonnes `justification`, `call_pitch`, `contacts_enriched_at`, etc. sont volontairement nullable et seront remplies par les phases 12 et 13.

## Threat Flags

None : aucune surface hors `<threat_model>` (pas de route, pas d'écrit applicatif). T-09-01, 02, 04, 05, 06, 07 couverts et prouvés par la recette ; T-09-03 accepté comme prévu.

## Next Phase Readiness

- 09-02 peut s'appuyer sur `prospection_settings`, `DEFAULT_HEAT_THRESHOLD`, `HEAT_THRESHOLD_MIN/MAX` et `ProspectionSettingsRow`
- 09-04 doit appliquer `20261124150326_prospection_domain.sql` sur la base réelle (checkpoint humain)

## Self-Check: PASSED

- FOUND: supabase/migrations/20261124150326_prospection_domain.sql
- FOUND: lib/prospection/constants.ts, lib/prospection/company-identity.ts, lib/prospection/company-identity.test.ts, lib/prospection/migration-contract.test.ts, lib/types/prospection.ts
- FOUND commits: c617e10, fb31644, e55f9ee

---
*Phase: 09-db-schema-foundation-proxycurl-audit*
*Completed: 2026-11-24*
