# Quick task 260326-x7n — Summary

## Done

- **Cause** : `computeJobPostingStepStates` retournait toutes les étapes en `done` dès que `!isStreaming && !workflowFailed`, ce qui arrive brièvement après ajout de mission alors que `job_analysis_workflow_run_id` est encore présent et que le client n’a pas encore ouvert le flux.
- **Fix** : option `workflowRunActive` — tant qu’un run est actif côté mission, on calcule les statuts détaillés (en général `pending` jusqu’aux métadonnées de flux), au lieu du raccourci global.
- **Fichiers** : `lib/workflow/compute-step-status.ts`, `components/positioning-mission-analysis-inline.tsx`, `components/mission-job-analysis.tsx`.
