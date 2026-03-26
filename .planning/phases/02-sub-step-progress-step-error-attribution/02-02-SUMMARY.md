---
phase: 02-sub-step-progress-step-error-attribution
plan: 02
subsystem: ui
tags: [workflow, steps, badges]

requires: [02-01]
provides:
  - "Libellés FR et ordre par type de workflow"
  - "compute*StepStates pour statuts pending/running/done/error"
  - "WorkflowStepList présentation"
affects: [02-03]

tech-stack:
  added: []
  patterns:
    - "formatStepSummaryLine pour SUB-01"

key-files:
  created:
    - lib/workflow/workflow-step-labels.ts
    - lib/workflow/compute-step-status.ts
    - components/workflow/WorkflowStepList.tsx
  modified: []

key-decisions:
  - "Étapes job posting : executive, keyPoints, finalizing"

patterns-established: []

requirements-completed: [SUB-01, SUB-02]

duration: 30min
completed: 2026-03-26
---

# Phase 02 Plan 02 — Vocabulaire d’étapes & liste réutilisable

**Labels FR, fonctions pures de statut par workflow, composant WorkflowStepList (Card/Badge, aria-live).**

## Self-Check: PASSED

## Accomplishments

- Quatre familles de workflows couvertes avec branches parallèles reflétées dans les statuts `running`.
