---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Prospection
status: parked
stopped_at: Phase 9 arrêtée avant 09-04 — v1.3 parké (quick 261124-lfg)
last_updated: "2026-11-24T14:34:58Z"
last_activity: 2026-11-24 -- v1.3 Prospection parké, prospection/radar retirés du produit (quick 261124-lfg)
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 4
  completed_plans: 3
  percent: 0
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (aucun jalon actif — v1.3 parké)

**Core value:** L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille
**Current focus:** aucun jalon actif — produit recentré sur la gestion des CV et le positionnement CV ↔ missions

## Current Position

Milestone: v1.3 Prospection — PARKED (2026-11-24)
Phase: aucune phase active (Phase 09 arrêtée avant 09-04, 3/4 plans)
Status: Parked
Last activity: 2026-11-24 -- prospection/radar retirés du produit, migration drop_radar prête mais non appliquée (quick 261124-lfg)

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
- **Retrait prospection/radar ; v1.3 parké** (2026-11-24, quick 261124-lfg) — code phase 9 retiré du produit, migration `20261124150326_prospection_domain.sql` (jamais appliquée) supprimée ; nouvelle migration `*_drop_radar.sql` idempotente (8 tables `radar_*`, 6 types, `match_consultants`) NON appliquée ; **pgvector conservé** (inerte, réutilisable par une future refonte). Phases 9–14 archivées dans `.planning/milestones/v1.3-ROADMAP.md`

### Pending todos

- Appliquer `supabase/migrations/*_drop_radar.sql` en prod — UNIQUEMENT après accord explicite de l'utilisateur.
- Crons radar encore présents dans `vercel.json` sur `main` (voir `09-PROXYCURL-AUDIT.md` §7).

### Blockers / concerns

- Les points ouverts propres à la prospection (rate limits ScrapIn, Dropcontact async, refresh du token France Travail, advisory lock `@workflow/next`) sont parkés avec v1.3 — voir `.planning/milestones/v1.3-ROADMAP.md`.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260921-j3g | Réconciliation des runs workflow zombies bloqués en analyzing/generating | 2026-09-21 | 566bfb2 | [260921-j3g-reconciliation-des-runs-workflow-zombies](./quick/260921-j3g-reconciliation-des-runs-workflow-zombies/) |
| 260921-jz1 | Payloads volumineux retirés des frontières de steps workflow + visibilité des échecs | 2026-09-21 | 2c96649 | [260921-jz1-ne-plus-faire-transiter-les-payloads-vol](./quick/260921-jz1-ne-plus-faire-transiter-les-payloads-vol/) |
| 260921-ksd | Assainissement des caractères interdits par Postgres avant tout écrit JSONB + plafond de retry | 2026-09-21 | 116fb14 | [260921-ksd-assainir-les-caracteres-interdits-par-po](./quick/260921-ksd-assainir-les-caracteres-interdits-par-po/) |
| 260921-seo | Écritures Supabase non contrôlées traitées (17 sites) + règle ESLint de prévention | 2026-09-21 | 2a1b793 | [260921-seo-traiter-les-11-ecritures-supabase-non-co](./quick/260921-seo-traiter-les-11-ecritures-supabase-non-co/) |
| 261111-q9p | Refonte visuelle des pages publiques (landing, auth, 404) : photos GPT Image 2.6, jury de 3 juges LLM — notes ramenées dans main, commits sur la branche refonte-landing-verre | 2026-11-12 | ea6fb48 | [261111-q9p-refonte-visuelle-des-pages-publiques-esn](./quick/261111-q9p-refonte-visuelle-des-pages-publiques-esn/) |
| 261112-27s | Agent designer + jury LLM, puis landing « Verre de nuit » (Hallmark), auth/404 alignées — notes ramenées dans main, commits sur la branche refonte-landing-verre | 2026-11-12 | 7a6a2cd | [261112-27s-agent-designer-propositions-maquettes-gp](./quick/261112-27s-agent-designer-propositions-maquettes-gp/) |
| 261124-lfg | Retrait prospection/radar (code phase 9 + migration drop_radar non appliquée), v1.3 parké | 2026-11-24 | c50f2bd | [261124-lfg-retrait-prospection-radar](./quick/261124-lfg-retrait-prospection-radar/) |
| 261124-mk0 | ZDR + inférence UE forcés sur tous les appels LLM (garde-fou lib/ai.ts + ESLint), passage à openai/gpt-6-luna (code, tarifs, migration llm) | 2026-11-24 | 68a65a9 | [261124-mk0-zdr-ue-luna](./quick/261124-mk0-zdr-ue-luna/) |
| 261124-nhq | Raisonnement low par défaut sur gpt-6-luna, CV adapté sans « null » ni markdown dans les compétences, années d’expérience au mois près (source unique), logo PDF rastérisé ; + débogage du flux d’analyse figé et des échecs silencieux (.planning/debug/flux-analyse-fige.md) | 2026-11-24 | e1abc6c | [261124-nhq-luna-low-et-defauts-cv-adapte](./quick/261124-nhq-luna-low-et-defauts-cv-adapte/) |

## Session continuity

**Last session:** 2026-11-24T14:34:58Z
**Stopped at:** Phase 9 arrêtée avant 09-04 — v1.3 parké (quick 261124-lfg)
**Resume file:** None

**Next step:** aucun jalon actif — définir le prochain jalon (`/gsd:new-milestone`) ou traiter des quick tasks sur le périmètre CV + positionnement. Ne plus lancer `/gsd:execute-phase 9`.
