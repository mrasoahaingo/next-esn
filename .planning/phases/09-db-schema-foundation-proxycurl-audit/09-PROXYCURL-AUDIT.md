# Audit Proxycurl / radar — Phase 9

**Date :** 2026-11-24
**Exigence rattachée :** CONT-05 (sources de contact autorisées) — critère de succès 5 du ROADMAP
**Sources :** toutes les affirmations ci-dessous ont été relevées par l'exécutant du plan 09-03 avec les commandes citées (historique git et grep sur l'arbre de travail). Aucune valeur de secret n'a été lue ni écrite : seuls des noms de variables figurent ici.

---

## 1. Statut

- Le code radar et ses collecteurs Proxycurl ont été **supprimés** par le commit `7ecd35e` — `chore(quick-261112-27s): retirer le radar de prospection` (2026-11-13).
- `git show 7ecd35e --stat` : **59 fichiers modifiés, 94 insertions, 9 449 suppressions** (dont `pnpm-lock.yaml` −1 825 lignes, `vercel.json` −12, `package.json` −3).
- Retirés : pages `app/(dashboard)/radar/`, API et workflows `app/api/radar/`, tout `lib/radar/` (19 fichiers), entrée « Radar Prospect » du menu, préfixe `/radar` des routes protégées, les deux crons de `vercel.json`, les dépendances `@browserbasehq/sdk`, `@browserbasehq/stagehand`, `anchorbrowser`, et les fiches `.agents/radar-*.md`.
- Conservés : les migrations Supabase et les tables `radar_*` (voir §6).
- Branche : `git merge-base --is-ancestor 7ecd35e main` → faux. Le commit est sur `prospection-phase-9` (PR #4), **pas encore sur `main`**.
- Conséquence : rien à déprécier ou annoter dans le code, il n'existe plus. Le risque restant est la **réintroduction** (copier-coller depuis l'historique git ou depuis une doc de recherche périmée) — d'où le garde-fou du §9.

## 2. Inventaire des références mortes (état à `7ecd35e^`)

Les 8 fichiers listés dans CONTEXT §Integration Points, vérifiés avec `git show 7ecd35e^:<chemin> | grep -nE "https?://|process\.env"` et grep des imports.

| Fichier (à `7ecd35e^`) | Fournisseur réellement appelé (hôte relevé dans le code) | Variable d'env |
|---|---|---|
| `lib/radar/collectors/proxycurl.ts` | `https://enrichlayer.com` (`BASE_URL`, l. 5) — endpoints `/api/v2/search/person`, `/api/v2/profile`, `/api/v2/company`, `/api/v2/company/employees/count`. **Le nom « proxycurl » est trompeur : ce fichier appelait Enrich Layer.** | `ENRICHLAYER_API_KEY` (l. 85, 108) |
| `lib/radar/collectors/linkedin.ts` | `https://nubela.co/proxycurl/api` (`PROXYCURL_BASE`, l. 4) — `/linkedin/company/employees`, `/linkedin/company`, `/linkedin/company/job/` — **service mort** | `PROXYCURL_API_KEY` (l. 39) |
| `lib/radar/collectors/linkedin-enrichment.ts` | `https://nubela.co/proxycurl/api` (l. 3) — `/linkedin/company/resolve`, `/linkedin/search/person` — **service mort** | `PROXYCURL_API_KEY` (l. 60, 107) |
| `lib/radar/queries.ts` | Aucun appel direct ; `enrichHotProspects` `.limit(20)` « pour maîtriser les crédits Proxycurl » (l. 493) ; statut des sources `enabled: Boolean(process.env.PROXYCURL_API_KEY)`, détail « Proxycurl company/employees » (l. 752-753) | `PROXYCURL_API_KEY` (lecture de présence) |
| `app/api/radar/workflows/freelance-paris-proxycurl.workflow.ts` | via `collectParisFreelanceData` de `@/lib/radar/collectors/proxycurl` → Enrich Layer | — |
| `app/api/radar/workflows/collect-linkedin.workflow.ts` | via `collectLinkedInSignals` de `@/lib/radar/collectors/linkedin` → Nubela | — |
| `app/api/radar/cron/freelance-paris-proxycurl/route.ts` | POST manuel protégé par `requireOrgAdmin()`, démarre `freelanceParisProxycurlWorkflow` | — |
| `app/(dashboard)/radar/components/radar-settings-form.tsx` | bouton « Freelances Paris (Proxycurl) » → `fetch('/api/radar/cron/freelance-paris-proxycurl')` (l. 271-385) | — |

