# Roadmap: Next-ESN — AI Workflow Reliability Milestone

## Overview

This milestone closes execution gaps in the existing async AI workflow architecture. The codebase already has the right patterns (NDJSON streaming, Supabase as ground truth, React Query projection, Zustand for transient UI). The work is two phases: first repair the server-side contract so workflows write correct terminal states to Supabase, fix button disabled logic to derive from server truth, surface errors to the UI, and fix cache invalidation scope. Second, build sub-step progress display and step-level error attribution on top of that stable foundation. No new features, no stack changes.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Server Contract & Core UI Reliability** - Fix workflow error status writes, derive button disabled state from Supabase, surface errors and success feedback, fix cache invalidation scope
- [ ] **Phase 2: Sub-Step Progress & Step Error Attribution** - Display per-step progress during AI runs, show individual step status badges, attribute errors to the specific step that failed

## Phase Details

### Phase 1: Server Contract & Core UI Reliability
**Goal**: Users always know what a workflow is doing — buttons are disabled while it runs, errors surface with actionable messages, and the state persists across page reloads
**Depends on**: Nothing (first phase)
**Requirements**: WFS-01, WFS-02, WFS-03, WFS-04, BTN-01, BTN-02, BTN-03, BTN-04, ERR-01, ERR-02, CCH-01, CCH-02
**Success Criteria** (what must be TRUE):
  1. User cannot trigger a duplicate AI run — the button is disabled while any workflow is running, even after a page reload
  2. When a workflow fails, the user sees an actionable error message ("Extraction échouée. Réessayez ou contactez le support.") — no silent failures
  3. When a workflow completes successfully, the user sees a visible success feedback
  4. After a workflow ends (success or error), the list view and detail view both reflect the updated state without a manual refresh
  5. Workflow status (`idle`, `pending`, `running`, `done`, `error`) persists in Supabase — a page reload never leaves a record stuck in `extracting` forever
**Plans:** 2 plans
Plans:
- [x] 01-01-PLAN.md — Server contract: workflow error handlers + NDJSON error frame parsing
- [ ] 01-02-PLAN.md — UI reliability: server-derived button state, toast feedback, cache invalidation, store reset
**UI hint**: yes

### Phase 2: Sub-Step Progress & Step Error Attribution
**Goal**: Users see which step of a multi-step AI workflow is currently running and, if one step fails, they know exactly which step failed and why
**Depends on**: Phase 1
**Requirements**: SUB-01, SUB-02, ERR-03
**Success Criteria** (what must be TRUE):
  1. During an active workflow, the user sees a step-by-step progress indicator ("Étape 2/4 : Analyse des compétences") that updates in real time
  2. Each visible sub-step has its own status badge (`pending` / `running` / `done` / `error`)
  3. When a step fails, the error message names the failing step ("Extraction CV échouée — fichier corrompu ?") rather than a generic workflow-level error
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Server Contract & Core UI Reliability | 0/2 | Planning complete | - |
| 2. Sub-Step Progress & Step Error Attribution | 0/TBD | Not started | - |
