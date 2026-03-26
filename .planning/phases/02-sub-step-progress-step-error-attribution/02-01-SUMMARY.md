---
phase: 02-sub-step-progress-step-error-attribution
plan: 01
subsystem: api
tags: [workflow, ndjson, supabase, err-03]

requires: []
provides:
  - "Colonne JSONB workflow_last_error sur candidates, positionings, missions"
  - "NDJSON erreur avec stepKey optionnel + persistance diagnostic"
  - "useWorkflowStream.errorStepKey"
affects: [02-02, 02-03]

tech-stack:
  added: []
  patterns:
    - "handleWorkflowError(..., ctx?: { stepKey? }) + attachWorkflowStepKey sur erreurs d’étape"

key-files:
  created:
    - supabase/migrations/20260412_workflow_last_error.sql
    - lib/types/workflow-last-error.ts
    - lib/utils/workflow-step-error.ts
  modified:
    - lib/hooks/useWorkflowStream.ts
    - workflows/extract-cv.ts
    - workflows/analyze-job-posting.ts
    - workflows/positioning-analyze.ts
    - workflows/positioning-generate.ts
    - lib/queries/candidates.ts
    - lib/queries/missions.ts
    - lib/queries/positionings.ts

key-decisions:
  - "stepKey résolu via ctx, lecture sur Error, ou unknown"
  - "Succès terminal : workflow_last_error mis à null sur la ligne concernée"

patterns-established: []

requirements-completed: [ERR-03]

duration: 45min
completed: 2026-03-26
---

# Phase 02 Plan 01 — Persistance erreur par étape & flux NDJSON

**Migration `workflow_last_error`, hook `errorStepKey`, handlers workflow enrichis et clears au succès.**

## Self-Check: PASSED

## Accomplishments

- NDJSON d’erreur peut inclure `stepKey` ; le client expose `errorStepKey`.
- Les quatre workflows écrivent un JSON `{ stepKey, message }` en base à l’échec et l’effacent au succès.
