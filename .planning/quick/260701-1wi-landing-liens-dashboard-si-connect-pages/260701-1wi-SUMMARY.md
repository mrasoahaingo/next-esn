---
phase: quick-260701-1wi
plan: 01
subsystem: ui
tags: [clerk, auth, landing, server-components, tailwind]

requires:
  - phase: quick-260701-00n
    provides: components/marketing/landing.tsx (landing publique) et route /dashboard
provides:
  - Liens conditionnels signed-in/signed-out sur la landing (lien /dashboard quand connecté)
  - Composants auth Esneo réutilisables (AuthBrandPanel statique + AuthScreen 2 colonnes)
  - Pages /sign-in et /sign-up refondues en split éditorial avec formulaire Clerk borderless
affects: [auth, landing, marketing]

tech-stack:
  added: []
  patterns:
    - "Conditionnel auth en RSC via <Show when=\"signed-in|signed-out\"> (@clerk/nextjs v7)"
    - "borderlessAppearance partagé pour fondre les formulaires Clerk dans un layout custom"

key-files:
  created:
    - components/auth/auth-brand-panel.tsx
    - components/auth/auth-screen.tsx
  modified:
    - components/marketing/landing.tsx
    - app/sign-in/[[...sign-in]]/page.tsx
    - app/sign-up/[[...sign-up]]/page.tsx

key-decisions:
  - "Utiliser <Show when=...> au lieu de <SignedIn>/<SignedOut> car ces derniers ne sont plus exportés par @clerk/nextjs v7.0.5"
  - "borderlessAppearance centralisé dans auth-screen.tsx, réutilisé par les deux pages"

patterns-established:
  - "Gating auth RSC: <Show when=\"signed-in\"> / <Show when=\"signed-out\"> (server component compatible)"
  - "Pages auth: AuthScreen 2 colonnes (panneau marque bg-primary à gauche, formulaire Clerk borderless à droite)"

requirements-completed: [QUICK-260701-1wi]

duration: 5min
completed: 2026-07-01
---

# Quick 260701-1wi: Liens dashboard sur la landing + pages auth 2 colonnes Summary

**La landing pointe vers /dashboard quand l'utilisateur est connecté (via `<Show when>`), et les pages /sign-in et /sign-up passent en split éditorial Esneo avec formulaire Clerk borderless.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-30T23:25:16Z
- **Completed:** 2026-06-30T23:30:09Z
- **Tasks:** 3
- **Files modified:** 5 (2 créés, 3 modifiés)

## Accomplishments
- Liens conditionnels aux 4 emplacements de la landing (SiteNav, Hero, FinalCta, SiteFooter) : `/dashboard` sous `signed-in`, liens auth d'origine sous `signed-out`.
- landing.tsx reste un Server Component (aucun `'use client'` ajouté).
- Nouveau dossier `components/auth/` : `AuthBrandPanel` (panneau de marque statique, tokens Esneo, EsneoFullLogo, hl-serif/font-mono) et `AuthScreen` (coquille 2 colonnes + `borderlessAppearance`).
- `/sign-in` et `/sign-up` refondues : 2 colonnes desktop, retour mobile + logo, textes orientés ESN. Plus d'usage de `AuthBrandLogo`.

## Task Commits

1. **Task 1: Liens conditionnels dashboard sur la landing** - `9c049d4` (feat)
2. **Task 2: Composants auth Esneo (AuthBrandPanel + AuthScreen)** - `9e4f34f` (feat)
3. **Task 3: Brancher AuthScreen sur sign-in et sign-up** - `00ee176` (feat)

## Files Created/Modified
- `components/marketing/landing.tsx` - Import `Show` + gating `signed-in`/`signed-out` aux 4 emplacements de liens auth.
- `components/auth/auth-brand-panel.tsx` - Panneau de marque gauche statique (kicker, titre serif, lede, retour /, EsneoFullLogo).
- `components/auth/auth-screen.tsx` - Coquille 2 colonnes + export `borderlessAppearance` pour Clerk.
- `app/sign-in/[[...sign-in]]/page.tsx` - `SignIn` dans `AuthScreen` avec textes ESN.
- `app/sign-up/[[...sign-up]]/page.tsx` - `SignUp` dans `AuthScreen` avec textes ESN.

## Decisions Made
- **Clerk API** : `@clerk/nextjs` v7.0.5 n'exporte plus `SignedIn`/`SignedOut`. L'équivalent RSC-compatible est le composant `<Show when="signed-in">` / `<Show when="signed-out">` (server component asynchrone). Utilisé à la place — même intention, API réelle.
- `borderlessAppearance` centralisé dans `auth-screen.tsx`, importé par les deux pages pour éviter la duplication.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] API Clerk SignedIn/SignedOut inexistante en v7.0.5**
- **Found during:** Task 1 (liens conditionnels landing)
- **Issue:** Le plan prescrivait `import { SignedIn, SignedOut } from '@clerk/nextjs'`, mais ces membres ne sont plus exportés par la version installée (7.0.5). tsc remontait `TS2724`/`TS2305`. Sans correction, Task 1 ne pouvait pas compiler.
- **Fix:** Remplacé par le composant `Show` (`import { Show } from '@clerk/nextjs'`) et les wrappers `<Show when="signed-out">` / `<Show when="signed-in">`. Même comportement (gating auth en Server Component), API réelle de la version.
- **Files modified:** components/marketing/landing.tsx
- **Verification:** `npx tsc --noEmit` sans erreur sur landing.tsx ; eslint sans erreur.
- **Committed in:** 9c049d4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** L'objectif (gating auth RSC : liens dashboard si connecté, liens auth sinon) est pleinement atteint. Seul le nom de l'API Clerk diffère ; aucun écart de comportement ni de scope.

## Issues Encountered
- **Worktree isolé sans fichiers untracked :** la tâche précédente quick-260701-00n (non commitée) a créé `components/marketing/landing.tsx` et la route `/dashboard` en untracked dans le checkout partagé ; ces fichiers n'étaient pas présents dans le worktree isolé. Copiés depuis le checkout partagé comme baseline/dépendances de build (illustrations.tsx, theme-toggle.tsx, app/(dashboard)/dashboard/page.tsx, tokens.css) — **non commités** car hors scope de ce plan. Seuls les 5 fichiers du plan ont été commités.

## User Setup Required
None - aucune configuration de service externe requise.

## Next Phase Readiness
- Composants `components/auth/` réutilisables pour d'éventuelles autres pages auth.
- Vérification visuelle manuelle recommandée (hors automatisation) : déconnecté → liens auth ; connecté → liens /dashboard ; /sign-in et /sign-up en 2 colonnes desktop, mono-colonne + logo en mobile.

---
*Phase: quick-260701-1wi*
*Completed: 2026-07-01*

## Known Stubs
None - aucun stub introduit.

## Self-Check: PASSED
- All 5 plan files present + SUMMARY.md present.
- All 3 task commits present (9c049d4, 9e4f34f, 00ee176).
