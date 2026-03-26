# Requirements: Next-ESN

**Defined:** 2026-03-26 (reset after v1.0 ship)
**Core value:** L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille

v1 reliability requirements are archived in `.planning/milestones/v1.0-REQUIREMENTS.md`.

## v2 candidates (not scheduled)

Pulled from the previous file — refine when the next roadmap is written.

### Latency

- **LAT-01**: Supabase Realtime subscriptions pour réduire le lag de polling
- **LAT-02**: Timestamp « dernière génération » sur les résultats

### Resilience

- **RES-01**: Succès partiel (une sous-étape échoue, afficher ce qui a réussi)
- **RES-02**: Relancer une sous-étape échouée sans tout refaire

## Out of scope (carry-over)

| Item | Reason |
|------|--------|
| Cancel fiable en vol | `@workflow/next` beta |
| Barres de % fictives | Préférer des étapes honnêtes |
| Tests automatisés | Dette connue |

---
*Reset after v1.0 AI Workflow Reliability — 2026-03-26*
