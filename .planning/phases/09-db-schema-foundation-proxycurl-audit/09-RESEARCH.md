# Phase 9 : DB + Schema Foundation + Proxycurl Audit — Research

**Researched:** 2026-11-24
**Domain:** Schéma Postgres/Supabase multi-tenant (RLS org-scopée), conformité RGPD au niveau schéma, réglage org admin (Next.js + React Query), garde-fou anti-régression (Proxycurl)
**Confidence:** HIGH (schéma vérifié par exécution réelle sur Postgres 17 ; conventions lues dans le code)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Seuil de chaleur (CONT-04)
- **D-01:** Le seuil vit dans une table dédiée `prospection_settings` (org_id PK) — isole le domaine prospection, extensible pour les futurs réglages (fréquence cron, quotas API).
- **D-02:** La migration Phase 9 ne crée que `heat_threshold` (défaut 60) — YAGNI, les autres colonnes arriveront par migrations idempotentes quand le besoin sera réel. Pas de JSONB fourre-tout : colonnes typées + Zod (pattern codebase).
- **D-03:** Provisionnement par **upsert à la première écriture** — pas de ligne tant que l'admin n'a rien sauvegardé ; défaut 60 en DEFAULT de colonne + constante code (`DEFAULT_HEAT_THRESHOLD = 60`). Pas de dépendance au cycle de vie des orgs Clerk.
- **D-04:** **Phase 9 livre la DB ET l'UI admin** de réglage du seuil — CONT-04 est 100% vérifiable dès cette phase (champ dans la page admin existante + service lecture/upsert).

