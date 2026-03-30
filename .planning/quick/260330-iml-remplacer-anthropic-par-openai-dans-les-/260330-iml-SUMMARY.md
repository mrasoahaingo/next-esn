---
phase: quick-260330-iml
plan: "01"
subsystem: radar/collectors
tags: [stagehand, openai, model-switch, cost-reduction]
dependency_graph:
  requires: []
  provides: [stagehand-openai-config]
  affects: [lib/radar/collectors/boamp.ts, lib/radar/collectors/jobs.ts]
tech_stack:
  added: []
  patterns: [stagehand-gpt4o-mini]
key_files:
  modified:
    - lib/radar/collectors/boamp.ts
    - lib/radar/collectors/jobs.ts
decisions:
  - Utiliser gpt-4o-mini pour Stagehand (coût réduit vs claude-3-5-sonnet) — OPENAI_API_KEY requis dans .env.local
metrics:
  duration: ~3 min
  completed: "2026-03-30T11:27:33Z"
  tasks_completed: 1
  files_modified: 2
---

# Phase quick-260330-iml Plan 01: Remplacer Anthropic par OpenAI dans les collectors Stagehand

**One-liner:** Switch Stagehand model from claude-3-5-sonnet-20241022 (ANTHROPIC_API_KEY) vers gpt-4o-mini (OPENAI_API_KEY) dans boamp.ts et jobs.ts pour réduire les coûts de scraping.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Remplacer Anthropic par OpenAI dans les deux collectors Stagehand | 552a02c | lib/radar/collectors/boamp.ts, lib/radar/collectors/jobs.ts |

## Changes Made

### lib/radar/collectors/boamp.ts
- `modelName`: `claude-3-5-sonnet-20241022` → `gpt-4o-mini`
- `modelClientOptions.apiKey`: `process.env.ANTHROPIC_API_KEY!` → `process.env.OPENAI_API_KEY!`
- Commentaire inline ajouté: `// Stagehand model — requires OPENAI_API_KEY in env`
- `createGatewayLanguageModel('google/gemini-2.5-flash')` pour extraction de budget: inchange

### lib/radar/collectors/jobs.ts
- `modelName`: `claude-3-5-sonnet-20241022` → `gpt-4o-mini`
- `modelClientOptions.apiKey`: `process.env.ANTHROPIC_API_KEY!` → `process.env.OPENAI_API_KEY!`
- Commentaire inline ajouté: `// Stagehand model — requires OPENAI_API_KEY in env`

## Deviations from Plan

None - plan executed exactly as written.

## Environment Variable Required

`OPENAI_API_KEY` doit etre present dans `.env.local` pour que les collectors Stagehand fonctionnent.

Verifier avec: `grep OPENAI_API_KEY .env.local`

Si absent, ajouter: `OPENAI_API_KEY=sk-...votre-cle...`

## Self-Check: PASSED

- [x] lib/radar/collectors/boamp.ts contient `gpt-4o-mini` et `OPENAI_API_KEY`
- [x] lib/radar/collectors/jobs.ts contient `gpt-4o-mini` et `OPENAI_API_KEY`
- [x] Aucune reference a `ANTHROPIC_API_KEY` dans ces deux fichiers
- [x] `createGatewayLanguageModel` (gemini-2.5-flash) inchange dans boamp.ts
- [x] Commit 552a02c existe
