---
phase: quick
plan: 260921-seo
subsystem: reliability
tags: [supabase, error-handling, observability, eslint, radar, workflow]
requires: [260921-ksd]
provides:
  - formatSupabaseWriteError / logSupabaseWriteError (forme de log uniforme)
  - contrat 500 sur POST /api/positioning/:id/export en cas d'échec de persistance
  - contrat 500 sur POST /api/workflow/:runId/cancel en cas d'échec de réinitialisation
  - règle ESLint no-restricted-syntax bloquant la réintroduction de la classe de bug
affects:
  - lib/queries/positionings.ts (onError toast)
  - lib/queries/workflow.ts (onError toast)
  - lib/radar/queries.ts (valeurs de retour non optimistes)
tech-stack:
  added: []
  patterns:
    - "lecture systématique de { error } sur toute chaîne supabase-js d'écriture"
    - "log à liste fermée de clés : aucune valeur métier ne peut fuiter"
key-files:
  created:
    - lib/utils/supabase-write-error.ts
    - lib/utils/supabase-write-error.test.ts
  modified:
    - app/api/positioning/[id]/export/route.ts
    - app/api/workflow/[runId]/cancel/route.ts
    - lib/queries/positionings.ts
    - lib/queries/workflow.ts
    - lib/services/job-posting-analyze-trigger.ts
    - lib/radar/queries.ts
    - app/api/radar/brief/route.ts
    - eslint.config.mjs
    - app/api/candidates/[id]/route.ts
    - app/api/extract/route.ts
    - app/api/positioning/generate/route.ts
    - lib/radar/matching.ts
    - lib/services/positioning-analyze-trigger.ts
decisions:
  - "PDF orphelin supprimé plutôt que conservé : regénérable à l'identique, et aucun écran ne permet de purger le bucket"
  - "cancelMissionJobAnalysisWorkflow passe de Promise<void> à Promise<boolean> sans lever : une réconciliation dégradée ne doit pas devenir un 500"
  - "enrichProspectLinkedIn retourne 0 quand rien n'est persisté : l'appelant ne doit jamais compter des contacts absents de la base"
  - "findOrCreateCompany ne reflète le SIREN dans son retour que s'il a réellement été persisté (fin du retour optimiste)"
  - "Règle ESLint core (no-restricted-syntax) plutôt que no-floating-promises typé : zéro dépendance, zéro analyse de types sur tout le repo"
  - "Les 6 sites révélés par la règle et absents de l'inventaire grep sont corrigés en log-only : aucun contrat d'API modifié hors des 3 sites de Classe A prévus"
metrics:
  duration: ~35 min
  tasks: 5
  files_changed: 15
  tests: 122 (116 existants + 6 nouveaux)
  completed: 2026-09-21
---

# Quick 260921-seo : Traiter les 11 écritures Supabase non contrôlées — Summary

Les écritures Supabase dont le `{ error }` n'était jamais lu remontent désormais leurs échecs :
500 explicite + toast français là où l'API confirmait un faux succès, log contextuel uniforme
partout ailleurs, et une règle ESLint qui rend la classe de bug non-réintroductible.

## Ce qui a été fait

### Task 1 — Utilitaire de log (TDD)

`lib/utils/supabase-write-error.ts` : fonction pure `formatSupabaseWriteError` (aucun import) +
enveloppe `logSupabaseWriteError`. Forme de log identique aux 4 `handleWorkflowError` de
`workflows/positioning-analyze.ts` : `table`, `recordId`, `operation`, `supabaseError`
(+ `code` / `details` / `hint` quand Supabase les fournit, omis sinon).

Cycle TDD respecté : RED franc constaté (`Cannot find module './supabase-write-error'`,
commit `cb4658e`) avant implémentation (commit `f0f54ac`). 6 tests.

Sécurité (T-seo-01) : la fonction recopie une **liste fermée** de clés — un `context` portant
`tailored_cv` ou `enrichment_data` ne peut pas les faire ressortir. Test 6 vérifie `Object.keys`
exact et l'absence de toute chaîne métier dans le JSON du résultat.

Écart mineur assumé sur le comportement de Test 4 : le plan disait « `String(...)` de la valeur »,
mais `String({})` vaut `[object Object]`, que le plan interdit explicitement dans la même phrase.
Implémenté donc : `message` si présent → sinon `JSON.stringify` pour les objets → sinon `String(...)`.
Une structure circulaire est absorbée (testée, ne lève pas).

