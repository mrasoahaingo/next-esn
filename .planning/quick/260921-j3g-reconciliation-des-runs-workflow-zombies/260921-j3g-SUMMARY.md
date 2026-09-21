---
phase: quick
plan: 260921-j3g
subsystem: workflow-reliability
tags: [workflow, reconciliation, supabase, ui-state, tdd]
requires: []
provides:
  - WORKFLOW_ZOMBIE_TIMEOUT_MS
  - decideWorkflowReconciliation
  - reconcileWorkflowRecord
  - reconcileWorkflowRunById
  - StepStatus.reconnecting
  - useWorkflowStream.runTerminated
affects:
  - app/api/workflow/[runId]/stream/route.ts
  - app/api/positioning/[id]/route.ts
  - app/api/candidates/[id]/route.ts
tech-stack:
  added: []
  patterns:
    - "Réconciliation best-effort déclenchée à la lecture (pas de cron)"
    - "Logique de décision pure isolée de l'IO pour être testable sans mock"
key-files:
  created:
    - supabase/migrations/20260921135225_workflow_started_at.sql
    - lib/services/workflow-reconcile.ts
    - lib/services/workflow-reconcile.test.ts
    - lib/workflow/compute-step-status.test.ts
  modified:
    - app/api/workflow/[runId]/stream/route.ts
    - app/api/positioning/[id]/route.ts
    - app/api/candidates/[id]/route.ts
    - app/api/positioning/generate/route.ts
    - app/api/extract/route.ts
    - app/api/upload/route.ts
    - app/api/missions/[id]/upload/route.ts
    - lib/services/positioning-analyze-trigger.ts
    - lib/hooks/useWorkflowStream.ts
    - lib/workflow/compute-step-status.ts
    - components/workflow/WorkflowStepList.tsx
    - app/review/[id]/positioning/[positioningId]/page.tsx
decisions:
  - "Colonne dédiée workflow_started_at plutôt que updated_at (aucun trigger dans le projet) ou l'API workflow (pas de date de démarrage fiable)"
  - "Timeout zombie à 15 min : marge x5 sur des analyses typiques de 1 à 3 min"
  - "Réconciliation à la lecture plutôt qu'un cron : elle se déclenche là où l'utilisateur regarde l'état"
  - "Sans startedAt (lignes antérieures à la migration), on ne marque jamais error : pas de preuve d'ancienneté"
metrics:
  duration: ~25 min
  completed: 2026-09-21
---

# Quick 260921-j3g : Réconciliation des runs workflow zombies — Résumé

Réconciliation serveur des lignes bloquées en statut actif quand le run workflow meurt sans exception applicative, plus un état UI honnête (`reconnecting`) au lieu de 5 étapes figées en « En attente ».

## Ce qui a été fait

**Task 1 — Service de réconciliation + colonne `workflow_started_at`** (`f77e9be` RED, `5ac98bf` GREEN)

`lib/services/workflow-reconcile.ts` expose une logique de décision **pure** (`decideWorkflowReconciliation`, aucun IO, aucun mock nécessaire pour la tester) et deux couches IO best-effort :

- `settle` : run `completed` **avec** données sauvegardées → statut terminal normal (`analyzing→analyzed`, `generating→generated`, `extracting|uploaded→reviewing`), `workflow_run_id` remis à null.
- `fail` : run `failed`/`cancelled`, run inexistant, run `completed` sans données, ou run non terminal dépassant `WORKFLOW_ZOMBIE_TIMEOUT_MS` → `status: 'error'` + `workflow_last_error` en français.
- `none` : run vivant et récent, `startedAt` inconnu, ou ligne déjà dans un statut non actif (idempotence).

Migration `20260921135225_workflow_started_at.sql` idempotente (`ADD COLUMN IF NOT EXISTS`) sur `positionings` et `candidates`, timestamp obtenu via `date +%Y%m%d%H%M%S`.

**Task 2 — Câblage serveur** (`d9e7f15`)

- `GET /api/workflow/[runId]/stream` réconcilie la ligne dans la branche run terminal (réponse enrichie `{ status, reconciled }`) **et** dans la branche run introuvable avant le 404.
- `GET /api/positioning/[id]` et `GET /api/candidates/[id]` réconcilient les lignes en statut actif et renvoient l'état réconcilié dans la même réponse (pas de relecture supplémentaire).
- Les 6 sites de démarrage écrivent `workflow_started_at` dans le même `.update({...})`.

