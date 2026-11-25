# Brief v2 — Coque : menu de gauche et en-tête

Lis `docs/refonte-app/COMMUN.md`, `docs/refonte-app/v2-COMMUN.md` et `DESIGN.md` § Révision v2 (surtout « Menu de
gauche »). Branche `refonte-coque`, périmètre de commit `refonte-coque`, worktree `refonte-coque` (issu du tronc).

## Périmètre

Possédés : `components/unified-sidebar.tsx`, `components/app-header.tsx`, `components/authenticated-shell.tsx`,
`components/mobile-nav-context.tsx`, `app/layout.tsx` (uniquement les classes du `body` : retirer `app-surface`,
poser `bg-shell`), `lib/config/app-routes.ts` (ajouter `/cvs`), `components/theme-toggle.tsx`,
`components/logo.tsx` / `esneo-full-logo.tsx` (usage seulement, pas le tracé).

**Ajout autorisé de primitives shadcn** manquantes, via le CLI (`pnpm dlx shadcn@latest add avatar dropdown-menu
command`, style `base-nova` de `components.json`), sans modifier les primitives existantes. Si le CLI échoue, écris
la primitive à la main dans `components/ui/` en suivant le style des voisines.

Interdits : les pages (`app/**/page.tsx`), `components/dashboard/**`, `app/review/**`, `components/ui/*` existants,
`globals.css`, données et API.

## État actuel (vu à l'écran)

Barre latérale : logo ; bascule « Mode démo » ; onglets segmentés « CVs / Positions » ; bouton pointillé
« Importer un CV » avec deux icônes ; **la liste des CV** (nom, badge « En revue » identique partout, titre de
poste), dépliable sur les positionnements avec scores et boutons d'annulation ; en bas, Templates, Mes technos,
Organisation, Équipe, Compétences équipe, Administration. En-tête : déclencheur mobile, icône bleue + fil
d'Ariane, sélecteur d'organisation Clerk, aide, thème, avatar Clerk. Fond du `body` : `app-surface` (taches
radiales). Hooks de la barre : `useCandidates`, `usePositionings`, `useMissions`, `useUploadCv`,
`useCancelWorkflow`, `useCreateMission`, `useDemoModeStore`, `useOrgBranding`.

## Direction

Une navigation d'app moderne (registre Linear / Notion / Vercel), sur la primitive `Sidebar` shadcn existante.

1. **Haut** : logo (même composant, même taille qu'aujourd'hui) ; en rail replié, le monogramme ou le logo rogné.
2. **Action principale** : `Button` `default` pleine largeur « Importer un CV » (déclenche le même `useUploadCv`
   que la barre actuelle, avec un `input type=file` caché ; feedback par `toast` existant), flanqué d'un `+` qui
   ouvre un `DropdownMenu` : « Importer un CV », « Nouvelle mission » (le `Dialog` de création de mission
   actuel, conservé tel quel).
3. **Recherche** : un champ `Rechercher… ⌘K` (`Button` `outline` qui ressemble à un champ) ouvrant une
   `CommandDialog` : groupes « CV » (via `useCandidates`, nom + titre, navigation vers `/review/[id]`),
   « Missions » (via `useMissions`, vers `/positions/[id]`), « Pages » (Tableau de bord, CVs, Missions, Modèles,
   réglages). Raccourci clavier ⌘K / Ctrl+K.
4. **Navigation** (groupe sans titre) : Tableau de bord `/dashboard` (`LayoutDashboard`), CVs `/cvs`
   (`FileText`, compteur = nombre de candidats), Missions `/positions` (`Briefcase`, compteur = missions),
   Modèles `/templates` (`LayoutTemplate`). Groupe « Réglages » : Mes technos `/settings/profile`, Organisation
   `/settings/organization`, Équipe `/settings/team`, Compétences équipe `/settings/team/skills`, Administration
   `/admin` (même condition d'affichage qu'aujourd'hui). Entrée active : `bg-primary/10 text-primary` ; icônes
   16 px ; compteurs en mono 12 px à droite, `text-muted-foreground`.
5. **Bas** : l'utilisateur (le `UserButton` Clerk existant, suivi du nom et de l'organisation en deux lignes,
   12 px) ; le bascule de thème ; « Mode démo » (`Switch`) seulement hors production, comme aujourd'hui.
6. **Repliable** : `collapsible="icon"` (rail de 3 rem avec icônes, info-bulles `Tooltip` sur chaque entrée en
   mode replié) ; bouton de repli dans l'en-tête (le `SidebarTrigger` existant, visible aussi sur bureau) ;
   hors-écran sur mobile (comportement actuel conservé).
7. **En-tête** : `bg-shell` sans flou, `border-b` ; fil d'Ariane sans l'icône bleue ; ajoute le cas `/cvs`
   (« Accueil › CVs ») et fais pointer « CV » des fils de `/review/**` vers `/cvs` quand c'est le bon parent ;
   sélecteur d'organisation, aide (onboarding), thème et `UserButton` : garde ce qui n'est pas descendu dans la
   barre (au minimum le sélecteur d'organisation et l'aide), évite les doublons avec le bas de la barre.
8. **Coque** : `main` en `bg-shell`, reste le conteneur de défilement (`DESIGN.md` : panneaux collants sur
   `top-5`).

## Ce qui quitte la barre latérale

La liste des CV, les onglets « CVs / Positions », le bouton pointillé et ses deux icônes, les scores et les boutons
d'annulation dans l'arbre. Ces fonctions vivent désormais sur la page `/cvs`, construite en parallèle par l'agent
tableau de bord (brief `v2-dashboard.md`). Tu n'écris pas cette page ; tu pointes vers `/cvs`. Si `useCancelWorkflow`
ou `usePositionings` ne te servent plus, retire-les de la barre.

## Conserver

Les hooks nécessaires et leur ordre pour ce qui reste ; l'import de CV et son toast ; le dialogue de nouvelle
mission ; l'onboarding (bouton d'aide) ; `useOrgBranding` (nom d'organisation) ; la condition d'affichage de
l'administration ; le mobile (`MobileNavProvider`, `SidebarTrigger`) ; le logo.
