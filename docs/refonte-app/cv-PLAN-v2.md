# Plan v2 — Édition du CV (`/review/[id]`)

Branche `refonte-cv`, même périmètre qu'en v1 (`app/review/[id]/page.tsx`, `app/review/components/**`,
`app/review/loading.tsx`). Loi : `DESIGN.md` § Révision v2 ; brief : `docs/refonte-app/v2-cv.md`. La logique et
les compositions de la v1 restent ; seule la matière change : toile `bg-shell`, un panneau par bloc, pastilles,
compteurs, avatar, jamais de vide.

## Composition retenue

Pleine largeur, `px-4 md:px-6 py-6`, `space-y-4` / `gap-4` entre panneaux, un seul `h1`, une seule action
`default`.

1. **`PageHeader`** (socle, tel quel). Titre : `InitialsAvatar` (lg) + « Prénom Nom » dès que l'identité est
   connue ; sinon « CV en cours d'extraction » / « CV à extraire » / nom du fichier, sans avatar. Description et
   faits inchangés. L'état de sauvegarde devient une `StatusBadge` : `warn` « Modifications non sauvegardées »,
   `ok` « Validé », `neutral` « Enregistré ». Actions inchangées (Valider `default`, Positionner `outline`,
   Sauvegarder / Annuler `ghost`, Supprimer `ghost` icône + `AlertDialog`).
2. **Zone `status`** = `ExtractionProgress` en **`Panel` compact** :
   - en cours : en-tête `Sparkles` · « Extraction » · compteur mono `2/5` · description = phase en cours ·
     à droite `StatusBadge` `info` `pulse` « En cours » + `AiGenerationInfoIcon` ; corps : `WorkflowStepList`
     (unique `aria-live`) ;
   - terminé : **une ligne de 44 px** (en-tête seul, sans filet bas) : « Extraction » · `5/5` · à droite la
     synthèse mono « terminée en 42 s · 5 étapes » (masquée sous `sm`), `Button` `ghost` `sm` « Voir le détail »
     (`aria-expanded`, déplie le `WorkflowStepList` dans un corps), l'icône IA ;
   - échec : en-tête · compteur · `StatusBadge` `err` « Échec » ; corps : `Alert` `destructive` + « Réessayer »
     (`outline` `sm`), puis les étapes ;
   - rien à montrer : `null` (comme en v1).
3. **Diptyque** `lg:grid-cols-12 gap-4` : dossier `lg:col-span-7` (`space-y-4`), aperçu `lg:col-span-5`
   `lg:sticky lg:top-6 lg:self-start`, `lg:max-h-[calc(100svh-7rem)]` (la page est en `py-6`).
4. **Chaque section est un `Panel`**, rendu par la section elle-même via un petit composant partagé
   `CvSectionPanel` (`Panel` + `PanelHeader` + `PanelBody` + `PanelFooter` optionnel) :
   - Identité (`User`) : deux colonnes `sm:grid-cols-2` dans le corps — Prénom | Nom ; Titre (pleine largeur) ;
     E-mail | Téléphone ; Localisation (pleine largeur) ; Années d'expérience | Disponibilité. Libellés 12 px.
   - Résumé (`AlignLeft`) : éditeur Markdown dans le corps ; curseur de marge en `PanelFooter`.
   - Compétences (`Wrench`, compteur = nombre de compétences incluses dans le PDF) : une ligne `divide-y` par
     catégorie (libellé, saisie, pastilles) dans un corps sans padding ; marge en `PanelFooter`.
   - Formations (`GraduationCap`, compteur) : « Ajouter » `ghost` `sm` dans l'en-tête ; lignes `divide-y`
     (`px-4 py-3`) ; vide et éditable = `Empty` avec l'action (l'en-tête ne la répète pas) ; vide en lecture =
     une ligne grise.
   - Expériences (`Briefcase`, compteur) : « Ajouter » dans l'en-tête ; lignes `divide-y`, chacune avec un
     **en-tête de ligne** (poste en 500, entreprise · lieu en gris, dates en mono) + chevron + corbeille, et un
     **dépliant** qui contient tous les champs (poste, entreprise, début, fin, domaine, missions, compétences
     mobilisées, marge). Une nouvelle expérience s'ouvre dépliée (comportement v1 conservé).
   - Statut de section : la page passe `status` à chaque section ; en cours = `StatusBadge` `info` `pulse`
     « En cours » dans l'en-tête + filet gauche `border-l-2 border-primary` sur le contenu du corps + `aria-busy` ;
     fini = rien.
