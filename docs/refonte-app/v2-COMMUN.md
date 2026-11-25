# Refonte UI produit — v2 : règles communes (complète `COMMUN.md`)

Tout `COMMUN.md` reste valable (lecture, périmètres, interdits, déroulé, vérifications, commits, communication),
avec les changements ci-dessous. Lis d'abord **`DESIGN.md` § « Révision v2 — de « vide » à app moderne »** : elle
remplace « Composition » et « Un seul niveau de carte » de la v1.

## Pourquoi une v2

L'utilisateur a regardé la v1 fusionnée et l'a trouvée **vide** : blocs sans contour sur fond uni, listes nues,
titres qui flottent, zones creuses. Il veut « une app moderne ». La v2 garde la logique et les compositions de la
v1 et change la **matière** : toile teintée, panneaux délimités, cartes KPI, tableaux, avatars, pastilles de
statut, compteurs, densité, et plus jamais de vide.

## Socle v2 déjà sur `refonte-app-ui` (à consommer, pas à modifier)

- `components/app/panel.tsx` — `Panel`, `PanelHeader` (icône, titre, compteur, description, actions),
  `PanelBody`, `PanelFooter`.
- `components/app/kpi-card.tsx` — `KpiCard` (libellé, valeur mono, sous-ligne, icône grise).
- `components/app/status-badge.tsx` — `StatusBadge` (`tone` ok / warn / err / info / neutral, `pulse`).
- `components/app/initials-avatar.tsx` — `InitialsAvatar`, `initialsOf()`.
- Toujours : `PageHeader`, `scoreTone()`, jetons `success` / `warning`, `font-mono`.

Si un de ces composants te manque une prop, demande-la par courrier `question` (le coordinateur l'ajoute sur le
tronc, tu fusionnes). Ne les modifie pas toi-même.

## Branches et fusion

Tu continues **sur la même branche** que la v1 (`refonte-<écran>`), déjà à jour du tronc (le coordinateur a
fusionné `refonte-app-ui` dedans avant de te lancer ; vérifie avec `git log --oneline -3`). Même périmètre de
commit (`refonte-<écran>`), sujets préfixés « v2 » dans le corps ou le sujet quand c'est utile. Fin : courrier
`merge_ready` au coordinateur, comme en v1.

## Serveur de dev : non

**Ne lance aucun serveur de dev** (l'utilisateur en a trouvé deux de trop). Le contrôle visuel est fait par le
coordinateur, dans un navigateur connecté, sur le tronc à `http://localhost:3100`, après fusion. Si tu veux
vérifier un rendu, raisonne sur les classes ; si tu as un doute de contraste ou de débordement, dis-le dans le
compte rendu.

## Ce qui change dans « fini »

En plus des critères v1 : plus aucun bloc nu sur la toile ; aucune zone creuse à 1440 × 900 avec un seul élément
dans une liste ; tous les statuts via `StatusBadge` ; tous les candidats avec `InitialsAvatar` ; tous les blocs
dans `Panel` ; critique pré-émission mise à jour dans le tampon (ajoute ` · v2`).
