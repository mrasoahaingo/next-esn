---
phase: 02-sub-step-progress-step-error-attribution
plan: 03
subsystem: ui
tags: [workflow, toast, review, mission, positioning]

requires: [02-02]
provides:
  - "Parité UX sous-étapes sur les 4 surfaces streaming"
  - "Toasts préfixés par libellé d’étape (D-09)"
affects: []

tech-stack:
  added: []
  patterns:
    - "compute + WorkflowStepList sur review, mission, positioning row, wizard"

key-files:
  created: []
  modified:
    - app/review/[id]/page.tsx
    - app/review/components/ExtractionProgress.tsx
    - app/positions/[id]/page.tsx
    - components/mission-job-analysis.tsx
    - app/review/[id]/positioning/[positioningId]/page.tsx
    - app/review/[id]/positioning/[positioningId]/components/AnalysisView.tsx
    - app/review/[id]/positioning/[positioningId]/components/CvGenerationStep.tsx
    - app/review/[id]/positioning/[positioningId]/components/EmailsGenerationStep.tsx

key-decisions:
  - "ExtractionProgress délègue la rangée de pilules à WorkflowStepList quand des rows sont fournies"

patterns-established: []

requirements-completed: [SUB-01, SUB-02, ERR-03]

duration: 40min
completed: 2026-03-26
---

# Phase 02 Plan 03 — Câblage UI & toasts par étape

**WorkflowStepList + toasts contextualisés sur review CV, analyse mission, lignes positionnement et assistant positionnement.**

## Self-Check: PASSED

## Accomplishments

- Même pattern de liste d’étapes et résumé « Étape i/n — … » sur les écrans concernés.
- Toasts d’erreur mentionnent l’étape en échec (FR).