## 3. Patterns morts — à ne pas recopier

Relevés dans `git show 7ecd35e^:lib/radar/queries.ts` et dans les migrations radar :

- **Fusion par nom même quand le SIREN est connu** : `normalizeCompanyName(row.name) === normalizedName` (l. 95-102, 650-656) sert de clé de rapprochement sans priorité au SIREN.
- **Contacts stockés en JSONB** `enrichment_data.contacts` sur la ligne entreprise (l. 403, 425-453) : pas de colonne de source, pas de date de collecte, pas de rétention RGPD.
- **Enums Postgres globaux non préfixés** (`signal_source`, `heat_level`, `action_type`, …) : collisions de noms pour tout nouveau domaine.
- **RLS `EXISTS` sans `TO authenticated`**.
- **Un workflow par source** (`collect-jobs`, `collect-linkedin`, `collect-linkedin-discovery`, `freelance-paris-proxycurl`, …) au lieu d'un pipeline unique.
- `await supabase.from(...)` sans lecture du champ `error`.

## 4. Patterns réutilisables — à réécrire, jamais à importer

- **Normalisation de nom d'entreprise** (`LEGAL_SUFFIXES`, NFD sans accents) : réécrite dans `lib/prospection/company-identity.ts` (plan 09-01) avec un ordre corrigé (suppression des points avant les suffixes légaux) et **sans la fusion par nom quand le SIREN est connu** — la contrainte `UNIQUE (org_id, siren)` prime, l'index partiel `(org_id, normalized_name) WHERE siren IS NULL` ne vaut que pour les entreprises non résolues.
- **Gate d'enrichissement** : seuil de chaleur + cache 7 jours + plafond 20 entreprises par run (repris sous forme de `prospection_settings.heat_threshold` et `enrichment_gated_at`).
- **Workflow dual-trigger** cron / déclenchement manuel admin.

## 5. Remplaçants confirmés

Décision milestone (STATE.md §Decisions, REQUIREMENTS.md §Out of Scope) :

| Besoin | Remplaçant | Phase |
|---|---|---|
| Signaux LinkedIn (entreprise, effectifs, offres) | **ScrapIn** — appels déclenchés seulement au-dessus du seuil de chaleur (heat-gated) | Phase 11 |
| Email des décideurs | **Dropcontact** — enrichissement email audité CNIL, asynchrone (job + poll/webhook) | Phase 13 |

- **Enrich Layer n'est pas retenu** : c'est la relance de Nubela/Proxycurl, avec la même exposition juridique (procès LinkedIn). `lib/radar/collectors/proxycurl.ts` l'appelait déjà ; ce chemin ne doit pas revenir.
- **CONT-05** : `prospection_contacts.contact_source` n'accepte que `scrapin`, `dropcontact`, `pappers`, `manual` (CHECK en liste fermée, migration du plan 09-01). Un collecteur de contacts ne peut donc pas enregistrer de contact issu d'un fournisseur mort.

## 6. État restant en base (rien n'est supprimé en Phase 9)

Relevé par `grep -hiE "CREATE TABLE|CREATE TYPE|CREATE (OR REPLACE )?FUNCTION" supabase/migrations/*radar*.sql` (6 migrations `20260401102300` → `20260402165214`) :

- **Tables** : `radar_companies`, `radar_signals`, `radar_prospect_scores`, `radar_consultants`, `radar_matches`, `radar_actions`, `radar_run_logs`, `radar_org_settings`.
- **Types** : `signal_source` (`job_offer`, `public_market`, `linkedin`, `press`), `heat_level`, `availability_status`, `action_type`, `action_outcome`, `radar_source` (+ valeur `linkedin-discovery` ajoutée par `ALTER TYPE`).
- **Fonction** : `match_consultants(query_embedding vector(1536), …)`.
- **Index pgvector** : `idx_radar_signals_embedding`, `idx_radar_consultants_embedding` (ivfflat).

