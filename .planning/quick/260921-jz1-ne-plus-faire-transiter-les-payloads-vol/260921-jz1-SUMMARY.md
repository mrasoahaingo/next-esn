---
phase: quick
plan: 260921-jz1
subsystem: workflow-reliability
tags: [workflow, payload-boundary, observabilite, toast, ui-state, tdd]
requires:
  - decideWorkflowReconciliation
  - reconcileWorkflowRecord
provides:
  - resolveWorkflowOutcome
  - WORKFLOW_GENERIC_FAILURE_MESSAGE
  - POSITIONING_ANALYSIS_SUCCESS_STATUSES
  - POSITIONING_GENERATE_SUCCESS_STATUSES
  - CV_EXTRACTION_SUCCESS_STATUSES
  - workflowLastError.runId
affects:
  - workflows/positioning-analyze.ts
  - workflows/positioning-generate.ts
  - workflows/extract-cv.ts
  - workflows/analyze-job-posting.ts
  - lib/services/ai-usage.service.ts
  - app/positions/[id]/page.tsx
  - app/review/[id]/positioning/[positioningId]/page.tsx
tech-stack:
  added: []
  patterns:
    - "Persistance dans le step producteur ; la frontière durable ne porte qu'un accusé { id, durationMs, persisted }"
    - "Décision de notification adossée à l'état relu en base, pas à la fin du flux"
    - "Report d'échec best-effort : console.error contextuel, jamais de throw"
key-files:
  created:
    - lib/workflow/workflow-outcome.ts
    - lib/workflow/workflow-outcome.test.ts
    - lib/utils/llm-log-payload.test.ts
  modified:
    - workflows/positioning-analyze.ts
    - workflows/positioning-generate.ts
    - workflows/extract-cv.ts
    - workflows/analyze-job-posting.ts
    - lib/services/ai-usage.service.ts
    - lib/types/workflow-last-error.ts
    - lib/services/workflow-reconcile.ts
    - lib/services/workflow-reconcile.test.ts
    - app/review/[id]/positioning/[positioningId]/page.tsx
    - app/positions/[id]/page.tsx
decisions:
  - "Aucune migration : runId vit dans la colonne JSONB workflow_last_error existante, et reste optionnel pour les lignes déjà en base"
  - "Frontière prepareCvText -> parallelExtractAndStream conservée : cvText est borné par la taille du document et la séparation sert la reprise après échec de transcription"
  - "prepareDurationMs et transcriptionModelId passés en scalaires au step d'extraction pour que la fusion des modèles et le cumul de durée restent identiques"
  - "Erreur de persistance non attribuée à une branche LLM : pas d'attachWorkflowStepKey, stepKey reste 'unknown'"
metrics:
  duration: ~35 min
  completed: 2026-09-21
---

# Quick 260921-jz1 : Ne plus faire transiter les payloads volumineux — Résumé

Les 4 workflows persistent désormais leur résultat dans le step qui le produit ; les frontières durables ne portent plus qu'un accusé `{ id, durationMs, persisted }`. En parallèle, les échecs redeviennent visibles : logs d'observabilité non avalés, toast adossé à l'état persisté, ligne en erreur affichée et relançable sur la page mission, `runId` conservé dans `workflow_last_error`.

**Aucun écart sensible au plan sur la Task 1** : la sémantique listée dans les contraintes est préservée à l'identique (statut final, `workflow_run_id`/`workflow_last_error` remis à null, fusion `cv`/`emails`, ordre `releaseLock` → `close`, attribution d'erreur par `attachWorkflowStepKey` sur les branches LLM uniquement).

## Vérification de la prémisse corrigée (valeur de retour des workflows)

Le plan affirmait qu'aucun appelant ne lit la valeur de retour des workflows. C'est inexact : `app/api/radar/runs/route.ts:30` fait bien `await run.returnValue.catch(() => null)` et l'expose dans le champ `result`.

Vérification menée : cet endpoint est générique, mais son unique consommateur est `app/(dashboard)/radar/components/radar-settings-form.tsx`. Le polling (ligne ~98) n'interroge que les runIds présents dans l'état local `manualRuns`, alimenté exclusivement par `registerRuns(...)` — appelé sur les 6 réponses des endpoints de refresh Radar (`/api/radar/refresh`, crons collect/score, freelance-paris, linkedin-agent-browser). **Aucun runId de positionnement, d'extraction CV ou d'analyse de fiche ne peut atteindre `/api/radar/runs`.** Les 4 workflows modifiés ne sont donc lus par personne via `returnValue`, mais la justification correcte est celle-ci, pas « personne ne lit la valeur de retour ».

## Ce qui a été fait

**Task 1 — positioning-analyze / positioning-generate** (`91dd75d`)

