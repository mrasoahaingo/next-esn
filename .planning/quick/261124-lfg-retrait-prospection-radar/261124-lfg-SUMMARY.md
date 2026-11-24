---
phase: quick-261124-lfg
plan: 01
subsystem: prospection (retrait), base de données, planification
tags: [retrait, prospection, radar, migration, supabase, planning]
requires: []
provides:
  - Produit sans surface prospection (route, carte de réglage, lib/prospection)
  - Migration idempotente supabase/migrations/20261124153210_drop_radar.sql (NON appliquée)
  - Jalon v1.3 Prospection parké dans .planning
affects:
  - app/settings/organization/page.tsx
  - lib/queries (keys, index)
tech-stack:
  added: []
  patterns:
    - "Test de contrat statique vitest sur un fichier de migration SQL"
key-files:
  created:
    - supabase/migrations/20261124153210_drop_radar.sql
    - supabase/drop-radar-migration.test.ts
    - .planning/milestones/v1.3-ROADMAP.md
    - .planning/milestones/v1.3-REQUIREMENTS.md
  modified:
    - app/settings/organization/page.tsx
    - lib/queries/keys.ts
    - lib/queries/index.ts
    - lib/utils/supabase-write-error.test.ts
    - .planning/ROADMAP.md
    - .planning/PROJECT.md
    - .planning/STATE.md
    - .planning/REQUIREMENTS.md
  deleted:
    - app/api/prospection/settings/route.ts
    - components/settings/prospection-settings-card.tsx
    - lib/prospection/company-identity.ts
    - lib/prospection/company-identity.test.ts
    - lib/prospection/constants.ts
    - lib/prospection/migration-contract.test.ts
    - lib/prospection/no-dead-providers.test.ts
    - lib/prospection/settings.ts
    - lib/prospection/settings.test.ts
    - lib/prospection/settings-route.test.ts
    - lib/queries/prospection-settings.ts
    - lib/validation/prospection-settings.ts
    - lib/types/prospection.ts
    - supabase/migrations/20261124150326_prospection_domain.sql
decisions:
  - "pgvector conservé : pas de DROP EXTENSION (inerte une fois le radar parti, réutilisable par une refonte)"
  - "drop_radar sans CASCADE : tables enfants d'abord, fonction avant types ; échec bruyant si un objet inconnu dépend du radar"
  - "Pas de DROP POLICY / DROP INDEX explicites : ils partent avec les tables, et préservent l'idempotence"
  - "drop_radar NON appliquée en prod : accord explicite de l'utilisateur requis (todo STATE)"
metrics:
  duration: "~35 min"
  completed: 2026-11-24
  tasks: 3
  files: 30
---

# Quick 261124-lfg : retrait de la partie prospection/radar — Summary

Code prospection de la phase 9 retiré du produit (route `/api/prospection/settings`, carte « Prospection » des réglages org, `lib/prospection/`, migration jamais appliquée), migration `20261124153210_drop_radar.sql` idempotente prête mais non appliquée, et jalon v1.3 parké dans `.planning`. Le produit se limite désormais à la gestion des CV et au positionnement CV ↔ missions.

BASE = `344b327db2e0ad677d5028774df4d806fb6b050d`

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `a75f3ac` | chore(quick-261124-lfg): retirer le code prospection de la phase 9 |
| 2 (RED) | `e9027e1` | test(quick-261124-lfg): contrat de la migration drop_radar |
| 2 (GREEN) | `282134c` | feat(quick-261124-lfg): migration drop_radar idempotente |
| 3 | `ef7577c` | docs(quick-261124-lfg): parker le jalon v1.3 Prospection |

## Task 1 : code phase 9 retiré

Fichiers supprimés (14) :

