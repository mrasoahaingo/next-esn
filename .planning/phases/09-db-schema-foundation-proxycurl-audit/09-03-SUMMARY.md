---
phase: 09-db-schema-foundation-proxycurl-audit
plan: 03
subsystem: prospection
tags: [audit, proxycurl, garde-fou, vitest, documentation]
requires: []
provides:
  - garde-fou vitest anti-réintroduction des fournisseurs morts (lib/prospection/no-dead-providers.test.ts)
  - audit Proxycurl / radar sourcé par git (09-PROXYCURL-AUDIT.md)
affects:
  - phases 10 à 13 (tout collecteur ou enrichissement de contacts)
tech-stack:
  added: []
  patterns:
    - test vitest de parcours du système de fichiers depuis la racine, avec liste d'exclusion explicite
key-files:
  created:
    - lib/prospection/no-dead-providers.test.ts
    - .planning/phases/09-db-schema-foundation-proxycurl-audit/09-PROXYCURL-AUDIT.md
  modified:
    - .planning/research/ARCHITECTURE.md
    - .planning/research/FEATURES.md
decisions:
  - "Garde-fou en vitest (parcours de toute la racine, exclusions explicites) plutôt qu'en ESLint : une seconde entrée no-restricted-syntax écraserait la règle Supabase existante"
  - "Enrich Layer explicitement écarté (relance de Nubela) ; remplaçants confirmés : ScrapIn (signaux LinkedIn) + Dropcontact (email)"
  - "Tables, types et fonction radar conservés en base ; leur éventuel drop reste une décision utilisateur"
requirements: [CONT-05]
metrics:
  duration: ~3 min
  tasks: 2
  files: 4
  completed: 2026-11-24
---

# Phase 9 Plan 03 : audit Proxycurl et garde-fou anti-réintroduction — Summary

Garde-fou vitest qui parcourt toute la racine du dépôt et échoue sur `/proxycurl|nubela|enrichlayer/i` ou sur un import `@/lib/radar` / `@/app/api/radar`, plus un audit sourcé par git du retrait radar (`7ecd35e`). L'audit confirme ScrapIn et Dropcontact comme remplaçants et écarte Enrich Layer.

## Tâches

| # | Tâche | Commit | Fichiers |
|---|-------|--------|----------|
| 1 | Garde-fou vitest no-dead-providers | `e97bd6f` | `lib/prospection/no-dead-providers.test.ts` |
| 2 | Audit 09-PROXYCURL-AUDIT.md + bandeaux recherches périmées | `11cc051` | `09-PROXYCURL-AUDIT.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/FEATURES.md` |

## Vérifications

- `vitest run lib/prospection/no-dead-providers.test.ts` : **4/4 verts** sur l'arbre actuel (scan effectif > 50 fichiers, présence de `middleware.ts` / `next.config.ts` / `package.json` et de fichiers sous `app/ lib/ components/ workflows/ scripts/`, aucun fichier exclu qui fuit).
- **Test de sensibilité (sonde)** : `guard-probe.tmp.ts` créé à la racine avec `export const GUARD_PROBE = 'PROXYCURL_API_KEY';` → le test « aucune référence Proxycurl / Nubela / Enrich Layer » échoue avec `expected [ 'guard-probe.tmp.ts' ] to deeply equal []` (3 autres tests verts). Sonde supprimée aussitôt → 4/4 verts. `test ! -e guard-probe.tmp.ts` OK, `git status --porcelain guard-probe.tmp.ts` vide ; jamais commitée.
- `eslint lib/prospection/no-dead-providers.test.ts` : sans erreur.
- Vérification automatisée de la Task 2 : OK (audit présent, 102 lignes, cite `7ecd35e`, `PROXYCURL_API_KEY`, `ENRICHLAYER_API_KEY`, `nubela.co`, `enrichlayer.com`, ScrapIn, Dropcontact ; les 9 sections demandées sont présentes).
- `git diff --numstat` sur les deux docs de recherche : `2 0` chacun (aucune ligne supprimée).
- Aucun fichier `.env*` lu ni modifié ; aucune valeur de secret dans l'audit.

## Faits relevés pour l'audit (relancés par l'exécutant)

- `git show 7ecd35e --stat` : 59 fichiers, +94 / −9 449 lignes ; `7ecd35e` n'est pas ancêtre de `main`.
- `lib/radar/collectors/proxycurl.ts` appelait en réalité `https://enrichlayer.com` (`ENRICHLAYER_API_KEY`) ; `linkedin.ts` et `linkedin-enrichment.ts` appelaient `https://nubela.co/proxycurl/api` (`PROXYCURL_API_KEY`).
- `git show main:vercel.json` contient toujours les crons `collect-signals` et `compute-scores`.
- Migrations radar : 8 tables `radar_*`, 6 types, fonction `match_consultants`, 2 index ivfflat.
- Aucun code restant (`app lib components workflows scripts hooks types middleware.ts next.config.ts package.json`) ne lit `PROXYCURL_API_KEY`, `ENRICHLAYER_API_KEY` ni les 7 clés d'époque radar.

## Actions utilisateur (à présenter par l'orchestrateur)

- [ ] Supprimer `PROXYCURL_API_KEY` des environnements Vercel **Development**, **Preview** et **Production**.
- [ ] Supprimer `ENRICHLAYER_API_KEY` de `.env.local`.
- [ ] Évaluer le retrait des clés d'époque radar (`ANCHOR_API_KEY`, `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `APOLLO_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `FIRECRAWL_API_KEY`). Aucun code restant ne les lit : leur retrait est sans effet sur l'application.
- [ ] Après merge et déploiement de PR #4 : vérifier dans Vercel que les crons radar `collect-signals` et `compute-scores` ne tournent plus (ils sont encore sur `main`).
- [ ] Décider du sort des tables, types et fonction radar : conservation ou migration de drop dédiée.

## Deviations from Plan

### Adaptations d'environnement (sans effet sur le livrable)

**1. [Rule 3 - Blocage] `node_modules` absent du worktree**
- **Trouvé pendant :** Task 1
- **Problème :** le worktree n'a pas de `node_modules`, donc ni `pnpm vitest` ni `pnpm lint` ne pouvaient tourner.
- **Correction :** lien symbolique `node_modules` vers celui du checkout principal (ignoré par `.gitignore`, non commité, exclu par le garde-fou). Tests lancés avec `./node_modules/.bin/vitest run …` et lint avec `./node_modules/.bin/eslint <fichier>` plutôt que `pnpm lint` sur tout le dépôt.
- **Fichiers modifiés :** aucun fichier suivi.

Sinon, plan exécuté tel qu'écrit.

## Known Stubs

Aucun.

## Threat Flags

Aucun : pas de nouvelle surface réseau, d'authentification ni de schéma. T-09-13, T-09-15 et T-09-17 sont mitigés comme prévu (garde-fou dont la sensibilité est prouvée, Enrich Layer écarté, noms de variables seulement). T-09-14 est transféré à l'utilisateur via les actions ci-dessus, et T-09-16 est accepté (crons sur `main`, vérification post-merge listée).

## Self-Check: PASSED

- FOUND: lib/prospection/no-dead-providers.test.ts
- FOUND: .planning/phases/09-db-schema-foundation-proxycurl-audit/09-PROXYCURL-AUDIT.md
- FOUND: commit e97bd6f
- FOUND: commit 11cc051
