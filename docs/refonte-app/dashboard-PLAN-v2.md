# Plan v2 — Tableau de bord (`/dashboard`) et page `/cvs`

Branche `refonte-dashboard` (suite de la v1) · périmètre `app/(dashboard)/**`, `components/dashboard/**`,
`app/cvs/**`, `components/cvs/**` · loi : `DESIGN.md` § Révision v2 (toile, panneaux, KPI, jamais de vide).

Ce qui change par rapport au plan v1 : la **matière**, pas la logique. Les calculs (`dashboard-stats.ts`), les
formats (`dashboard-format.ts`), les hooks et leur ordre, la zone de dépôt et les états restent ; la ligne de faits
devient quatre `KpiCard`, chaque section devient un `Panel`, la liste des positionnements devient un `Table`,
les statuts passent par `StatusBadge`, les candidats par `InitialsAvatar`, les dates par une forme relative.

## Tableau de bord — composition (de haut en bas)

Conteneur `mx-auto w-full max-w-7xl px-6 py-6`, `flex flex-col gap-6` entre l'en-tête et le contenu, `gap-4` entre
panneaux. Rien n'est sticky.

1. **`PageHeader`** inchangé : « Tableau de bord », « Activité de {org} », action = `CvDropzone` bouton.
2. **Quatre `KpiCard`** (`grid grid-cols-2 gap-4 lg:grid-cols-4`) :
   - CV analysés (`FileText`) — valeur `totalCvs`, sous-ligne « 22 en relecture · 1 prêt » (nouveau
     `reviewingCvs` dans `DashboardStats`).
   - Positionnements (`GitCompare`) — valeur `totalPositionings`, sous-ligne « 12 analysés ».
   - Score moyen (`Gauge`) — valeur « 72 % » colorée par `scoreToneText()`, ou « — » avec « Aucun positionnement
     analysé ».
   - Temps gagné (`Timer`) — valeur `formatTimeSaved()`, sous-ligne = la formule courte « 22 CV × 40 min »
     en déclencheur de `Tooltip` (texte complet conservé, atteignable au clavier).
   Le détail **« Temps par opération »** devient le `PanelFooter` du panneau « Derniers positionnements » : une
   ligne mono « Temps par opération · Extraction IA 3 min · Analyse IA 1 min 12 s · … », seulement les durées
   non nulles, seulement quand il y en a. Plus de `<details>`.