`fetchAndAnalyze` écrit directement l'update (`analysis`, `status: 'analyzed'`, `ai_analysis_duration_ms`, `workflow_run_id: null`, `workflow_last_error: null`, `analysis_recruiter_answers`, `ai_analysis_models`), contrôle le `{ error }` et lève `saveAnalysis DB update failed: …` le cas échéant, puis relit `answers, candidate_id` et appelle `logPositioningAnalysisSnapshot` avec `reason: 'workflow_completed'` à l'identique. Retour : `{ positioningId, durationMs, persisted }`.

`fetchAndGenerate` : les trois branches `generateMode` sont déplacées littéralement — `'all'` en update complet, sinon relecture de la ligne, cumul `prevMs + durationMs`, fusion `{ ...prevByTask, ...modelsSnapshot.byTask }` puis `uniqueModels` trié, update restreint aux colonnes du mode. Garde `if (!object)` → `{ …, persisted: false }` sans écriture.

`saveAnalysis` / `saveGeneration` remplacés par `closeAnalysisStream()` / `closeGenerateStream()` (steps minimaux sans argument), appelés après le step producteur donc après son `writer.releaseLock()`.

**Task 2 — extract-cv / analyze-job-posting** (`7a37dae`)

`parallelExtractAndStream` reçoit deux scalaires supplémentaires (`prepareDurationMs`, `transcriptionModelId`) pour reproduire à l'identique ce que le corps du workflow calculait avant l'appel à `saveResult` : injection de `TASK_KEY.CV_TRANSCRIPTION` dans `byTask`, `uniqueModels` trié, `durationMs` cumulé prep + extraction. Détection de langue (`lang === 'en' ? 'en' : 'fr'`) et `throw new Error('saveResult DB update failed: …')` conservés. `runMissionAnalysesAfterExtract` reste inchangé et s'exécute toujours après.

La frontière `prepareCvText` → `parallelExtractAndStream` est volontairement conservée : `cvText` est borné par la taille du document, et la séparation en step distinct permet la reprise sans refaire la transcription.

`analyze-job-posting` : update `job_analysis` / `job_analysis_input_hash` / `ai_job_analysis_models` / `job_analysis_workflow_run_id: null` / `workflow_last_error: null` déplacé dans `fetchAndAnalyze` avec la garde `object != null && typeof object === 'object'` et contrôle du `{ error }`.

**Task 3 — observabilité serveur** (`4cbaeba` RED, `91a6d70` GREEN)

`reportAiUsageLogFailure` (non exportée) émet un unique `console.error` avec `taskKey`, identifiants et `approxPayloadBytes` — jamais le contenu du payload (T-jz1-03). `approxPayloadBytes` retourne `-1` si `JSON.stringify` échoue, sans jamais lever. Câblé dans `logAiUsage` (typée `Promise<void>`), `insertAiUsageStart` et `updateAiUsageEnd` ; aucune ne relance, le log reste best-effort.

`workflowLastErrorSchema` gagne `runId: z.string().optional()`. `decideWorkflowReconciliation` reçoit `runId: string | null` et `failWith(message, runId)` pose `...(runId ? { runId } : {})` ; `reconcileWorkflowRecord` passe `row.workflow_run_id`. Aucune migration.

**Task 4 — toast honnête** (`6551a43` RED, `c5acef5` GREEN)

`lib/workflow/workflow-outcome.ts` : `resolveWorkflowOutcome` pur (aucun IO, aucun import React), `WORKFLOW_GENERIC_FAILURE_MESSAGE` et les trois jeux de statuts de succès en constantes.

Les quatre `onFinish` concernés sont devenus `async` : ils attendent l'invalidation de la query de détail, relisent la donnée fraîche via `getQueryData`, et n'émettent un toast que sur une issue conclue. Toutes les invalidations existantes sont conservées. Le toast d'erreur n'apparaît que sur un statut persisté `'error'` — les `useEffect` existants sur `stream.error` restent en place sans double toast, puisque les deux chemins ne se déclenchent pas sur la même condition. Libellés réaccentués (« Analyse terminée avec succès », « Génération terminée avec succès », « Extraction terminée avec succès »).

**Task 5 — groupe « En échec »** (`2c96649`)

`FAILED_STATUSES`, entrée `error: { label: 'Échec', variant: 'destructive' }` dans `posStatusConfig`, liste `failed`, et une section `aria-labelledby="positionings-failed"` rendue avant « En cours » (icône `AlertTriangle` en `text-destructive`, `Badge variant="destructive"`). Séparateurs `border-t` ajustés sur les deux sections suivantes. Sous chaque ligne en échec : message `p.workflow_last_error?.message` (repli `WORKFLOW_GENERIC_FAILURE_MESSAGE`) et bouton shadcn `Button variant="outline" size="xs"` « Relancer l'analyse » appelant `analysisStream.submit({ positioningId: p.id })`, désactivé pendant `analysisStream.isLoading` (T-jz1-02). Le message de pied « Aucun profil prêt pour l'instant… » reste conditionné à `drafts.length > 0`, il ne s'affiche donc pas quand seules des lignes en échec existent.

## Vérification

