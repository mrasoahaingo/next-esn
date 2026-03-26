# Next-ESN

## What This Is

Un SaaS pour les ESN (Entreprises de Services Numériques) qui les aide dans leur quotidien : gestion des CVs de consultants, analyse de missions, et positionnement de consultants sur des missions, le tout assisté par l'IA (extraction automatique, analyse, matching).

## Core Value

L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille — il sait ce qui se passe, ne peut pas lancer de doublons, et voit les erreurs quand ça échoue.

## Current Milestone: v1.1 Réactivité, flux & résilience

**Goal:** Améliorer la réactivité perçue des états IA (Realtime, fraîcheur), fiabiliser les parcours quand une sous-étape échoue — et **corriger le flux positionnement** : création / upload de mission depuis `/review/[id]/positioning` sans rupture de parcours.

**Target features:**

- **Flux positionnement (priorité)** : rester sur `/review/[id]/positioning` après ajout / upload d’une mission ; afficher l’état d’analyse de l’offre **inline** ; n’activer le positionnement (CTA) que lorsque l’analyse mission est **terminée avec succès** (vérité serveur). Pas de redirection obligatoire vers la fiche mission puis retour manuel.
- **Réactivité** : réduire le décalage UI ↔ base (ex. Realtime Supabase là où c’est pertinent) ; afficher un horodatage « dernière génération » sur les résultats concernés.
- **Résilience** : succès partiel visible ; relance ciblée d’une sous-étape en échec sans tout relancer (dans les limites du runtime `@workflow/next` beta).

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

### Active (v1.1)

Voir `.planning/REQUIREMENTS.md` — exigences FLOW-*, LAT-*, RES-*.

### Out of Scope

- Nouvelles features métier lourdes (matching avancé, CRM, notifications push) — hors milestone sauf décision explicite
- Refonte UX globale hors périmètre des écrans concernés par v1.1
- Tests automatisés — dette connue
- Refactoring structurel global — hors scope sauf besoin bugfix
- **Cancel fiable d’un workflow en vol** — limites `@workflow/next` beta

## Context

- Stack : Next.js 16, React 19, Supabase, Clerk, Vercel AI SDK, `@workflow/next` beta
- v1.0 : statuts workflow persistés, NDJSON, UI alignée Supabase, sous-étapes + `workflow_last_error`
- Carte codebase : `.planning/codebase/`

## Constraints

- **Tech stack** : Next.js 16 + Supabase + Clerk + Vercel AI SDK — pas de changement de stack imposé
- **Workflow runtime** : `@workflow/next` beta — travailler avec ses limites
- **Scope** : pas de nouvelles features fonctionnelles hors exigences v1.1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus fiabilité avant features | L’UX de base doit être solide | ✓ v1.0 |
| Garder le workflow runtime beta | Pas d’alternative mature équivalente | ✓ v1.0 |
| `handleWorkflowError` colocalisé par fichier | Orchestrateurs `@workflow/next` | ✓ v1.0 |
| **Mission créée depuis la page positionnement** | Éviter aller-retour fiche mission ↔ positionnement | **v1.1** — rester sur `/review/[id]/positioning`, état d’analyse inline, CTA positionnement désactivé jusqu’à analyse mission OK |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-03-26 — milestone v1.1 scoped*
