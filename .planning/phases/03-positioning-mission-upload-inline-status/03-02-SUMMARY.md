---
phase: 03-positioning-mission-upload-inline-status
plan: 02
subsystem: ui
tags: [flow-02, flow-03, workflow, react-query]

requires:
  - phase: 03-01
    provides: "Invariant FLOW-01 sur hub"
provides:
  - "MissionDetail typé + getPositioningMatchingCtaState (FLOW-03)"
  - "PositioningMissionAnalysisInline + useWorkflowStream job posting"
  - "Hub : useMission, CTA gated, aria-describedby"
affects: [04]

tech-stack:
  added: []
  patterns:
    - "Gating CTA depuis détail mission useMission (champs serveur uniquement)"

key-files:
  created:
    - lib/utils/mission-positioning-gate.ts
    - components/positioning-mission-analysis-inline.tsx
  modified:
    - lib/queries/missions.ts
    - lib/queries/index.ts
    - app/review/[id]/positioning/page.tsx

key-decisions:
  - "Pas de toast succès sur le hub inline (surface silencieuse)"
  - "Textes d’aide CTA alignés sur 03-UI-SPEC (quatre états + stale + ERR-02)"

patterns-established: []

requirements-completed: [FLOW-02, FLOW-03]

duration: 90min
completed: 2026-03-26
---

# Phase 03 Plan 02 — Inline analyse mission & gating CTA

**Bloc « Analyse de la fiche mission » avec WorkflowStepList ; CTA « Analyser le matching » piloté par `getPositioningMatchingCtaState` et texte d’aide accessible.**

## Self-Check: PASSED

## Accomplishments

- Type `MissionDetail` + `useMission<MissionDetail>` pour aligner le client sur `GET /api/missions/[id]`.
- Utilitaires `hasPersistedJobAnalysis` / `getPositioningMatchingCtaState` (copies FR conformes au contrat UI pour les états principaux).
- Composant client `PositioningMissionAnalysisInline` réutilisant `computeJobPostingStepStates` + `WorkflowStepList` sans toast succès sur fin de flux.
- Page hub : `useMission(selectedMissionId)`, inline entre fiche et CTA, bouton désactivé selon état serveur + `aria-describedby`.

## Task Commits

Un commit applicatif regroupe les trois tâches (gate + composant + câblage).