- `app/api/prospection/settings/route.ts`
- `components/settings/prospection-settings-card.tsx`
- `lib/prospection/company-identity.ts`, `company-identity.test.ts`, `constants.ts`, `migration-contract.test.ts`, `no-dead-providers.test.ts`, `settings.ts`, `settings.test.ts`, `settings-route.test.ts`
- `lib/queries/prospection-settings.ts`
- `lib/validation/prospection-settings.ts`
- `lib/types/prospection.ts`
- `supabase/migrations/20261124150326_prospection_domain.sql` (jamais appliquée)

Fichiers rétablis à `68383fe` (`git diff 68383fe` vide ; le diff vs BASE ne contient que des lignes retirées, toutes liées à la prospection) : `app/settings/organization/page.tsx` (-4), `lib/queries/index.ts` (-2), `lib/queries/keys.ts` (-4).

Fixtures de `lib/utils/supabase-write-error.test.ts` renommées (`radar_companies` → `candidates`, `radar_actions` → `positionings`, opérations idem) ; assertions inchangées, 6/6 tests verts.

Garde-fou `git grep -liE 'prospect|radar'` (hors .planning/.claude/.cursor/.agents/docs) : uniquement `DESIGN.md`, `app/landing.css`, `AnalysisCharts.tsx` (RadarChart recharts), `components/landing/landing.tsx`, `next-esn-local.sql`, les 7 anciennes migrations radar, plus la nouvelle migration `drop_radar` et son test. Aucun autre fichier.

## Task 2 : migration drop_radar

`supabase/migrations/20261124153210_drop_radar.sql`, dans l'ordre :

1. `DROP FUNCTION IF EXISTS public.match_consultants(vector, text, double precision, integer)`
2. `DROP TABLE IF EXISTS` : `radar_matches`, `radar_signals`, `radar_prospect_scores`, `radar_actions`, `radar_consultants`, `radar_companies`, `radar_run_logs`, `radar_org_settings` (tous `public.`)
3. `DROP TYPE IF EXISTS` : `signal_source`, `heat_level`, `availability_status`, `action_type`, `action_outcome`, `radar_source` (tous `public.`)

Les index `idx_radar_*` (dont les 2 ivfflat) et les policies RLS radar partent avec leurs tables. Les colonnes `linkedin_discovery` / `linkedin_context_id` vivent sur `radar_org_settings` et partent avec elle.

**Volontairement conservé :** l'extension `vector` (pgvector), ses migrations, toutes les tables non radar.

Test de contrat `supabase/drop-radar-migration.test.ts` : 9 tests (fichier unique à 14 chiffres, uniquement des `DROP … IF EXISTS public.…`, 8 tables exactes, 6 types exacts, signature de la fonction, fonction et tables avant les types, ordre des FK, ni CASCADE ni DROP EXTENSION ni écriture, aucune table conservée). RED constaté (9 échecs, fichier absent), puis GREEN (9/9).

### Recette Postgres jetable (Docker `pgvector/pgvector:pg17`, local, aucun accès distant)

Script non commité : scratchpad de session `recette-drop-radar.sh`. Stub `auth.jwt()` → `'{}'::jsonb`.

```
apply 20260401102200_001_enable_pgvector.sql -> exit 0
apply 20260401102300_radar_tables.sql -> exit 0
apply 20260401102400_radar_linkedin_discovery.sql -> exit 0
apply 20260401102600_001_radar_run_logs.sql -> exit 0
apply 20260401103000_001_linkedin_context.sql -> exit 0
apply 20260401103100_radar_source_linkedin_discovery.sql -> exit 0
apply 20260401104900_radar_org_settings.sql -> exit 0
apply 20260402165214_radar_signals_matches_rls.sql -> exit 0
== avant drop_radar
 radar_tables | radar_types | match_fn | vector_ext | keep_me_table
            8 |           6 |        1 |          1 |             0
drop_radar passe 1 -> exit 0
drop_radar passe 2 -> exit 0        (NOTICE … does not exist, skipping ×15)
== après drop_radar
 radar_tables | radar_types | match_fn | vector_ext | keep_me_table
            0 |           0 |        0 |          1 |             1
keep_me rows=1
== base vierge (sans pgvector)
drop_radar sur base vierge -> exit 0   (NOTICE: type "vector" does not exist, skipping)
drop_radar sur base vierge, passe 2 -> exit 0
```

