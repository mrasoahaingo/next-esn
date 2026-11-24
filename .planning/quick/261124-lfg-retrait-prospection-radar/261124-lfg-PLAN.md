---
phase: quick-261124-lfg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/prospection/ (dossier supprimé : company-identity.ts, company-identity.test.ts, constants.ts, migration-contract.test.ts, no-dead-providers.test.ts, settings.ts, settings.test.ts, settings-route.test.ts)
  - app/api/prospection/settings/route.ts (supprimé)
  - components/settings/prospection-settings-card.tsx (supprimé)
  - lib/queries/prospection-settings.ts (supprimé)
  - lib/validation/prospection-settings.ts (supprimé)
  - lib/types/prospection.ts (supprimé)
  - supabase/migrations/20261124150326_prospection_domain.sql (supprimé)
  - app/settings/organization/page.tsx
  - lib/queries/keys.ts
  - lib/queries/index.ts
  - lib/utils/supabase-write-error.test.ts
  - supabase/migrations/<TS>_drop_radar.sql (nouveau, TS = date +%Y%m%d%H%M%S)
  - supabase/drop-radar-migration.test.ts (nouveau)
  - .planning/ROADMAP.md
  - .planning/PROJECT.md
  - .planning/STATE.md
  - .planning/REQUIREMENTS.md
  - .planning/milestones/v1.3-ROADMAP.md (nouveau)
  - .planning/milestones/v1.3-REQUIREMENTS.md (nouveau)
autonomous: true
requirements: [QUICK-261124-lfg]

must_haves:
  truths:
    - "Le produit ne contient plus aucune surface prospection : pas de route /api/prospection, pas de carte « Prospection » dans /settings/organization, pas de dossier lib/prospection"
    - "La gestion des CV et le positionnement CV ↔ mission fonctionnent comme avant : vitest, tsc, eslint et next build passent"
    - "Une migration drop_radar idempotente supprime les 8 tables radar_*, les 6 types radar et la fonction match_consultants, sans toucher aux tables conservées ni à l'extension pgvector"
    - "La migration drop_radar n'est appliquée sur aucune base distante ; son idempotence est prouvée par un test de contrat et une recette Postgres jetable"
    - "Le jalon v1.3 Prospection apparaît comme parké dans ROADMAP, PROJECT et STATE ; la phase 9 est notée arrêtée avant 09-04 ; aucun fichier sous .planning/phases/09-* ni .planning/research/ n'est supprimé"
    - "La landing publique (carte « Prospection — Bientôt »), RadarChart/Radar de recharts, docs/STRATEGY.md et next-esn-local.sql sont inchangés"
  artifacts:
    - path: "supabase/migrations/<TS>_drop_radar.sql"
      provides: "Suppression idempotente des objets radar"
      contains: "DROP TABLE IF EXISTS public.radar_companies"
    - path: "supabase/drop-radar-migration.test.ts"
      provides: "Contrat statique de la migration drop_radar"
    - path: "app/settings/organization/page.tsx"
      provides: "Page réglages org identique à 68383fe"
    - path: ".planning/milestones/v1.3-ROADMAP.md"
      provides: "Archive des phases 9–14 du jalon parké"
  key_links:
    - from: "lib/queries/index.ts"
      to: "lib/queries/prospection-settings.ts"
      via: "export supprimé (le fichier n'existe plus)"
      pattern: "prospection"
    - from: "supabase/drop-radar-migration.test.ts"
      to: "supabase/migrations/*_drop_radar.sql"
      via: "readFileSync sur le fichier trouvé par suffixe"
      pattern: "_drop_radar\\.sql"
---

<objective>
Retirer toute la partie prospection/radar du produit. Seules restent la gestion des CV et le matching CV ↔ missions (positionnement). La prospection et le radar seront retravaillés plus tard ; le code reste récupérable via l'historique git (le radar historique a été retiré par `7ecd35e`, le code de la phase 9 vit dans les commits `c617e10`..`0d76094`).

