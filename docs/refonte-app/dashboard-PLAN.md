# Plan — Refonte du tableau de bord (`/dashboard`)

Branche `refonte-dashboard` · périmètre `app/(dashboard)/**`, `components/dashboard/**` · loi : `DESIGN.md` § L'établi.

## Composition retenue (Workbench, de haut en bas)

Conteneur `max-w-6xl mx-auto px-4 md:px-6 py-5`, sections séparées par `space-y-8`. Rien n'est sticky : le tableau
de bord tient en deux écrans et n'a pas d'aperçu à garder sous les yeux.

1. **En-tête** — `PageHeader` : titre « Tableau de bord », description « Activité de {organisation} », action
   unique « Importer un CV ». L'action **est** la zone de dépôt : un `label` en `Button` `default` (36 px, 44 px
   sur téléphone) qui enveloppe l'`input type="file"` et accepte le glisser-déposer (filet `ring` en survol de
   fichier). Pas de `Sheet`, pas de bloc dessous : un bouton suffit, le glisser-déposer reste possible dessus.
2. **Ligne de faits** — `dl` horizontale entre deux filets (`border-y`), quatre faits séparés par des filets
   verticaux à partir de `sm` (grille 2 × 2 en dessous) : CVs analysés · Positionnements · Score moyen · Temps
   gagné. Chiffre en `font-mono tabular-nums text-2xl font-semibold`, libellé `text-xs text-muted-foreground`.
   « — » quand il n'y a pas de donnée (score moyen sans analyse, temps gagné sans CV extrait). « Temps gagné »
   garde son info-bulle avec la formule (le déclencheur est un bouton, donc atteignable au clavier).
   **« Temps par opération »** devient un `<details>` sous la ligne (résumé mono « Temps par opération · total
   X »), affiché seulement quand il y a des durées ; son contenu est une `dl` de cinq durées sur filets. Plus
   de rangée de tuiles. « CVs finalisés » quitte la ligne de faits : l'information vit dans le pipeline
   (Prêt + Généré).
