# Phase 2: Sub-Step Progress & Step Error Attribution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `02-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 2 — Sub-Step Progress & Step Error Attribution
**Areas discussed:** Transport & reconnect; Parallel branches; UI pattern; Coverage & parity; Error attribution

---

## 1. Transport & reconnect

| Option | Description | Selected |
|--------|-------------|----------|
| A | Stream-only: never persist step state | |
| B | Stream-first; persist only terminal failure step info on parent row for reload (ERR-03); no `workflow_steps` table unless spike | ✓ |
| C | Full `workflow_steps` table in Phase 2 | |

**User's choice:** B (recommended default after user selected **all** areas for discussion)
**Notes:** Aligns with existing GET stream replay; defers heavy persistence per `.planning/STATE.md` open question.

---

## 2. Parallel branches

| Option | Description | Selected |
|--------|-------------|----------|
| A | Single fake “current step” | |
| B | Fixed ordered checklist; multiple `running` when several `activeBranches` | ✓ |
| C | Collapse to one “parallel” row without branch names | |

**User's choice:** B
**Notes:** Honest UX; no fake serialization of parallel LLM work.

---

## 3. UI pattern

| Option | Description | Selected |
|--------|-------------|----------|
| A | Horizontal stepper only | |
| B | Vertical step list + badges + optional “Étape x/y” header; inside Card/panel | ✓ |
| C | Full-screen wizard | |

**User's choice:** B
**Notes:** Matches “no full redesign” constraint.

---

## 4. Coverage & parity

| Option | Description | Selected |
|--------|-------------|----------|
| A | One workflow first, others later | |
| B | All four workflows in Phase 2 | ✓ |

**User's choice:** B
**Notes:** Consistent core value across CV, mission, positioning analyze, positioning generate.

---

## 5. Error attribution (ERR-03)

| Option | Description | Selected |
|--------|-------------|----------|
| A | Inline only | |
| B | Inline on failed step + toast | ✓ |
| C | Toast only | |

**User's choice:** B
**Notes:** Step names the failure; toast ensures visibility.

---

## Claude's Discretion

- Visual polish (connector, exact badge variants) within existing design system

## Deferred Ideas

- `workflow_steps` table — only if stream replay proves insufficient
- v2 partial success / per-step retry