Purpose : la branche `prospection-phase-9` ne doit plus embarquer de surface prospection à demi construite (route, carte de réglage, migration jamais appliquée), et la base doit pouvoir être débarrassée des objets radar morts quand l'utilisateur le décidera.

Output :
1. Code phase 9 supprimé, trois fichiers rétablis à leur état `68383fe`, fixtures neutralisées.
2. Nouvelle migration `supabase/migrations/<TS>_drop_radar.sql` + test de contrat vitest + recette Docker jetable (non commitée), avec preuve d'idempotence.
3. Jalon v1.3 parké dans `.planning`, dans le style du parking de v1.2.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/PROJECT.md
@./CLAUDE.md
@.planning/phases/09-db-schema-foundation-proxycurl-audit/09-PROXYCURL-AUDIT.md

## Décisions verrouillées de l'utilisateur (non négociables)

- **D-01** : la carte « Prospection — Bientôt » de la landing publique reste : NE PAS toucher `components/landing/landing.tsx`, `app/landing.css`, `DESIGN.md`.
- **D-02** : les objets radar en base sont supprimés via une NOUVELLE migration `supabase/migrations/<date +%Y%m%d%H%M%S>_drop_radar.sql`, idempotente, sans modifier ni supprimer les 7 anciennes migrations radar (`20260401102300_radar_tables.sql`, `20260401102400_radar_linkedin_discovery.sql`, `20260401102600_001_radar_run_logs.sql`, `20260401103000_001_linkedin_context.sql`, `20260401103100_radar_source_linkedin_discovery.sql`, `20260401104900_radar_org_settings.sql`, `20260402165214_radar_signals_matches_rls.sql`). Aucune connexion à une base distante. Seule une recette sur un Postgres Docker jetable est permise. L'application en prod se fera plus tard, avec l'accord explicite de l'utilisateur.
- **D-03** : retrait sur la branche courante `prospection-phase-9`. Le jalon v1.3 est marqué « parké » comme v1.2. Tout le contenu de `.planning/phases/09-*` et de `.planning/research/` est CONSERVÉ. La phase 9 est notée « arrêtée avant 09-04 » (migration prospection jamais appliquée).

## Inventaire établi par le planificateur (vérifié par grep le 2026-11-24)

Objets radar créés par les anciennes migrations :
- **Tables (8)** : `radar_companies`, `radar_signals` (FK → companies), `radar_prospect_scores` (FK → companies), `radar_consultants`, `radar_matches` (FK → companies, consultants), `radar_actions` (FK → companies), `radar_run_logs`, `radar_org_settings` (les colonnes `linkedin_discovery` et `linkedin_context_id` des migrations 102400/103000 sont sur `radar_org_settings` elle-même, donc supprimées avec elle).
- **Types (6)** : `signal_source`, `heat_level`, `availability_status`, `action_type`, `action_outcome`, `radar_source`.
- **Fonction (1)** : `match_consultants(query_embedding vector(1536), match_org_id text, match_threshold float DEFAULT 0.7, match_count int DEFAULT 5)`, soit la signature `(vector, text, double precision, integer)`. Son type de retour référence `availability_status`.
- **Index** : 11 index btree `idx_radar_*`, 3 index `idx_radar_run_logs_*` et 2 index ivfflat (`idx_radar_signals_embedding`, `idx_radar_consultants_embedding`). Tous sont supprimés automatiquement avec leurs tables.
- **Policies RLS** : toutes sur des tables radar, supprimées automatiquement avec leurs tables.

Vérifications faites :
- Aucune occurrence de `embedding`, `vector`, `match_consultants`, `ivfflat` dans `app/ lib/ workflows/ components/ scripts/`. Le matching CV ↔ missions n'utilise pas pgvector.
- Aucune migration non radar ne contient `REFERENCES radar_` ni n'utilise ces 6 types. Seul le commentaire de `20261124150326_prospection_domain.sql` les cite, et ce fichier est supprimé.
- L'extension `vector` est créée par `20260401102200_001_enable_pgvector.sql`, qui ne figure pas dans la liste radar de l'utilisateur. Seuls des objets radar l'utilisent.
- `vercel.json` n'existe pas sur cette branche (retiré par `7ecd35e`). Il n'y a donc aucun cron radar à retirer ici. `main` contient encore les deux crons radar, ce qui est hors périmètre et déjà signalé dans 09-PROXYCURL-AUDIT §7.

