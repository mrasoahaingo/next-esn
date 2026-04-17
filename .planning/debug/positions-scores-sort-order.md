---
status: awaiting_human_verify
trigger: "Sur la page /positions/[id], la liste des scores s'affiche dans le mauvais ordre puis re-render avec le bon ordre (descendant). Trouver où le tri est appliqué tardivement et le corriger pour que le bon ordre soit affiché dès le début. Vérifier partout ailleurs aussi."
created: 2026-04-16T00:00:00Z
updated: 2026-04-16T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — Line 1491 in page.tsx calls positionings.sort() in-place inside useMemo (existingCandidateIds), mutating the shared array reference. This triggers a re-render with sorted data after the first unsorted render.
test: Verified by reading the code — .sort() without spread copies the original memoized array directly.
expecting: Fix by sorting in the positionings useMemo and using spread in existingCandidateIds.
next_action: Apply fix

## Symptoms

expected: La liste des scores sur /positions/[id] doit être triée en ordre décroissant dès le premier rendu, sans re-render visible
actual: La liste s'affiche d'abord dans le mauvais ordre, puis re-render et se trie correctement en descendant
errors: Aucune erreur visible, juste un flash/reorder visuel au chargement
reproduction: Naviguer vers /positions/[id] et observer l'ordre de la liste des scores au chargement
started: Non précisé

## Eliminated

## Evidence

- timestamp: 2026-04-16
  checked: app/positions/[id]/page.tsx lines 1482-1493
  found: positionings useMemo (line 1482-1485) returns mission?.positionings ?? [] with NO sort. drafts and ready are derived without sort. existingCandidateIds useMemo (line 1490-1493) calls positionings.sort() directly — NO spread/copy — mutating the shared array in-place after first render.
  implication: First render uses API order (unsorted). existingCandidateIds memo mutates the array, triggering a re-render with sorted data.

- timestamp: 2026-04-16
  checked: app/api/missions/[id]/route.ts Supabase query
  found: No ORDER BY on positionings in the SQL query — positionings come back in insertion order.
  implication: Client is solely responsible for sorting. The in-place mutation is the entire cause of the flash.

- timestamp: 2026-04-16
  checked: Lines 923, 950 (CompareCvsModal) and line 1491 (existingCandidateIds)
  found: CompareCvsModal uses .sort() inline in JSX on the positionings prop — these also mutate their input array but since they run on a modal open, don't cause the page-load flash.
  implication: Same mutation anti-pattern exists in modal code but not visible on load.

## Resolution

root_cause: In app/positions/[id]/page.tsx, the positionings useMemo (line 1482) returned the raw unsorted array from the API. The existingCandidateIds useMemo (line 1490) then called positionings.sort() directly — without a spread copy — mutating the shared array in-place. This caused a re-render with the now-sorted data, producing the visible flash/reorder on load.

fix: Moved the sort into the positionings useMemo using a spread copy ([...].sort()), so drafts and ready inherit the correct descending score order on the first render. Removed the redundant sort from existingCandidateIds. Removed two redundant inline .sort() calls in CompareCvsModal JSX (lines 923, 950) which also mutated the prop array.

verification: pending human confirmation
files_changed: [app/positions/[id]/page.tsx]