Consignes :
- **Ne pas réutiliser ces noms.** C'est la raison de l'absence de `CREATE TYPE` dans la migration prospection : un `DO $$ CREATE TYPE signal_source … EXCEPTION WHEN duplicate_object` avalerait l'erreur et la colonne hériterait silencieusement des valeurs radar. Le domaine prospection utilise `TEXT` + CHECK nommés `prospection_<table>_<col>_check`.
- Ne pas lire ni écrire ces tables depuis le nouveau code.
- Un éventuel `DROP` = tâche séparée, **à décider par l'utilisateur** (hors périmètre Phase 9).

## 7. Crons

- `vercel.json` à `7ecd35e^` ne contenait que deux crons radar : `/api/radar/cron/collect-signals` (`0 */6 * * *`) et `/api/radar/cron/compute-scores` (`30 */6 * * *`).
- Le fichier est supprimé **sur la branche seulement** : `git show main:vercel.json` renvoie toujours ces deux crons.
- Tant que PR #4 n'est pas mergée et déployée en production, Vercel continue de planifier ces crons sur `main` (leurs routes existent encore sur `main`).

## 8. Actions utilisateur (non automatisées)

L'agent n'a lu ni modifié aucun fichier `.env*` et n'a pas agi sur l'environnement Vercel.

- [ ] Supprimer `PROXYCURL_API_KEY` des environnements Vercel **Development**, **Preview** et **Production**.
- [ ] Supprimer `ENRICHLAYER_API_KEY` de `.env.local`.
- [ ] Évaluer le retrait des clés d'époque radar : `ANCHOR_API_KEY`, `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `APOLLO_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `FIRECRAWL_API_KEY` (`.env.local`, et Vercel si présentes).
  Vérification faite le 2026-11-24 : `grep -rlE "<ces 9 noms>" app lib components workflows scripts hooks types middleware.ts next.config.ts package.json` → seul `lib/prospection/no-dead-providers.test.ts` sort (littéraux de test, aucune lecture de `process.env`). **Aucun code restant ne lit ces variables** : leur retrait est sans effet sur l'application.
- [ ] Après merge et déploiement de PR #4 : vérifier dans Vercel (onglet Cron Jobs) que `collect-signals` et `compute-scores` ne tournent plus.
- [ ] Décider du sort des tables, types et fonction radar (§6) : conservation ou migration de drop dédiée.

## 9. Garde-fou

`lib/prospection/no-dead-providers.test.ts` (plan 09-03, Task 1) rend vrai « aucun nouveau code ne peut s'appuyer sur ces références mortes » :

- **Ce qu'il scanne** : toute la racine du dépôt (`process.cwd()`), fichiers `.ts .tsx .js .jsx .mjs .cjs .mts .cts .json`.
- **Ce qu'il exclut** (`EXCLUDED_DIRS` / `EXCLUDED_FILES`) : `node_modules` (à toute profondeur), `.next`, `.git`, `.planning`, `docs`, `supabase/migrations` (historique immuable), tout dossier caché d'outil/agent (`.claude`, `.agents`, `.cursor`, `.vercel`, `.media`, `.swc`, `.hallmark`, `.taste-skill`, …), les lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `skills-lock.json`, tout `*-lock.json` / `*.lock`) et le test lui-même.
- **Ce qu'il interdit** : `/proxycurl|nubela|enrichlayer/i` dans le contenu, et tout import `'@/lib/radar…'` ou `'@/app/api/radar…'`.
- **Faux positifs évités** : `RadarChart` (recharts, `AnalysisCharts.tsx`) et les fixtures `radar_companies` de `lib/utils/supabase-write-error.test.ts` ne déclenchent rien — couvert par un test dédié.
- **Sensibilité prouvée** : une sonde temporaire `guard-probe.tmp.ts` à la racine (`'PROXYCURL_API_KEY'`) fait échouer le test en la nommant ; supprimée aussitôt, retour au vert.
- **Pourquoi pas ESLint** : en flat config, une seconde entrée `no-restricted-syntax` remplace les options de la première et désactiverait la règle « écritures Supabase non contrôlées ». Un test vitest n'interfère avec rien et couvre aussi les fichiers JSON.