#### Historique des scores
- **D-05:** `prospection_scores` = **snapshot par run** — une ligne par (company, run) ; la liste `/prospection` lit le dernier snapshot. Historique complet pour voir l'évolution de chaleur et déboguer le scoring.
- **D-06:** **Pas de purge en v1.3** — volume maîtrisé (quelques centaines d'entreprises × runs quotidiens). Prévoir un index `(company_id, created_at DESC)` pour lire le dernier snapshot efficacement.
- **D-07:** Chaque snapshot stocke `score` + `score_breakdown` JSONB (contribution par signal : type, poids, decay appliqué) + `run_id` — le score est auditable et débogable sans recalcul.
- **D-08:** La justification et le pitch LLM (générés Phase 12) vivront en **colonnes sur `prospection_companies`** (`justification`, `call_pitch`, `synthesis_generated_at`) — un seul texte courant par entreprise, écrasé quand le score change significativement. À prévoir dans le schéma dès Phase 9 (colonnes nullable).

### Claude's Discretion
- **Sort du code Proxycurl mort** (`lib/radar/collectors/proxycurl.ts`, `linkedin*.ts`, 2 workflows, cron route `app/api/radar/cron/freelance-paris-proxycurl/`, form UI) — non discuté ; le planner choisit entre audit documenté, marqueurs @deprecated ou suppression, en respectant le success criterion 5 du ROADMAP (« aucun nouveau code ne peut s'appuyer sur ces références mortes »). Attention : vérifier si le cron radar tourne encore en prod avant toute suppression.
- **Sémantique RGPD/TTL** — non discuté ; calcul de `gdpr_retention_expires_at` (a priori `contact_sourced_at` + 3 ans max, cf. REQUIREMENTS CONT-05) et mécanisme de purge à la discrétion recherche/planner. Phase 9 pose les colonnes NOT NULL, l'enforcement peut venir plus tard.
- Design détaillé des autres tables (automations, signals, run_logs, actions) — suivre les success criteria du ROADMAP et les patterns migrations du codebase.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

> **Changement depuis CONTEXT.md (2026-07-04) :** le commit `7ecd35e` (« retirer le radar de prospection », branche `prospection-phase-9` / PR #4, **pas encore sur `main`**) a déjà supprimé `lib/radar/`, `app/(dashboard)/radar/`, `app/api/radar/`, les workflows radar, l'entrée sidebar, le préfixe `/radar` et `vercel.json`. Les 8 fichiers Proxycurl n'existent plus dans l'arbre de travail. Le choix « audit documenté vs @deprecated vs suppression » est donc tranché de fait : **suppression déjà faite** → la Phase 9 livre l'audit écrit (à partir de l'historique git) **+ un garde-fou automatisé** contre la réintroduction. Voir §Audit Proxycurl.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SIG-04 | Entreprises réconciliées par SIREN — une entreprise remontée par deux automations n'apparaît qu'une fois, signaux fusionnés | Contrainte `prospection_companies_org_siren_key UNIQUE (org_id, siren)` + CHECK format 9 chiffres ; `prospection_companies` n'a **pas** d'`automation_id` (l'entreprise est partagée par l'org), le lien automation passe par `prospection_signals.automation_id` ; index partiel `(org_id, normalized_name) WHERE siren IS NULL` pour les non-résolues ; `upsert ... onConflict: 'org_id,siren'` vérifié. Helpers purs `normalizeCompanyName` / `isValidSiren` à livrer + tests. |
| CONT-04 | L'admin d'org peut configurer le seuil de chaleur (défaut 60) | Table `prospection_settings` (D-01..D-03), route `app/api/prospection/settings/route.ts` (GET `requireOrgId`, PUT `requireOrgAdmin`), Zod `0..100` entier, hooks React Query, carte « Prospection » dans `/settings/organization` (page déjà gardée `isOrgAdmin || isSuperAdmin`). **Pas** `/admin` (super admin plateforme uniquement). |
| CONT-05 | Chaque contact stocké porte sa provenance et sa date de collecte (RGPD/CNIL, rétention max 3 ans) | `prospection_contacts.contact_source TEXT NOT NULL` (CHECK liste fermée), `contact_sourced_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `gdpr_retention_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '3 years')` + CHECK `> contact_sourced_at` + index pour la future purge. Colonne générée **impossible** (vérifié : « generation expression is not immutable »). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Stack figée** : Next.js 16 + Supabase + Clerk + Vercel AI SDK ; aucun changement de stack. **Aucun paquet npm à ajouter dans cette phase.**
- **Migrations** : `supabase/migrations/YYYYMMDDHHmmss_description.sql`, timestamp unique obtenu par `date +%Y%m%d%H%M%S` ; **toutes idempotentes** (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS` avant `CREATE POLICY`, types via `DO $$ … EXCEPTION WHEN duplicate_object`) ; **ne jamais modifier une migration appliquée**.
- **Nommage** : services/utilitaires camelCase `.ts`, composants PascalCase, hooks `useX`, constantes `UPPER_SNAKE_CASE`, schémas Zod camelCase, types inférés PascalCase.
- **Style** : 2 espaces, point-virgules, guillemets simples, alias `@/`, types de retour explicites sur les fonctions exportées, paramètre objet unique dès 2+ paramètres.
- **Erreurs API** : try/catch, `if (error instanceof NextResponse) return error;`, `NextResponse.json({ error }, { status })`, Zod `safeParse` → 400 avec détails.
- **Supabase** : client service role `getSupabase()` (RLS contournée) → **chaque requête tenant-scopée DOIT porter `.eq('org_id', orgId)`** (commentaire de `lib/utils/supabase.ts`).
- **Règle ESLint active (quick 260921-seo)** : `no-restricted-syntax` interdit `await supabase.from(...)…` en instruction nue ; toujours `const { error } = await …` puis lever, ou `logSupabaseWriteError(...)` (best-effort). Aucune valeur métier (emails, payloads) dans les logs.
- **UI** : composants shadcn/ui d'abord (mémoire utilisateur `feedback_shadcn_priority`).
- **GSD** : modifications de fichiers uniquement via un workflow GSD (`/gsd:execute-phase`).
- **Langue** : prose/UI en français, identifiants en anglais.

## Summary

La Phase 9 est une phase de fondation SQL + un petit vertical CONT-04. Tout le domaine tient dans **une seule migration idempotente** créant 8 tables (`prospection_settings` + les 7 tables du ROADMAP), que j'ai rédigée puis **exécutée deux fois sur un Postgres 17 jetable** (stub `auth.jwt()` + rôles `anon`/`authenticated`) : idempotence OK, `UNIQUE(org_id, siren)` rejette le doublon (23505), les 3 colonnes RGPD sont NOT NULL, RLS isole bien `org_a`/`org_b`, `anon` n'a aucun accès, upsert `ON CONFLICT (org_id, siren)` fusionne. Le SQL vérifié est reproduit intégralement en §Code Examples.

Trois découvertes changent le plan par rapport aux recherches de juillet : (1) des **types enum globaux `signal_source`, `heat_level`, `action_type`, `action_outcome` existent déjà** (migrations radar) — le pattern `DO $$ CREATE TYPE … EXCEPTION WHEN duplicate_object THEN NULL` réutiliserait **silencieusement** l'enum radar avec les mauvaises valeurs (vérifié). Il faut des colonnes `TEXT` + `CHECK` nommés. (2) Les migrations sont appliquées par `scripts/migrate.ts` au **`postbuild` Vercel** (variable `SUPABASE_MIGRATION_URL`, absente de `.env.local`) : une erreur SQL fait **échouer le déploiement** ; le fichier s'exécute en une transaction implicite (vérifié). (3) Le radar/Proxycurl est **déjà supprimé** du code (commit `7ecd35e`, pas encore sur `main`) ; l'audit devient un document d'historique + un **test vitest garde-fou** qui échoue si `proxycurl|nubela|enrichlayer` ou un import `lib/radar` réapparaît. Fait notable : `lib/radar/collectors/proxycurl.ts` appelait en réalité `enrichlayer.com` (relance de Nubela, même zone juridique) avec `ENRICHLAYER_API_KEY`, toujours présent dans `.env.local`.

Côté CONT-04 : `/admin` est réservé au super admin plateforme (middleware + `useSuperAdmin`) ; « l'admin d'org » correspond à `/settings/organization` (déjà gardée par `isOrgAdmin || isSuperAdmin`, API en `requireOrgAdmin`). Le seuil s'y ajoute sous forme de **carte autonome avec son propre `<form>`**, hors du formulaire existant (formulaires imbriqués interdits en HTML), branchée sur une nouvelle route `app/api/prospection/settings/route.ts`.

**Primary recommendation:** une migration `YYYYMMDDHHmmss_prospection_domain.sql` (SQL de §Code Examples), aucun enum, FK composites `(org_id, company_id)` pour interdire les liens inter-org, `siren` nullable + CHECK + UNIQUE, puis le vertical seuil (route + Zod + hooks + carte) et le garde-fou vitest anti-Proxycurl.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Unicité SIREN par org (SIG-04) | Database | API (helpers `normalizeCompanyName`/`isValidSiren`) | La contrainte doit tenir sous concurrence de runs ; le code ne fait que normaliser et viser `onConflict`. |
| Isolation tenant | API (service role + `.eq('org_id')`) | Database (RLS défense en profondeur + FK composites) | Le serveur n'utilise que la service role (RLS contournée) ; RLS protège en cas d'usage futur de la clé anon / Clerk third-party. |
| Colonnes RGPD / défauts de rétention (CONT-05) | Database | API (Phase 13 renseigne `contact_source`) | NOT NULL + DEFAULT + CHECK = garantie même si un collecteur oublie un champ. |
| Seuil de chaleur : stockage (CONT-04) | Database | — | `prospection_settings`, CHECK 0..100, DEFAULT 60. |
| Seuil : lecture/écriture + autorisation | API / Backend | — | `requireOrgId` (lecture, membres) / `requireOrgAdmin` (écriture). |
| Seuil : saisie | Browser / Client | — | Carte React dans `/settings/organization`, React Query. |
| Garde-fou anti-Proxycurl | Tests (vitest, outillage) | — | Test qui parcourt le code source ; pas de dépendance runtime. |

## Standard Stack

### Core (déjà installé — rien à ajouter)
| Library | Version (package.json) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.99.1 | Accès DB (service role) | Seul client DB du projet [VERIFIED: package.json + lib/utils/supabase.ts] |
| `zod` | 4.3.6 | Validation payload seuil + types domaine | Pattern codebase (`lib/validation/org-settings.ts`) [VERIFIED: codebase] |
| `@tanstack/react-query` | 5.90.21 | Hooks query/mutation seuil | Pattern `lib/queries/*` + `queryKeys` [VERIFIED: codebase] |
| `@clerk/nextjs` | 7.0.5 | `requireOrgId` / `requireOrgAdmin` / `useOrgRole` | Auth existante [VERIFIED: lib/utils/auth.ts] |
| `postgres` | 3.4.5 | Utilisé par `scripts/migrate.ts` (postbuild) | Runner de migrations du projet [VERIFIED: package.json, scripts/migrate.ts] |
| `vitest` | 3.2.4 | Tests helpers + garde-fou | Runner existant (`pnpm test` = `vitest run`) [VERIFIED: package.json] |

### Supporting (shadcn déjà présents dans `components/ui/`)
`card`, `field`, `input`, `slider`, `button`, `label`, `sonner` (toast) — tous présents [VERIFIED: ls components/ui].

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `TEXT` + `CHECK` nommé | Enum Postgres préfixé (`prospection_signal_source`) | Enum : `ALTER TYPE ADD VALUE` non utilisable dans la même transaction, impossible à retirer ; CHECK : `DROP CONSTRAINT IF EXISTS` + `ADD` idempotent. CHECK retenu. |
| `DEFAULT now() + 3 ans` | Colonne générée `contact_sourced_at + interval '3 years'` | **Impossible** : `timestamptz + interval` n'est pas IMMUTABLE (vérifié). Et la CNIL fait repartir le délai à chaque interaction volontaire du prospect → colonne écrivable obligatoire. |
| Index partiel anti-double run dans `prospection_run_logs` | `pg_try_advisory_lock` (prévu par STATE.md) | Un advisory lock de session ne survit pas à PostgREST (requêtes HTTP poolées) ; l'index partiel `WHERE status='running'` marche avec un simple INSERT service role. Décision finale = Phase 10, mais l'index est posé maintenant (coût nul). |
| Vitest garde-fou | Règle ESLint `no-restricted-syntax` | ESLint ne voit pas `vercel.json`/commentaires, et une 2ᵉ entrée `no-restricted-syntax` dans un autre objet de config **remplacerait** la règle Supabase existante. Vitest suit le précédent `lib/config/app-routes.test.ts`. |
| `supabase gen types` | Types manuels | Le repo n'a **aucun** type généré (aucun `Database`, aucun `database.types.ts`) ; types de ligne écrits à la main (`lib/types/organization-settings.ts`). Garder ce pattern, ne pas introduire la génération dans cette phase. [VERIFIED: grep] |

**Installation:** aucune.

## Package Legitimacy Audit

Aucun paquet externe installé par cette phase → audit sans objet.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                    ┌────────────────────────────── Phase 9 livre ──────────────────────────────┐
 Org admin (navigateur)
   │  /settings/organization  ── carte « Prospection » (form autonome)
   │        │ useProspectionSettings()  GET            useUpdateProspectionSettings()  PUT
   ▼        ▼                                                   ▼
 app/api/prospection/settings/route.ts
   ├─ GET : requireOrgId → getProspectionSettings(orgId) → row ?? { heat_threshold: DEFAULT_HEAT_THRESHOLD }
   └─ PUT : requireOrgAdmin → zod safeParse (int 0..100) → upsert onConflict 'org_id' → row
                         │ getSupabase() (service role) + .eq('org_id', orgId)
                         ▼
 Supabase Postgres ── migration unique (appliquée au postbuild Vercel par scripts/migrate.ts)
   prospection_settings (org_id PK, heat_threshold 0..100 DEFAULT 60)
   prospection_automations ──┐ (org_id,id)
                             ├──< prospection_run_logs (status running|completed|partial|failed ; 1 seul 'running'/automation)
   prospection_companies ────┤ (org_id,id)  UNIQUE(org_id, siren) ; TTL signal_last_fetched_at / enrichment_gated_at
        ├──< prospection_signals   (UNIQUE company_id,source,source_ref ; occurred_at = base du decay ; automation_id/run_id SET NULL)
        ├──< prospection_scores    (snapshot par run ; index company_id, created_at DESC)
        ├──< prospection_contacts  (contact_source / contact_sourced_at / gdpr_retention_expires_at NOT NULL)
        └──< prospection_actions   (historique statuts new|to_call|called|dismissed)
   RLS : anon_deny_all + org_select/insert/update/delete TO authenticated (auth.jwt() ->> 'org_id')

 Consommateurs futurs : P10 (run_logs, signals, scores) · P11 (upsert SIREN, source_results) · P12 (justification/call_pitch)
                        P13 (seuil via getProspectionHeatThreshold, contacts RGPD) · P14 (automations, status, actions)

 Garde-fou : lib/prospection/no-dead-providers.test.ts parcourt app/ lib/ components/ workflows/ + vercel.json
             → échoue sur /proxycurl|nubela|enrichlayer/i ou import « lib/radar » / « api/radar »
```

### Recommended Project Structure
```
supabase/migrations/
└── <date +%Y%m%d%H%M%S>_prospection_domain.sql   # 8 tables + index + RLS (unique migration)
lib/prospection/
├── constants.ts              # DEFAULT_HEAT_THRESHOLD = 60, listes fermées (sources, types, statuts) as const
├── company-identity.ts       # normalizeCompanyName(), isValidSiren(), normalizeSiren()
├── company-identity.test.ts
├── settings.ts               # getProspectionSettings(orgId), getProspectionHeatThreshold(orgId) — serveur
└── no-dead-providers.test.ts # garde-fou anti-Proxycurl / anti-radar
lib/validation/prospection-settings.ts   # prospectionSettingsPutSchema (miroir de org-settings.ts)
lib/types/prospection.ts                 # types de ligne (ProspectionSettingsRow, … ) écrits à la main
lib/queries/prospection-settings.ts      # useProspectionSettings / useUpdateProspectionSettings
lib/queries/keys.ts                      # + prospection.settings(orgId)
lib/queries/index.ts                     # + exports
app/api/prospection/settings/route.ts    # GET / PUT
components/settings/prospection-settings-card.tsx   # carte seuil (shadcn)
app/settings/organization/page.tsx       # monte la carte HORS du <form> existant
.planning/phases/09-…/09-PROXYCURL-AUDIT.md          # l'audit (success criterion 5)
```

### Pattern 1 : FK composites `(org_id, company_id)` — l'isolation tenant portée par le schéma
**What:** chaque table parente expose `UNIQUE (org_id, id)` ; chaque enfant référence `FOREIGN KEY (org_id, company_id) REFERENCES prospection_companies (org_id, id) ON DELETE CASCADE`.
**Why:** avec la service role, rien n'empêche un bug applicatif d'attacher un signal de l'org B à une entreprise de l'org A. La FK composite le rend **impossible** (vérifié : violation de FK). Elle permet aussi d'avoir `org_id` en colonne sur chaque table → RLS simple `org_id = (select auth.jwt() ->> 'org_id')` au lieu du `EXISTS` sous-requête du radar (`20260402165214`).
**When to use:** toutes les tables enfants de `prospection_companies` et `prospection_run_logs → prospection_automations`.

### Pattern 2 : RLS du projet (à copier tel quel)
Convention la plus récente et la plus complète (`20260401100900_enable_rls.sql`, `20260401101100_organization_settings.sql`) :
- `ENABLE ROW LEVEL SECURITY` ; `REVOKE … FROM anon` ; `GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated` ;
- `anon_deny_all` `FOR ALL TO anon USING (false)` ;
- 4 policies `org_select_/org_insert_/org_update_/org_delete_<table>` `TO authenticated` avec `(select auth.jwt() ->> 'org_id')` — la forme `(select …)` est celle recommandée par le skill `supabase-postgres-best-practices` (`security-rls-performance.md`, évaluée une fois).
Ne **pas** copier la forme radar (`FOR ALL USING (org_id = auth.jwt() ->> 'org_id')` sans `TO authenticated` ni `select`).
**Important :** l'app n'envoie jamais de JWT Clerk à Supabase (un seul `createClient`, service role) → ces policies ne sont pas exercées aujourd'hui ; elles sont une défense en profondeur cohérente avec le reste du schéma [VERIFIED: grep createClient].

### Pattern 3 : seuil — upsert à la première écriture (D-03)
GET renvoie `row?.heat_threshold ?? DEFAULT_HEAT_THRESHOLD` sans créer de ligne ; PUT fait `upsert({ org_id, heat_threshold, updated_at }, { onConflict: 'org_id' })`. `created_at` n'étant pas dans le payload, il garde sa valeur DEFAULT à l'insertion et n'est jamais écrasé ensuite.

### Pattern 4 : SIREN nullable + deux clés d'unicité
- `siren TEXT NULL` + `CHECK (siren IS NULL OR siren ~ '^[0-9]{9}$')` + `UNIQUE (org_id, siren)` : deux SIREN identiques dans une org → rejet ; plusieurs `NULL` → autorisés (vérifié).
- `normalized_name TEXT NOT NULL` + **index unique partiel** `(org_id, normalized_name) WHERE siren IS NULL` : une seule ligne « non résolue » par nom normalisé ; dès que le SIREN est connu, seule la contrainte SIREN compte (on **ne fusionne jamais sur le nom** une entreprise dont le SIREN est connu — erreur du radar, cf. audit).
- Pourquoi nullable : la Phase 10 (France Travail) persiste des signaux **avant** que le collecteur SIRENE n'arrive (Phase 11) ; un `NOT NULL` bloquerait la Phase 10. Voir Open Question 1.

### Anti-Patterns to Avoid
- **`DO $$ CREATE TYPE signal_source …` / `heat_level` / `action_type` / `action_outcome` / `availability_status` / `radar_source`** : ces noms existent déjà ; le bloc `EXCEPTION WHEN duplicate_object` les avale et la colonne hérite des **valeurs radar** (vérifié : `{job_offer,public_market,linkedin,press}`).
- **Colonne générée pour la rétention** : refusée par Postgres (« generation expression is not immutable »).
- **`CREATE INDEX CONCURRENTLY`** : interdit dans la transaction implicite du runner.
- **`supabase-js .upsert(..., { onConflict: 'org_id,normalized_name' })`** sur l'index partiel : échoue (« there is no unique or exclusion constraint matching the ON CONFLICT specification », vérifié) — PostgREST ne sait pas fournir le prédicat `WHERE`. Pour les non-résolues : select puis insert, en traitant `23505` comme « déjà là ».
- **Monter la carte seuil à l'intérieur du `<form onSubmit={handleSave}>`** de `/settings/organization` : formulaire imbriqué invalide, et le bouton « Enregistrer » déclencherait le mauvais submit.
- **Ajouter un second objet `{ rules: { 'no-restricted-syntax': … } }`** dans `eslint.config.mjs` : en flat config, les options d'une règle redéfinie plus loin remplacent les précédentes → la règle « écritures Supabase non contrôlées » serait désactivée [ASSUMED — comportement de fusion flat config ; si une règle ESLint est ajoutée, ajouter les sélecteurs **dans le même tableau**].
- **Recopier `lib/radar/queries.ts` (historique git)** : fusion par nom même quand le SIREN est connu, contacts dans un JSONB `enrichment_data`, `await supabase.from(...)` sans lecture d'erreur.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dédoublonnage SIREN | Lookup + insert applicatif | `UNIQUE (org_id, siren)` + `upsert onConflict 'org_id,siren'` | Course entre runs concurrents ; seule la contrainte est atomique. |
| Anti-double run | Flag booléen / lecture-puis-écriture | Index unique partiel `(automation_id) WHERE status='running'` | INSERT atomique ; `23505` = run déjà en cours. |
| Isolation inter-org des enfants | Vérif applicative `company.org_id === orgId` | FK composite `(org_id, company_id)` | Garantie DB, même service role. |
| Log d'échec d'écriture | `console.error(error)` ad hoc | `logSupabaseWriteError` / `formatSupabaseWriteError` (`lib/utils/supabase-write-error.ts`) | Liste fermée de clés, pas de données perso dans les logs. |
| JSONB écrit depuis des sources externes (`payload`, `source_results`, `score_breakdown`) | Rien | Utilitaire existant `lib/utils/pg-jsonb-safe.ts` (quick 260921-ksd) | Caractères interdits par Postgres (`\u0000`) → échec d'écriture. À appliquer dès la Phase 10. |
| Auth/rôles | Lecture manuelle des claims | `requireOrgId()` / `requireOrgAdmin()` / `useOrgRole()` + `useSuperAdmin()` | Déjà utilisé partout ; `requireOrgAdmin` accepte aussi le super admin. |
| Clé SIREN | Regex seule | Regex DB + `isValidSiren` (Luhn) côté code | Le format seul accepte des numéros inexistants. |

**Key insight :** dans ce domaine, tout ce qui doit tenir sous concurrence (dédup, anti-double run, isolation tenant) doit être une contrainte DB ; le code applicatif ne fait que viser ces contraintes et interpréter `23505`/`23503`/`23514`.

## Runtime State Inventory (retrait radar / Proxycurl)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Tables `radar_companies`, `radar_signals`, `radar_prospect_scores`, `radar_consultants`, `radar_matches`, `radar_actions`, `radar_run_logs`, `radar_org_settings` ; types `signal_source`, `heat_level`, `availability_status`, `action_type`, `action_outcome`, `radar_source` ; fonction `match_consultants` ; index ivfflat pgvector. Restent en base (aucune migration de drop). | **Aucune en Phase 9.** Ne pas réutiliser, ne pas référencer, **éviter les collisions de noms**. Un drop éventuel = tâche séparée (hors scope, à décider par l'utilisateur). |
| Live service config | `vercel.json` (crons `/api/radar/cron/collect-signals` toutes les 6 h et `/compute-scores`) supprimé **seulement sur la branche** ; `main` le contient encore → les crons radar continuent tant que PR #4 n'est pas déployée en prod. Variables d'env Vercel non inspectées. | Noter dans l'audit ; vérification humaine des crons et des env Vercel après merge. |
| OS-registered state | Aucun — vérifié : pas de launchd/pm2/cron local lié au radar. | Aucune. |
| Secrets/env vars | `.env.local` contient encore `ENRICHLAYER_API_KEY` (et, d'époque radar : `ANCHOR_API_KEY`, `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `APOLLO_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `FIRECRAWL_API_KEY`). `PROXYCURL_API_KEY` absent de `.env.local` ; état Vercel inconnu. Noms seulement, valeurs non relevées. | Lister dans l'audit ; **retrait = action humaine** (pas de modification de `.env*` par l'agent). |
| Build artifacts | `@browserbasehq/*` et `anchorbrowser` déjà retirés du lockfile par `7ecd35e`. `.next/` peut contenir d'anciens bundles radar (régénérés au build). | Aucune. |

## Audit Proxycurl (success criterion 5) — contenu recommandé du document

Fichier : `.planning/phases/09-db-schema-foundation-proxycurl-audit/09-PROXYCURL-AUDIT.md`. Sources : `git show 7ecd35e --stat` et `git show 7ecd35e^:<chemin>`.

1. **Statut** : code supprimé par `7ecd35e` (quick 261112-27s, 59 fichiers, −9 449 lignes). Rien à déprécier : il n'existe plus.
2. **Inventaire des références mortes (avant suppression)** :
   | Fichier (7ecd35e^) | Fournisseur réellement appelé | Env |
   |---|---|---|
   | `lib/radar/collectors/proxycurl.ts` | `https://enrichlayer.com` (person search, profile, employee count) — nom « proxycurl » trompeur | `ENRICHLAYER_API_KEY` |
   | `lib/radar/collectors/linkedin.ts` | `https://nubela.co/proxycurl/api` (company/employees, company, company/job) — **mort** | `PROXYCURL_API_KEY` |
   | `lib/radar/collectors/linkedin-enrichment.ts` | `nubela.co/proxycurl/api` (company/resolve, search/person) — **mort** | `PROXYCURL_API_KEY` |
   | `lib/radar/queries.ts` | `enrichHotProspects` limité à 20 « pour les crédits Proxycurl » ; statut sources `PROXYCURL_API_KEY` | — |
   | `app/api/radar/workflows/freelance-paris-proxycurl.workflow.ts`, `collect-linkedin.workflow.ts` | via collecteurs ci-dessus | — |
   | `app/api/radar/cron/freelance-paris-proxycurl/route.ts` | POST manuel `requireOrgAdmin` | — |
   | `app/(dashboard)/radar/components/radar-settings-form.tsx` | bouton « Freelances Paris (Proxycurl) » | — |
3. **Patterns morts à ne pas recopier** : fusion par nom même avec SIREN connu ; contacts stockés en JSONB `enrichment_data` ; enums globaux non préfixés ; RLS `EXISTS` sans `TO authenticated` ; un workflow par source.
4. **Patterns réutilisables (à réécrire, pas importer)** : normalisation de nom (`LEGAL_SUFFIXES`, NFD sans accents) ; gate d'enrichissement (seuil + cache 7 j + plafond 20/run) ; workflow dual-trigger cron/manuel.
5. **Remplaçants confirmés** (décision milestone, STATE.md/REQUIREMENTS.md) : **ScrapIn** (signaux LinkedIn, heat-gated, Phase 11) + **Dropcontact** (email, CNIL-audité, Phase 13). **Enrich Layer n'est pas un remplaçant retenu** : c'est la relance de Nubela/Proxycurl, même exposition juridique [MEDIUM : sources tierces concordantes].
6. **Docs de recherche périmées** : `.planning/research/ARCHITECTURE.md` (§Contact Enrichment Gating, Phase 3, « Proxycurl collectors (`lib/radar/collectors/proxycurl.ts`) »), `FEATURES.md` — ajouter un bandeau « Proxycurl = ScrapIn + Dropcontact ; `lib/radar` supprimé ».
7. **État runtime** : tableau Runtime State Inventory ci-dessus (tables radar conservées, crons encore sur `main`, clés d'env résiduelles).
8. **Garde-fou** : `lib/prospection/no-dead-providers.test.ts` (voir Code Examples) — c'est ce qui rend vrai « aucun nouveau code ne peut s'appuyer sur ces références ».

## Common Pitfalls

### Pitfall 1 : collision d'enum silencieuse
**What goes wrong:** `signal_source` créé « idempotemment » réutilise l'enum radar ; inserts Phase 10 `'france_travail'` → `invalid input value for enum`.
**How to avoid:** zéro `CREATE TYPE` ; `TEXT` + `CHECK` nommés `prospection_<table>_<col>_check`.
**Warning signs:** `grep -n "CREATE TYPE" <migration>` non vide.

### Pitfall 2 : la migration casse le déploiement
**What goes wrong:** `scripts/migrate.ts` tourne au `postbuild` ; une erreur → `process.exit(1)` → build Vercel en échec. Le fichier entier est annulé (transaction implicite du protocole simple, vérifié avec `psql -c` multi-instructions) et la version n'est pas enregistrée.
**How to avoid:** tester localement deux applications successives sur Postgres jetable (recette en §Verification) ; pas de `CONCURRENTLY`, pas de `BEGIN/COMMIT` explicites.

### Pitfall 3 : migration appliquée par un build de preview
**What goes wrong:** si `SUPABASE_MIGRATION_URL` est défini pour l'environnement Preview Vercel et pointe la base de prod, pousser la branche applique la migration en prod avant merge. **Non vérifié** (env Vercel non inspecté).
**How to avoid:** voir Open Question 2 ; la migration étant purement additive (nouvelles tables), le risque est faible, mais à connaître.

### Pitfall 4 : `UNIQUE` + `NULL`
**What goes wrong:** croire que `UNIQUE(org_id, siren)` empêche les doublons d'entreprises sans SIREN — non, les NULL sont distincts.
**How to avoid:** l'index partiel `(org_id, normalized_name) WHERE siren IS NULL` + règle code « résoudre le SIREN avant tout rattachement définitif ».

### Pitfall 5 : rétention RGPD figée
**What goes wrong:** calculer `gdpr_retention_expires_at` une fois pour toutes ; or la CNIL fait courir 3 ans à partir du dernier contact **à l'initiative du prospect** [CITED: PITFALLS.md → CNIL].
**How to avoid:** colonne écrivable (DEFAULT = filet), CHECK `> contact_sourced_at` seulement ; la Phase 13/14 la repousse sur interaction ; une purge planifiée viendra avec la Phase 13 (index `prospection_contacts_retention_idx` déjà posé).

### Pitfall 6 : décroissance calculée sur la mauvaise date
**What goes wrong:** decay (SCOR-02) basé sur `fetched_at`/`created_at` → un vieux signal re-collecté redevient « frais ».
**How to avoid:** `occurred_at NOT NULL` (date de l'événement) distinct de `fetched_at` ; index `(company_id, occurred_at DESC)`.

### Pitfall 7 : garde-fou trop large
**What goes wrong:** une regex sur `radar` casse sur `RadarChart` (recharts, `AnalysisCharts.tsx`) et sur les fixtures `radar_companies` de `supabase-write-error.test.ts`.
**How to avoid:** cibler `/proxycurl|nubela|enrichlayer/i` et les chemins d'import `lib/radar` / `api/radar` uniquement ; exclure le fichier de test lui-même et `supabase/migrations/` (historique immuable).

### Pitfall 8 : `useLayoutEffect` de seed de la page organisation
La page seed son état une seule fois par org (`seededForOrg`) à partir de `useOrgSettings`. La carte seuil doit avoir **son propre** état et son propre seed depuis `useProspectionSettings`, sinon elle reste à 60 après chargement.

## Code Examples

### Migration complète (vérifiée : 2 applications sur Postgres 17 + assertions)
```sql
-- supabase/migrations/<date +%Y%m%d%H%M%S>_prospection_domain.sql
-- ============================================================
-- Domaine prospection (v1.3) — 7 tables + prospection_settings
-- Tout est org-scopé (Clerk org_id). Le serveur passe par la service role
-- (RLS contournée) : chaque requête applicative DOIT filtrer .eq('org_id', orgId).
-- Les policies ci-dessous sont une défense en profondeur (convention du projet).
-- Pas d'enum Postgres : des types globaux `signal_source`, `heat_level`,
-- `action_type`, `action_outcome` existent déjà (radar) ; text + CHECK nommés.
-- updated_at : aucun trigger dans ce projet, écrit par le code applicatif.
-- ============================================================

-- ─── prospection_settings (D-01..D-03) ─────────────────────────
CREATE TABLE IF NOT EXISTS prospection_settings (
  org_id         TEXT PRIMARY KEY,
  heat_threshold SMALLINT NOT NULL DEFAULT 60,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_settings_heat_threshold_range CHECK (heat_threshold BETWEEN 0 AND 100)
);

-- ─── prospection_automations ───────────────────────────────────
CREATE TABLE IF NOT EXISTS prospection_automations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       TEXT NOT NULL,
  name         TEXT NOT NULL,
  criteria     JSONB NOT NULL DEFAULT '{}'::jsonb,   -- validé par Zod (secteurs NAF, tranches effectif, géo, profils à placer)
  enabled      BOOLEAN NOT NULL DEFAULT true,
  created_by   TEXT,
  last_run_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_automations_org_id_id_key UNIQUE (org_id, id),
  CONSTRAINT prospection_automations_name_not_blank CHECK (length(btrim(name)) > 0)
);

-- ─── prospection_companies (SIG-04 : une ligne par SIREN et par org) ─
CREATE TABLE IF NOT EXISTS prospection_companies (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  TEXT NOT NULL,
  siren                   TEXT,
  name                    TEXT NOT NULL,
  normalized_name         TEXT NOT NULL,
  naf_code                TEXT,
  headcount_range         TEXT,
  city                    TEXT,
  postal_code             TEXT,
  website                 TEXT,
  linkedin_url            TEXT,
  status                  TEXT NOT NULL DEFAULT 'new',
  current_score           SMALLINT,
  current_score_at        TIMESTAMPTZ,
  signal_last_fetched_at  TIMESTAMPTZ,          -- TTL collecte (coûts API)
  enrichment_gated_at     TIMESTAMPTZ,          -- moment où le seuil a ouvert l'enrichissement
  contacts_enriched_at    TIMESTAMPTZ,          -- cache 7 j Phase 13
  justification           TEXT,                 -- D-08, rempli Phase 12
  call_pitch              TEXT,                 -- D-08, rempli Phase 12
  synthesis_generated_at  TIMESTAMPTZ,          -- D-08
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_companies_org_siren_key UNIQUE (org_id, siren),
  CONSTRAINT prospection_companies_org_id_id_key UNIQUE (org_id, id),
  CONSTRAINT prospection_companies_siren_format CHECK (siren IS NULL OR siren ~ '^[0-9]{9}$'),
  CONSTRAINT prospection_companies_status_check CHECK (status IN ('new', 'to_call', 'called', 'dismissed')),
  CONSTRAINT prospection_companies_current_score_range CHECK (current_score IS NULL OR current_score BETWEEN 0 AND 100)
);

-- Entreprises non encore résolues : une seule ligne par nom normalisé (pas de fusion sur le nom
-- quand le SIREN est connu — la contrainte (org_id, siren) prime).
CREATE UNIQUE INDEX IF NOT EXISTS prospection_companies_unresolved_name_key
  ON prospection_companies (org_id, normalized_name) WHERE siren IS NULL;
CREATE INDEX IF NOT EXISTS prospection_companies_org_score_idx
  ON prospection_companies (org_id, current_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS prospection_companies_org_status_idx
  ON prospection_companies (org_id, status);

-- ─── prospection_run_logs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospection_run_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           TEXT NOT NULL,
  automation_id    UUID NOT NULL,
  workflow_run_id  TEXT,
  trigger          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'running',
  source_results   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- par collecteur : { ok, count, error } (SIG-06)
  signals_upserted INTEGER NOT NULL DEFAULT 0,
  companies_upserted INTEGER NOT NULL DEFAULT 0,
  error            TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at      TIMESTAMPTZ,
  CONSTRAINT prospection_run_logs_org_id_id_key UNIQUE (org_id, id),
  CONSTRAINT prospection_run_logs_trigger_check CHECK (trigger IN ('cron', 'manual')),
  CONSTRAINT prospection_run_logs_status_check CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  CONSTRAINT prospection_run_logs_automation_fk FOREIGN KEY (org_id, automation_id)
    REFERENCES prospection_automations (org_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS prospection_run_logs_automation_started_idx
  ON prospection_run_logs (automation_id, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS prospection_run_logs_workflow_run_id_key
  ON prospection_run_logs (workflow_run_id) WHERE workflow_run_id IS NOT NULL;
-- Garde anti-double run (AUTO-05) : au plus un run 'running' par automation.
CREATE UNIQUE INDEX IF NOT EXISTS prospection_run_logs_one_running_key
  ON prospection_run_logs (automation_id) WHERE status = 'running';

-- ─── prospection_signals ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospection_signals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         TEXT NOT NULL,
  company_id     UUID NOT NULL,
  automation_id  UUID,
  run_id         UUID,
  source         TEXT NOT NULL,
  signal_type    TEXT NOT NULL,
  source_ref     TEXT NOT NULL,             -- id externe (offre FT, annonce BODACC…) — clé de dédup
  title          TEXT NOT NULL,
  payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at    TIMESTAMPTZ NOT NULL,      -- date de l'événement : base du decay (SCOR-02)
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_signals_dedup_key UNIQUE (company_id, source, source_ref),
  CONSTRAINT prospection_signals_source_check CHECK (source IN ('france_travail', 'sirene', 'pappers', 'scrapin')),
  CONSTRAINT prospection_signals_type_check CHECK (signal_type IN (
    'job_posting', 'headcount_growth', 'funding', 'financial_growth', 'legal_event', 'leadership_change')),
  CONSTRAINT prospection_signals_company_fk FOREIGN KEY (org_id, company_id)
    REFERENCES prospection_companies (org_id, id) ON DELETE CASCADE,
  CONSTRAINT prospection_signals_automation_fk FOREIGN KEY (automation_id)
    REFERENCES prospection_automations (id) ON DELETE SET NULL,
  CONSTRAINT prospection_signals_run_fk FOREIGN KEY (run_id)
    REFERENCES prospection_run_logs (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS prospection_signals_company_occurred_idx
  ON prospection_signals (company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS prospection_signals_org_automation_idx
  ON prospection_signals (org_id, automation_id);
CREATE INDEX IF NOT EXISTS prospection_signals_expires_idx
  ON prospection_signals (expires_at);
CREATE INDEX IF NOT EXISTS prospection_signals_run_idx
  ON prospection_signals (run_id);

-- ─── prospection_scores (D-05..D-07 : snapshot par run) ────────
CREATE TABLE IF NOT EXISTS prospection_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           TEXT NOT NULL,
  company_id       UUID NOT NULL,
  run_id           UUID,
  score            SMALLINT NOT NULL,
  score_breakdown  JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ signal_id, signal_type, occurred_at, weight, decay, contribution }]
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_scores_score_range CHECK (score BETWEEN 0 AND 100),
  CONSTRAINT prospection_scores_company_fk FOREIGN KEY (org_id, company_id)
    REFERENCES prospection_companies (org_id, id) ON DELETE CASCADE,
  CONSTRAINT prospection_scores_run_fk FOREIGN KEY (run_id)
    REFERENCES prospection_run_logs (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS prospection_scores_company_created_idx
  ON prospection_scores (company_id, created_at DESC);   -- D-06
CREATE INDEX IF NOT EXISTS prospection_scores_run_idx
  ON prospection_scores (run_id);

-- ─── prospection_contacts (CONT-05 : provenance + rétention RGPD) ─
CREATE TABLE IF NOT EXISTS prospection_contacts (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                     TEXT NOT NULL,
  company_id                 UUID NOT NULL,
  full_name                  TEXT NOT NULL,
  job_title                  TEXT,
  linkedin_url               TEXT,
  email                      TEXT,
  email_enriched_at          TIMESTAMPTZ,
  contact_source             TEXT NOT NULL,
  contact_sourced_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  gdpr_retention_expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '3 years'),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_contacts_source_check CHECK (contact_source IN ('scrapin', 'dropcontact', 'pappers', 'manual')),
  CONSTRAINT prospection_contacts_retention_after_sourcing CHECK (gdpr_retention_expires_at > contact_sourced_at),
  CONSTRAINT prospection_contacts_company_fk FOREIGN KEY (org_id, company_id)
    REFERENCES prospection_companies (org_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS prospection_contacts_company_idx
  ON prospection_contacts (company_id);
CREATE INDEX IF NOT EXISTS prospection_contacts_retention_idx
  ON prospection_contacts (gdpr_retention_expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS prospection_contacts_company_linkedin_key
  ON prospection_contacts (company_id, linkedin_url) WHERE linkedin_url IS NOT NULL;

-- ─── prospection_actions (LIST-02 : historique des statuts) ─────
CREATE TABLE IF NOT EXISTS prospection_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL,
  company_id  UUID NOT NULL,
  user_id     TEXT NOT NULL,
  status      TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_actions_status_check CHECK (status IN ('new', 'to_call', 'called', 'dismissed')),
  CONSTRAINT prospection_actions_company_fk FOREIGN KEY (org_id, company_id)
    REFERENCES prospection_companies (org_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS prospection_actions_company_created_idx
  ON prospection_actions (company_id, created_at DESC);

-- ─── RLS (convention : anon_deny_all + 4 policies org-scopées TO authenticated) ─
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'prospection_settings', 'prospection_automations', 'prospection_companies',
    'prospection_run_logs', 'prospection_signals', 'prospection_scores',
    'prospection_contacts', 'prospection_actions'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL PRIVILEGES ON %I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_deny_all_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO anon USING (false)', 'anon_deny_all_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_select_' || t, t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR SELECT TO authenticated
      USING (org_id = (select auth.jwt() ->> 'org_id'))$p$, 'org_select_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_insert_' || t, t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR INSERT TO authenticated
      WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'))$p$, 'org_insert_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_update_' || t, t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR UPDATE TO authenticated
      USING (org_id = (select auth.jwt() ->> 'org_id'))
      WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'))$p$, 'org_update_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_delete_' || t, t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR DELETE TO authenticated
      USING (org_id = (select auth.jwt() ->> 'org_id'))$p$, 'org_delete_' || t, t);
  END LOOP;
END $$;
```
Résultats observés : 8 tables, `relrowsecurity = t` partout, 40 policies, doublon SIREN → `23505 prospection_companies_org_siren_key`, contact sans source → `23502`, rétention par défaut = 1 096 jours, `authenticated` org_b voit 0 ligne / org_a 1, insert pour une autre org → violation RLS, `anon` → permission refusée, FK composite inter-org → `23503`.
Le bloc `DO` en boucle est vérifié ; si le planner préfère la forme explicite (40 instructions, plus « greppable », comme `20260401100900_enable_rls.sql`), le résultat est identique.

### Valeurs : listes fermées et domaine (à aligner avec les CHECK)
```typescript
// lib/prospection/constants.ts
export const DEFAULT_HEAT_THRESHOLD = 60;
export const PROSPECTION_SIGNAL_SOURCES = ['france_travail', 'sirene', 'pappers', 'scrapin'] as const;
export const PROSPECTION_SIGNAL_TYPES = [
  'job_posting', 'headcount_growth', 'funding', 'financial_growth', 'legal_event', 'leadership_change',
] as const;
export const PROSPECTION_COMPANY_STATUSES = ['new', 'to_call', 'called', 'dismissed'] as const;
export const PROSPECTION_CONTACT_SOURCES = ['scrapin', 'dropcontact', 'pappers', 'manual'] as const;
export const PROSPECTION_RUN_STATUSES = ['running', 'completed', 'partial', 'failed'] as const;
```
Toute extension future = nouvelle migration `ALTER TABLE … DROP CONSTRAINT IF EXISTS <nom>; ALTER TABLE … ADD CONSTRAINT <nom> CHECK (…)` + mise à jour de la constante.

### Helpers d'identité entreprise (port réécrit du radar, sans le bug de fusion)
```typescript
// lib/prospection/company-identity.ts — logique tirée de 7ecd35e^:lib/radar/queries.ts
const LEGAL_SUFFIXES = /\b(sas|sarl|sa|srl|sasu|eurl|sci|snc|sca|se|scp|gie|gip|ep|spa|nv|bv|gmbh|ag|ltd|llc|inc|corp|plc)\b\.?/gi;

export function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(LEGAL_SUFFIXES, '')
    .replace(/[,.\-&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Retire espaces/points (« 552 100 554 ») ; renvoie undefined si pas 9 chiffres. */
export function normalizeSiren(raw: string | null | undefined): string | undefined {
  const digits = (raw ?? '').replace(/[\s.]/g, '');
  return /^[0-9]{9}$/.test(digits) ? digits : undefined;
}

/** SIREN = 9 chiffres + clé de Luhn. */
export function isValidSiren(siren: string): boolean {
  if (!/^[0-9]{9}$/.test(siren)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    let digit = Number(siren[8 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}
```
Tests : `'552 100 554'` → normalisé ; Luhn valide/invalide ; `'ACME S.A.S.'` et `'Acme'` → même nom normalisé ; accents retirés.

### Route seuil (CONT-04)
```typescript
// app/api/prospection/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, requireOrgId } from '@/lib/utils/auth';
import { getSupabase } from '@/lib/utils/supabase';
import { getProspectionSettings } from '@/lib/prospection/settings';
import { prospectionSettingsPutSchema } from '@/lib/validation/prospection-settings';

export async function GET() {
  try {
    const orgId = await requireOrgId();
    return NextResponse.json(await getProspectionSettings(orgId));
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('GET /api/prospection/settings:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { orgId } = await requireOrgAdmin();
    const parsed = prospectionSettingsPutSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { data, error } = await getSupabase()
      .from('prospection_settings')
      .upsert(
        { org_id: orgId, heat_threshold: parsed.data.heat_threshold, updated_at: new Date().toISOString() },
        { onConflict: 'org_id' },
      )
      .select('org_id, heat_threshold, updated_at')
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('PUT /api/prospection/settings:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
```
```typescript
// lib/validation/prospection-settings.ts
import { z } from 'zod';
export const prospectionSettingsPutSchema = z.object({
  heat_threshold: z.number().int().min(0).max(100),
});
export type ProspectionSettingsPut = z.infer<typeof prospectionSettingsPutSchema>;
```
```typescript
// lib/prospection/settings.ts — serveur ; réutilisé par la gate Phase 13
export type ProspectionSettings = { heat_threshold: number; is_default: boolean };

export async function getProspectionSettings(orgId: string): Promise<ProspectionSettings> {
  const { data, error } = await getSupabase()
    .from('prospection_settings')
    .select('heat_threshold')
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? { heat_threshold: data.heat_threshold, is_default: false }
    : { heat_threshold: DEFAULT_HEAT_THRESHOLD, is_default: true };
}

export async function getProspectionHeatThreshold(orgId: string): Promise<number> {
  return (await getProspectionSettings(orgId)).heat_threshold;
}
```
Hooks : `queryKeys.prospection.settings(orgId)` = `['prospection', 'settings', orgId] as const` ; `useProspectionSettings()` (calque de `useOrgSettings`) ; `useUpdateProspectionSettings()` (calque de `useInviteMember` : `throw new Error(err.error …)` si `!res.ok`, `onSuccess` → `invalidateQueries`). Carte : `Card` + `Field`/`FieldLabel` + `Slider` (0–100, pas 5) **et** `Input type="number"` synchronisés, bouton « Enregistrer le seuil », `toast.success` / `toast.error`, texte d'aide « En dessous de ce score, la recherche de contact est désactivée ». Montée **après** la balise `</form>` existante de `/settings/organization`.

### Garde-fou anti-Proxycurl (success criterion 5)
```typescript
// lib/prospection/no-dead-providers.test.ts — calqué sur lib/config/app-routes.test.ts
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCANNED_DIRS = ['app', 'lib', 'components', 'workflows', 'scripts'];
const SCANNED_FILES = ['vercel.json', 'next.config.ts', 'middleware.ts', 'package.json'];
const SELF = relative(ROOT, fileURLToPath(import.meta.url));
const DEAD_PROVIDER = /proxycurl|nubela|enrichlayer/i;
const DEAD_IMPORT = /['"]@\/(lib\/radar|app\/api\/radar)\b/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return entry === 'node_modules' ? [] : walk(full);
    return /\.(ts|tsx|js|mjs|json)$/.test(entry) ? [full] : [];
  });
}

describe('fournisseurs morts (audit Phase 9)', () => {
  const files = [
    ...SCANNED_DIRS.filter((d) => existsSync(join(ROOT, d))).flatMap((d) => walk(join(ROOT, d))),
    ...SCANNED_FILES.map((f) => join(ROOT, f)).filter(existsSync),
  ].filter((f) => relative(ROOT, f) !== SELF);

  it('aucune référence Proxycurl / Nubela / Enrich Layer', () => {
    const offenders = files.filter((f) => DEAD_PROVIDER.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it('aucun import du domaine radar supprimé', () => {
    const offenders = files.filter((f) => DEAD_IMPORT.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });
});
```
(Package `"type": "module"` : `fileURLToPath(import.meta.url)`, comme `vitest.config.ts`. À exécuter une fois pour confirmer qu'il passe sur l'arbre actuel.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Proxycurl (Nubela) pour LinkedIn + enrichissement | ScrapIn (signaux, heat-gated) + Dropcontact (email) | Fermeture Proxycurl 4 juillet 2025 [MEDIUM : sources tierces concordantes] | Toute doc/code citant Proxycurl est historique. |
| Enrich Layer comme « remplaçant compatible » | Non retenu | Relance de Nubela [LOW-MEDIUM] | `ENRICHLAYER_API_KEY` à retirer (action humaine). |
| Intégration Supabase via JWT template Clerk | Clerk session tokens + Third-Party Auth Supabase | JWT template déprécié au 1ᵉʳ avril 2025 [CITED: supabase.com/docs/guides/auth/third-party/clerk] | Sans effet aujourd'hui (service role) ; si un jour la clé anon + token Clerk sont utilisés, le claim d'org des tokens v2 est imbriqué (`o.id`) et non `org_id` [MEDIUM] → policies à revoir à ce moment-là. |

**Deprecated/outdated dans le repo :** `.planning/research/ARCHITECTURE.md` (schéma avec `source DEFAULT 'proxycurl'`, `justification`/`call_pitch` sur scores — remplacé par D-08), `lib/radar/*` (supprimé).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | En flat config ESLint, redéfinir `no-restricted-syntax` dans un objet ultérieur remplace les options précédentes | Anti-Patterns | Faible : le plan recommande vitest ; si ESLint est utilisé, mettre les sélecteurs dans le même tableau supprime le risque. |
| A2 | `SUPABASE_MIGRATION_URL` est défini dans l'env Vercel Production (non visible localement) et peut-être en Preview | Pitfall 3 / Open Q2 | Moyen : migration appliquée plus tôt ou pas du tout. |
| A3 | Enrich Layer = relance de Nubela/Proxycurl | Audit | Faible : il n'est de toute façon pas retenu. |
| A4 | Tokens Clerk v2 : claim d'org imbriqué `o.id` | State of the Art | Nul aujourd'hui (RLS non exercée) ; à revoir si usage de la clé anon. |
| A5 | France Travail ne fournit pas systématiquement le SIREN de l'employeur → `siren` nullable nécessaire en Phase 10 | Pattern 4 / Open Q1 | Moyen : si le SIREN est toujours disponible, `NOT NULL` serait plus strict. |
| A6 | Clé de Luhn applicable à tous les SIREN | Helpers | Faible : utilisé côté code uniquement (la DB ne vérifie que le format). |
| A7 | Liste de `signal_type` / `contact_source` suffisante pour les Phases 10–13 | Migration | Faible : extension par migration CHECK idempotente. |

## Open Questions (RESOLVED)

1. **`siren` nullable ou NOT NULL ?**
   - Ce qu'on sait : PITFALLS.md recommande `NOT NULL` ; le ROADMAP exige seulement `UNIQUE(org_id, siren)` ; la Phase 10 collecte France Travail avant l'arrivée du collecteur SIRENE (Phase 11).
   - Recommandation : **nullable** + CHECK + index partiel sur le nom normalisé (SQL ci-dessus) ; la Phase 11 ajoute la résolution SIRENE et le contrôle « `WHERE siren IS NULL` avant lancement » de PITFALLS reste une vérification de fin de milestone. À confirmer par l'utilisateur si un doute subsiste.
   - RESOLVED: `siren` nullable + `CHECK (siren IS NULL OR siren ~ '^[0-9]{9}$')` + `UNIQUE (org_id, siren)` + index unique partiel sur `normalized_name WHERE siren IS NULL` (décision orchestrateur, plan 09-01).
2. **Où et quand la migration s'applique-t-elle ?** `SUPABASE_MIGRATION_URL` n'est pas en local ; elle tourne au `postbuild` Vercel. Vérifier (humain, tableau de bord Vercel) que la variable n'est **pas** exposée aux builds Preview pointant la prod — sinon le push de la branche applique la migration. Migration additive → risque faible, mais l'exécutant doit le savoir.
   - RESOLVED: `SUPABASE_MIGRATION_URL` est absente de l'env Vercel (seuls `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, partagés par Development / Preview / Production) et de `.env.local` : aucun build, preview compris, n'applique la migration. Elle est appliquée au checkpoint humain bloquant du plan 09-04.
3. **Statut courant de l'entreprise** : colonne `prospection_companies.status` (filtre LIST-03 simple) + historique `prospection_actions`. Alternative : statut dérivé de la dernière action (pas de dénormalisation, filtre plus coûteux). Recommandation : colonne + historique, écrits ensemble en Phase 14.
   - RESOLVED: colonne `status` sur `prospection_companies` (CHECK `new|to_call|called|dismissed`) + historique dans `prospection_actions`, écrits ensemble en Phase 14.
4. **Anti-double run** : index partiel `prospection_run_logs_one_running_key` posé dès maintenant ; il impose une réconciliation des runs zombies (précédent quick 260921-j3g, `started_at`) en Phase 10. Si la Phase 10 retient un autre mécanisme, l'index est sans effet nuisible.
   - RESOLVED: index unique partiel `prospection_run_logs_one_running_key` posé dès la Phase 9 ; la gestion des runs bloqués (zombies) est traitée en Phase 10.
5. **UI-SPEC** : `workflow.ui_phase = true` mais la Phase 9 n'a pas de « UI hint » au ROADMAP ; la carte seuil est minime. Le planner décide si un `/gsd:ui-phase` est requis ou si la description ci-dessus suffit.
   - RESOLVED: pas d'UI-SPEC ; une seule carte shadcn « Prospection » dans `/settings/organization` (plan 09-02).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/tests | ✓ | v24.15.0 (CLAUDE.md mentionne 22) | — |
| pnpm | scripts | ✓ | 11.10.0 | — |
| Docker | vérification locale de la migration (Postgres jetable) | ✓ (daemon actif) | — | — |
| Image `postgres:17-alpine` | idem | ✓ (tirée pendant la recherche) | 17 | — |
| psql | assertions SQL | ✓ | 18.3 | `docker exec … psql` |
| Supabase CLI | — (pas de `supabase/config.toml` → pas de `supabase start` sans `supabase init`) | ✓ | 2.78.1 | Postgres jetable + stub |
| `SUPABASE_MIGRATION_URL` | application réelle de la migration | ✗ en local | — | Application au postbuild Vercel (déploiement) |
| Base Supabase prod (version) | — | — | Postgres 17.6 (`supabase/.temp/postgres-version`) | — |

**Bloquant sans repli :** aucun pour l'implémentation. La preuve « dans Supabase » (success criterion 1–4 sur la vraie base) n'arrive qu'après déploiement → vérification humaine post-déploiement (requêtes ci-dessous).

## Verification Strategy (nyquist_validation = false → section allégée)

- **Statique (vitest, rapide)** : `pnpm test` — `company-identity.test.ts`, `no-dead-providers.test.ts`, et un test « contrat de migration » qui lit le fichier SQL et vérifie : présence des 8 `CREATE TABLE IF NOT EXISTS prospection_*`, de `prospection_companies_org_siren_key UNIQUE (org_id, siren)`, des 3 colonnes RGPD `NOT NULL`, de `signal_last_fetched_at` et `enrichment_gated_at`, absence de `CREATE TYPE` et de `CONCURRENTLY`.
- **Exécution locale (recette reproductible, utilisée pour cette recherche)** :
  1. `docker run -d --rm --name p9-pg -e POSTGRES_PASSWORD=x postgres:17-alpine` puis attendre `pg_isready`.
  2. Stub : rôles `anon`, `authenticated` ; schéma `auth` ; `auth.jwt()` lisant `current_setting('request.jwt.claims', true)` ; recréer `signal_source`/`heat_level`/`action_type` (pour prouver l'absence de collision).
  3. Appliquer la migration **deux fois** avec `psql -v ON_ERROR_STOP=1 -1 < fichier`.
  4. Assertions : doublon SIREN → 23505 ; contact sans `contact_source` → 23502 ; RLS org_a/org_b via `SET ROLE authenticated` + `set_config('request.jwt.claims', …)` ; FK composite inter-org → 23503.
  5. `docker stop p9-pg`.
- **Post-déploiement (humain, éditeur SQL Supabase)** : `select count(*) from information_schema.tables where table_name like 'prospection_%'` = 8 ; `select relname, relrowsecurity from pg_class where relname like 'prospection_%' and relkind='r'` ; deux `insert` même SIREN même org dans une transaction annulée (`begin; … rollback;`).
- **Manuel UI** : en org admin, `/settings/organization` → régler 75 → recharger → 75 ; en membre, la page redirige (garde existante) et `PUT` direct → 403.

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | oui (indirect) | Clerk via `requireOrgId` / `requireOrgAdmin` |
| V3 Session Management | non (Clerk) | — |
| V4 Access Control | **oui** | `requireOrgAdmin` sur PUT ; `.eq('org_id')` systématique ; RLS + FK composites |
| V5 Input Validation | **oui** | Zod (`int`, 0..100) + CHECK DB |
| V6 Cryptography | non | — |
| V8 Data Protection (RGPD) | **oui** | colonnes provenance/rétention NOT NULL ; aucune donnée perso dans les logs (`logSupabaseWriteError`) |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Fuite inter-tenant via service role (oubli de `.eq('org_id')`) | Information disclosure | Filtre org obligatoire + FK composites + revue |
| Liaison d'un enfant à l'entreprise d'une autre org | Tampering | FK composite `(org_id, company_id)` (vérifiée) |
| Membre non admin modifie le seuil (coûts d'enrichissement) | Elevation of privilege | `requireOrgAdmin` côté API (la garde UI ne suffit pas) |
| Valeur hors bornes / non entière | Tampering | Zod + `CHECK (heat_threshold BETWEEN 0 AND 100)` |
| Conservation illimitée de données de contact | Repudiation / conformité | `gdpr_retention_expires_at NOT NULL` + index de purge (purge Phase 13) |
| Clés d'API mortes réactivées par copier-coller | Spoofing / coût | Garde-fou vitest + retrait humain des clés résiduelles |

## Sources

### Primary (HIGH confidence)
- Code du repo : `supabase/migrations/*` (notamment `20260401100900_enable_rls.sql`, `20260401101100_organization_settings.sql`, `20260401102300_radar_tables.sql`, `20260401102600_001_radar_run_logs.sql`, `20260401104900_radar_org_settings.sql`, `20260402165214_radar_signals_matches_rls.sql`, `20260921135225_workflow_started_at.sql`), `scripts/migrate.ts`, `lib/utils/{supabase,auth,supabase-write-error,org-settings}.ts`, `app/api/org/settings/route.ts`, `app/settings/organization/page.tsx`, `app/admin/page.tsx`, `middleware.ts`, `lib/queries/*`, `eslint.config.mjs`, `lib/config/app-routes.test.ts`.
- Historique git : `git show 7ecd35e --stat`, `git show 7ecd35e^:lib/radar/...` (inventaire Proxycurl/Enrich Layer).
- Exécution réelle sur `postgres:17-alpine` : colonne générée refusée, UNIQUE/NULL, CHECK SIREN, FK composite, collision d'enum, index partiel + `ON CONFLICT`, atomicité multi-instructions, migration complète ×2 + RLS.
- Skill projet `.claude/skills/supabase-postgres-best-practices` (`security-rls-performance.md`, `schema-constraints.md`, `schema-foreign-key-indexes.md`).

### Secondary (MEDIUM confidence)
- [Supabase — Clerk third-party auth](https://supabase.com/docs/guides/auth/third-party/clerk) — JWT template déprécié, claim `role` requis.
- [Clerk blog — multitenancy Clerk + Supabase](https://clerk.com/blog/multitenancy-clerk-supabase-b2b) — claims d'org (`org_id` / `o.id`).
- [ZoomInfo — Proxycurl API review](https://pipeline.zoominfo.com/sales/proxycurl-api), [Unipile — Proxycurl alternative](https://www.unipile.com/proxycurl-alternative/) — fermeture juillet 2025, relance Enrich Layer.
- [enrichlayer/enrichlayer-api-py](https://github.com/enrichlayer/enrichlayer-api-py) — existence/endpoint d'Enrich Layer.
- `.planning/research/{SUMMARY,ARCHITECTURE,PITFALLS}.md` (juillet 2026) — RGPD 3 ans, TTL, SIREN.

### Tertiary (LOW confidence)
- [Explorium — Enrich Layer](https://www.explorium.ai/compare/enrichlayer/) — dates divergentes, non retenu comme source.

## Metadata

**Confidence breakdown:**
- Standard stack : HIGH — aucun ajout, tout lu dans le repo.
- Architecture / schéma : HIGH — SQL exécuté et assertions passées ; choix de colonnes pour Phases 10–14 = MEDIUM (anticipation, extensible par migration).
- Pitfalls : HIGH — collisions d'enum, immutabilité, `ON CONFLICT` partiel et atomicité vérifiés empiriquement.
- Audit Proxycurl : HIGH pour l'inventaire (git) ; MEDIUM pour le contexte Enrich Layer.

**Research date:** 2026-11-24
**Valid until:** 2026-12-24 (schéma stable) ; revalider l'état des env Vercel et le merge de PR #4 avant exécution.