Conteneur arrêté (`--rm`, plus aucun conteneur `lfg-drop-radar`).

Observation : dans l'ordre chronologique des migrations, `20260401102400` et `20260401103000` s'exécutent avant la création de `radar_org_settings` (`20260401104900`) et sautent donc leurs `ALTER` ; sans incidence ici, la table et toutes ses colonnes partent ensemble.

## Task 3 : jalon v1.3 parké

- `.planning/milestones/v1.3-ROADMAP.md` : note de parking + section v1.3 et « Phase Details » 9–14 copiées telles quelles.
- `.planning/milestones/v1.3-REQUIREMENTS.md` : copie intégrale de l'ancien REQUIREMENTS.md, en-tête « Parké 2026-11-24 ».
- `.planning/REQUIREMENTS.md` : plus de jalon actif, liens vers les archives (v1.1 n'a pas de fichier d'archive dédié ; c'est indiqué).
- `.planning/ROADMAP.md` : ligne ⏸ v1.3, note de parking (drop_radar non appliquée), bloc `<details>` PARKED, Phase Details 9–14 retirés, tableau Progress à « Parked ».
- `.planning/PROJECT.md` : « Current Milestone : aucun (v1.3 parké) », section « Parked Milestone : v1.3 Prospection », Requirements « Parked (v1.3) », Out of Scope « Prospection / radar », contrainte de scope v1.3 et contrainte coûts API (propre à la prospection) retirées, Key Decision ajoutée, Last updated.
- `.planning/STATE.md` : `status: parked`, `completed_plans: 3`, aucune phase active, décision, todos (drop_radar en prod après accord explicite ; crons radar sur `main`), blockers prospection parkés, next step mis à jour. Tableau « Quick Tasks Completed » non touché (laissé à l'orchestrateur).
- Aucun fichier modifié ni supprimé sous `.planning/phases/09-*` ni `.planning/research/` (`git diff --name-status BASE` vide).

## Vérification finale

- `npx vitest run` : 126 tests, 0 échec.
- `npx tsc --noEmit` : exit 0.
- `npx eslint` sur les 5 fichiers touchés : exit 0, aucun problème.
- `npx next build` (Turbopack) : exit 0, aucune route `/api/prospection` dans la liste. Pas besoin de `--webpack` : le lien symbolique `node_modules` n'a pas bloqué Turbopack (seul avertissement : racine du workspace inférée sur le checkout principal à cause des deux lockfiles, sans effet sur le build).
- Fichiers protégés inchangés vs BASE : `components/landing`, `app/landing.css`, `DESIGN.md`, `docs/`, `next-esn-local.sql`, `AnalysisCharts.tsx`, les 7 migrations radar et `20260401102200_001_enable_pgvector.sql`.
- `node_modules` (lien symbolique) non suivi par git.

## Deviations from Plan

None - plan executed exactly as written.

## Todo restant (utilisateur)

- Appliquer `supabase/migrations/20261124153210_drop_radar.sql` en prod — UNIQUEMENT après accord explicite.
- Crons radar encore présents dans `vercel.json` sur `main` (voir `09-PROXYCURL-AUDIT.md` §7).

## Threat Flags

Aucune nouvelle surface : une route API est supprimée ; la migration destructive est couverte par T-lfg-01 (IF EXISTS, `public.`, sans CASCADE, test de contrat, non appliquée).

## Self-Check: PASSED

- FOUND: supabase/migrations/20261124153210_drop_radar.sql
- FOUND: supabase/drop-radar-migration.test.ts
- FOUND: .planning/milestones/v1.3-ROADMAP.md
- FOUND: .planning/milestones/v1.3-REQUIREMENTS.md
- FOUND commits: a75f3ac, e9027e1, 282134c, ef7577c
