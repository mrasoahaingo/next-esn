# Brief v2 — Tableau de bord et page CVs

Lis `COMMUN.md`, `v2-COMMUN.md`, `DESIGN.md` § Révision v2, et ton `dashboard-PLAN.md` v1. Branche
`refonte-dashboard` (déjà à jour du tronc). Périmètre v2 : `app/(dashboard)/**`, `components/dashboard/**`, **et
la nouvelle page `app/cvs/**` + `components/cvs/**`**.

## Vu à l'écran (v1)

Le titre, la ligne de faits, puis un titre « Derniers positionnements » avec une seule ligne et 400 px de vide
dessous ; à droite, « Pipeline des CV » nu et une carte « Distribution des scores » seule à avoir un contour ;
« Compétences demandées » tout en bas. Rien ne délimite les blocs ; l'écran se lit comme un document.

## Tableau de bord v2

1. `PageHeader` conservé (titre, « Activité de {org} », action d'import).
2. **Quatre `KpiCard`** sur une rangée (`grid-cols-2 lg:grid-cols-4 gap-4`) : CV analysés (sous-ligne : « 22 en
   relecture · 1 prêt »), Positionnements (sous-ligne : « 1 analysé »), Score moyen (valeur colorée par
   `scoreTone`), Temps gagné (sous-ligne : la formule courte, info-bulle complète conservée). Le détail « Temps
   par opération » passe dans un `PanelFooter` du panneau « Derniers positionnements » ou dans le `hint` de la
   carte, à toi de choisir.
3. **Grille `lg:grid-cols-12 gap-4 items-start`** :
   - Gauche `col-span-8` : `Panel` « Derniers positionnements » (icône `GitCompare`, compteur, action « Tout
     voir » → `/cvs`) avec un **`Table`** : avatar + candidat, mission, score (mono, `scoreTone`), statut
     (`StatusBadge`), date relative courte. Ligne entière cliquable. Sans donnée : `Empty` avec « Créer un
     positionnement ». Puis, dessous, `Panel` « Compétences demandées » (barres par compétence, deux colonnes,
     légende dans l'en-tête, couverture en compteur) — il remonte sous le tableau, plus de vide.
   - Droite `col-span-4` : `Panel` « Pipeline des CV » (liste statut → compteur + barre, chaque statut avec
     `StatusBadge` `neutral`/`info`/`ok`), `Panel` « À reprendre » (lignes avec avatar, nom, `StatusBadge`
     `err`/`warn`, lien), `Panel` « Distribution des scores » (recharts, une teinte).
4. Chargement : squelettes à la forme des panneaux. Erreur : `Alert` conservée. Premier lancement : un seul
   `Panel` d'invitation (dropzone) **plus** les quatre KPI à « — », pour que la page ait sa forme dès le début.

## Page `/cvs` (nouvelle) — l'ancienne liste de la barre latérale, à sa place

Le menu de gauche (refait en parallèle par l'agent coque) ne liste plus les CV ; il pointe vers `/cvs`.

- Fichiers : `app/cvs/page.tsx` (`'use client'`, tampon Hallmark), `app/cvs/loading.tsx` (réexporte
  `@/components/route-loading`), `components/cvs/*`. Le coordinateur et l'agent coque ajoutent `/cvs` aux routes
  protégées et au fil d'Ariane ; tu n'y touches pas.
- Données : `useCandidates` (liste, statuts, diagnostics de workflow), `usePositionings` (compteur et meilleur
  score par candidat), `useUploadCv`, `useCancelWorkflow`, `useDemoModeStore` — exactement ce que la barre
  latérale utilise aujourd'hui (`components/unified-sidebar.tsx`, lis-le pour reprendre la logique : libellés de
  statut, annulation d'un workflow en cours, navigation).
- Composition : `PageHeader` « CVs » (description « {n} candidats », action « Importer un CV »), une barre
  d'outils (champ de recherche sur nom et titre, chips de filtre par statut avec compteurs : Tous · En
  extraction · En relecture · Prêt · Généré · Échec), puis un `Panel` avec un **`Table`** : avatar + nom + titre
  (deux lignes), statut (`StatusBadge`, `pulse` en extraction), positionnements (« 3 · meilleur 84 » en mono),
  mis à jour (date relative), actions (`ghost` icône : ouvrir ; annuler si un workflow tourne, avec
  `AlertDialog` ou confirmation existante ; pas de suppression ici). Ligne cliquable → `/review/[id]`.
  Un candidat avec positionnements peut se déplier (`ChevronRight`) sur ses positionnements (mission, score,
  statut, lien), comme l'arbre actuel. État vide : `Empty` + dropzone. Sous `md` : la table devient une liste de
  cartes compactes.
- Tri par défaut : mis à jour récemment en premier.

## Conserver

Tout ce que v1 conservait ; en plus, les comportements de l'arbre de la barre latérale (annulation, statuts,
navigation) qui migrent sur `/cvs`.