5. **`SectionShell`** : API conservée (`status`, `label`, `children`). Props **optionnelles** nouvelles `title`
   et `icon` : quand `title` est fourni (écran CV), l'état `pending` est un `Panel` avec son en-tête réel et des
   squelettes calmes dans le corps, et `streaming` / `done` rendent `children` tel quel (la section porte son
   propre en-tête et sa pastille). Sans `title` (positionnement), rendu v1 inchangé.
6. **`PdfPreview`** : API conservée (toutes les props existantes, nouvelles props optionnelles seulement) ;
   devient un `Panel` : en-tête `FileText` · titre · compteur « 2 pages » · actions (spinner pendant la
   génération, plein écran `ghost` `icon-sm`, « Télécharger » `outline` `sm`) ; corps sans padding avec
   l'iframe ; sans PDF : `Empty` (icône dans un disque `bg-muted`, titre, une phrase). Mesure de hauteur
   (`ResizeObserver`) et `Dialog` plein écran conservés.
7. **Avant toute donnée** : mêmes cinq panneaux en squelettes (`SectionShell` `pending` avec `title` / `icon`),
   « Lancer l'extraction » en `default` dans l'en-tête, aperçu en `Empty`.
8. **Mouvement** : transitions shadcn ; `animate-pulse` des `Skeleton` et du point de `StatusBadge` seulement.

## Fichiers

Modifier :
- `app/review/[id]/page.tsx` — toile `bg-shell`, `py-6`, `gap-4`, avatar dans le titre, `StatusBadge` dans
  `meta`, `status` passé aux sections, `title` / `icon` passés aux `SectionShell`, tampon ` · v2`.
- `app/review/components/ExtractionProgress.tsx` — panneau compact à trois états, dépliant d'étapes.
- `app/review/components/SectionShell.tsx` — mode panneau optionnel pour `pending`.
- `app/review/components/PdfPreview.tsx` — panneau, compteur de pages, `Empty`.
- `app/review/components/PersonalInfo.tsx`, `Summary.tsx`, `Skills.tsx`, `Education.tsx`, `Experiences.tsx` —
  rendus dans `CvSectionPanel`, listes `divide-y` dans le corps, en-têtes de ligne pour les expériences.

Créer :
- `app/review/components/CvSectionPanel.tsx` — panneau de section (icône, titre, compteur, action, pastille
  « En cours », filet gauche, pied).
- `app/review/components/count-included-skills.ts` + `.test.ts` — fonction pure du compteur de compétences.

Supprimer :
- `app/review/components/SectionHeading.tsx` si plus importé nulle part après la bascule (`FIELD_LABEL_CLASS`
  déménage dans `CvSectionPanel.tsx`) ; vérifié par `grep -rn` avant suppression.

Inchangés : `PdfPreviewSync.tsx`, `loading.tsx`, `candidate-file-name.ts`, `format-extraction-summary.ts`.

## Ce que je retire et pourquoi

- Les `h2` sur filet (`SectionHeading`) : remplacés par les en-têtes de panneau (icône, titre, compteur).
- Les `Badge` `outline` colorés de l'en-tête : remplacés par `StatusBadge` (même pastille partout).
- Le `<details>` de l'extraction terminée : remplacé par l'action « Voir le détail » de l'en-tête du panneau.
- Les champs toujours visibles de chaque expérience : rangés dans le dépliant, derrière un en-tête de ligne
  lisible (poste, entreprise, dates), pour que la liste se lise comme une liste.

## Questions ouvertes (non bloquantes)

- `Empty` de l'aperçu PDF sans action : il n'y a pas d'action utile avant que l'identité soit extraite ; je laisse
  titre + phrase. À trancher à la revue visuelle.
- Le panneau d'extraction replié supprime le filet bas de `PanelHeader` via `className="border-b-0"` (prop
  existante) ; si le coordinateur préfère une prop dédiée, je la consommerai.
- Collant à `top-6` (page `py-6` v2) alors que `DESIGN.md` cite `top-5` (page `py-5` v1) : même règle, nouvelle
  valeur ; à aligner sur le tronc si la toile change de padding.
