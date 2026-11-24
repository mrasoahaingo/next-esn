# Brief v2 — Édition du CV

Lis `COMMUN.md`, `v2-COMMUN.md`, `DESIGN.md` § Révision v2, et ton `cv-PLAN.md` v1. Branche `refonte-cv` (déjà à
jour du tronc). Même périmètre qu'en v1. `SectionShell` et `PdfPreview` : API constante, l'agent positionnement
les consomme.

## Vu à l'écran (v1)

En-tête correct. En dessous, le formulaire est posé nu sur le fond : titres « Identité », « Résumé » qui flottent,
champs alignés sur la toile, aucun contour entre les sections ; seule la carte « Aperçu » a une forme. L'ensemble
se lit comme un formulaire d'administration, pas comme un dossier dans une app.

## Direction v2

1. `PageHeader` conservé. La zone d'état de l'extraction devient un **`Panel`** compact (en-tête : icône
   `Sparkles`, « Extraction », compteur « 5/5 » ou « 2/5 », action « Voir le détail » qui déplie ; corps :
   `WorkflowStepList` pendant le flux, la ligne de fin repliée ensuite, `Alert` en échec). Terminé et replié, il
   fait une ligne de 44 px.
2. **Chaque section du dossier est un `Panel`** (`space-y-4`) : Identité (`User`), Résumé (`AlignLeft`),
   Compétences (`Wrench`, compteur « 24 »), Formations (`GraduationCap`, compteur), Expériences (`Briefcase`,
   compteur). En-tête avec l'action de la section à droite (« Ajouter » en `ghost sm` pour formations,
   expériences, compétences ; le curseur de marge en `PanelFooter`). `SectionShell` : en attente = `Panel` avec
   squelettes dans le corps ; en cours = `StatusBadge` `info` `pulse` « En cours » dans l'en-tête du panneau +
   le filet gauche existant sur le corps ; fini = rien. Garde l'API (`status`, `label`, `children`) : le panneau
   et son en-tête peuvent être rendus par `SectionShell` lui-même à partir d'une prop optionnelle nouvelle
   (`title`, `icon`, `count`, `actions`), ou par chaque section ; dans les deux cas, les props existantes
   restent valables pour le positionnement.
3. **Champs** : `Field` / `Input` shadcn, deux colonnes dans le panneau Identité, libellés 12 px ; les listes
   (compétences, formations, expériences) en lignes `divide-y` dans le corps, chaque expérience avec un en-tête
   de ligne (poste, entreprise, dates en mono) et son dépliant.
4. **Aperçu PDF** : `PdfPreview` devient un `Panel` (en-tête : icône `FileText`, « Aperçu », pages en compteur,
   actions plein écran et « Télécharger ») ; collant comme en v1. Sans PDF : `Empty` dans le corps.
5. Toile : la page ne pose plus rien de nu ; `space-y-4` ; `px-6 py-6`.
6. Avant toute donnée : les mêmes panneaux avec squelettes, l'action « Lancer l'extraction » dans l'en-tête.

## Conserver

Tout v1 ; `StatusBadge` pour « Validé » / « Modifications non sauvegardées » / « Enregistré » dans l'en-tête.
