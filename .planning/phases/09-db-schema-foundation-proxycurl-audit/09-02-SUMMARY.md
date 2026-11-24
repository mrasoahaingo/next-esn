---
phase: 09-db-schema-foundation-proxycurl-audit
plan: 02
subsystem: api
tags: [prospection, settings, zod, react-query, shadcn, clerk, supabase]

requires:
  - phase: 09-01
    provides: "table prospection_settings, DEFAULT_HEAT_THRESHOLD / HEAT_THRESHOLD_MIN/MAX, ProspectionSettingsRow"
provides:
  - "GET/PUT /api/prospection/settings (lecture membre, écriture admin d'org, upsert onConflict org_id)"
  - "lib/prospection/settings.ts : getProspectionSettings, getProspectionHeatThreshold (source unique du seuil pour la gate Phase 13), toProspectionSettings"
  - "lib/validation/prospection-settings.ts : prospectionSettingsPutSchema"
  - "queryKeys.prospection + hooks useProspectionSettings / useUpdateProspectionSettings"
  - "ProspectionSettingsCard montée dans /settings/organization"
affects: [09-04, phase-13]

tech-stack:
  added: []
  patterns:
    - "Test de route Next sans Clerk ni supabase-js : vi.mock par factory sur @/lib/utils/auth et @/lib/utils/supabase + faux client chaînable"
    - "Saisie locale rattachée à l'org ({ orgId, raw }) au lieu d'un useLayoutEffect de seed (règle react-hooks/set-state-in-effect)"

key-files:
  created:
    - lib/validation/prospection-settings.ts
    - lib/prospection/settings.ts
    - lib/prospection/settings.test.ts
    - lib/prospection/settings-route.test.ts
    - app/api/prospection/settings/route.ts
    - lib/queries/prospection-settings.ts
    - components/settings/prospection-settings-card.tsx
  modified:
    - lib/queries/keys.ts
    - lib/queries/index.ts
    - app/settings/organization/page.tsx

key-decisions:
  - "Écart à D-04 : réglage placé dans /settings/organization (admin d'org) et non /admin (réservé au super admin par middleware.ts) — confirmation utilisateur au checkpoint 09-04 Task 3"
  - "GET ne crée jamais de ligne : sans ligne, { heat_threshold: 60, is_default: true } ; la ligne naît au premier PUT (D-03)"
  - "PUT : requireOrgAdmin avant toute lecture du corps ; JSON invalide → 400 ; org_id toujours issu de la session"
  - "Bouton « Enregistrer le seuil » désactivé si la valeur saisie égale la valeur effective (y compris le défaut 60 non enregistré)"

patterns-established:
  - "Route de réglage par org : GET requireOrgId + service de lecture ; PUT requireOrgAdmin + Zod + upsert onConflict org_id + select().single()"

requirements-completed: [CONT-04]

duration: 6min
completed: 2026-11-24
---

# Phase 9 Plan 02 : Réglage du seuil de chaleur (CONT-04) Summary

**Route GET/PUT `/api/prospection/settings` (Zod entier 0..100, `requireOrgAdmin`, upsert `onConflict: 'org_id'`), service `getProspectionHeatThreshold` défaut 60 sans création de ligne, et carte shadcn « Prospection » (Slider + Input) dans `/settings/organization`.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-11-24T14:07:30Z
- **Completed:** 2026-11-24T14:13:00Z
- **Tasks:** 2
- **Files modified:** 10 (7 créés, 3 modifiés)

## Accomplishments

- CONT-04 de bout en bout : carte → hooks React Query → route API → `prospection_settings`
- Autorisation, bornes et origine de l'`org_id` prouvées par 20 tests (12 validation/service, 8 route) ; suite complète 186/186
- `getProspectionHeatThreshold(orgId)` prêt pour la gate d'enrichissement de la Phase 13

## Écart à D-04

