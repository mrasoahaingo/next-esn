---
status: resolved
trigger: "Bug critique sécurité — lors du switch d'organisation en tant que super_admin, les données de l'organisation précédente (ou d'une autre org) restent affichées / des requêtes API partent avec le mauvais orgId."
created: 2026-03-27T00:00:00Z
updated: 2026-03-27T00:02:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED AND FIXED — Three independent vectors caused stale org data. All three have been addressed.
test: TypeScript compilation passes with zero errors after all changes.
expecting: After org switch, no stale-org data should be served from React Query cache and no store state from the previous org persists.
next_action: Awaiting human verification

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: After org switch, all displayed data and all API requests must correspond exclusively to the newly selected organization.
actual: Intermittently, data from the previous organization remains displayed, and API requests are sent with the wrong orgId.
errors: Network requests observed with wrong orgId
reproduction: Intermittent — occurs when switching via the organization selector
started: Observed behavior, uncertain when it started
suspects: React Query cache not invalidated on org switch, query keys that don't include orgId, Zustand state not reset, race condition between Clerk org change and query re-fetch

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: Server-side API routes don't validate orgId
  evidence: All org-scoped routes use requireOrgId() / requireOrgContext() from lib/utils/auth.ts which reads orgId from the Clerk session server-side. The server is not a vector.
  timestamp: 2026-03-27T00:01:00Z

- hypothesis: Middleware fails to protect routes
  evidence: middleware.ts correctly uses clerkMiddleware + auth.protect() and redirects to /org-selection when no orgId. Admin routes are protected by super_admin check.
  timestamp: 2026-03-27T00:01:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-27T00:01:00Z
  checked: lib/queries/keys.ts
  found: Only queryKeys.org.settings(orgId) included orgId. ALL other keys (candidates, missions, positionings, dashboard, recruiterSkills, orgRecruiterSkills, templates) were org-agnostic strings like ['candidates', 'list']. team.ts used its own local teamKeys object which also had no orgId.
  implication: When switching orgs, React Query cache had entries keyed by ['candidates','list'] etc. — these entries belonged to org A but could be served to org B.

- timestamp: 2026-03-27T00:01:00Z
  checked: components/auth-query-sync.tsx
  found: AuthQuerySync detected userId:orgId changes via useLayoutEffect, called queryClient.clear() and reset cv-builder store only. positioning.store and template.store were NOT reset.
  implication: When switching orgs, positioning.store retained positioningId, analysis, tailoredCv, email*, currentStep, recruiterAnswerEntries etc. from the previous org. template.store retained templateConfig from previous org.

- timestamp: 2026-03-27T00:01:00Z
  checked: Multiple page files (app/review/[id]/page.tsx, app/review/[id]/positioning/[positioningId]/page.tsx, app/positions/[id]/page.tsx) and components (mission-job-analysis.tsx, positioning-mission-analysis-inline.tsx, template-list-sidebar.tsx)
  found: These files called queryClient.invalidateQueries() and queryClient.refetchQueries() with old key signatures that had no orgId. After the keys.ts change they produced TypeScript errors until also fixed.
  implication: All invalidation call sites needed to pass orgId to be consistent.

- timestamp: 2026-03-27T00:02:00Z
  checked: TypeScript compilation after all fixes
  found: Zero errors. All query key call sites updated to include orgId.
  implication: Fix is type-safe and consistent across the codebase.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: |
  Three vectors combined to produce intermittent stale-org data:

  VECTOR 1 (PRIMARY): React Query cache keys for candidates, missions, positionings,
  dashboard, recruiterSkills, orgRecruiterSkills, templates, and team were org-agnostic.
  Cache entries from org A could be shown to org B before the next fetch completed.

  VECTOR 2 (SECONDARY): positioning.store and template.store were not reset in AuthQuerySync.
  Switching orgs left the full positioning analysis, tailoredCv, email drafts,
  recruiterAnswerEntries and templateConfig from org A in memory.

  VECTOR 3 (MINOR): team.ts defined its own teamKeys outside queryKeys with no orgId.

fix: |
  1. lib/queries/keys.ts — All key factories now require orgId as first argument.
     queryKeys.team is now included (previously lived in team.ts as teamKeys).
  2. lib/queries/candidates.ts — useAuth() orgId passed to all key calls, enabled: !!orgId added.
  3. lib/queries/missions.ts — Same pattern.
  4. lib/queries/positionings.ts — Same pattern.
  5. lib/queries/dashboard.ts — Same pattern.
  6. lib/queries/recruiter-skills.ts — Same pattern.
  7. lib/queries/templates.ts — Same pattern.
  8. lib/queries/team.ts — Rewritten to use queryKeys.team (with orgId), removed local teamKeys.
  9. lib/queries/workflow.ts — useCancelWorkflow now reads orgId and passes to all key calls.
  10. components/auth-query-sync.tsx — Now also resets usePositioningStore and useTemplateStore on org change.
  11. app/review/[id]/page.tsx — Fixed inline queryClient.invalidateQueries() calls.
  12. app/review/[id]/positioning/[positioningId]/page.tsx — Fixed inline calls.
  13. app/positions/[id]/page.tsx — Fixed inline calls.
  14. components/mission-job-analysis.tsx — Fixed inline calls.
  15. components/positioning-mission-analysis-inline.tsx — Fixed inline calls.
  16. components/template-list-sidebar.tsx — Fixed inline call.

verification: TypeScript compilation passes with zero errors. All query key factories require orgId, ensuring no cross-org cache sharing is possible at the type level.

files_changed:
  - lib/queries/keys.ts
  - lib/queries/candidates.ts
  - lib/queries/missions.ts
  - lib/queries/positionings.ts
  - lib/queries/dashboard.ts
  - lib/queries/recruiter-skills.ts
  - lib/queries/templates.ts
  - lib/queries/team.ts
  - lib/queries/workflow.ts
  - components/auth-query-sync.tsx
  - app/review/[id]/page.tsx
  - app/review/[id]/positioning/[positioningId]/page.tsx
  - app/positions/[id]/page.tsx
  - components/mission-job-analysis.tsx
  - components/positioning-mission-analysis-inline.tsx
  - components/template-list-sidebar.tsx
