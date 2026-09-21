---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Prospection
status: planning
stopped_at: Phase 9 context gathered
last_updated: "2026-07-03T22:19:14.671Z"
last_activity: 2026-07-03 — Roadmap v1.3 Prospection créé (Phases 9–14)
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (milestone v1.3)

**Core value:** L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille
**Current focus:** Phase 9 — DB + Schema Foundation + Proxycurl Audit

## Current Position

Phase: 9 of 14 (DB + Schema Foundation + Proxycurl Audit)
Plan: — of —
Status: Ready to plan
Last activity: 2026-09-21 — Completed quick task 260921-seo: Écritures Supabase non contrôlées traitées + règle ESLint de prévention

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

_To be updated after first plans complete._

## Accumulated Context

### Decisions

- **Prospection from scratch sous `/prospection`** — le Radar existant (`lib/radar/`) reste de côté ; nouveau domaine propre
- **Proxycurl est mort** (juillet 2025, procès LinkedIn) — remplacé par ScrapIn (LinkedIn signals) + Dropcontact (email enrichment) ; audit obligatoire Phase 9 avant tout code collecteur
- **Enrichissement contact gated par seuil de chaleur** — coût API le plus élevé ; gate enforced en code, pas seulement documenté
- **Réconciliation entreprises par SIREN** — `UNIQUE(org_id, siren)` en DB dès la migration ; jamais merger sur le nom seul
- **Score 0–100 déterministe** — jamais par LLM ; LLM reçoit uniquement la liste structurée des signaux pour la synthèse
- **RGPD colonnes en DB dès la création** — `gdpr_retention_expires_at`, `contact_source`, `contact_sourced_at` non négociables ; CNIL active (900K€ amende 2025)
- **v1.2 parké au profit de la prospection** — Phases 7–8 documentées dans `.planning/milestones/v1.2-ROADMAP.md`

### Pending todos

None.

### Blockers / concerns

- **ScrapIn rate limits** non documentés publiquement — valider en staging avec une liste représentative avant d'activer le cron.
- **Dropcontact async** (POST job + poll/webhook) — stratégie webhook vs polling à prototyper avant Phase 13.
- **France Travail token refresh** — token OAuth2 expirant cause des échecs cron silencieux ; stratégie de refresh (étape séparée + retry sur 401) à prototyper Phase 10.
- **`@workflow/next` advisory lock** — interaction `pg_try_advisory_lock` + runs concurrent à valider en staging Phase 10.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260921-j3g | Réconciliation des runs workflow zombies bloqués en analyzing/generating | 2026-09-21 | 566bfb2 | [260921-j3g-reconciliation-des-runs-workflow-zombies](./quick/260921-j3g-reconciliation-des-runs-workflow-zombies/) |
| 260921-jz1 | Payloads volumineux retirés des frontières de steps workflow + visibilité des échecs | 2026-09-21 | 2c96649 | [260921-jz1-ne-plus-faire-transiter-les-payloads-vol](./quick/260921-jz1-ne-plus-faire-transiter-les-payloads-vol/) |
| 260921-ksd | Assainissement des caractères interdits par Postgres avant tout écrit JSONB + plafond de retry | 2026-09-21 | 116fb14 | [260921-ksd-assainir-les-caracteres-interdits-par-po](./quick/260921-ksd-assainir-les-caracteres-interdits-par-po/) |
| 260921-seo | Écritures Supabase non contrôlées traitées (17 sites) + règle ESLint de prévention | 2026-09-21 | 2a1b793 | [260921-seo-traiter-les-11-ecritures-supabase-non-co](./quick/260921-seo-traiter-les-11-ecritures-supabase-non-co/) |


## Session continuity

**Last session:** 2026-07-03T22:19:14.662Z
**Stopped at:** Phase 9 context gathered
**Resume file:** .planning/phases/09-db-schema-foundation-proxycurl-audit/09-CONTEXT.md

**Next step:** `/gsd:plan-phase 9` — DB + Schema Foundation + Proxycurl Audit
