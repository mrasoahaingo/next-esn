---
phase: 1
slug: server-contract-core-ui-reliability
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-03-26
---

# Phase 1 — UI Design Contract

> Visual and interaction contract for workflow feedback states: loading, error, success, and disabled buttons. No new pages or layouts — this phase retrofits reliability UI onto existing components.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn v4 |
| Preset | base-nova (neutral base color) |
| Component library | @base-ui/react (headless primitives) |
| Icon library | lucide-react 0.577.0 |
| Font | Geist (sans: `--font-geist-sans`, mono: `--font-geist-mono`) |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps inside buttons (`gap-1`), inline padding |
| sm | 8px | Compact element spacing, button internal padding |
| md | 16px | Default element spacing, toast padding |
| lg | 24px | Section padding, card padding |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

Exceptions: none

---

## Typography

All text in this phase uses the existing Geist font stack. No new type roles introduced.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px (text-sm) | 400 (normal) | 1.43 (20px) |
| Label | 14px (text-sm) | 500 (medium) | 1.43 (20px) |
| Heading | 20px (text-xl) | 600 (semibold) | 1.2 (24px) |
| Display | 28px (text-2xl) | 600 (semibold) | 1.2 (34px) |

Phase 1 uses only Body and Label roles. Heading and Display are declared for completeness but not introduced in this phase.

---

## Color

This phase uses the existing Esneo theme tokens from `globals.css`. No new colors are introduced.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `var(--background)` / `var(--shell)` | Page background, main content area |
| Secondary (30%) | `var(--card)` / `var(--panel)` | Cards, sidebar, form surfaces |
| Accent (10%) | `var(--primary)` oklch(0.55 0.22 130) — neon green | Primary CTA buttons, active spinner color, success toast icon |
| Destructive | `var(--destructive)` oklch(0.577 0.245 27.325) | Error toast icon, error status badge, destructive button variant |

Accent reserved for: primary CTA buttons (Extraire, Analyser, Generer), loading spinner inside active buttons, success toast icon, `ring` focus indicator.

### Semantic Status Colors

These map workflow statuses to visual indicators. Use existing shadcn badge variants:

| Status | Badge variant | Text color | Background |
|--------|--------------|------------|------------|
| idle | `secondary` | `--secondary-foreground` | `--secondary` |
| pending | `secondary` | `--secondary-foreground` | `--secondary` |
| running | `default` | `--primary-foreground` | `--primary` |
| done | `secondary` | `--secondary-foreground` | `--secondary` |
| error | `destructive` | `--destructive` | `--destructive/10` |

---

## Copywriting Contract

All copy is in French (project convention: French client context).

| Element | Copy |
|---------|------|
| **Extraction CTA (idle)** | `Extraire le CV` |
| **Extraction CTA (error, retry)** | `Relancer l'extraction` |
| **Analysis CTA (idle)** | `Lancer l'analyse` |
| **Analysis CTA (error, retry)** | `Relancer l'analyse` |
| **Generation CTA (idle)** | `Generer le CV` |
| **Generation CTA (error, retry)** | `Relancer la generation` |
| **Loading state (button label)** | Same CTA label, button disabled + Spinner icon prepended |
| **Success toast: extraction** | `Extraction terminee avec succes` |
| **Success toast: analysis** | `Analyse terminee avec succes` |
| **Success toast: generation** | `Generation terminee avec succes` |
| **Error toast: extraction** | `Extraction echouee. Reessayez ou contactez le support.` |
| **Error toast: analysis** | `Analyse echouee. Reessayez ou contactez le support.` |
| **Error toast: generation** | `Generation echouee. Reessayez ou contactez le support.` |
| **Error toast: generic** | `Une erreur est survenue. Reessayez ou contactez le support.` |
| **Empty state** | Not applicable — Phase 1 modifies existing views, no new empty states |
| **Destructive confirmation** | Not applicable — Phase 1 has no destructive actions |

### Toast Configuration

| Property | Value |
|----------|-------|
| Component | `sonner` Toaster (already mounted in `app/layout.tsx`) |
| Duration: success | 4000ms (sonner default) |
| Duration: error | 8000ms (longer so user can read the action) |
| Position | Bottom-right (sonner default) |
| Dismiss | Click or swipe |

---

## Interaction States

### Button States (Workflow Trigger Buttons)

All workflow trigger buttons follow this state machine, derived from Supabase `status` field via React Query:

| Server status | Button `disabled` | Button icon | Button label |
|---------------|-------------------|-------------|--------------|
| idle / done | `false` | none | CTA label (e.g. `Extraire le CV`) |
| pending / running (extracting, analyzing, generating) | `true` | `Spinner` via `data-icon="inline-start"` | Same CTA label, visually muted by `disabled:opacity-50` |
| error | `false` | none | Retry CTA label (e.g. `Relancer l'extraction`) |

### Spinner Pattern

Use shadcn `Spinner` component (must be installed via `npx shadcn add spinner`). Compose with Button using `data-icon`:

```
<Button disabled={isWorkflowActive}>
  {isWorkflowActive && <Spinner data-icon="inline-start" />}
  {label}
</Button>
```

The Spinner inherits size from the button variant's `[&_svg:not([class*='size-'])]:size-4` rule.

### Toast Pattern

Use `toast.success()` and `toast.error()` from `sonner`. Triggered in the `onFinish` / `onError` callbacks of `useWorkflowStream`. Icons are already configured in `components/ui/sonner.tsx` (CircleCheckIcon for success, OctagonXIcon for error).

---

## Component Inventory

### Existing Components Used (no modifications needed)

| Component | Source | Used For |
|-----------|--------|----------|
| `Button` | `components/ui/button.tsx` | Workflow trigger buttons (disabled state) |
| `Badge` | `components/ui/badge.tsx` | Status indicators on list/detail views |
| `Toaster` | `components/ui/sonner.tsx` | Toast container (already in layout) |

### New Components to Install

| Component | Source | Used For |
|-----------|--------|----------|
| `Spinner` | `npx shadcn add spinner` | Loading indicator inside buttons |

### No Custom Components

Phase 1 does not introduce any custom components. All UI changes are state-driven variations of existing shadcn components.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Spinner | not required |

No third-party registries declared. No vetting needed.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
