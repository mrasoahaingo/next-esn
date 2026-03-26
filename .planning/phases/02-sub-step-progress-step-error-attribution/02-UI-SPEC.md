---
phase: 2
slug: sub-step-progress-step-error-attribution
status: approved
reviewed_at: 2026-03-26
shadcn_initialized: true
preset: base-nova
created: 2026-03-26
extends: ../01-server-contract-core-ui-reliability/01-UI-SPEC.md
---

# Phase 2 — UI Design Contract

> Visual and interaction contract for **sub-step progress** and **step-level error attribution** across all streaming workflows (CV extraction, job posting analysis, positioning analysis, positioning generation). Extends Phase 1 — same design system, tokens, and toast patterns; adds a shared **compact vertical step list** inside existing Cards/panels.

**Requirements mapped:** SUB-01, SUB-02, ERR-03

---

## Parent contract

| Document | Role |
|----------|------|
| `.planning/phases/01-server-contract-core-ui-reliability/01-UI-SPEC.md` | Authoritative for Geist typography, Esneo color tokens, semantic status badge variants, Sonner toasts, workflow CTA labels, and button/spinner patterns |

Where Phase 1 and Phase 2 both apply, **Phase 1 wins** unless this document explicitly adds or narrows behavior for sub-steps.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn v4 (unchanged) |
| Preset | base-nova |
| Component library | @base-ui/react (headless primitives) |
| Icon library | lucide-react |
| Font | Geist (`--font-geist-sans`) |

**New for this phase:** optional thin vertical connector between step rows (`border-l` + `pl-*` on a muted line) — **optional**; if omitted, a plain spaced list is acceptable (see `02-CONTEXT.md` D-10 / Claude discretion).

---

## Spacing Scale

Same 4px grid as Phase 1. Phase 2 additions:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap between step row icon/dot and text |
| sm | 8px | Gap between step title and error subline |
| md | 16px | Padding inside the step list container (`CardContent` or equivalent) |
| lg | 24px | Margin below step list header / above list |

Exceptions: none

---

## Typography

Inherits Phase 1 body/label roles. Phase 2 adds one **caption** role for secondary line on step rows (limits total distinct sizes to **three** — within checker max of four).

| Role | Size | Weight | Line height | Usage |
|------|------|--------|-------------|--------|
| Body | 14px (`text-sm`) | 400 | 1.43 | Step title line, toast body |
| Label | 14px (`text-sm`) | 500 | 1.43 | Card/section labels above the list |
| Caption | 12px (`text-xs`) | 400 | 1.33 | Step error detail, muted meta under a step |

**Summary line (SUB-01):** one line, `text-sm` + `font-medium`, e.g. `Étape 2/4 — Analyse des compétences` — same scale as Label but used as **subtitle** to the list; must not be the only indicator of per-step state (badges are source of truth per `02-CONTEXT.md` D-07).

---

## Color

No new palette tokens. Reuse Phase 1 semantic table for **step status badges**:

| Step state | Badge variant | Notes |
|------------|---------------|--------|
| `pending` | `secondary` | Muted |
| `running` | `default` | Primary-filled — draws eye to active step(s) |
| `done` | `secondary` | Distinct from running; optional small `Check` icon if space allows |
| `error` | `destructive` | Row also shows caption in `text-destructive` or `muted-foreground` for secondary explanation |

**Accent reserved for:** unchanged from Phase 1 — primary CTAs, focus ring, running badge fill, success toast icon. **Not** used for every step row border.

**Parallelism (D-05):** when multiple branches run, **multiple** rows may use `running` at once — color must not imply a single global “current” step.

---

## Copywriting Contract

All user-facing strings in **French**. Patterns below satisfy SUB-01, SUB-02, ERR-03 and align with `02-CONTEXT.md` D-09, D-10.

### Summary line (SUB-01)

| Element | Pattern |
|---------|---------|
| Template | `Étape {index}/{total} — {shortLabel}` |
| Example | `Étape 2/4 — Analyse des compétences` |

`shortLabel` comes from the workflow’s fixed ordered map of logical steps (French). No fake percentage or indeterminate progress bar.

### Parallel group (optional, D-05)

| Element | Copy |
|---------|------|
| Optional group heading | `Analyse en parallèle` — only if branch names stay visible; omit if redundant |

### Per-step row

| Element | Pattern |
|---------|---------|
| Step name | Short French title (e.g. `OCR et structure`, `Fusion des branches`) |
| Error on row (ERR-03) | `{stepName} — {actionable message}` e.g. `Extraction CV — fichier corrompu ou illisible. Réessayez avec un autre fichier.` |
| Scrolled-away reinforcement | Same substance as Phase 1 error toasts, but **must include** the failing step name in the first clause (Sonner), e.g. `Extraction CV : échec. Réessayez ou contactez le support.` |

### CTAs

No new primary CTAs in Phase 2 — reuse Phase 1 (`Extraire le CV`, `Relancer l'extraction`, `Lancer l'analyse`, etc.).

| Element | Copy |
|---------|------|
| Empty state (no run in progress, list hidden or collapsed) | Not applicable — list appears when stream is active or reconnect replays meta; if a placeholder is needed: `Aucune étape pour le moment` |
| Destructive confirmation | Not applicable |

---

## Layout & visual hierarchy

| Focal point | When |
|-------------|------|
| **Step list + badges** | During `pending` / `running` workflow — user’s eye goes to rows with `running` / `error` |
| **Summary line** | Secondary — orients without replacing badges |

**Container:** existing `Card` or panel — `rounded-lg`, same border/background as surrounding feature (home, mission, positioning). List is **compact** (no full-page takeover, `02-CONTEXT.md` D-06).

**Structure:**

1. Optional `CardHeader` with title of the workflow context (existing copy).
2. One summary line (SUB-01) when at least one step is visible.
3. Vertical list: each row = step name + `Badge` + optional caption (error text).

**Accessibility:** step name text must accompany badge (not icon-only status).

---

## Coverage (parity)

Same UX pattern on every surface that consumes `useWorkflowStream` for these workflows:

| Workflow | Surfaces (indicative) |
|----------|------------------------|
| CV extraction | Dashboard / review entry using extract stream |
| Job posting analysis | Mission upload / analysis flows |
| Positioning analysis | Positioning detail / analysis panels |
| Positioning generation | Steps such as CV generation, emails generation — align list pattern with shared component |

Exact file placement is left to implementation; **visual contract** is identical.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `Card`, `Badge`, `Button` (Phase 1), optional `Spinner` | not required |
| Third-party | none | not applicable |

No new registries or blocks.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-03-26