3. **Grille `lg:grid-cols-12 gap-4 items-start`** :
   - Gauche `lg:col-span-8`, `flex flex-col gap-4` :
     - `Panel` **« Derniers positionnements »** (`GitCompare`, compteur = analysés, action « Tout voir » →
       `/cvs`). `Table` : Candidat (`InitialsAvatar` + nom), Mission (titre tronqué), Score (mono, `scoreTone`),
       Statut (`StatusBadge`), Date (relative courte, mono). Ligne entière cliquable (`onClick` → `router.push`),
       le nom est un `Link` réel (cible clavier) ; `hover:bg-muted/50`, `focus-within:bg-muted/50`. Sans donnée :
       `Empty` (icône dans un disque `bg-muted`, titre, phrase, action « Créer un positionnement » → `/cvs`).
     - `Panel` **« Compétences demandées »** (`Tags`, compteur « Couverture 64 % », légende fort / partiel /
       manquant dans les `actions` de l'en-tête). Corps : dix barres à trois segments, deux colonnes à partir de
       `md`, pourcentage mono avec son info-bulle. `PanelFooter` : la ligne « 7 technologies assimilées sur votre
       profil · Voir tout ». Sans donnée : `Empty` avec action « Créer un positionnement ».
   - Droite `lg:col-span-4`, `flex flex-col gap-4` :
     - `Panel` **« Pipeline des CV »** (`Workflow`, compteur = total CV) : cinq lignes `StatusBadge` →
       compteur mono, barre `h-1.5` sous chacune (clartés de `primary` conservées). Sans CV : `Empty` avec la
       zone de dépôt bouton.
     - `Panel` **« À reprendre »** (`AlertCircle`, compteur) : lignes `divide-y`, `InitialsAvatar` (nom du
       candidat quand il est connu, sinon « CV »), motif, `StatusBadge` `err` / `warn`, date relative ; lien
       entier. Toujours affiché : sans élément, une ligne « Tout est à jour » (`StatusBadge` `ok`) — ce n'est pas un
       vide à corriger, donc pas d'`Empty` ni d'action.
     - `Panel` **« Distribution des scores »** (`BarChart3`, compteur = analysés) : recharts, une teinte. Sans
       donnée : `Empty` avec action « Créer un positionnement ».
4. **États** : chargement = `DashboardSkeleton` à la forme des panneaux (quatre cartes KPI, panneau avec lignes de
   tableau, trois panneaux à droite) ; erreur = `Alert destructive` + « Réessayer » (inchangée) ; **premier
   lancement** (aucun CV, aucun positionnement) ou mode démo = les quatre `KpiCard` à « — » **puis** le seul
   panneau d'invitation (`CvDropzone` variante `panel`, désormais sur `bg-panel` avec filet pointillé).

Ce qui disparaît de la v1 : `SectionHeading` (titres sur filet) et `ChartEmpty` (texte nu) — remplacés par
`PanelHeader` et `Empty` ; `DashboardFacts` (ligne de faits + `<details>`) — remplacé par les KPI et le pied de
panneau ; le `Badge outline` de statut — remplacé par `StatusBadge`.

## Statuts : une seule table, partout

`components/cvs/cv-status.ts` (fonctions pures, testées) : libellé et ton de chaque statut de CV
(`uploaded` Importé `neutral` · `extracting` En extraction `info` + `pulse` · `reviewing` En relecture `warn` ·
`ready` Prêt `ok` · `generated` Généré `ok` · `error` Échec `err`) et de positionnement (`draft` Brouillon
`neutral` · `analyzing` Analyse en cours `info` + `pulse` · `analyzed` Analysé `ok` · `generating` Génération
en cours `info` + `pulse` · `generated` Généré `ok` · `exported` Exporté `ok` · `error` Échec `err`). Le tableau
de bord l'importe pour le pipeline, les derniers positionnements et « À reprendre » : même pastille partout
(`DESIGN.md` : « À relire » = `warning`, d'où `warn` pour « En relecture », plutôt que l'`info` du brief).

`formatRelativeDate(iso, now)` rejoint `dashboard-format.ts` : « à l'instant », « il y a 5 min », « il y a 2 h »,
« hier », puis « 21 mars » (année ajoutée si différente).

## Page `/cvs` — composition

Conteneur `mx-auto w-full max-w-7xl px-6 py-6`, `flex flex-col gap-6`. Hooks, dans l'ordre : `useRouter`,
`useDemoModeStore`, `useCandidates`, `usePositionings`, `useUploadCv`, `useCancelWorkflow` — ceux de la barre
latérale pour la liste des CV, sans `useMissions`.

1. **`PageHeader`** « CVs », description « {n} candidats » (ou « Aucun candidat »), action = `CvDropzone` bouton
   (même `useUploadCv`, mêmes toasts vouvoyés que le tableau de bord, redirection vers `/review/[id]`).
2. **Barre d'outils** (`CvsToolbar`) : champ de recherche (`Input` avec icône `Search`, sur nom et titre,
   insensible à la casse et aux accents) et chips de filtre par statut avec compteurs mono : Tous · En
   extraction · En relecture · Prêt · Généré · Échec (`button` `aria-pressed`, actif `bg-primary/10
   text-primary border-primary/30`). Les deux filtres se combinent.
3. **`Panel`** « Candidats » (`FileText`, compteur = lignes affichées) avec un **`Table`** à partir de `md` :
   dépliage (`ChevronRight`, seulement si le candidat a des positionnements) · Candidat (`InitialsAvatar`, nom,
   titre en seconde ligne) · Statut (`StatusBadge`, `pulse` en extraction) · Positionnements (« 3 · meilleur 84 »
   en mono, « — » sans) · Importé (date relative) · Actions (`ghost` icône : ouvrir ; annuler l'extraction si
   `status === 'extracting' && workflow_run_id`, même `useCancelWorkflow` que la barre, sans dialogue puisque
   l'action est réversible et que la barre n'en avait pas ; pas de suppression ici). Ligne cliquable →
   `/review/[id]`. Déplié : une ligne par positionnement (mission, score mono coloré, `StatusBadge`, date, lien,
   annulation si `analyzing` / `generating` avec `workflow_run_id`), triés par score décroissant comme dans la
   barre, puis la ligne « Nouveau positionnement » → `/review/[id]/positioning`. Tri par défaut : plus récent en
   premier (l'API ne renvoie pas `updated_at` : on trie sur `created_at`, la colonne s'appelle donc « Importé »).
   **Sous `md`** : liste de cartes compactes (avatar, nom, titre, statut, positionnements, date, actions), le
   dépliage y reste disponible.
