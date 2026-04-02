---
phase: quick-260330-ntv
plan: 01
status: complete
completed_at: 2026-03-30
---

# Summary — Collecteur découverte LinkedIn Stagehand

## One-liner
Collecteur Stagehand qui recherche de nouvelles entreprises sur LinkedIn company search et les upserte dans `radar_companies`.

## What was built

**`lib/radar/collectors/linkedin-discovery.ts`**
- Utilise Stagehand/Browserbase pour naviguer sur LinkedIn company search
- Combine `keywords` + `sectors` de `LinkedInDiscovery` en 5 termes max
- Filtre par `minHeadcount` / `maxHeadcount` et présence `/company/` dans l'URL
- Déduplique par `linkedinUrl`, respecte `maxCompaniesPerRun`

**`lib/radar/queries.ts`**
- Nouvelle fonction `upsertDiscoveredCompany` : upsert par `linkedin_url` → fallback nom normalisé → insert
- `insertRunLog` étendu avec source `'linkedin-discovery'`

**`app/api/radar/workflows/collect-linkedin-discovery.workflow.ts`**
- Pattern `'use workflow'` / `'use step'` standard
- Court-circuite si `linkedinDiscovery.enabled === false`
- Steps : fetchConfig → runCollector → persist → log

**`app/api/radar/cron/collect-signals/route.ts`**
- `startCollectRuns` lance désormais 3 workflows : press, linkedin, linkedin-discovery

## Decisions
- Max 5 termes de recherche pour maîtriser les crédits Browserbase
- Guard Browserbase env vars en entrée de collecteur
- `@ts-expect-error` sur `modelName` (Stagehand V3 types incomplets)

## Commits
- `866a6d9` feat(quick-260330-ntv): collecteur découverte LinkedIn via Stagehand