## Choix du planificateur (à discrétion, à reporter dans le SUMMARY)

- **pgvector CONSERVÉ** : pas de `DROP EXTENSION`. L'extension est inerte une fois les objets radar partis. Sa migration n'est pas une migration radar, et la refonte future de la prospection pourrait s'en servir. Supprimer une extension Supabase relève d'une décision distincte (règle « en cas de doute, ne pas supprimer »).
- **Pas de CASCADE** : les tables sont supprimées dans l'ordre des FK (enfants d'abord), la fonction avant les types. Si la prod contient un objet inconnu (vue créée à la main, etc.) qui dépend d'un objet radar, la migration doit échouer bruyamment plutôt que l'emporter en silence.
- **Pas de `DROP POLICY` / `DROP INDEX` explicites** : `DROP TABLE` les supprime. Un `DROP POLICY IF EXISTS … ON <table absente>` peut échouer sur une base sans radar, ce qui casserait l'idempotence.
- **Tout est qualifié `public.`** : les noms de types sont génériques (`action_type`…), on ne doit jamais toucher un homonyme dans un autre schéma.
- **Pas de DROP des tables `prospection_*`** : leur migration n'a jamais été appliquée et son fichier est supprimé.

<interfaces>
Fichiers rétablis à l'identique de `68383fe` (le diff `68383fe..HEAD` sur ces 3 fichiers ne contient QUE les ajouts de la phase 9) :
- `app/settings/organization/page.tsx` : retirer l'import `ProspectionSettingsCard` et le bloc `{canManage ? <ProspectionSettingsCard /> : null}` avec son commentaire.
- `lib/queries/index.ts` : retirer `export { useProspectionSettings, useUpdateProspectionSettings } from './prospection-settings';` et `export type { ProspectionSettingsResponse } from './prospection-settings';`.
- `lib/queries/keys.ts` : retirer la clé `prospection: { all, settings }`.

`lib/utils/supabase-write-error.ts` exporte `formatSupabaseWriteError(ctx: SupabaseWriteErrorContext)` avec `{ table, recordId, operation, supabaseError }`. Les assertions du test portent sur `supabaseError` / `recordId`, jamais sur le nom de table.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1 : Retirer le code prospection de la phase 9 et neutraliser les fixtures radar</name>
  <files>lib/prospection/ (supprimé), app/api/prospection/settings/route.ts (supprimé), components/settings/prospection-settings-card.tsx (supprimé), lib/queries/prospection-settings.ts (supprimé), lib/validation/prospection-settings.ts (supprimé), lib/types/prospection.ts (supprimé), supabase/migrations/20261124150326_prospection_domain.sql (supprimé), app/settings/organization/page.tsx, lib/queries/keys.ts, lib/queries/index.ts, lib/utils/supabase-write-error.test.ts</files>
  <read_first>lib/utils/supabase-write-error.test.ts (lignes 50-105), app/settings/organization/page.tsx (vers les lignes 7-12 et 470-485)</read_first>
  <action>
Préparation du worktree : `ln -s /Users/mrasoahaingo/Projects/perso/next-esn/node_modules node_modules`. Le lien est ignoré par `.gitignore` : ne JAMAIS le commiter, vérifier avec `git status --short` avant chaque commit. Noter `BASE=$(git rev-parse HEAD)` dans le SUMMARY, et redéfinir `BASE=<ce sha>` dans chaque commande de vérification des Tasks 1 à 3 (les variables shell ne persistent pas d'un appel à l'autre) ; il sert à prouver que les fichiers protégés n'ont pas bougé.