4. **États** : chargement = squelette de table dans le panneau ; erreur = `Alert destructive` + « Réessayer »
   (refetch des deux listes) ; aucun candidat (ou mode démo) = `Empty` + zone de dépôt (`CvDropzone` panneau) ;
   aucun résultat après filtre = `Empty` « Aucun candidat ne correspond » avec l'action « Effacer les filtres ».
5. `app/cvs/loading.tsx` réexporte `@/components/route-loading`.

## Fichiers

| Action | Fichier | Rôle |
|---|---|---|
| modifier | `app/(dashboard)/dashboard/page.tsx` | composition v2, tampon « · v2 » |
| modifier | `components/dashboard/dashboard-stats.ts` + `.test.ts` | `reviewingCvs` ; `POSITIONING_STATUS_LABEL` remplacé par `cv-status.ts` |
| modifier | `components/dashboard/dashboard-format.ts` + `.test.ts` | `formatRelativeDate` |
| créer | `components/dashboard/dashboard-kpis.tsx` | les quatre `KpiCard` (remplace `dashboard-facts.tsx`) |
| modifier | `components/dashboard/recent-positionings.tsx` | `Panel` + `Table` + `Empty` + pied « Temps par opération » |
| modifier | `components/dashboard/cv-pipeline.tsx` | deux `Panel` (pipeline, à reprendre) avec `StatusBadge`, `InitialsAvatar` |
| modifier | `components/dashboard/skills-demand.tsx` | `Panel`, légende dans l'en-tête, pied technos |
| modifier | `components/dashboard/score-distribution-chart.tsx` | `Panel` |
| modifier | `components/dashboard/cv-dropzone.tsx` | variante panneau sur `bg-panel` ; variante bouton inchangée |
| modifier | `components/dashboard/dashboard-skeleton.tsx` | à la forme des panneaux |
| créer | `components/dashboard/dashboard-empty.tsx` | `Empty` de panneau (icône en disque, titre, phrase, action) — un seul helper |
| supprimer | `components/dashboard/dashboard-facts.tsx`, `section-heading.tsx`, `chart-empty.tsx` | plus importés nulle part après la v2 (`grep -rn` dans le compte rendu) |
| créer | `components/cvs/cv-status.ts` + `.test.ts` | libellés et tons des statuts CV / positionnement |
| créer | `components/cvs/cvs-list.ts` + `.test.ts` | nom et titre d'un candidat, filtre, tri, résumé des positionnements, compteurs par filtre |
| créer | `components/cvs/cvs-toolbar.tsx` | recherche + chips |
| créer | `components/cvs/cvs-table.tsx` | panneau, table, lignes dépliées, cartes mobiles |
| créer | `components/cvs/cvs-skeleton.tsx` | squelette de table |
| créer | `app/cvs/page.tsx`, `app/cvs/loading.tsx` | page, tampon Hallmark |

## Questions ouvertes (non bloquantes, envoyées au coordinateur)

- `/api/candidates` ne renvoie ni `workflow_run_id` ni `updated_at` : le bouton d'annulation d'une extraction
  (conditionné à `workflow_run_id`, comme dans la barre latérale aujourd'hui) n'apparaîtra qu'une fois le champ
  ajouté à la sélection ; la colonne « Mis à jour » demandée est « Importé » (`created_at`) jusqu'à `updated_at`.
  Proposition pour le tronc : ajouter `workflow_run_id, updated_at` au `select` de `app/api/candidates/route.ts`.
- `/api/dashboard` ne renvoie toujours pas `extracted_data` pour les candidats : « À reprendre » nomme les
  candidats des positionnements, pas ceux des CV (« CV du 24 nov. »). Même proposition qu'en v1.
