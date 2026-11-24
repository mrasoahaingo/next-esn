# Next-ESN

## What This Is

Un SaaS pour les ESN (Entreprises de Services Numériques) qui les aide dans leur quotidien : gestion des CVs de consultants, analyse de missions, et positionnement de consultants sur des missions, le tout assisté par l'IA (extraction automatique, analyse, matching).

## Core Value

L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille — il sait ce qui se passe, ne peut pas lancer de doublons, et voit les erreurs quand ça échoue.

## Current Milestone : aucun (v1.3 parké)

Périmètre produit actuel : gestion des CV de consultants + positionnement CV ↔ missions (analyse de missions, matching, CV adapté). La prospection et le radar ont été retirés du produit le 2026-11-24 (quick `261124-lfg`) et seront retravaillés plus tard.

## Parked Milestone : v1.3 Prospection

**État au parking (2026-11-24) :** Phase 9 arrêtée avant 09-04. Les plans 09-01 (fondation SQL du domaine prospection), 09-02 (réglage du seuil de chaleur) et 09-03 (audit Proxycurl) ont été faits, puis leur code a été retiré du produit ; 09-04 (application de la migration en prod) n'a jamais été exécuté, la migration `20261124150326_prospection_domain.sql` n'a donc jamais été appliquée et son fichier est supprimé (récupérable via git). Une migration `*_drop_radar.sql` qui supprime les objets `radar_*` morts existe dans le dépôt, en attente d'accord explicite avant application en prod. Archive : `.planning/milestones/v1.3-ROADMAP.md` et `.planning/milestones/v1.3-REQUIREMENTS.md` ; plans, SUMMARY et audit dans `.planning/phases/09-db-schema-foundation-proxycurl-audit/`.

**Goal (au moment du parking):** Donner aux recruteurs ESN une liste d'entreprises « chaudes » — susceptibles de recruter avant même d'avoir publié une annonce — avec le bon contact à appeler, alimentée par des automations à critères.

**Target features:**

