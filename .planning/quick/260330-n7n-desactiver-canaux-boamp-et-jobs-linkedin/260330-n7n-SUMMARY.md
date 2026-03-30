---
phase: quick-260330-n7n
plan: "01"
subsystem: radar-collectors
tags: [radar, linkedin, stagehand, browserbase, cron]
dependency_graph:
  requires: []
  provides:
    - collectLinkedInBrowserSignals (lib/radar/collectors/linkedin-browser.ts)
  affects:
    - app/api/radar/cron/collect-signals/route.ts
    - app/api/radar/workflows/collect-linkedin.workflow.ts
tech_stack:
  added: []
  patterns:
    - Stagehand V3 browser scraping (réutilisation du pattern jobs.ts)
    - Promise.all pour collecteurs parallèles dans un workflow step
key_files:
  created:
    - lib/radar/collectors/linkedin-browser.ts
  modified:
    - app/api/radar/cron/collect-signals/route.ts
    - app/api/radar/workflows/collect-linkedin.workflow.ts
decisions:
  - Stagehand @ts-expect-error pour les propriétés V3 manquantes dans les types (modelName, page, extract) — pattern identique à boamp.ts et jobs.ts
  - Deux blocs distincts dans linkedin-browser.ts (pages entreprise + LinkedIn Jobs search) sans déduplication — upsertSignals gère via upsert
  - Guard BROWSERBASE_API_KEY/PROJECT_ID en début de collecteur — retourne signals/calls vides si absent
metrics:
  duration: ~15 min
  completed_date: "2026-03-30"
  tasks_completed: 3
  files_changed: 3
---

# Phase quick-260330-n7n Plan 01: Désactiver boamp/jobs, LinkedIn browser Summary

**One-liner:** Cron allégé (press + linkedin uniquement), nouveau collecteur Stagehand `linkedin-browser.ts` fusionné dans le workflow LinkedIn via `Promise.all` avec Proxycurl.

## What Was Built

### Task 1 — Désactiver boamp et jobs dans le cron
Retiré `collectJobsWorkflow` et `collectBoampWorkflow` de `startCollectRuns` dans le cron. Le `Promise.all` ne lance plus que `collectPressWorkflow` et `collectLinkedInWorkflow`. Les imports correspondants sont supprimés. Les fichiers workflow et collector boamp/jobs restent intacts.

### Task 2 — Collecteur LinkedIn browser (Stagehand)
Créé `lib/radar/collectors/linkedin-browser.ts` exportant `collectLinkedInBrowserSignals(companyUrls: string[])`.

Deux blocs d'extraction :
- **Bloc A (pages entreprise)** : navigue sur chaque URL LinkedIn d'entreprise, extrait offres IT et présence de consultants externes via `stagehand.extract` + `LinkedInCompanyPageSchema`. Crée un `RawSignal` source `'linkedin'` par entreprise avec job count >= 1.
- **Bloc B (LinkedIn Jobs search)** : une seule navigation sur la recherche LinkedIn Jobs France (mots-clés IT), extrait toutes les offres via `LinkedInJobsExtractionSchema`, groupe par entreprise, crée un `RawSignal` source `'job_offer'` par entreprise.

Pattern Stagehand identique à `jobs.ts` : `createStagehand()` factory, `try/finally` pour `close()`, guard env vars.

### Task 3 — Intégration dans le workflow LinkedIn
Remplacé `fetchLinkedInSignals` par `fetchAllLinkedInSignals` dans `collect-linkedin.workflow.ts`. La nouvelle step appelle `collectLinkedInSignals` (Proxycurl) et `collectLinkedInBrowserSignals` (Stagehand) en `Promise.all`, fusionne signaux et calls. Le reste du workflow (persist, log) est inchangé.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Suppression des @ts-expect-error inutiles (init() et close())**
- **Found during:** Task 2 vérification TypeScript
- **Issue:** Les directives `@ts-expect-error` pour `stagehand.init()` et `stagehand.close()` étaient inutiles car ces méthodes sont correctement typées en V3. TypeScript rapportait TS2578 (unused directive).
- **Fix:** Supprimé les deux directives superflues. Conservé uniquement celles nécessaires pour `modelName`, `stagehand.page`, et `stagehand.extract` qui ne sont pas dans les types V3.
- **Files modified:** `lib/radar/collectors/linkedin-browser.ts`
- **Commit:** 6b39ae7

## Known Stubs

None. Le collecteur est câblé sur les vraies URLs (BROWSERBASE_API_KEY requis en runtime). En l'absence de clé, la fonction retourne `{ signals: [], calls: [] }` sans erreur.

## Self-Check: PASSED

- `lib/radar/collectors/linkedin-browser.ts` existe et exporte `collectLinkedInBrowserSignals`
- `app/api/radar/cron/collect-signals/route.ts` ne référence plus boamp ni jobs
- `app/api/radar/workflows/collect-linkedin.workflow.ts` appelle `fetchAllLinkedInSignals` avec `Promise.all`
- `npx tsc --noEmit` passe sans nouvelles erreurs (erreurs pre-existantes dans boamp.ts et jobs.ts inchangées)

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | e2f1c9b | feat(quick-260330-n7n): désactiver canaux boamp et jobs dans le cron |
| 2 | 6b39ae7 | feat(quick-260330-n7n): créer le collecteur LinkedIn browser (Stagehand) |
| 3 | cddd599 | feat(quick-260330-n7n): intégrer collecteur browser dans le workflow LinkedIn |
