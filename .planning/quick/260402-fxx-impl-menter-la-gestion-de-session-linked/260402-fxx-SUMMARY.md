---
phase: quick-260402-fxx
plan: 01
subsystem: radar
tags: [linkedin, browserbase, session, auth, settings]
dependency_graph:
  requires: []
  provides:
    - linkedin_context_id column on radar_org_settings
    - GET/POST/DELETE /api/radar/linkedin-session
    - saveLinkedInContext() in lib/radar/settings.ts
    - Browserbase context reuse in linkedin-browser collector
  affects:
    - collect-linkedin.workflow.ts
    - radar-settings-form.tsx
tech_stack:
  added:
    - "@browserbasehq/sdk — Browserbase API client for context/session management"
  patterns:
    - "Browserbase Context + Session for persistent LinkedIn auth"
    - "toPublicSettings() pattern to strip internal fields from API responses"
key_files:
  created:
    - supabase/migrations/20260402_001_linkedin_context.sql
    - app/api/radar/linkedin-session/route.ts
  modified:
    - lib/radar/settings.ts
    - app/api/radar/settings/route.ts
    - lib/radar/collectors/linkedin-browser.ts
    - app/api/radar/workflows/collect-linkedin.workflow.ts
    - app/(dashboard)/radar/components/radar-settings-form.tsx
decisions:
  - "@browserbasehq/sdk installed separately from stagehand — direct Browserbase API calls for context/session creation"
  - "linkedinContextId stored in radarSettingsSchema (internal) but stripped via toPublicSettings() before any GET/PATCH /api/radar/settings response"
  - "createStagehand(contextId?) uses browserbaseSessionCreateParams spread pattern to avoid breaking existing call without context"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-02T09:36:08Z"
  tasks_completed: 2
  files_modified: 7
---

# Phase quick-260402-fxx Plan 01: LinkedIn Session Management Summary

**One-liner:** Browserbase Context-based LinkedIn session management per org — persistent auth for Stagehand collectors via UI-driven connect/disconnect flow.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration SQL + backend (settings.ts + route API linkedin-session) | 6970e75 | migration, settings.ts, linkedin-session/route.ts, package.json |
| 2 | Collecteur linkedin-browser.ts + workflow + UI settings | 2dc2632 | linkedin-browser.ts, collect-linkedin.workflow.ts, radar-settings-form.tsx |

## What Was Built

### Migration SQL
`supabase/migrations/20260402_001_linkedin_context.sql` — adds `linkedin_context_id TEXT` column to `radar_org_settings`.

### Backend: settings.ts
- `radarSettingsSchema` extended with `linkedinContextId` (read-only, not in `radarSettingsPatchSchema`)
- `DEFAULT_RADAR_SETTINGS` has `linkedinContextId: null`
- `mapRowToSettings` maps `row.linkedin_context_id`
- `saveLinkedInContext(orgId, contextId | null)` — upserts the contextId in the DB

### API Route: /api/radar/linkedin-session
- `GET` — returns `{ connected: boolean }` (no contextId exposed)
- `POST` — creates Browserbase Context + Session, saves contextId, returns `{ liveUrl }`
- `DELETE` — clears contextId, returns `{ success: true }`

### Collector: linkedin-browser.ts
- `createStagehand(contextId?)` — injects `browserbaseSessionCreateParams` if contextId provided
- `collectLinkedInBrowserSignals(urls, orgId?)` — reads settings for contextId, falls back gracefully if unavailable

### Workflow: collect-linkedin.workflow.ts
- `fetchAllLinkedInSignals(urls, orgId)` — passes orgId to browser collector

### UI: radar-settings-form.tsx
- New "Connexion LinkedIn" Card with connected/disconnected state
- Badge vert "Connecté" + "Déconnecter" button when connected
- "Connecter mon LinkedIn" button opens liveUrl in new tab when disconnected

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical security] Strip linkedinContextId from GET/PATCH /api/radar/settings**
- **Found during:** Post-task verification
- **Issue:** `getRadarSettings()` now returns `linkedinContextId` but `GET /api/radar/settings` was returning `NextResponse.json(settings)` verbatim — would have exposed the contextId to the frontend
- **Fix:** Added `toPublicSettings()` helper that destructures and omits `linkedinContextId` before JSON serialization, applied to both GET and PATCH responses
- **Files modified:** `app/api/radar/settings/route.ts`
- **Commit:** c5e5dae

## Known Stubs

None — all functionality is fully wired.

## Self-Check: PASSED
