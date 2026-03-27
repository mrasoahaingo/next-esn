# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## org-switch-data-leak — Cross-org data leak when switching organizations
- **Date:** 2026-03-27
- **Error patterns:** orgId, stale data, wrong orgId, cache, org switch, React Query, Zustand, queryKeys, candidates list, missions list, positionings list
- **Root cause:** Three vectors combined: (1) React Query cache keys for candidates, missions, positionings, dashboard, recruiterSkills, orgRecruiterSkills, templates, and team were org-agnostic, so cache entries from org A were served to org B; (2) positioning.store and template.store were not reset in AuthQuerySync on org change; (3) team.ts defined its own teamKeys outside queryKeys with no orgId.
- **Fix:** All query key factories in lib/queries/keys.ts now require orgId as first argument. All query hooks pass orgId from useAuth() and guard with enabled: !!orgId. components/auth-query-sync.tsx now resets usePositioningStore and useTemplateStore in addition to the cv-builder store on org change.
- **Files changed:** lib/queries/keys.ts, lib/queries/candidates.ts, lib/queries/missions.ts, lib/queries/positionings.ts, lib/queries/dashboard.ts, lib/queries/recruiter-skills.ts, lib/queries/templates.ts, lib/queries/team.ts, lib/queries/workflow.ts, components/auth-query-sync.tsx, app/review/[id]/page.tsx, app/review/[id]/positioning/[positioningId]/page.tsx, app/positions/[id]/page.tsx, components/mission-job-analysis.tsx, components/positioning-mission-analysis-inline.tsx, components/template-list-sidebar.tsx
---

