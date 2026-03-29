---
phase: quick
plan: 260329-wv9
subsystem: radar
tags: [radar, linkedin, settings, migration, db]
dependency_graph:
  requires: []
  provides: [linkedin_discovery DB column, radar settings read/write, LinkedIn Discovery UI section]
  affects: [radar_org_settings table, lib/radar/settings.ts, RadarSettingsForm]
tech_stack:
  added: []
  patterns: [JSONB column with DEFAULT, Zod optional patch schema, controlled form state]
key_files:
  created:
    - supabase/migrations/20260329_003_radar_linkedin_discovery.sql
  modified:
    - lib/radar/settings.ts
    - app/(dashboard)/radar/components/radar-settings-form.tsx
decisions:
  - DEFAULT SQL mirrors DEFAULT_LINKEDIN_DISCOVERY in settings.ts for consistency
metrics:
  duration: 126s
  completed: "2026-03-29"
  tasks_completed: 3
  files_changed: 3
---

# Quick 260329-wv9: LinkedIn Discovery Settings — Migration DB Summary

**One-liner:** linkedin_discovery JSONB column wired end-to-end from DB migration through settings read/write to RadarSettingsForm UI section.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration DB — ajouter colonne linkedin_discovery | 8bdf433 | supabase/migrations/20260329_003_radar_linkedin_discovery.sql |
| 2 | settings.ts — brancher linkedin_discovery dans patch schema, defaults, read et write | 61d4526 | lib/radar/settings.ts |
| 3 | RadarSettingsForm — section LinkedIn Discovery | 4bf355c | app/(dashboard)/radar/components/radar-settings-form.tsx |

## What Was Done

- **Task 1:** Created `supabase/migrations/20260329_003_radar_linkedin_discovery.sql` with `ALTER TABLE radar_org_settings ADD COLUMN IF NOT EXISTS linkedin_discovery JSONB NOT NULL DEFAULT ...`. Default JSON matches `DEFAULT_LINKEDIN_DISCOVERY` from settings.ts.

- **Task 2:** Updated `lib/radar/settings.ts` in four places:
  - `radarSettingsPatchSchema` now includes `linkedinDiscovery: linkedinDiscoverySchema.optional()`
  - `DEFAULT_RADAR_SETTINGS` now includes `linkedinDiscovery: DEFAULT_LINKEDIN_DISCOVERY`
  - `mapRowToSettings` reads `row?.linkedin_discovery ?? DEFAULT_RADAR_SETTINGS.linkedinDiscovery`
  - `upsertRadarSettings` includes `linkedin_discovery: next.linkedinDiscovery` in the Supabase upsert payload

- **Task 3:** Updated `RadarSettingsForm` in four zones:
  - Import extended with `DEFAULT_LINKEDIN_DISCOVERY` and `LinkedInDiscovery` type
  - `SettingsFormState` type gains `linkedinDiscovery: LinkedInDiscovery` field
  - `useState` initial state and `useEffect` sync updated
  - `handleSave` payload includes `linkedinDiscovery: form.linkedinDiscovery`
  - New "Decouverte LinkedIn" Card inserted between "Seed LinkedIn" and "Matching vivier" with: enabled toggle, sectors/regions/keywords textareas, minExternalRatio/maxCompaniesPerRun/minHeadcount/maxHeadcount inputs

## Verification

- `npx tsc --noEmit` passes without errors after Tasks 2 and 3
- Migration file exists and contains correct ALTER TABLE statement

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all fields are fully wired from DB to UI.

## Self-Check: PASSED

- supabase/migrations/20260329_003_radar_linkedin_discovery.sql: FOUND
- lib/radar/settings.ts modified: FOUND
- app/(dashboard)/radar/components/radar-settings-form.tsx modified: FOUND
- Commits 8bdf433, 61d4526, 4bf355c: FOUND
