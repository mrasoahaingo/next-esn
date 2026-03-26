# Milestones

## v1.0 AI Workflow Reliability (Shipped: 2026-03-26)

**Phases completed:** 2 phases, 5 plans, 4 tasks

**Key accomplishments:**

- try/catch error handlers in all 4 workflow orchestrators writing status 'error' to Supabase + NDJSON error frame parsing in useWorkflowStream
- UI wiring for workflow reliability (server-derived disabled state, toasts, cache invalidation)
- Migration `workflow_last_error`, hook `errorStepKey`, handlers workflow enrichis et clears au succès
- Labels FR, fonctions pures de statut par workflow, composant WorkflowStepList (Card/Badge, aria-live).
- WorkflowStepList + toasts contextualisés sur review CV, analyse mission, lignes positionnement et assistant positionnement.

---
