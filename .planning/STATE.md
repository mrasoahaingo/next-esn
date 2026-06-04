---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Réactivité, flux & résilience
status: verifying
stopped_at: Completed quick-260604-m4p-PLAN.md — add language field to mergeExtractedPartial
last_updated: "2026-06-04T14:01:21.088Z"
last_activity: "2026-06-04 - Completed quick task 260604-miq: Les textes extraits par le LLM sont toujours en français même pour un CV en anglais"
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
  percent: 0
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (milestone v1.2)

**Core value:** L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille  
**Current focus:** Phase 06 — db-schema-foundation

## Current Position

Phase: 7
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-06-04 - Completed quick task 260604-miq: Les textes extraits par le LLM sont toujours en français même pour un CV en anglais

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

_To be updated after first plans complete._

## Accumulated Context

### Decisions

- **FLOW** : Rester sur `/review/[id]/positioning` après upload mission ; analyse visible inline ; bouton positionnement actif seulement quand l'analyse mission est prête (serveur).
- [Phase quick-260330-iml]: Stagehand: gpt-4o-mini + OPENAI_API_KEY pour reduire les couts de scraping vs claude-3-5-sonnet
- [Phase quick-260330-iml]: Utiliser gpt-4o-mini pour Stagehand (coût réduit vs claude-3-5-sonnet) — OPENAI_API_KEY confirmé présent dans .env.local
- **LANG** : Langue unique par document source ; artefacts positionnement cross-langue suivent la langue de la mission (destinataire = client final). UI applicative reste en français — pas de framework i18n.
- **PROMPT** : Un seul row par task_key avec `{{language}}` injecté — pas de doublons de prompts par langue.
- [Phase 06-db-schema-foundation]: CHECK IN ('fr','en') en DB dès la migration — intégrité contrainte DB sans dépendre de la validation applicative
- [Phase 06]: language field at extractionSchema root (not personalInfo) — document-level property, not personal data
- [Phase 06]: CV_LABELS declared but not wired to PDF pipeline — Phase 8 responsibility
- [Phase 06-03]: Guard fires on rendered output (post-renderTemplate) — catches real silent passthrough; warn includes taskKey and placeholder names for actionable debug
- [Phase quick-260604-m4p]: language field is a primitive (fr|en) — direct assignment in mergeExtractedPartial is correct, no deep merge needed

### Pending todos

None.

### Blockers / concerns

Implémentation RES-02 soumise aux capacités du runtime workflow beta.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260326-x7n | Étapes analyse mission inline cohérentes si run actif avant reconnexion flux | 2026-03-26 | d0f0fad | [260326-x7n-clarifier-tapes-analyse-mission-inline-q](./quick/260326-x7n-clarifier-tapes-analyse-mission-inline-q/) |
| 260329-wv9 | LinkedIn Discovery wired end-to-end: DB migration, settings read/write, RadarSettingsForm UI section | 2026-03-29 | 4bf355c | [260329-wv9-linkedin-discovery-settings-migration-db](./quick/260329-wv9-linkedin-discovery-settings-migration-db/) |
| 260330-hbc | ApiCall type + collectors return { signals, calls } + run log expandable table | 2026-03-30 | 6b2857c | [260330-hbc-log-appel-et-r-ponse-api-dans-radar-run-](./quick/260330-hbc-log-appel-et-r-ponse-api-dans-radar-run-/) |
| 260330-iml | Remplacer Anthropic par OpenAI dans les collectors Stagehand boamp et jobs | 2026-03-30 | 552a02c | [260330-iml-remplacer-anthropic-par-openai-dans-les-](./quick/260330-iml-remplacer-anthropic-par-openai-dans-les-/) |
| 260330-n7n | Désactiver boamp/jobs dans le cron, ajouter collecteur LinkedIn browser Stagehand | 2026-03-30 | cddd599 | [260330-n7n-desactiver-canaux-boamp-et-jobs-linkedin](./quick/260330-n7n-desactiver-canaux-boamp-et-jobs-linkedin/) |
| 260402-fxx | Gestion de session LinkedIn via Browserbase Contexts — connect/disconnect UI + collecteur réutilise le contexte | 2026-04-02 | c5e5dae | [260402-fxx-impl-menter-la-gestion-de-session-linked](./quick/260402-fxx-impl-menter-la-gestion-de-session-linked/) |
| 260403-1ga | Créer collector Proxycurl pour freelances Paris avec workflow et cron route | 2026-04-02 | 1e8a68b | [260403-1ga-cr-er-collector-proxycurl-pour-freelance](./quick/260403-1ga-cr-er-collector-proxycurl-pour-freelance/) |
| 260403-1ga | Collector Proxycurl REST en 4 étapes chainées (search/profile/company/count) + workflow + cron route | 2026-04-02 | e0fef9e | [260403-1ga-cr-er-collector-proxycurl-pour-freelance](./quick/260403-1ga-cr-er-collector-proxycurl-pour-freelance/) |
| 260603-gew | Barre de progression 5/5 quand extraction terminée sans formations + labels Education en français | 2026-06-03 | bfe1d53 | [260603-gew-fix-cv-extraction-progress-bar-and-educa](./quick/260603-gew-fix-cv-extraction-progress-bar-and-educa/) |
| 260604-kyb | Wire CV_LABELS into buildCvDossierLayoutSpec so the PDF preview uses English labels when language is en | 2026-06-04 | 1e42d2c | [260604-kyb-wire-cv-labels-into-buildcvdossierlayout](./quick/260604-kyb-wire-cv-labels-into-buildcvdossierlayout/) |
| 260604-lid | Language detection wired end-to-end: identity prompt detects fr/en, saveResult persists to candidates.language | 2026-06-04 | c1bb9fa | [260604-lid-fix-language-detection-update-cv-branch-](./quick/260604-lid-fix-language-detection-update-cv-branch-/) |
| 260604-m4p | Quand j'upload un cv en anglais, la preview reset en FR | 2026-06-04 | ca4d390 | [260604-m4p-quand-j-upload-un-cv-en-anglais-la-previ](./quick/260604-m4p-quand-j-upload-un-cv-en-anglais-la-previ/) |
| 260604-miq | Les textes extraits par le LLM sont toujours en français même pour un CV en anglais | 2026-06-04 | bf5c764 | [260604-miq-les-textes-extraits-par-le-llm-sont-touj](./quick/260604-miq-les-textes-extraits-par-le-llm-sont-touj/) |

## Session continuity

**Last session:** 2026-06-04T14:01:16.817Z
**Stopped at:** Completed quick-260604-m4p-PLAN.md — add language field to mergeExtractedPartial
**Resume file:** None

**Next step:** `/gsd:plan-phase 6` — DB + Schema Foundation