D-04 place le champ « dans la page admin existante ». Il est placé dans **`/settings/organization`** : `middleware.ts` réserve `/admin(.*)` (`isAdminRoute`) au super admin plateforme, alors que CONT-04 vise l'**admin d'org**, qui ne pourrait pas atteindre `/admin`. La page organisation est déjà gardée `isOrgAdmin || isSuperAdmin` côté UI (la carte n'est montée que si `canManage`), et l'API impose `requireOrgAdmin` (qui accepte aussi le super admin). Le reste de D-04 (DB + UI livrées dès la Phase 9, service lecture/upsert) est respecté. **Confirmation utilisateur demandée au checkpoint 09-04 Task 3.**

## Task Commits

1. **Task 1 (RED) : tests validation, service et route** - `3a3dfb4` (test)
2. **Task 1 (GREEN) : route GET/PUT, service, schéma Zod** - `71dfe66` (feat)
3. **Task 2 : hooks React Query et carte « Prospection »** - `fa84ad0` (feat)

## Files Created/Modified

- `lib/validation/prospection-settings.ts` - `prospectionSettingsPutSchema` (entier 0..100, clés inconnues retirées)
- `lib/prospection/settings.ts` - `toProspectionSettings`, `getProspectionSettings` (`.eq('org_id', orgId)`, `maybeSingle`), `getProspectionHeatThreshold`
- `app/api/prospection/settings/route.ts` - GET (`requireOrgId`) / PUT (`requireOrgAdmin` → JSON → Zod → upsert)
- `lib/prospection/settings.test.ts` - bornes, types, `org_id` injecté, défaut 60
- `lib/prospection/settings-route.test.ts` - 403 non-admin, 400 hors bornes / JSON invalide, upsert sur l'org de session, 500, GET 401, défaut sans écriture, valeur enregistrée
- `lib/queries/keys.ts` - `queryKeys.prospection.{all,settings}`
- `lib/queries/prospection-settings.ts` - `useProspectionSettings`, `useUpdateProspectionSettings`, type `ProspectionSettingsResponse`
- `lib/queries/index.ts` - exports des hooks et du type
- `components/settings/prospection-settings-card.tsx` - carte shadcn (`Card glass-panel border-0`, `Field`, `Slider`, `Input`, `Button`), formulaire propre, toasts sonner
- `app/settings/organization/page.tsx` - import + `{canManage ? <ProspectionSettingsCard /> : null}` après le ternaire du formulaire (ligne 480 > `</form>` ligne 476)

## TDD Gate Compliance

- RED : `3a3dfb4 test(09-02)` — échec constaté (modules introuvables)
- GREEN : `71dfe66 feat(09-02)` — 20/20 tests verts
- REFACTOR : aucun

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Seed de la saisie sans `useLayoutEffect`**
- **Found during:** Task 2
- **Issue:** le pattern prévu (ref `seededForOrg` + `setState` dans `useLayoutEffect`) déclenche l'erreur ESLint `react-hooks/set-state-in-effect`, qui ferait échouer `pnpm lint`.
- **Fix:** état `{ orgId, raw } | null` : sans saisie (ou après changement d'org), le champ affiche la valeur serveur ; dès que l'utilisateur modifie, sa saisie n'est plus écrasée par un refetch. Même garantie que Pitfall 8, sans effet.
- **Files modified:** components/settings/prospection-settings-card.tsx
- **Commit:** fa84ad0

**2. [Rule 2 - Correctness] JSON invalide → 400 explicite**
- **Found during:** Task 1
- **Issue:** `await req.json()` sur un corps non JSON lève une `SyntaxError` qui serait tombée en 500.
- **Fix:** `try/catch` local renvoyant 400 `{ error: 'Corps JSON invalide' }` (prévu par l'action du plan, couvert par un test).
- **Commit:** 71dfe66

**3. Style de la carte** : `Card className="glass-panel border-0"` (convention des cartes existantes : admin, dashboard) plutôt que `rounded-xl glass-panel` seul, pour neutraliser la bordure par défaut de `Card`.

## Issues Encountered

- `pnpm lint` (`eslint .`) remonte dans le worktree des erreurs préexistantes hors périmètre : scripts CommonJS de `.claude/get-shit-done/` et `.cursor/get-shit-done/` (`no-require-imports`) et 1 erreur dans `app/positions/[id]/page.tsx` (non modifié). Les fichiers de ce plan passent ESLint sans erreur ; `tsc --noEmit` exit 0 ; `vitest run` 186/186.

## Known Stubs

None.

## Threat Flags

None : la seule nouvelle surface (`/api/prospection/settings`) est couverte par T-09-08..T-09-12 (403 non-admin et 400 hors bornes sans appel Supabase, `org_id` de session, `console.error` limité au message d'erreur).

## Next Phase Readiness

- 09-04 : appliquer la migration, puis vérifier visuellement la carte (défaut 60 + mention « Valeur par défaut », enregistrement, rechargement) et faire confirmer l'écart à D-04
- Phase 13 : lire le seuil via `getProspectionHeatThreshold(orgId)` (serveur uniquement)

## Self-Check: PASSED

- FOUND: lib/validation/prospection-settings.ts, lib/prospection/settings.ts, lib/prospection/settings.test.ts, lib/prospection/settings-route.test.ts, app/api/prospection/settings/route.ts, lib/queries/prospection-settings.ts, components/settings/prospection-settings-card.tsx
- FOUND commits: 3a3dfb4, 71dfe66, fa84ad0

---
*Phase: 09-db-schema-foundation-proxycurl-audit*
*Completed: 2026-11-24*
