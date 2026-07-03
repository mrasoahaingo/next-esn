# Phase 9: DB + Schema Foundation + Proxycurl Audit - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Les 7 tables du domaine prospection (`prospection_automations`, `prospection_companies`, `prospection_signals`, `prospection_scores`, `prospection_contacts`, `prospection_run_logs`, `prospection_actions`) existent dans Supabase avec RLS org-scoped, contraintes SIREN/TTL/RGPD correctes dès le départ — plus une table `prospection_settings` (décision de cette discussion). Le code `lib/radar/` mort (Proxycurl) est audité et documenté pour ne plus être copié dans les phases suivantes.

Requirements couverts : SIG-04 (réconciliation SIREN), CONT-04 (seuil configurable), CONT-05 (provenance contacts / RGPD).

</domain>

<decisions>
## Implementation Decisions

### Seuil de chaleur (CONT-04)
- **D-01:** Le seuil vit dans une table dédiée `prospection_settings` (org_id PK) — isole le domaine prospection, extensible pour les futurs réglages (fréquence cron, quotas API).
- **D-02:** La migration Phase 9 ne crée que `heat_threshold` (défaut 60) — YAGNI, les autres colonnes arriveront par migrations idempotentes quand le besoin sera réel. Pas de JSONB fourre-tout : colonnes typées + Zod (pattern codebase).
- **D-03:** Provisionnement par **upsert à la première écriture** — pas de ligne tant que l'admin n'a rien sauvegardé ; défaut 60 en DEFAULT de colonne + constante code (`DEFAULT_HEAT_THRESHOLD = 60`). Pas de dépendance au cycle de vie des orgs Clerk.
- **D-04:** **Phase 9 livre la DB ET l'UI admin** de réglage du seuil — CONT-04 est 100% vérifiable dès cette phase (champ dans la page admin existante + service lecture/upsert).

### Historique des scores
- **D-05:** `prospection_scores` = **snapshot par run** — une ligne par (company, run) ; la liste `/prospection` lit le dernier snapshot. Historique complet pour voir l'évolution de chaleur et déboguer le scoring.
- **D-06:** **Pas de purge en v1.3** — volume maîtrisé (quelques centaines d'entreprises × runs quotidiens). Prévoir un index `(company_id, created_at DESC)` pour lire le dernier snapshot efficacement.
- **D-07:** Chaque snapshot stocke `score` + `score_breakdown` JSONB (contribution par signal : type, poids, decay appliqué) + `run_id` — le score est auditable et débogable sans recalcul.
- **D-08:** La justification et le pitch LLM (générés Phase 12) vivront en **colonnes sur `prospection_companies`** (`justification`, `call_pitch`, `synthesis_generated_at`) — un seul texte courant par entreprise, écrasé quand le score change significativement. À prévoir dans le schéma dès Phase 9 (colonnes nullable).

### Claude's Discretion
- **Sort du code Proxycurl mort** (`lib/radar/collectors/proxycurl.ts`, `linkedin*.ts`, 2 workflows, cron route `app/api/radar/cron/freelance-paris-proxycurl/`, form UI) — non discuté ; le planner choisit entre audit documenté, marqueurs @deprecated ou suppression, en respectant le success criterion 5 du ROADMAP (« aucun nouveau code ne peut s'appuyer sur ces références mortes »). Attention : vérifier si le cron radar tourne encore en prod avant toute suppression.
- **Sémantique RGPD/TTL** — non discuté ; calcul de `gdpr_retention_expires_at` (a priori `contact_sourced_at` + 3 ans max, cf. REQUIREMENTS CONT-05) et mécanisme de purge à la discrétion recherche/planner. Phase 9 pose les colonnes NOT NULL, l'enforcement peut venir plus tard.
- Design détaillé des autres tables (automations, signals, run_logs, actions) — suivre les success criteria du ROADMAP et les patterns migrations du codebase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & exigences
- `.planning/ROADMAP.md` — Phase 9 : goal, 5 success criteria (7 tables, UNIQUE(org_id, siren), colonnes RGPD NOT NULL, colonnes TTL, audit Proxycurl documenté)
- `.planning/REQUIREMENTS.md` — SIG-04, CONT-04, CONT-05 + Out of Scope (Proxycurl mort, remplacé par ScrapIn + Dropcontact)
- `.planning/STATE.md` — décisions accumulées v1.3 (SIREN, RGPD/CNIL, score déterministe, seuil gated) et blockers connus

### Recherche milestone v1.3
- `.planning/research/SUMMARY.md` — synthèse recherche prospection (sources de signaux, build vs buy)
- `.planning/research/ARCHITECTURE.md` — architecture pressentie du domaine prospection
- `.planning/research/PITFALLS.md` — pièges connus (rate limits ScrapIn, Dropcontact async, France Travail OAuth)

### Conventions migrations
- `CLAUDE.md` §Database Migrations — format timestamp 14 chiffres unique, idempotence obligatoire (IF NOT EXISTS, DROP POLICY avant CREATE POLICY), jamais modifier une migration appliquée

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/migrations/20260401104900_radar_org_settings.sql` et `20260402165214_radar_signals_matches_rls.sql` — patterns existants pour settings org-scoped et RLS à reprendre pour les tables prospection
- Page admin existante (`app/admin/`) et `lib/queries/org-settings.ts` — points d'accroche pour l'UI de réglage du seuil (D-04)
- Pattern Zod + colonnes typées (`lib/schema.ts`) pour valider `prospection_settings`

### Established Patterns
- Migrations idempotentes, timestamp `date +%Y%m%d%H%M%S`, une migration = un changement
- RLS org-scoped via `org_id` (Clerk orgId) — toutes les tables prospection doivent le suivre
- Supabase client direct (pas d'ORM), service role côté serveur

### Integration Points
- `lib/radar/` — domaine à auditer, PAS à réutiliser : 8 fichiers référencent Proxycurl (`lib/radar/collectors/proxycurl.ts`, `linkedin.ts`, `linkedin-enrichment.ts`, `lib/radar/queries.ts`, `app/api/radar/workflows/freelance-paris-proxycurl.workflow.ts`, `app/api/radar/workflows/collect-linkedin.workflow.ts`, `app/api/radar/cron/freelance-paris-proxycurl/route.ts`, `app/(dashboard)/radar/components/radar-settings-form.tsx`)
- Nouveau domaine prospection : tables `prospection_*` + `prospection_settings`, aucune table existante à modifier

</code_context>

<specifics>
## Specific Ideas

- Le `score_breakdown` JSONB doit permettre de répondre à « pourquoi cette entreprise a ce score » sans recalculer : contribution par signal avec type, poids et decay appliqué.
- Les colonnes LLM sur `prospection_companies` (`justification`, `call_pitch`, `synthesis_generated_at`) sont créées nullable en Phase 9 et remplies en Phase 12.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 9-DB + Schema Foundation + Proxycurl Audit*
*Context gathered: 2026-07-04*
