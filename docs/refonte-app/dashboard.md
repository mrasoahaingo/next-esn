# Brief — Tableau de bord (`/dashboard`)

Lis d'abord `docs/refonte-app/COMMUN.md` et `DESIGN.md` § L'établi. Périmètre : `app/(dashboard)/**`,
`components/dashboard/**`. Branche `refonte-dashboard`, périmètre de commit `refonte-dashboard`.

## Ce que l'écran fait (à préserver)

Vue d'ensemble de l'activité de l'organisation, pour un chasseur de têtes ou un ingénieur d'affaires qui ouvre
l'app le matin. **Action principale : importer un CV** (zone de dépôt → `useUploadCv` → redirection vers
`/review/[id]`). Données : `useDashboard`, `useUploadCv`, `useDemoModeStore`, `useOrgBranding`.

État actuel (inventaire du 2026-11-24), de haut en bas :

1. `h1` « Dashboard » en `title-gradient`, sous-titre « Vue d'ensemble de l'activité — {org} », zone de dépôt.
2. Cinq tuiles identiques (icône colorée + libellé + chiffre) : CVs analysés, CVs finalisés, Positionnements,
   Score moyen, Temps gagné (info-bulle avec la formule).
3. Carte « Mes technos assimilées » : compteur, mur de `Badge`, « Voir tout ».
4. Trois cartes : « Distribution des scores » (barres recharts), « Couverture compétences » (donut recharts),
   « Pipeline CVs » (cinq `Progress`).
5. Carte « Temps par opération » : seconde rangée de cinq mini-tuiles (seulement avec des données).
6. Carte « Top compétences demandées » : barres empilées fort / partiel / manquant, deux colonnes.
7. Carte « Derniers matchings » : lignes cliquables (tuile de score 48 px, « candidat → mission », mini-barre,
   durée, date, `Badge` de statut, chevron).
8. Phrase centrée en bas : « Sélectionne un CV dans la barre latérale pour commencer ».

Tics à retirer : titre en dégradé ; deux rangées de tuiles identiques ; `glass-panel` sur chaque carte ; pied de
carte explicatif en 10 px ; arc-en-ciel accent / neon / violet / ambre ; `grid-noise` dans les états vides ;
l'aide `EmptyChart` recopiée dans trois fichiers ; textes de 8 à 11 px ; tutoiement ; phrase centrée finale ;
aucun état d'erreur.

## Direction

Le tableau de bord est **la table du matin** : ce qu'il y a à reprendre, ce qui vient de se passer, et les
chiffres qui situent, pas un mur de widgets. Macrostructure Workbench : l'en-tête fonctionnel, puis un diptyque
asymétrique.

1. **En-tête** (`PageHeader`) : titre « Tableau de bord » ; description « Activité de {organisation} » (ou le nom
   de l'organisation seul en `meta`) ; action : « Importer un CV » (`Button` `default`), qui ouvre ou révèle la
   zone de dépôt (la zone peut rester un `label` de dépôt discret à droite de l'en-tête à partir de `md`, plein
   écran en `Sheet` ou en bloc dessous sur téléphone, à toi de trancher dans le plan).
2. **Ligne de faits** : une `dl` horizontale sur un filet (pas de tuiles, pas d'icônes) : CVs analysés ·
   Positionnements · Score moyen · Temps gagné, chiffres en `font-mono tabular-nums` 1.5 rem / 600, libellés en
   0.75 rem `text-muted-foreground`. « Temps gagné » garde son info-bulle avec la formule ; « Temps par
   opération » devient le détail de cette info-bulle (ou un `<details>` sous la ligne), plus une rangée de tuiles.
   Un chiffre sans donnée affiche « — ».
3. **Diptyque** `lg:grid-cols-12` : à gauche (`lg:col-span-8`) **« Derniers positionnements »** en liste sur le
   papier (`divide-y`) : score en mono coloré par `scoreTone()`, « Candidat → Mission », statut en `Badge`
   `outline`, date courte en mono ; la ligne entière est un lien, sans chevron décoratif ; mini-barre fort /
   partiel / manquant conservée si elle apporte quelque chose, sinon retirée (décide-le dans le plan). À droite
   (`lg:col-span-4`) **« Pipeline des CV »** : liste statut → compteur, une barre `h-1.5` par statut colorée par
   `primary` et ses opacités ; puis **« À reprendre »** s'il existe des CV en cours ou en erreur (liens directs).
4. **Compétences** : une seule section « Compétences demandées » qui fusionne « Couverture compétences » et
   « Top compétences demandées » en barres horizontales triées, trois segments (fort `primary`, partiel
   `primary/50`, manquant `border`), pourcentage en mono à droite, info-bulle conservée. Le donut disparaît.
   « Mes technos assimilées » devient une ligne sous cette section (compteur + « Voir tout »), ou un petit bloc
   dans la colonne de droite, pas un mur de badges.
5. **Distribution des scores** : conservée (barres recharts via `ChartContainer`), une teinte `primary`, dans la
   colonne de droite ou sous le diptyque ; axe et libellés lisibles (≥ 0.75 rem).
6. **États** : chargement = squelettes à la forme des blocs (pas un spinner centré) ; **premier lancement sans
   donnée = un seul panneau d'invitation** (« Importez votre premier CV. » + la zone de dépôt), pas six cartes
   vides ; **erreur** (`useDashboard` en échec) = `Alert` `destructive` avec « Réessayer » (`refetch`). Plus de
   phrase d'aide centrée en bas.
7. Un seul helper d'état vide, dans ton périmètre, pour les graphiques (sans `grid-noise`).

## Conserver

`useDashboard` et la forme de ses données ; la redirection après import ; l'info-bulle de la formule du temps
gagné ; le lien vers la page des technos ; recharts via `components/ui/chart.tsx`.