### Task 2 — Classe A : les API cessent de mentir sur un succès

- **`export/route.ts`** : lit `{ error }`, logue, **supprime le PDF orphelin** du bucket
  `cv-formatted` (échec du nettoyage logué séparément, sans masquer l'erreur initiale), puis lève.
  Le `catch` existant produit le 500. Le choix de suppression est documenté en commentaire dans
  le code.
- **`cancel/route.ts`** : les 2 `update` lisent `{ error }` et lèvent. Commentaire en place :
  l'erreur signale que **la ligne** n'a pas été réinitialisée, pas que l'annulation du run a
  échoué ; relancer est idempotent (bloc `alreadyTerminal`).
- **Contrat client vérifié moi-même** : `useExportPositioning` et `useCancelWorkflow` lèvent déjà
  sur `!res.ok` — aucun appelant ne casse. Le `onError` a bien été ajouté dans **les deux** hooks
  (toast sonner français, `duration: 8000`), ce qui couvre les 9 sites appelants sans toucher un
  seul composant. Vérifié également que le `onSuccess` **local** de `handleExport`
  (`app/review/[id]/positioning/[positioningId]/page.tsx:800`) ne se déclenche pas en cas
  d'erreur : le téléchargement ne part donc plus sur un export non persisté.

### Task 3 — Classe A' : `job_analysis_workflow_run_id`

`cancelMissionJobAnalysisWorkflow` : `Promise<void>` → `Promise<boolean>`, logue et retourne
`false` si l'effacement échoue. Son unique appelant consomme la valeur et émet un `console.warn`
nommant la conséquence (mission non relançable) — sans interrompre le flux : le chemin `!claimed`
existant prend le relais. Le site de réconciliation logue sans lever, avec le commentaire liant le
log à la relecture `missionAfterClear` qui suit.

### Task 4 — Classe B : Radar best-effort

Les 6 sites lisent `{ error }` et loguent sans jamais faire échouer l'opération englobante.
Trois d'entre eux informent leur appelant :

| Site | Remontée |
|------|----------|
| `findOrCreateCompany` backfill SIREN | retour **non optimiste** : le SIREN n'apparaît dans l'objet que s'il a été persisté |
| `enrichProspectLinkedIn` | retourne `0` quand rien n'est persisté — signature `Promise<number>` inchangée |
| `upsertDiscoveredCompany` backfill LinkedIn | retour conservé, risque résiduel documenté en commentaire |

Les deux appelants de `enrichProspectLinkedIn` ont été vérifiés : `enrichHotProspects`
(`if (count > 0)`) et `app/api/radar/prospects/[id]/enrich/route.ts` (`{ contacts: 0 }`) traitent
déjà `0` comme « aucun contact enregistré ». Contrats inchangés.

### Task 5 — Règle ESLint de prévention

`no-restricted-syntax` (règle **core**, zéro dépendance, zéro analyse de types) sur
`app/**/*.ts`, `lib/**/*.ts`, `workflows/**/*.ts`. Sélecteur : `ExpressionStatement >
AwaitExpression CallExpression > MemberExpression[property.name='from']`. Une chaîne destructurée
est une `VariableDeclaration` et n'est pas signalée — la discrimination voulue fonctionne.

**La porte de sortie n'a pas eu à être utilisée** : 6 violations, soit bien en dessous du seuil de
10. Elles n'étaient pas des faux positifs.

## Deviations from Plan

### [Rule 2 — Fonctionnalité critique manquante] 6 sites hors inventaire corrigés

**Trouvé pendant :** Task 5, dès la première exécution de la règle.
**Problème :** la règle a révélé 6 écritures non contrôlées **absentes de l'inventaire des 11** —
confirmation directe que l'heuristique grep à fenêtre de 4 lignes du quick 260921-ksd était
non fiable, comme son SUMMARY l'annonçait.

| Fichier | Ligne | Écriture |
|---------|-------|----------|
| `app/api/extract/route.ts` | 15 | claim du `workflow_run_id` après `start()` |
| `app/api/positioning/generate/route.ts` | 73 | claim du `workflow_run_id` après `start()` |
| `lib/services/positioning-analyze-trigger.ts` | 47 et 130 | claim du `workflow_run_id` après `start()` |
| `app/api/candidates/[id]/route.ts` | 78 | `delete` en cascade des positionnements |
| `lib/radar/matching.ts` | 42 | purge de `radar_matches` avant réinsertion |

Les 4 premiers sont exactement la mécanique des runs zombies traitée au quick 260921-j3g : un run
démarré dont la ligne ne porte pas le `run_id`, donc invisible de la réconciliation.

**Correction :** `logSupabaseWriteError` uniquement — **aucun changement de contrat**. Un
`eslint-disable` aurait été possible mais aurait enterré six vraies occurrences de la classe de
bug que ce quick corrige. Aucun de ces sites ne lève, aucune réponse HTTP ne change, les 122 tests
restent au vert.

**Commit :** `2a1b793`

### [Écart de spécification] Sérialisation d'un `supabaseError` sans `message`

Voir Task 1 ci-dessus : `JSON.stringify` avant `String(...)` pour les objets, afin de respecter
l'interdiction de `[object Object]` énoncée dans le même critère.

## Deferred Issues (hors périmètre, non corrigés)

**`pnpm lint` ne sort PAS en 0 — et ne sortait déjà pas en 0 avant ce quick.** Mesuré
explicitement en relançant ESLint avec la configuration de `HEAD` :

| | erreurs | warnings |
|---|---------|----------|
| baseline (config avant ce quick) | 617 | 160 |
| après ce quick | 617 | 160 |

**Aucune régression** : les 6 violations introduites par la nouvelle règle ont toutes été
corrigées, `no-restricted-syntax` sort à 0. Les 617 erreurs préexistantes se répartissent en
`.claude/` (514, outillage agent en CJS → `@typescript-eslint/no-require-imports`), `.cursor/`
(102) et `app/positions/[id]/page.tsx:1506` (1, `react-hooks/set-state-in-effect`). Toutes hors
périmètre de ce quick (règle SCOPE BOUNDARY) et non touchées.

Recommandation pour un quick ultérieur : ajouter `.claude/**` et `.cursor/**` aux `ignores` de
`eslint.config.mjs` — ce sont des répertoires d'outillage, pas du code produit, et leur présence
rend `pnpm lint` inexploitable comme porte de qualité.

## Verification

| Commande | Attendu | Obtenu |
|----------|---------|--------|
| `npx tsc --noEmit` | 0 erreur | exit 0 |
| `npx vitest run` | ≥ 122 tests, 0 échec | **122 passed** (16 fichiers), exit 0 |
| `npx eslint` sur les fichiers touchés | propre | 0 issue |
| `no-restricted-syntax` sur tout le repo | 0 | **0** |
| `rtk proxy "npx next build"` | Compiled successfully | **✓ Compiled successfully in 62s**, exit 0 |
| `grep -c logSupabaseWriteError` (5 fichiers de sites) | ≥ 11 | **17** |
| `git diff --exit-code package.json` | inchangé | inchangé, aucune dépendance ajoutée |
| `ls supabase/migrations` | aucune migration ajoutée | 57 fichiers, inchangé |

## Commits

| Hash | Message |
|------|---------|
| `cb4658e` | test(quick-260921-seo): add failing tests for supabase write error formatting (RED) |
| `f0f54ac` | feat(quick-260921-seo): add supabase write error log utility (GREEN) |
| `a52da85` | fix(quick-260921-seo): fail export and cancel APIs when the supabase write fails |
| `407b7fb` | fix(quick-260921-seo): surface failed run_id clears in mission job analysis |
| `2bd6f53` | fix(quick-260921-seo): log radar best-effort write failures and report the risky ones |
| `2a1b793` | chore(quick-260921-seo): forbid ignoring supabase write results via eslint |

Aucun fichier étranger au plan n'a été stagé : `git diff --cached --name-only` contrôlé avant
chacun des 6 commits. Les modifications préexistantes du working tree (`app/globals.css`,
`app/layout.tsx`, `components/marketing/*`, `DESIGN.md`, `PRODUCT.md`, `pnpm-workspace.yaml`,
suppressions dans `.planning/phases/`) sont intactes et non commitées.

## Known Stubs

Aucun.

## Self-Check: PASSED

- `lib/utils/supabase-write-error.ts` — FOUND
- `lib/utils/supabase-write-error.test.ts` — FOUND
- Commits `cb4658e`, `f0f54ac`, `a52da85`, `407b7fb`, `2bd6f53`, `2a1b793` — tous présents dans `git log`