1. Supprimer avec `git rm -r` : `lib/prospection/` (tout le dossier, y compris `no-dead-providers.test.ts`, dont l'interdiction des imports `@/lib/radar` gênerait la future refonte), `app/api/prospection/`, `components/settings/prospection-settings-card.tsx`, `lib/queries/prospection-settings.ts`, `lib/validation/prospection-settings.ts`, `lib/types/prospection.ts`, `supabase/migrations/20261124150326_prospection_domain.sql`. Cette migration n'a jamais été appliquée, sa suppression est donc sûre.
2. Rétablir `app/settings/organization/page.tsx`, `lib/queries/keys.ts` et `lib/queries/index.ts` avec `git checkout 68383fe -- <les 3 fichiers>`. Vérifier ensuite que `git diff 68383fe -- <les 3 fichiers>` est vide et que `git diff $BASE -- <les 3 fichiers>` ne montre QUE des lignes retirées qui mentionnent la prospection. Si un autre changement apparaît (modification postérieure non phase 9), revenir à `$BASE` et retirer les lignes à la main.
3. Dans `lib/utils/supabase-write-error.test.ts`, renommer les fixtures sans changer les assertions : `table: 'radar_companies'` devient `table: 'candidates'` ; `operation: 'radar.findOrCreateCompany.refreshName'` devient `operation: 'candidates.extraction.refreshName'` ; `table: 'radar_actions'` devient `table: 'positionings'` ; `operation: 'radar.brief.logAction'` devient `operation: 'positioning.export.update'`. Les `recordId` (`c1`, `a1`) et toutes les lignes `expect(...)` restent identiques.
4. Garde-fou des références restantes : `git grep -liE 'prospect|radar' -- . ':!.planning' ':!.claude' ':!.cursor' ':!.agents' ':!docs'` doit lister EXACTEMENT `DESIGN.md`, `app/landing.css`, `app/review/[id]/positioning/[positioningId]/components/AnalysisCharts.tsx`, `components/landing/landing.tsx`, `next-esn-local.sql` et les 7 anciennes migrations radar. Ce sont les exceptions voulues : D-01, RadarChart de recharts pour le graphique du matching, dump local. Toute autre ligne doit être traitée ou signalée dans le SUMMARY. Ne pas toucher non plus `docs/STRATEGY.md`. Les fichiers non suivis (`.media/`, `.taste-skill/`, `tsconfig.tsbuildinfo`) sont hors sujet.
5. Commit : `chore(quick-261124-lfg): retirer le code prospection de la phase 9`, avec la ligne d'attribution `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  </action>
  <verify>
    <automated>test ! -e lib/prospection && test ! -e app/api/prospection && git diff --quiet 68383fe -- app/settings/organization/page.tsx lib/queries/keys.ts lib/queries/index.ts && git diff --quiet $BASE -- components/landing app/landing.css DESIGN.md docs next-esn-local.sql 'app/review/[id]/positioning/[positioningId]/components/AnalysisCharts.tsx' && ! grep -qi radar lib/utils/supabase-write-error.test.ts && npx vitest run lib/utils/supabase-write-error.test.ts && npx tsc --noEmit</automated>
  </verify>
  <done>Les 7 cibles sont supprimées, les 3 fichiers sont identiques à 68383fe et le test des fixtures passe sans aucune mention radar. `tsc --noEmit` renvoie 0. Le git grep ne liste que les exceptions voulues.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2 : Migration drop_radar idempotente, test de contrat et recette Postgres jetable</name>
  <files>supabase/migrations/&lt;TS&gt;_drop_radar.sql, supabase/drop-radar-migration.test.ts</files>
  <read_first>supabase/migrations/20260401102300_radar_tables.sql, supabase/migrations/20260401102600_001_radar_run_logs.sql, supabase/migrations/20260401104900_radar_org_settings.sql, supabase/migrations/20260401102200_001_enable_pgvector.sql</read_first>
  <behavior>
    - Le fichier `*_drop_radar.sql` existe et il n'y en a qu'un seul.
    - Chaque instruction `DROP` porte `IF EXISTS` et cible un nom qualifié `public.`.
    - Les 8 tables radar sont supprimées, toutes et uniquement des `public.radar_*`.
    - Les 6 types `signal_source`, `heat_level`, `availability_status`, `action_type`, `action_outcome` et `radar_source` sont supprimés.
    - `match_consultants` est supprimée AVANT tout `DROP TYPE`, et toutes les tables sont supprimées AVANT tout `DROP TYPE`.
    - `radar_matches`, `radar_signals`, `radar_prospect_scores` et `radar_actions` sont supprimées avant `radar_companies`, et `radar_matches` avant `radar_consultants`.
    - Le fichier ne contient ni `CASCADE`, ni `DROP EXTENSION`, ni `CREATE`/`ALTER`/`INSERT`/`UPDATE`/`DELETE`, et aucun nom de table conservée (`candidates`, `missions`, `positionings`, `org_settings`).
  </behavior>
  <action>
RED : générer le timestamp avec `date +%Y%m%d%H%M%S`, conformément à CLAUDE.md (14 chiffres, unique). Écrire d'abord `supabase/drop-radar-migration.test.ts` (vitest, `readdirSync`/`readFileSync` sur `join(process.cwd(), 'supabase', 'migrations')`, fichier trouvé par suffixe `_drop_radar.sql`), qui encode les assertions du bloc behavior. Les commentaires SQL (`--`) sont retirés avant l'analyse, pour qu'un commentaire ne fasse ni passer ni échouer une assertion. Lancer le test : il doit échouer (fichier absent). Commit `test(quick-261124-lfg): contrat de la migration drop_radar`.

GREEN : créer `supabase/migrations/<TS>_drop_radar.sql`, sans modifier aucune ancienne migration (D-02). Le fichier commence par un commentaire en français : il supprime les objets du radar retiré (`7ecd35e`), n'est pas appliqué en prod sans accord explicite de l'utilisateur, conserve volontairement pgvector, et n'utilise pas CASCADE pour échouer bruyamment si un objet inconnu en dépend. Instructions dans cet ordre :
(a) `DROP FUNCTION IF EXISTS public.match_consultants(vector, text, double precision, integer);`
(b) `DROP TABLE IF EXISTS`, dans l'ordre `public.radar_matches`, `public.radar_signals`, `public.radar_prospect_scores`, `public.radar_actions`, `public.radar_consultants`, `public.radar_companies`, `public.radar_run_logs`, `public.radar_org_settings` ;
(c) `DROP TYPE IF EXISTS`, dans l'ordre `public.signal_source`, `public.heat_level`, `public.availability_status`, `public.action_type`, `public.action_outcome`, `public.radar_source`.
Pas de `DROP POLICY`/`DROP INDEX` : ils partent avec les tables, et un `DROP POLICY … ON` une table absente casserait l'idempotence. Pas de `DROP EXTENSION vector` (choix du planificateur, voir contexte). Pas de drop de colonnes sur des tables conservées : aucune migration radar n'en a ajouté. Relancer le test : il doit passer. Commit `feat(quick-261124-lfg): migration drop_radar idempotente`.

Recette Postgres jetable (script NON commité, dans le scratchpad de la session ; aucune base distante) :
- Lancer `docker run -d --rm --name lfg-drop-radar -e POSTGRES_PASSWORD=x pgvector/pgvector:pg17`, attendre `pg_isready`.
- Créer le stub Supabase : `CREATE SCHEMA auth;` puis une fonction `auth.jwt()` qui renvoie `'{}'::jsonb` (les policies radar en dépendent).
- Appliquer avec `psql -v ON_ERROR_STOP=1 -f`, dans l'ordre : `20260401102200_001_enable_pgvector.sql`, puis les 7 migrations radar dans l'ordre des timestamps. Sans ON_ERROR_STOP pour `20260401103100`, qui fait `ALTER TYPE … ADD VALUE` hors transaction ; psql est en autocommit, c'est donc correct.
- Contrôler que les 8 tables, les 6 types et la fonction existent.
- Pour prouver qu'aucune table conservée n'est touchée, créer une table témoin `public.keep_me(id int)` avec une ligne.
- Appliquer la migration drop_radar DEUX fois avec ON_ERROR_STOP=1 : les deux passes doivent renvoyer 0.
- Contrôler via `information_schema.tables`, `pg_type` et `pg_proc` : 0 table `radar_%`, aucun des 6 types, pas de `match_consultants` ; l'extension `vector` est présente (`pg_extension`) ; `keep_me` contient sa ligne.
- Dans un second conteneur vierge (ou une seconde base `createdb fresh`), appliquer drop_radar seul : exit 0.
- `docker stop lfg-drop-radar`.
- Coller les sorties clés dans le SUMMARY. Si Docker est indisponible, le noter dans le SUMMARY : le test de contrat reste la preuve minimale.
  </action>
  <verify>
    <automated>npx vitest run supabase/drop-radar-migration.test.ts && ls supabase/migrations/*_drop_radar.sql | wc -l | grep -q '^ *1$' && git diff --quiet $BASE -- supabase/migrations/20260401102300_radar_tables.sql supabase/migrations/20260401102400_radar_linkedin_discovery.sql supabase/migrations/20260401102600_001_radar_run_logs.sql supabase/migrations/20260401103000_001_linkedin_context.sql supabase/migrations/20260401103100_radar_source_linkedin_discovery.sql supabase/migrations/20260401104900_radar_org_settings.sql supabase/migrations/20260402165214_radar_signals_matches_rls.sql supabase/migrations/20260401102200_001_enable_pgvector.sql</automated>
  </verify>
  <done>Le test de contrat passe. La migration existe en un seul exemplaire avec un timestamp de 14 chiffres, et les anciennes migrations sont intactes. La recette Docker montre deux passes à 0, puis 0 objet radar, pgvector présent, la table témoin intacte et une passe à 0 sur base vierge. Aucune connexion à une base distante.</done>
</task>

<task type="auto">
  <name>Task 3 : Parker le jalon v1.3 Prospection dans .planning, puis vérification complète</name>
  <files>.planning/ROADMAP.md, .planning/PROJECT.md, .planning/STATE.md, .planning/REQUIREMENTS.md, .planning/milestones/v1.3-ROADMAP.md, .planning/milestones/v1.3-REQUIREMENTS.md</files>
  <read_first>.planning/milestones/v1.2-ROADMAP.md (en-tête, pour le style d'archive), .planning/REQUIREMENTS.md</read_first>
  <action>
Parking dans le même style que v1.2 (D-03), en français. Ne rien supprimer sous `.planning/phases/09-*` ni `.planning/research/`.

1. `.planning/milestones/v1.3-ROADMAP.md` : y copier le titre, la ligne v1.3 de la liste des jalons et les sections « 🚧 v1.3 Prospection » et « Phase Details » des phases 9 à 14, prises telles quelles dans ROADMAP.md (lignes 44-53 et 82-205 environ). Ajouter en tête une note de parking. Elle dit que le jalon est parké le 2026-11-24, que le code prospection/radar a été retiré du produit (quick 261124-lfg) et que la phase 9 a été arrêtée avant 09-04 : la migration `20261124150326_prospection_domain.sql` n'a jamais été appliquée et son fichier est supprimé, mais elle reste récupérable via git. Elle dit aussi que les plans, SUMMARY, recherche et audit de la phase 9 restent dans `.planning/phases/09-db-schema-foundation-proxycurl-audit/`.
2. `.planning/milestones/v1.3-REQUIREMENTS.md` : copie intégrale de l'actuel `.planning/REQUIREMENTS.md`, avec une ligne d'en-tête « parké 2026-11-24 ». Remplacer ensuite `.planning/REQUIREMENTS.md` par un court document : aucun jalon actif, liens vers les archives v1.1, v1.2 et v1.3 dans `.planning/milestones/`.
3. `.planning/ROADMAP.md` :
   - Ligne 8 : `- ⏸ **v1.3 Prospection** — Phases 9–14 (parked 2026-11-24 — Phase 9 arrêtée avant 09-04 (3/4 plans), code retiré du produit ; détails dans `.planning/milestones/v1.3-ROADMAP.md`)`.
   - Ajouter sous la note v1.2 une note équivalente pour v1.3 : la prospection et le radar sont retirés, à retravailler plus tard. Une migration `*_drop_radar.sql` existe dans le dépôt mais n'est PAS appliquée en prod (en attente d'accord explicite).
   - Remplacer la section « 🚧 v1.3 Prospection » par un bloc `<details><summary>⏸ v1.3 Prospection (Phases 9–14) — PARKED 2026-11-24</summary>` qui liste les phases 9–14 : Phase 9 « 3/4 plans — arrêtée avant 09-04 », Phases 10–14 « — parked » ; suivi de `Archive: .planning/milestones/v1.3-ROADMAP.md`.
   - Retirer de ROADMAP.md les « Phase Details » des phases 9–14, désormais dans l'archive.
   - Tableau Progress : phase 9 `3/4 | Parked | —` ; phases 10–14 `0/TBD | Parked | —`.
4. `.planning/PROJECT.md` :
   - Remplacer « Current Milestone: v1.3 Prospection » par « Current Milestone : aucun (v1.3 parké) », avec une phrase sur le périmètre produit actuel : gestion des CV + positionnement CV ↔ missions.
   - Ajouter une section « Parked Milestone : v1.3 Prospection », dans le format de celle de v1.2 : objectif, état au parking (phase 9 : fondation SQL, réglage du seuil de chaleur et audit Proxycurl faits puis retirés du code ; 09-04 jamais exécuté ; migration drop_radar en attente d'accord), lien vers l'archive.
   - Requirements « Active (v1.3) » → « Parked (v1.3) ».
   - Out of Scope : ajouter « Prospection / radar — retirés du produit le 2026-11-24, à retravailler plus tard ».
   - Constraints/Scope : retirer « hors exigences v1.3 (prospection) ». Garder la contrainte coûts API seulement si elle sert encore, sinon la retirer.
   - Key Decisions : ligne « Retrait prospection/radar ; v1.3 parké » avec la raison (recentrer sur CV + matching, refonte ultérieure), outcome « ✓ quick 261124-lfg ».
   - Mettre à jour la ligne « Last updated ».
5. `.planning/STATE.md` :
   - Frontmatter : `status: parked`, `stopped_at` = « Phase 9 arrêtée avant 09-04 — v1.3 parké (quick 261124-lfg) », `last_updated`/`last_activity` = 2026-11-24, `progress.completed_plans: 3`.
   - Current Position : jalon parké, aucune phase active.
   - Decisions : ajouter le retrait (pgvector conservé ; drop_radar non appliqué).
   - Blockers : remplacer les points propres à la prospection (ScrapIn, Dropcontact, France Travail, advisory lock) par une ligne indiquant qu'ils sont parkés avec v1.3.
   - Pending todos : « Appliquer `*_drop_radar.sql` en prod — UNIQUEMENT après accord explicite de l'utilisateur » ; « Crons radar encore présents dans `vercel.json` sur `main` (voir 09-PROXYCURL-AUDIT §7) ».
   - Session continuity / Next step : plus de `/gsd:execute-phase 9`.
   - NE PAS ajouter la ligne au tableau « Quick Tasks Completed » : l'orchestrateur quick s'en charge.

Puis lancer la vérification complète sur l'arbre final : `npx vitest run`, `npx tsc --noEmit`, `npx eslint app/settings/organization/page.tsx lib/queries/keys.ts lib/queries/index.ts lib/utils/supabase-write-error.test.ts supabase/drop-radar-migration.test.ts` et `npx next build`. Si `next build` échoue À CAUSE du lien symbolique node_modules (Turbopack : « Symlink … points out of the filesystem root »), relancer `npx next build --webpack` et noter l'écart dans le SUMMARY. Toute autre erreur de build doit être corrigée.

Commit : `docs(quick-261124-lfg): parker le jalon v1.3 Prospection`, avec la ligne d'attribution `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Vérifier que `node_modules` n'est pas dans le commit.
  </action>
  <verify>
    <automated>test -f .planning/milestones/v1.3-ROADMAP.md && test -f .planning/milestones/v1.3-REQUIREMENTS.md && grep -q 'v1.3 Prospection.*parked 2026-11-24' .planning/ROADMAP.md && grep -q 'Parked Milestone.*v1.3' .planning/PROJECT.md && grep -q 'status: parked' .planning/STATE.md && test -z "$(git diff --name-status $BASE -- .planning/phases/09-db-schema-foundation-proxycurl-audit .planning/research | grep -v '^M')" && npx vitest run && npx tsc --noEmit && npx eslint app/settings/organization/page.tsx lib/queries/keys.ts lib/queries/index.ts lib/utils/supabase-write-error.test.ts supabase/drop-radar-migration.test.ts && npx next build && ! git ls-files --error-unmatch node_modules 2>/dev/null</automated>
  </verify>
  <done>v1.3 apparaît parké dans ROADMAP, PROJECT et STATE, avec ses archives dans `.planning/milestones/`. Aucun fichier de `phases/09-*` ni de `research/` n'est supprimé. vitest, tsc, eslint sur les fichiers touchés et next build passent. node_modules n'est pas commité.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| dépôt → base Supabase prod | Une migration destructive committée peut être poussée par `supabase db push` |
| client → API | La route `/api/prospection/settings` (GET membre / PUT admin) disparaît |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-lfg-01 | Tampering / DoS (perte de données) | `*_drop_radar.sql` | mitigate | `IF EXISTS` partout, noms qualifiés `public.`, pas de CASCADE (échec bruyant si un objet inconnu dépend du radar), test de contrat qui interdit tout nom de table conservée et tout `DROP EXTENSION`. Aucune application sur une base distante dans ce plan ; todo STATE « accord explicite requis ». |
| T-lfg-02 | Tampering | anciennes migrations radar | mitigate | Le `git diff --quiet $BASE` sur les 8 fichiers fait partie du verify de la Task 2. |
| T-lfg-03 | Elevation of privilege | `/api/prospection/settings` | accept | La route est supprimée : la surface d'attaque diminue, aucun nouveau point d'entrée. |
| T-lfg-04 | Information disclosure | recette Docker | accept | Conteneur local jetable, mot de passe factice, aucune donnée réelle ; `next-esn-local.sql` n'est pas utilisé. |
</threat_model>

<verification>
- `npx vitest run` : tout vert (les tests `lib/prospection/*` ont disparu ; `supabase/drop-radar-migration.test.ts` et `lib/utils/supabase-write-error.test.ts` passent).
- `npx tsc --noEmit` : exit 0.
- `npx eslint` sur les fichiers touchés : exit 0.
- `npx next build` (ou `--webpack` si le lien symbolique bloque Turbopack, avec mention dans le SUMMARY) : exit 0.
- `git grep -liE 'prospect|radar'` hors .planning/.claude/.cursor/.agents/docs ne liste que les exceptions voulues, plus la migration drop_radar et son test.
- La recette Docker prouve l'idempotence (double application) et la non-régression (pgvector et table témoin intacts).
</verification>

<success_criteria>
- Plus aucune surface prospection dans l'application ; la page `/settings/organization` est identique à `68383fe`.
- La migration drop_radar est prête, idempotente, testée et NON appliquée en prod.
- La landing, RadarChart, docs/STRATEGY.md, next-esn-local.sql et les 7 anciennes migrations radar sont inchangés.
- Le jalon v1.3 est parké dans .planning et la phase 9 est notée « arrêtée avant 09-04 ».
- Le SUMMARY consigne : objets supprimés, objets volontairement conservés (pgvector), sortie de la recette Docker, écart éventuel `--webpack`, todo d'application en prod.
</success_criteria>

<output>
Créer `.planning/quick/261124-lfg-retrait-prospection-radar/261124-lfg-SUMMARY.md` à la fin.
</output>
