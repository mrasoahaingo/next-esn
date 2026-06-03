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

## org-data-leak-after-cv-upload — Cross-org data leak after CV upload (service_role singleton + missing org_id filters)
- **Date:** 2026-06-03
- **Error patterns:** org data leak, cross-org, upload CV, rafraîchissement, service_role, singleton, supabase, RLS bypass, org_id filter, multi-tenant, fuite données
- **Root cause:** Two combined issues: (1) Supabase client in lib/utils/supabase.ts was a module-level singleton using service_role key shared across warm Lambda requests — service_role bypasses RLS entirely, making app-level filters the only security boundary; (2) Six refresh-after-write SELECT queries (POST/PATCH returning updated state) were missing .eq('org_id', orgId) filter, meaning cross-org data could be returned if the singleton had corrupted state.
- **Fix:** (1) Removed singleton pattern from lib/utils/supabase.ts — createClient() now called fresh on each getSupabase() call; (2) Added .eq('org_id', orgId) to all refresh-after-write SELECT queries in upload, missions, missions/[id], positioning (x3), and candidates/[id] DELETE cascade.
- **Files changed:** lib/utils/supabase.ts, app/api/upload/route.ts, app/api/missions/route.ts, app/api/missions/[id]/route.ts, app/api/positioning/route.ts, app/api/candidates/[id]/route.ts
---

