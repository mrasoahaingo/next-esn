# Plan v2 — Coque : menu de gauche et en-tête

Branche `refonte-coque` (issue du tronc `refonte-app-ui` à `638c9b6`). Brief : `v2-coque.md`. Loi : `DESIGN.md`
§ Révision v2, « Menu de gauche (coque) ».

## Composition retenue

### Barre latérale (`components/unified-sidebar.tsx`, réécrite)

`Sidebar collapsible="icon"` (primitive shadcn existante), fond `bg-sidebar` (= `panel`), filet `border-r border-border`.
Hors-écran sur mobile (comportement de la primitive, inchangé). De haut en bas :

1. **Logo** — même composant (`EsneoFullLogo` ou le logo d'organisation), même taille (`max-h-8`, `w-30`), lien vers
   `/dashboard`. En rail replié : le logo est rogné à gauche dans une fenêtre de 2 rem (`overflow-hidden`,
   `object-left`), pas de tracé nouveau.
2. **Action principale** — `Button` `default` pleine largeur « Importer un CV » (même `useUploadCv`, `input type=file`
   caché, mêmes toasts), flanqué d'un `Button` `outline` `icon` `+` qui ouvre un `DropdownMenu` : « Importer un CV »,
   « Nouvelle mission ». En rail : seul le `+` reste (icône, info-bulle « Créer »), les deux actions dans le menu.
3. **Recherche** — `Button` `outline` qui ressemble à un champ (icône `Search`, « Rechercher… », `kbd` « ⌘K » en mono
   à droite) ; ouvre la palette. En rail : icône seule avec info-bulle. Raccourci global ⌘K / Ctrl+K.
4. **Navigation** (groupe sans titre) — `SidebarMenu` : Tableau de bord `/dashboard` (`LayoutDashboard`), CVs `/cvs`
   (`FileText`, compteur = candidats), Missions `/positions` (`Briefcase`, compteur = missions), Modèles `/templates`
   (`LayoutTemplate`, même condition qu'aujourd'hui : super-admin). Entrée active : `bg-primary/10 text-primary` sur
   `rounded-md` ; icônes 16 px ; compteurs `SidebarMenuBadge` en `font-mono text-xs text-muted-foreground`.
   Info-bulle (`tooltip` de `SidebarMenuButton`) sur chaque entrée en rail.
5. **Réglages** (`SidebarGroupLabel`) — Mes technos `/settings/profile`, Organisation `/settings/organization`,
   Équipe `/settings/team`, Compétences équipe `/settings/team/skills` (mêmes conditions `canManageTeam`),
   Administration `/admin` (super-admin). Plus aucune teinte `neon` / `violet` / `amber`.
6. **Pied** — l'utilisateur : `UserButton` Clerk suivi du nom et de l'organisation (`useOrgBranding().displayName`)
   sur deux lignes en 12 px ; `ThemeToggle` ; « Mode démo » (`Switch`) hors production seulement. En rail : avatar
   et bascule de thème empilés, le reste masqué.

Ce qui quitte la barre : la liste des CV et son arbre de positionnements (scores, annulations, « Nouveau
positionnement »), les onglets segmentés CVs / Positions, le bouton pointillé et ses deux icônes (rafraîchir,
replier), l'onglet Positions et sa liste de missions. Tout cela vit sur `/cvs` (agent tableau de bord).
`usePositionings` et `useCancelWorkflow` ne servent plus à la barre : retirés. `useParams` non plus.

### Palette ⌘K (`components/command-palette.tsx`, nouveau)

`CommandDialog` : champ de recherche en tête, puis trois groupes : « CV » (`useCandidates` : nom + titre, avatar à
initiales, navigation `/review/[id]`), « Missions » (`useMissions` : titre + entreprise, `/positions/[id]`),
« Pages » (Tableau de bord, CVs, Missions, Modèles, Mes technos, Organisation, Équipe, Compétences équipe,
Administration, mêmes conditions d'affichage que le menu). Entrée → navigation, fermeture, fermeture du volet mobile.
Ouverte depuis le bouton de recherche de la barre et par ⌘K / Ctrl+K (écouteur `keydown` global).

### Dialogue de nouvelle mission (`components/new-mission-dialog.tsx`, nouveau)

Le `Dialog` actuel de la barre, extrait tel quel (champs, `JobDescriptionInput`, `useCreateMission`, navigation vers
`/positions/[id]?tab=analysis`). Seules les classes changent : plus de `bg-violet`, bouton `default`, titre sans
icône carrée.

### En-tête (`components/app-header.tsx`)

`sticky top-0`, `bg-shell` sans flou, `border-b border-border`, hauteur 3 rem. `SidebarTrigger` visible à toutes
les tailles (replie le rail sur bureau, ouvre le volet sur mobile). Fil d'Ariane sans l'icône bleue, séparateurs
`ChevronRight` 14 px, dernier élément en `text-foreground`. Cas ajoutés : `/cvs` → « Accueil › CVs » ;
`/review/**` → « Accueil › CVs › Édition CV » / « … › CV › Positionnement » (le « CV » pointe vers `/review/[id]`,
« CVs » vers `/cvs`). « Positions » devient « Missions » (nom du menu). À droite : `OrganizationSwitcher` et l'aide
(onboarding). Thème et `UserButton` descendent dans la barre (pas de doublon). Le constructeur de fil d'Ariane
devient une fonction pure dans `components/app-breadcrumbs.ts`, testée.

### Coque et toile

- `components/authenticated-shell.tsx` : `main` en `bg-shell`, reste le conteneur de défilement (`overflow-y-auto`,
  `min-h-0`), rien d'autre ne change.
- `app/layout.tsx` : classes du `body` seulement — `app-surface` retiré, `bg-shell` posé.
- `lib/config/app-routes.ts` : `/cvs` est déjà présent sur le tronc ; rien à faire.
- `components/mobile-nav-context.tsx` : n'est importé nulle part (`grep -rn` : seul lui-même) ; conservé tel quel,
  signalé dans le compte rendu.

### Primitives shadcn ajoutées (`components/ui/`, nouveaux fichiers seulement)

Le CLI `shadcn add avatar dropdown-menu` n'a écrit aucun fichier et a seulement ajouté un paquet `cn` parasite dans
`package.json` (annulé : aucune dépendance nouvelle). Les primitives sont donc écrites à la main depuis le registre
`base-nova`, imports corrigés (`@/lib/utils`, `lucide-react`) :

- `avatar.tsx` — Base UI `Avatar` (registre base-nova, transcrit).
- `dropdown-menu.tsx` — Base UI `Menu` (registre base-nova, transcrit).
- `command.tsx` — la version du registre dépend de `cmdk` (dépendance nouvelle, interdite) ; écrite à la main sur
  Base UI `Autocomplete` (liste en ligne, filtrage, navigation clavier, groupes, état vide) dans un `Dialog`, avec la
  même API que shadcn (`Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`,
  `CommandItem`, `CommandShortcut`, `CommandSeparator`) pour qu'un passage à `cmdk` reste trivial.

## Fichiers

| Action | Fichier |
|---|---|
| Modifier | `components/unified-sidebar.tsx`, `components/app-header.tsx`, `components/authenticated-shell.tsx`, `app/layout.tsx` |
| Créer | `components/ui/avatar.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/command.tsx`, `components/command-palette.tsx`, `components/new-mission-dialog.tsx`, `components/app-breadcrumbs.ts`, `components/app-breadcrumbs.test.ts` |
| Inchangé | `components/mobile-nav-context.tsx`, `components/theme-toggle.tsx`, `components/logo.tsx`, `components/esneo-full-logo.tsx`, `lib/config/app-routes.ts` |
| Supprimer | rien |

## Ce qui est retiré et pourquoi

- La liste des CV / missions et l'arbre de positionnements dans la barre : `DESIGN.md` v2 fait de la barre une
  navigation ; ces fonctions vivent sur `/cvs`.
- Les teintes `neon` / `violet` / `amber-*` de la barre et du dialogue : une seule couleur chromatique, `primary`.
- Le flou et la transparence de l'en-tête, l'icône carrée bleue du fil d'Ariane : interdits v1 (icône dans un carré
  lumineux), et l'en-tête s'aligne sur la toile.
- `app-surface` sur le `body` : interdit v1, remplacé par `bg-shell`.
- Les textes de 8 à 11 px de la barre : rien sous 0.75 rem.

## Questions ouvertes

- `components/mobile-nav-context.tsx` n'est utilisé nulle part ; le laisser ou le retirer est une décision du
  coordinateur (hors de ce tour).
- Le libellé du fil d'Ariane pour `/positions` passe de « Positions » à « Missions » pour suivre le menu ; à
  confirmer si une page affiche encore « Positions » dans son `h1`.