**Task 3 — Hook client** (`420227e`)

Les deux sorties silencieuses de la reconnexion (`!response.ok` avec statut terminal, et `Content-Type: application/json`) restent dans le `try` : le `finally` déclenche donc `onFinish` → invalidation React Query → refetch de l'état réconcilié par la Task 2. Un run `failed`/`cancelled` pose une `error` lisible. Nouveau champ `runTerminated` exposé par le hook.

**Task 4 — État UI `reconnecting`** (`fab95c3` RED, `566bfb2` GREEN)

`StepStatus` gagne `'reconnecting'`, appliqué par un helper partagé dans les 4 `compute*StepStates` quand le run est actif côté serveur mais qu'aucun événement n'a été rejoué. `computePositioningGenerateStepStates` reçoit enfin le paramètre `workflowRunActive` manquant (aligné sur ses 3 fonctions sœurs) et est câblé sur la page de review. Badge « Reprise du suivi… » en variant `outline`.

## Vérification

| Commande | Résultat |
| --- | --- |
| `npx vitest run` | 12 fichiers, **86 tests passés**, 0 échec |
| `npx vitest run lib/services/workflow-reconcile.test.ts` | 13 passés |
| `npx vitest run lib/workflow/compute-step-status.test.ts` | 9 passés |
| `npx tsc --noEmit` | 0 erreur |
| `npx eslint` sur les fichiers touchés | 0 erreur |

Cycle TDD respecté sur les deux tâches `tdd="true"` : échec constaté avant implémentation (module introuvable pour la Task 1, 2 assertions rouges sur `computePositioningGenerateStepStates` pour la Task 4), commit `test(...)` puis commit d'implémentation.

Le scénario manuel de non-régression (positioning en `analyzing` pointant vers un run mort) n'a pas été rejoué : il demande une base avec la migration appliquée et un run réel. La migration doit être appliquée avant déploiement.

## Déviations par rapport au plan

**1. [Règle 3 - Blocage] `next lint --file` n'existe plus en Next.js 16**

- **Trouvé pendant :** Task 2, commande de vérification du plan
- **Problème :** `npx next lint --file <path>` renvoie `error: unknown option '--file'` (la commande a été retirée de Next 16).
- **Correctif :** vérification équivalente via `npx eslint <fichiers>`, qui utilise la même config `eslint.config.mjs`.
- **Fichiers modifiés :** aucun
- **Commit :** `d9e7f15`

**2. [Règle 2 - Correction] Réponse GET reconstruite au lieu d'une relecture**

- **Trouvé pendant :** Task 2
- **Problème :** le plan laissait le choix entre relire la ligne et appliquer la décision sur l'objet renvoyé.
- **Correctif :** application de la décision sur l'objet déjà en mémoire — un aller-retour Supabase en moins, et cohérence garantie avec l'update qui vient d'être fait.
- **Fichiers modifiés :** `app/api/positioning/[id]/route.ts`, `app/api/candidates/[id]/route.ts`
- **Commit :** `d9e7f15`

## Observations hors périmètre (non corrigées)

- `vitest run` collecte aussi des tests dans `.claude/worktrees/agent-aade05bced46a7d43/` (worktree résiduel). Ils passent, mais l'`include` de `vitest.config.ts` gagnerait à exclure ce répertoire.
- 4 warnings ESLint préexistants dans `app/review/[id]/positioning/[positioningId]/page.tsx` (imports inutilisés, une dépendance `useCallback` manquante) — sans rapport avec cette tâche.

## Known Stubs

Aucun.

## Self-Check: PASSED

Fichiers créés vérifiés présents :
- `lib/services/workflow-reconcile.ts` — FOUND
- `lib/services/workflow-reconcile.test.ts` — FOUND
- `lib/workflow/compute-step-status.test.ts` — FOUND
- `supabase/migrations/20260921135225_workflow_started_at.sql` — FOUND

Commits vérifiés présents : `f77e9be`, `5ac98bf`, `d9e7f15`, `420227e`, `fab95c3`, `566bfb2`.