3. **Diptyque** `lg:grid-cols-12 gap-6` :
   - Gauche `lg:col-span-8` — **« Derniers positionnements »** (six plus récents analysés), liste sur le papier
     `divide-y divide-border`. Chaque ligne est un `Link` entier (`/review/[candidat]/positioning/[id]`) :
     score en mono `text-lg` coloré par `scoreToneText()`, « Candidat → Mission » (titre tronqué), date courte
     en mono, statut en `Badge outline`. **La mini-barre fort / partiel / manquant est retirée** : le score dit
     déjà la qualité, la répartition par compétence est lue au niveau de l'organisation dans la section
     « Compétences demandées », et la barre n'était lisible qu'en survol (info-bulle). La durée par ligne
     (info-bulle) est retirée aussi : les durées sont regroupées dans « Temps par opération ».
   - Droite `lg:col-span-4`, `space-y-8` — **« Pipeline des CV »** : cinq lignes statut → compteur mono, barre
     `h-1.5` sous chacune, teintée `primary` à cinq clartés (`/30 /45 /60 /80 /100` dans l'ordre du flux) ;
     puis **« À reprendre »** (seulement s'il y a des CV `uploaded`, `extracting` ou `error`, ou des
     positionnements `error`) : liens directs vers `/review/[id]` avec le motif (« Extraction en échec »,
     « Extraction en cours », « Importé, extraction non lancée ») et la date ; l'API du tableau de bord ne renvoie
     pas le nom des candidats, la ligne dit donc « CV du 24 nov. » ; puis **« Distribution des scores »** en
     carte (`bg-card border rounded-xl`), barres recharts horizontales, une teinte `primary`, ticks à 12 px.
4. **« Compétences demandées »** pleine largeur : dix compétences triées par fréquence, deux colonnes à partir de
   `md`, barre à trois segments (`bg-primary`, `bg-primary/50`, `bg-border`), pourcentage de maîtrise en mono à
   droite (déclencheur de l'info-bulle fort / partiel / manquant · nombre d'évaluations). La **couverture
   globale** (ex-donut) devient la méta de la section : « Couverture 64 % · 12 analyses » en mono dans la ligne
   de titre. Le donut et `skill-coverage-chart.tsx` disparaissent. **« Mes technos assimilées »** devient la
   dernière ligne de cette section : « 7 technologies assimilées sur votre profil · Voir tout » (lien
   `/settings/profile`), ou l'invitation à les marquer quand il n'y en a pas. Plus de mur de badges.
5. **États** :
   - chargement : `DashboardSkeleton` à la forme des blocs (en-tête, ligne de faits, diptyque), `Skeleton`
     sans balayage ;
   - erreur (`useDashboard` en échec) : en-tête puis `Alert destructive` « Le tableau de bord n'a pas pu être
     chargé. » avec un bouton « Réessayer » (`refetch`) ;
   - premier lancement (aucun CV, aucun positionnement) ou mode démo : en-tête puis **un seul panneau**
     d'invitation (`Empty`) « Importez votre premier CV. » + la zone de dépôt en version panneau ;
   - un seul helper d'état vide pour les blocs, `ChartEmpty` (texte sur le papier, sans `grid-noise`).
   Plus de phrase d'aide centrée en bas.
6. **Sections** : chaque `h2` (0.9375 rem / 600) est posé sur un filet (`border-b pb-2`), avec sa méta en mono
   à droite ; composant `SectionHeading` dans le périmètre.

## Fichiers

| Action | Fichier | Rôle |
|---|---|---|
| modifier | `app/(dashboard)/dashboard/page.tsx` | page réécrite : hooks inchangés, composition ci-dessus, tampon Hallmark |
| garder | `app/(dashboard)/loading.tsx` | spinner de route (autorisé au chargement initial d'une route) |
| modifier | `components/dashboard/score-distribution-chart.tsx` | une teinte `primary`, carte, `ChartEmpty` |
| supprimer | `components/dashboard/skill-coverage-chart.tsx` | donut fusionné dans « Compétences demandées » (seul import : la page) |
| créer | `components/dashboard/dashboard-stats.ts` + `.test.ts` | fonctions pures : stats, distribution, pipeline, top compétences, couverture, à reprendre |
| créer | `components/dashboard/dashboard-format.ts` + `.test.ts` | `formatTimeSaved`, `formatDurationMs`, `formatShortDate`, `candidateDisplayName`, `jobTitleFromDescription` |
| créer | `components/dashboard/cv-dropzone.tsx` | zone de dépôt : variante bouton (en-tête) et panneau (premier lancement) |
| créer | `components/dashboard/section-heading.tsx` | `h2` sur un filet + méta mono |
| créer | `components/dashboard/dashboard-facts.tsx` | ligne de faits + `<details>` Temps par opération |
| créer | `components/dashboard/recent-positionings.tsx` | liste des derniers positionnements |
| créer | `components/dashboard/cv-pipeline.tsx` | pipeline + « À reprendre » |
| créer | `components/dashboard/skills-demand.tsx` | compétences demandées + ligne technos assimilées |
| créer | `components/dashboard/chart-empty.tsx` | état vide unique des blocs |
| créer | `components/dashboard/dashboard-skeleton.tsx` | squelette à la forme des blocs |

## Ce qui est retiré, et pourquoi

- `title-gradient`, `glass-panel`, `grid-noise`, `transition-all`, `neon` / `violet` / `amber-400`, `overlay` :
  interdits par `DESIGN.md` ; remplacés par les jetons shadcn et `scoreTone()`.
- Les cinq tuiles « icône + libellé + chiffre » et la seconde rangée « Temps par opération » : rangées de tuiles
  identiques ; remplacées par la ligne de faits et un `<details>`.
- Les pieds de carte explicatifs en 10 px, les textes de 8 à 11 px : rien sous 0.75 rem.
- Le donut « Couverture compétences » : même donnée que les barres de compétences ; fusionné.
- Le mur de badges « Mes technos assimilées » : une ligne avec compteur et lien.
- La mini-barre et la durée par ligne de positionnement : redondantes et visibles seulement en survol.
- Le chevron et l'icône flèche décoratifs : la ligne entière est un lien ; « → » reste comme texte entre candidat
  et mission (c'est le sens de la ligne, pas une décoration).
- Les icônes de titre de carte (`Zap`, `Target`, `Clock`, `GraduationCap`) : un `h2` suffit.
- La phrase centrée « Sélectionne un CV dans la barre latérale pour commencer » et tout tutoiement.
- Le spinner centré de chargement : squelettes.
- `EmptyChart` recopié trois fois : un seul `ChartEmpty`.

## Comportement préservé

`useDemoModeStore`, `useOrgBranding`, `useDashboard`, `useUploadCv`, `useRouter`, dans cet ordre ; redirection vers
`/review/[id]` après import ; toasts d'import (texte vouvoyé) ; info-bulle de la formule du temps gagné ; lien
`/settings/profile` ; recharts via `ChartContainer` ; même forme de données (`DashboardData`).

## Questions ouvertes (non bloquantes)

- L'API `/api/dashboard` ne renvoie pas `extracted_data` pour les candidats : la liste « À reprendre » ne peut pas
  nommer le candidat. Proposition pour le tronc, hors de mon périmètre : ajouter `extracted_data->personalInfo`
  à la sélection des candidats.
- `components/route-loading.tsx` (hors périmètre) affiche « Chargement... » avec trois points ; proposer « … ».