| Commande | Résultat |
| --- | --- |
| `npx tsc --noEmit` | 0 erreur |
| `npx vitest run` | 14 fichiers, **100 tests passés**, 0 échec (86 existants + 14 nouveaux) |
| `npx vitest run lib/workflow/workflow-outcome.test.ts` | 6 passés |
| `npx eslint` sur les fichiers touchés | 0 erreur introduite |
| `grep -n "return {" workflows/*.ts` | aucune valeur de retour de step ne contient `object` |
| Migration Supabase | aucune créée |

Cycle TDD respecté sur les deux tâches `tdd="true"` :
- Task 4 : RED franc (`Cannot find module '@/lib/workflow/workflow-outcome'`), commit `test(...)` puis `feat(...)`.
- Task 3 : RED partiel — les 2 tests `runId` échouaient avant implémentation, mais les 4 tests `serializeLlmLogPayload` passaient d'emblée (la fonction existait déjà ; le plan les demandait comme couverture de non-régression des plafonds, pas comme spécification d'un comportement nouveau). Commit `test(...)` puis `feat(...)` malgré tout.

Les trois `<human-check>` du plan n'ont pas été rejoués : ils demandent une base réelle et un run workflow (relance d'analyse, upload de CV, passage manuel d'une ligne en `status='error'`). À faire avant déploiement.

## Déviations par rapport au plan

**1. [Règle 3 - Blocage] `parallelExtractAndStream` reçoit deux paramètres supplémentaires**

- **Trouvé pendant :** Task 2
- **Problème :** la fusion `modelsSnapshot` + modèle de transcription et le cumul `prep.durationMs + ext.durationMs` étaient calculés dans le corps du workflow, entre les deux steps. Persister dans le step producteur sans ces deux valeurs aurait changé `ai_extraction_models` et `ai_extraction_duration_ms`.
- **Correctif :** `prepareDurationMs: number` et `transcriptionModelId: string | undefined` passés en arguments scalaires (aucun payload volumineux ajouté à la frontière), calcul déplacé à l'identique dans le step.
- **Fichiers modifiés :** `workflows/extract-cv.ts`
- **Commit :** `7a37dae`

**2. [Règle 3 - Blocage] Type local `PersistedPositioningState` sur la page de review**

- **Trouvé pendant :** Task 4
- **Problème :** le plan interdit `any` pour la donnée relue, mais `PositioningWorkflowDiagnostics` ne porte que `workflow_last_error`, pas `status`.
- **Correctif :** type local `PositioningWorkflowDiagnostics & { status?: string | null }` déclaré après les imports.
- **Fichiers modifiés :** `app/review/[id]/positioning/[positioningId]/page.tsx`
- **Commit :** `c5acef5`

**3. [Règle 3 - Blocage] `invalidateMission` remplacé par `refetchMissionDetail`**

- **Trouvé pendant :** Task 4
- **Problème :** `invalidateMission` était synchrone et ne rendait pas la donnée relue ; conservé tel quel il devenait du code mort (warning lint).
- **Correctif :** helper `refetchMissionDetail(): Promise<MissionDetail | undefined>` qui `await` l'invalidation du détail, conserve les deux autres invalidations et retourne la mission fraîche typée. `invalidateMission` supprimé (plus aucun appelant).
- **Fichiers modifiés :** `app/positions/[id]/page.tsx`
- **Commit :** `c5acef5`

## Observations hors périmètre (non corrigées)

- `workflows/extract-cv.ts:8` — `logAiUsage` importé mais inutilisé : warning **préexistant** (vérifié sur `git show HEAD~…`), le symbole n'était déjà plus utilisé avant cette tâche.
- `app/positions/[id]/page.tsx` — erreur ESLint `react-hooks/set-state-in-effect` sur le `useEffect` `?positionner=1` : **préexistante**, vérifiée en lintant une copie de la version HEAD d'avant la tâche (même erreur, 1 occurrence). Sans rapport avec ce plan.
- `app/review/[id]/positioning/[positioningId]/page.tsx` — 4 warnings préexistants (imports inutilisés, dépendance `useCallback` manquante), déjà signalés dans le SUMMARY de `260921-j3g`.
- `vitest run` collecte toujours `.claude/worktrees/agent-aade05bced46a7d43/` (worktree résiduel) : l'`include` de `vitest.config.ts` gagnerait à l'exclure.

## Threat Flags

Aucune nouvelle surface de sécurité hors du registre du plan. `T-jz1-02` (relance en boucle) et `T-jz1-03` (fuite de payload dans les logs) sont mitigés comme prévu ; `T-jz1-SC` sans objet (aucune dépendance ajoutée).

## Known Stubs

Aucun.

## Self-Check: PASSED

Fichiers créés vérifiés présents :
- `lib/workflow/workflow-outcome.ts` — FOUND
- `lib/workflow/workflow-outcome.test.ts` — FOUND
- `lib/utils/llm-log-payload.test.ts` — FOUND

Commits vérifiés présents : `91dd75d`, `7a37dae`, `4cbaeba`, `91a6d70`, `6551a43`, `c5acef5`, `2c96649`.
