---
status: passed
phase: 03-positioning-mission-upload-inline-status
verified: 2026-03-26
---

# Phase 3 verification

## Automated

- `pnpm exec tsc --noEmit` — pass
- `pnpm exec eslint` sur fichiers modifiés (hub, gate, inline, queries) — pass

## Must-haves (FLOW-01, FLOW-02, FLOW-03)

1. **FLOW-01** : après création mission depuis le hub, pas de navigation vers `/positions/[id]` ; invariant documenté dans `page.tsx`.
2. **FLOW-02** : mission sélectionnée — bloc « Analyse de la fiche mission » avec étapes / `WorkflowStepList` lorsque l’analyse est active ou en erreur.
3. **FLOW-03** : CTA « Analyser le matching » désactivé tant que l’analyse n’est pas utilisable côté serveur ; texte d’aide depuis `getPositioningMatchingCtaState` + `aria-describedby` sur le bouton.

## human_verification

- (optionnel) Parcours manuel : création mission → rester sur l’URL hub → observer analyse inline puis activation du CTA quand l’analyse est prête.
