# Retrospective

## Cross-milestone trends

_(À enrichir au fil des milestones.)_

## Milestone: v1.0 — AI Workflow Reliability

**Shipped:** 2026-03-26  
**Phases:** 2 | **Plans:** 5

### What was built

- Contrat serveur : erreurs workflow → Supabase, parsing NDJSON côté client (`useWorkflowStream`).
- UI : boutons et loaders basés sur l’état serveur, toasts, invalidation cache.
- Sous-étapes : `workflow_last_error`, `errorStepKey`, `WorkflowStepList`, libellés FR.

### What worked

- Plans découpés par couche (API → hook → UI) avec résumés traceables.
- Schéma Zod + une source de vérité Supabase pour le statut workflow.

### What was inefficient

- État `STATE.md` / frontmatter parfois désynchronisé du disque — rafraîchir via `gsd-tools roadmap analyze` avant décisions.

### Key lessons

- Documenter les exigences en `[x]` avant `milestone complete` évite l’ambiguïté à la clôture.

---