- **Page `/prospection`** : nouvelle feature from scratch (le Radar `lib/radar/` reste de côté) — liste d'entreprises triée par score de chaleur, justification lisible « pourquoi cette entreprise est chaude » et pitch d'appel.
- **Signaux « chauds » multi-sources** : levées de fonds/croissance, activité LinkedIn (croissance effectifs, arrivées CTO/managers, turnover), historique d'annonces récurrentes, AO/marchés publics gagnés.
- **Contact à appeler** : enrichissement automatique via API (décideur DRH/CTO/hiring manager — nom, poste, LinkedIn, coordonnées si dispo), déclenché uniquement au-dessus du seuil de chaleur pour maîtriser les coûts.
- **Automations à critères** : le recruteur crée plusieurs automations (ciblage entreprise : secteur/taille/géo + profils recherchés à placer) ; exécution périodique par cron **et** lancement manuel « live ».
- **Scoring IA + règles** : pondération déterministe des signaux (type, récence) + synthèse LLM (score, justification, pitch d'appel).
- **Liste actionnable simple** : statuts « à appeler / appelé / écarté » — pas de pipeline CRM complet dans ce milestone.

**Sources de données (à valider en recherche) :**

| Signal | Sources pressenties |
|---|---|
| Levées / croissance | Pappers / Societeinfo (actes, comptes, effectifs), presse tech (Maddyness, FrenchWeb), Crunchbase/Dealroom |
| Activité LinkedIn | Proxycurl (headcount growth, job changes — déjà câblé), Browserbase/Stagehand (déjà câblé) |
| Historique d'annonces | API France Travail (gratuite), Adzuna, scraping WTTJ/Indeed |
| AO / marchés gagnés | API BOAMP (DILA), DECP data.gouv (attributions), TED |
| Socle entreprises | API SIRENE/INSEE (gratuite) + Pappers ; réconciliation par SIREN |
| Contacts décideurs | Proxycurl, Dropcontact (RGPD FR), Apollo.io, Kaspr, Nomination/Pharow |

Question ouverte build vs buy : des agrégateurs FR (Pharow) fusionnent déjà plusieurs de ces signaux.

## Parked Milestone: v1.2 Multi-langue (Phases 7–8 restantes)

**Goal:** Permettre aux ESN de gérer des CVs et des missions en anglais — l’IA détecte la langue automatiquement, les artefacts générés restent dans la langue du document source, et les templates PDF s’adaptent.

**État au parking (2026-07-03) :** Phase 6 (DB + Schema Foundation) livrée ; l'essentiel de la détection langue, des labels PDF et des artefacts langue-aware a été couvert par des quick tasks (voir STATE.md). Restent documentées dans la roadmap : Phase 7 (Workflow Detection + Prompt Injection) et Phase 8 (PDF Wiring + Manual Override UI).

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

### Parked (v1.3)

- Exigences AUTO-*, SIG-*, SCOR-*, CONT-*, LIST-* de la prospection — voir `.planning/milestones/v1.3-REQUIREMENTS.md`.

### Parked (v1.2)

- Exigences LANG-*, PDF-*, PROMPT-* restantes des Phases 7–8 — voir roadmap archivée.

### Out of Scope

- **Prospection / radar** — retirés du produit le 2026-11-24, à retravailler plus tard (v1.3 parké)
- Pipeline CRM complet pour la prospection (contacté → RDV → gagné/perdu, relances) — v1.3 se limite à une liste actionnable (à appeler / appelé / écarté)
- Autres features métier lourdes (matching avancé, notifications push) — hors milestone sauf décision explicite
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
- **Scope** : pas de nouvelles features fonctionnelles sans décision explicite

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus fiabilité avant features | L’UX de base doit être solide | ✓ v1.0 |
| Garder le workflow runtime beta | Pas d’alternative mature équivalente | ✓ v1.0 |
| `handleWorkflowError` colocalisé par fichier | Orchestrateurs `@workflow/next` | ✓ v1.0 |
| **Mission créée depuis la page positionnement** | Éviter aller-retour fiche mission ↔ positionnement | **v1.1** — rester sur `/review/[id]/positioning`, état d’analyse inline, CTA positionnement désactivé jusqu’à analyse mission OK |
| **Langue unique par document** | Prompts doivent rester maintenables sans doublons | — Pending |
| **Artifacts positionnement cross-langue → langue mission** | Destinataire = client final, pas le candidat | — Pending |
| **UI applicative reste FR** | Scope réduit, pas de framework i18n nécessaire | — Pending |
| **Colonnes language en DB + Zod + CV_LABELS** | Fondations v1.2 posées en Phase 06 | ✓ Phase 06 |
| **Guard console.warn placeholders non résolus** | Détection précoce des erreurs de template LLM | ✓ Phase 06 |
| **v1.2 parké au profit de la prospection** | Phases 7–8 documentées ; l'essentiel couvert par quick tasks ; prospection prioritaire | — Pending |
| **Prospection from scratch sous `/prospection`** | Le Radar existant reste de côté — nouveau domaine propre | — Pending |
| **Enrichissement contact gated par seuil de chaleur** | Maîtriser les coûts d'API contact (poste le plus cher) | — Pending |
| **Réconciliation entreprises par SIREN** | Clé stable pour fusionner les signaux multi-sources | — Pending |
| **Retrait prospection/radar ; v1.3 parké** | Recentrer le produit sur la gestion des CV et le matching CV ↔ missions ; la prospection sera refondue plus tard (pgvector conservé, `*_drop_radar.sql` non appliquée en prod sans accord) | ✓ quick 261124-lfg |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
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
*Last updated: 2026-11-24 — Milestone v1.3 Prospection parké, prospection/radar retirés du produit (quick 261124-lfg)*
