# Feature Landscape

**Domain:** Async AI workflow feedback UX for AI-powered SaaS (ESN consultant matching)
**Researched:** 2026-03-26
**Scope:** Milestone — async workflow UX feedback for 3 existing AI workflows (CV extraction, mission analysis, positioning)

---

## Context

The app has 3 AI workflows using Vercel `@workflow/next` beta with streaming NDJSON responses. Current state:
- No button disabling during workflow execution (duplicate triggers possible)
- No clear progression display (pending → running → done/error)
- Errors not surfaced reliably (mix of silent catches and inconsistent patterns)
- React Query + Zustand state not synchronized with real workflow status

The goal is reliability, not new features. All items below are evaluated through that lens.

---

## Table Stakes

Features users expect from any async operation in 2025. Missing = product feels broken, not just incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Button disabled during active workflow** | Prevents duplicate calls, universal web convention | Low | Use `mutation.isPending` or workflow running state. React Query `useMutation` exposes `isPending` natively. |
| **Visible loading indicator on trigger** | User needs confirmation the action registered | Low | Spinner/loader on the button itself, or in the workflow result area |
| **Distinct status states in UI** | Users need to know: is it working, done, or failed? | Low-Med | Minimum: `idle`, `pending`, `success`, `error`. Maps to Supabase `status` column |
| **Error message surfaced to user** | Silent failures destroy trust immediately | Low | Currently toast via Sonner exists — needs consistent wiring to all workflow error paths |
| **Actionable error copy** | "Something went wrong" is useless. Users need next step | Low | "Extraction failed. Try again or contact support." — not a dev error string |
| **Success state feedback** | User needs to know the workflow completed | Low | Brief success toast or status badge update |
| **State persists across navigation** | User should not lose progress info on page reload | Med | Requires workflow status persisted to Supabase (already partially done via `status` column) |

---

## Differentiators

Features not universally expected yet, but valued when present. Raise perceived quality and reduce support load.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Sub-step progress display** | "Step 2/4: Analyzing skills" reduces anxiety during long waits | Med | Vercel AI SDK supports streaming custom data parts with IDs for reconciliation. Workflow NDJSON stream already carries step info. |
| **Step-level status badges** | Each sub-workflow (extraction, scoring, CV gen) shows own state | Med | Architecturally natural given the 3-workflow structure. Positioning has the most sub-steps. |
| **Specific error attribution** | "CV extraction failed — file may be corrupted" vs generic error | Med | Requires distinguishing error types in API routes and workflow error frames |
| **"Last generated" timestamp** | Shows when results were produced, builds trust in data freshness | Low | Display `updated_at` from Supabase record |
| **Partial success handling** | If 1 of 3 sub-workflows fails, show what succeeded | High | Complex state management; positioning has interdependent steps. Defer unless specific user pain. |
| **Retry single failed step** | Re-run only the failed sub-step without restarting the full workflow | High | Requires workflow design change. Out of scope for reliability milestone. |
| **Estimated time remaining** | "~30 seconds left" reduces user abandonment | High | Requires calibration data; AI workflows have high variance. High risk of being wrong and eroding trust. |

---

## Anti-Features

Features to deliberately NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Fake progress bars** | Fabricated percentages erode trust when they stall | Use honest step-based progress ("Step 2 of 4") or a simple indeterminate spinner |
| **Push notifications / email on completion** | Out of scope per PROJECT.md, adds infrastructure complexity | Surface status synchronously in-page |
| **Separate jobs/activity page** | Requires new routing, new queries, new UI surface | Update status inline where the workflow was triggered |
| **Resumable/retry individual sub-steps** | Requires workflow architecture changes, breaks `@workflow/next` beta contract | Restart the full workflow on error — simpler and more reliable |
| **Optimistic UI for AI generation** | AI output is unpredictable; optimistic state would need rollback constantly | Use real pending state, not predicted outcome |
| **Streaming output preview** | Showing partial AI output during generation invites quality concerns | Show complete result after workflow finishes |
| **Cancel in-flight workflow** | `@workflow/next` beta does not document reliable cancellation support | Disable trigger button to prevent new starts; no mid-flight cancel |

---

## Feature Dependencies

```
Button disabled during active workflow
  → requires: workflow running state tracked in client (React Query + Zustand sync)
  → required by: all other progress display features

Workflow status states (idle/pending/success/error)
  → requires: consistent status in Supabase OR reliable client state
  → required by: error display, success feedback, sub-step display

Error message surfaced to user
  → requires: consistent error propagation from API routes (no silent catches)
  → required by: actionable error copy

Sub-step progress display
  → requires: button disabled + status states (already working baseline)
  → requires: NDJSON stream frames carrying step names (already partially implemented)
```

**Implementation order:**
1. Button disabled + loading indicator (unblocks everything, lowest risk)
2. Status states synced (idle/pending/success/error)
3. Error surfacing + actionable copy
4. Sub-step progress display (builds on stable foundation above)

---

## MVP Recommendation

**Must ship (this milestone):**
1. Button disabled during active workflow — blocks duplicate triggers
2. Loading indicator on trigger button/area — confirms action registered
3. Status states displayed in UI — user knows what is happening
4. Error surfaced with actionable copy — no silent failures
5. Success feedback — user knows when done

**Defer to later milestone:**
- Sub-step progress display: valuable but needs the above as a stable base first
- Step-level status badges: nice quality upgrade, not blocking reliability
- "Last generated" timestamp: low effort but low priority vs correctness fixes
- Specific error attribution: good long-term, but requires API route audit scope

---

## Sources

- [UI patterns for async workflows, background jobs, and data pipelines — LogRocket](https://blog.logrocket.com/ui-patterns-for-async-workflows-background-jobs-and-data-pipelines/)
- [Background tasks with progress updates: UI patterns that work — AppMaster](https://appmaster.io/blog/background-tasks-progress-ui)
- [Mastering Mutations in React Query — tkdodo](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
- [React Query: Avoiding Duplicate Mutation Requests — Medium](https://medium.com/@jdimitrop/react-query-avoiding-duplicate-mutation-requests-38c722e7a2e9)
- [AI SDK UI: Streaming Custom Data — Vercel](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data)
- [Design Patterns for AI Interfaces — Smashing Magazine](https://www.smashingmagazine.com/2025/07/design-patterns-ai-interfaces/)

---

*Confidence: HIGH for table stakes (established UX convention + verified in docs). MEDIUM for differentiators (patterns exist, application-specific tradeoffs vary). HIGH for anti-features (grounded in project constraints from PROJECT.md).*
