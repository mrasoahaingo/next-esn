---
status: passed
phase: 02-sub-step-progress-step-error-attribution
verified: 2026-03-26
---

# Phase 2 verification

## Automated

- `pnpm exec tsc --noEmit` — pass

## Must-haves (SUB-01, SUB-02, ERR-03)

1. Résumé « Étape i/n — … » via `formatStepSummaryLine` + `WorkflowStepList`.
2. Badges par ligne (`pending` / `running` / `done` / `error`) depuis `compute*StepStates`.
3. Erreurs : ligne concernée + toast préfixé par libellé d’étape ; persistance `workflow_last_error` pour rechargement.

## human_verification

- (optionnel) Valider en UI sur les 4 flux après déploiement migration Supabase.
