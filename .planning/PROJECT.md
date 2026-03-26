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

### Active

- [ ] Les boutons de génération IA sont désactivés pendant qu'un workflow tourne — empêcher les doublons
- [ ] Chaque workflow IA affiche un état de progression clair (pending → running → done/error)
- [ ] Les erreurs de workflow remontent à l'UI avec un message compréhensible
- [ ] Le state UI (React Query + Zustand) se synchronise correctement avec l'état réel des workflows
- [ ] Les sous-workflows (étapes intermédiaires visibles dans l'UI) affichent leur progression individuelle
- [ ] Aucun crash silencieux — toute erreur est visible par l'utilisateur

### Out of Scope

- Nouvelles features (matching avancé, CRM, notifications) — on fiabilise d'abord l'existant
- Refonte UX complète — on corrige la synchro, pas le design
- Tests automatisés — dette identifiée mais hors scope de ce milestone
- Refactoring de la structure (split des gros fichiers) — hors scope sauf si nécessaire pour corriger un bug

## Context

- App brownfield Next.js 16 + React 19 + Supabase + Clerk + Vercel AI SDK + Gemini 2.5 Flash
- 3 workflows IA principaux : extraction CV, analyse mission, positionnement — chacun avec des sous-étapes
- Le workflow runtime est en beta (`@workflow/next 4.0.1-beta`) — source potentielle d'instabilité
- Le store Zustand du positionnement est complexe (25+ champs) et fragile
- Les patterns d'erreurs sont inconsistants entre les routes API (mix throw/safeParse/catch silencieux)
- Aucun test existant dans la codebase
- Codebase map complète disponible dans `.planning/codebase/`

## Constraints

- **Tech stack**: Next.js 16 + Supabase + Clerk + Vercel AI SDK — pas de changement de stack
- **Workflow runtime**: `@workflow/next` beta — travailler avec ses limitations, pas le remplacer
- **Scope**: Fiabilisation uniquement — pas de nouvelles features fonctionnelles

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus fiabilité avant features | L'UX de base doit être solide avant d'ajouter des fonctionnalités | — Pending |
| Garder le workflow runtime beta | Pas d'alternative mature équivalente, on travaille avec | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-26 after initialization*
