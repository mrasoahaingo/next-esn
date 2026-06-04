# Next-ESN

## What This Is

Un SaaS pour les ESN (Entreprises de Services Numériques) qui les aide dans leur quotidien : gestion des CVs de consultants, analyse de missions, et positionnement de consultants sur des missions, le tout assisté par l'IA (extraction automatique, analyse, matching).

## Core Value

L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille — il sait ce qui se passe, ne peut pas lancer de doublons, et voit les erreurs quand ça échoue.

## Current Milestone: v1.2 Multi-langue

**Goal:** Permettre aux ESN de gérer des CVs et des missions en anglais — l’IA détecte la langue automatiquement, les artefacts générés restent dans la langue du document source, et les templates PDF s’adaptent.

**Target features:**

- **Détection langue** : auto-détection `fr|en` lors de l’extraction CV (branche identity) et de l’analyse mission ; override manuel dans la review CV / édition mission.
- **Artefacts IA langue-aware** : extraction CV, analyse mission, analyse de positionnement, CV tailored, emails — tous dans la langue du document source. Pour le positionnement cross-langue (CV fr × mission en), les artefacts suivent la langue de la **mission**.
- **Labels PDF** : `templates/cv-dossier-layout.ts` remplacé par un `CV_LABELS` map `{ fr: {...}, en: {...} }` ; les PDFs en anglais affichent `Skills`, `Experience`, `Education` etc.
- **Prompts LLM** : directive `{{language}}` injectée dans les prompts DB existants (pas de doublons de prompts). Renderer `lib/llm/template-render.ts` déjà compatible.
- **DB** : colonnes `language` ajoutées sur `candidates`, `missions`, `organization_settings.default_language`.

## Previous Milestone: v1.1 Réactivité, flux & résilience

**Goal:** Améliorer la réactivité perçue des états IA (Realtime, fraîcheur), fiabiliser les parcours quand une sous-étape échoue — et corriger le flux positionnement : création / upload de mission depuis `/review/[id]/positioning` sans rupture de parcours.

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
- ✓ Hub `/review/[id]/positioning` : pas de redirection `/positions` après création mission ; état d’analyse mission inline ; CTA matching selon vérité serveur (`FLOW-01`–`FLOW-03`) — Phase 3

### Active (v1.2)

Voir `.planning/REQUIREMENTS.md` — exigences LANG-*, PDF-*, PROMPT-*.

### Out of Scope

- Nouvelles features métier lourdes (matching avancé, CRM, notifications push) — hors milestone sauf décision explicite
- Refonte UX globale / i18n de l’UI applicative — trop large, décision explicite requise
- Tests automatisés — dette connue
- Refactoring structurel global — hors scope sauf besoin bugfix
- **Cancel fiable d’un workflow en vol** — limites `@workflow/next` beta
- **Radar (`lib/radar/brief.ts`) multi-langue** — prompt hardcodé en code, domaine séparé, hors v1.2
- **Clerk locale toggle (frFR/enUS)** — UI reste en français

## Context

- Stack : Next.js 16, React 19, Supabase, Clerk, Vercel AI SDK, `@workflow/next` beta
- v1.0 : statuts workflow persistés, NDJSON, UI alignée Supabase, sous-étapes + `workflow_last_error`
- Carte codebase : `.planning/codebase/`

## Constraints

- **Tech stack** : Next.js 16 + Supabase + Clerk + Vercel AI SDK — pas de changement de stack imposé
- **Workflow runtime** : `@workflow/next` beta — travailler avec ses limites
- **Scope** : pas de nouvelles features fonctionnelles hors exigences v1.2

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus fiabilité avant features | L’UX de base doit être solide | ✓ v1.0 |
| Garder le workflow runtime beta | Pas d’alternative mature équivalente | ✓ v1.0 |
| `handleWorkflowError` colocalisé par fichier | Orchestrateurs `@workflow/next` | ✓ v1.0 |
| **Mission créée depuis la page positionnement** | Éviter aller-retour fiche mission ↔ positionnement | **v1.1** — rester sur `/review/[id]/positioning`, état d’analyse inline, CTA positionnement désactivé jusqu’à analyse mission OK |

## Evolution

This document evolves at phase transitions and milestone boundaries.

| **Langue unique par document** | Prompts doivent rester maintenables sans doublons | — Pending |
| **Artifacts positionnement cross-langue → langue mission** | Destinataire = client final, pas le candidat | — Pending |
| **UI applicative reste FR** | Scope réduit, pas de framework i18n nécessaire | — Pending |
| **Colonnes language en DB + Zod + CV_LABELS** | Fondations v1.2 posées en Phase 06 | ✓ Phase 06 |
| **Guard console.warn placeholders non résolus** | Détection précoce des erreurs de template LLM | ✓ Phase 06 |

---
*Last updated: 2026-06-04 — Phase 06 complete: DB migrations, Zod schemas, LLM placeholder guard*
