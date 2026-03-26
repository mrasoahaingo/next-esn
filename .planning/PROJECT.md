# Next-ESN

## What This Is

Un SaaS pour les ESN (Entreprises de Services Numériques) qui les aide dans leur quotidien : gestion des CVs de consultants, analyse de missions, et positionnement de consultants sur des missions, le tout assisté par l'IA (extraction automatique, analyse, matching).

## Core Value

L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille — il sait ce qui se passe, ne peut pas lancer de doublons, et voit les erreurs quand ça échoue.

## Requirements

### Validated

- ✓ Upload et extraction de CV par IA — existing
- ✓ Création et analyse de missions/offres — existing
- ✓ Positionnement consultant ↔ mission avec génération de CV adapté — existing
- ✓ Authentification multi-tenant via Clerk (orgs, rôles) — existing
- ✓ Streaming des réponses IA via workflows Vercel — existing
- ✓ Dashboard avec statistiques (scores, compétences) — existing
- ✓ Export CV en PDF — existing
- ✓ Suivi des coûts IA (ai_usage_log) — existing
- ✓ Boutons de génération IA désactivés pendant un workflow ; état dérivé du serveur — v1.0
- ✓ Progression par sous-étape et badges par étape ; erreurs attribuées à l’étape — v1.0
- ✓ Erreurs workflow remontées à l’UI avec messages actionnables — v1.0
- ✓ Synchro React Query + reset store positionnement sur changement de contexte — v1.0

### Active

- [ ] Prochaine milestone : à définir (`/gsd-new-milestone`) — ex. latence Realtime, résilience partielle (voir `REQUIREMENTS.md` v2 candidates)

### Out of Scope

- Nouvelles features métier lourdes (matching avancé, CRM, notifications) — prioriser la fiabilité jusqu’à décision produit
- Refonte UX complète — hors scope sauf décision milestone
- Tests automatisés — dette connue
- Refactoring structurel global — hors scope sauf besoin bugfix

## Context

- Stack : Next.js 16, React 19, Supabase, Clerk, Vercel AI SDK, `@workflow/next` beta
- v1.0 fiabilité : statuts workflow persistés, flux NDJSON avec erreurs structurées, UI alignée sur Supabase, `workflow_last_error` + progression par étape
- Carte codebase : `.planning/codebase/`

## Constraints

- **Tech stack** : Next.js 16 + Supabase + Clerk + Vercel AI SDK — pas de changement de stack imposé
- **Workflow runtime** : `@workflow/next` beta — travailler avec ses limites
- **Scope** : éviter les features fonctionnelles non planifiées en milestone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus fiabilité avant features | L’UX de base doit être solide | ✓ v1.0 — workflows et UI alignés sur la vérité serveur |
| Garder le workflow runtime beta | Pas d’alternative mature équivalente | ✓ Accepté — handlers d’erreur + persistance compensent |
| `handleWorkflowError` colocalisé par fichier | Orchestrateurs `@workflow/next` | ✓ Statuts `error` + `workflow_last_error` cohérents |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-03-26 after v1.0 AI Workflow Reliability milestone*
