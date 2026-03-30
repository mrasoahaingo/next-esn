---
name: Désactiver boamp/jobs, LinkedIn mode agent browser
description: Décisions pour désactiver canaux boamp/jobs et ajouter LinkedIn Stagehand browser
type: project
---

# Quick Task 260330-n7n: Désactiver boamp/jobs, LinkedIn mode agent browser - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Task Boundary

1. Désactiver les canaux boamp et jobs dans le cron de collecte
2. Ajouter un collecteur LinkedIn en mode agent browser (Stagehand) qui tourne en parallèle du Proxycurl existant

</domain>

<decisions>
## Implementation Decisions

### Désactiver boamp et jobs
- Retirer uniquement de `startCollectRuns` dans `app/api/radar/cron/collect-signals/route.ts`
- Les fichiers workflow et collector restent (boamp.ts, jobs.ts, collect-boamp.workflow.ts, collect-jobs.workflow.ts)
- Pas de suppression de fichiers

### LinkedIn mode agent browser — périmètre
- **Les deux** : pages entreprises + recherche d'offres LinkedIn Jobs
- Naviguer sur `linkedin.com/company/xxx` pour détecter consultants externes et offres IT
- Scraper `linkedin.com/jobs` avec mots-clés IT pour détecter besoins en recrutement

### Proxycurl
- Garder en parallèle — Stagehand est un **nouveau collecteur** qui s'ajoute
- `linkedin.ts` (Proxycurl) continue à tourner
- Nouveau fichier `lib/radar/collectors/linkedin-browser.ts` avec Stagehand
- Le workflow `collect-linkedin.workflow.ts` intègre les deux sources (Proxycurl + Stagehand)

### Claude's Discretion
- Structure exacte du nouveau collecteur Stagehand (pages à naviguer, sélecteurs, logique d'extraction)
- Comment fusionner les signaux des deux sources dans le workflow sans doublons
- Modèle Stagehand : `gpt-4o-mini` + `OPENAI_API_KEY` (cohérent avec boamp/jobs)

</decisions>

<specifics>
## Specific Ideas

- Le collecteur browser peut réutiliser le pattern de `jobs.ts` (createStagehand factory, try/finally pour close)
- Les URLs LinkedIn des entreprises viennent déjà de `settings.linkedinCompanyUrls` + `radar_companies.linkedin_url`
- Pour Jobs : mots-clés comme "consultant IT", "développeur", "cloud", "data" — même approche que le collecteur jobs.ts sur Indeed mais sur LinkedIn Jobs

</specifics>

<canonical_refs>
## Canonical References

- `lib/radar/collectors/linkedin.ts` — collecteur Proxycurl existant (modèle de structure)
- `lib/radar/collectors/jobs.ts` — pattern Stagehand à réutiliser (createStagehand, init/close)
- `app/api/radar/workflows/collect-linkedin.workflow.ts` — workflow à modifier pour ajouter Stagehand
- `app/api/radar/cron/collect-signals/route.ts` — retirer boamp et jobs de startCollectRuns

</canonical_refs>
