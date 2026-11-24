# Plan — Édition du CV (`/review/[id]`)

Branche `refonte-cv`, périmètre `app/review/[id]/page.tsx`, `app/review/components/**`, `app/review/loading.tsx`.
Loi : `DESIGN.md` § L'établi ; brief : `docs/refonte-app/cv.md`.

## Composition retenue

Pleine largeur (`px-4 md:px-6 py-5`), un seul `h1`, une seule action `default`.

1. **`PageHeader`** (socle, consommé tel quel)
   - `title` : « Prénom Nom » dès que l'identité est connue ; sinon « CV en cours d'extraction » (pendant le
     flux) ou « CV à extraire » (statut `uploaded`, avant toute donnée).
   - `description` : « CV importé le {date courte fr} ».
   - `meta` : `nom-du-fichier.pdf · 2 min 14 s de session` (durée = puce de temps actuelle, info-bulle « Extraction IA /
     Édition » conservée) · « Enregistré » quand rien n'est à sauvegarder.
   - `actions`, de droite à gauche en importance : **Valider le CV** (`default`) · Positionner le CV (`outline`,
     `Tooltip` « Attendez la fin de l'extraction » quand désactivé) · Sauvegarder (`ghost`, seulement si `isDirty`) ·
     Annuler l'extraction (`ghost`, pendant le flux) · Supprimer (`ghost` icône, `AlertDialog` existant).
   - Un seul `Badge` `outline` d'état dans `meta` : « Modifications non enregistrées » (warning) ou « Validé »
     (success) ; jamais les deux.
   - `status` : voir 2.
2. **Zone `status`** = `ExtractionProgress` refait (même fichier, nouvelles props plus simples) :
   - en cours : une ligne « {phase en cours} » + compteur mono `2/5` + `AiGenerationInfoIcon` (gelé, à droite),
     puis `WorkflowStepList` (inchangé) ; `aria-live` porté par `WorkflowStepList`, pas de doublon ;
   - terminé : une ligne mono « Extraction terminée en 42 s · 5 étapes » + `<details>` « Détail des étapes » avec
     le `WorkflowStepList` ;
   - erreur : `Alert` `destructive` (message de l'étape ou de l'API) + bouton « Réessayer » (`outline` `sm`) ;
     c'est l'unique bandeau d'erreur de l'écran (celui de la colonne gauche remonte ici) ; les étapes restent
     visibles dessous.
   - Plus de barre de progression néon, plus de bandeaux de phase colorés, plus de pastilles par étape.
3. **Diptyque asymétrique** `lg:grid-cols-12 gap-6` : formulaire `lg:col-span-7`, aperçu `lg:col-span-5`
   `lg:sticky lg:top-16 lg:self-start`, hauteur `lg:max-h-[calc(100vh-5rem)]` avec défilement interne de l'iframe.
   Sous `lg` : une colonne, formulaire puis aperçu.
4. **Sections sur le papier** (`space-y-8`) : `h2` 0.9375 rem / 600 sur `border-b border-border pb-2`, action de
   section (« Ajouter une formation ») en `ghost` `sm` à droite du `h2`. Titres : Identité · Résumé · Compétences ·
   Formations · Expériences. Libellés de champs 0.75 rem, casse de phrase, en français (Prénom, Nom, Titre,
   E-mail, Téléphone, Localisation, Années d'expérience, Disponibilité ; Diplôme, École, Année ; Poste,
   Entreprise, Domaine, Début, Fin, Mission). Listes (formations, expériences) en `divide-y divide-border`.
5. **`SectionShell`** (même API `status | label | children`) : `pending` = `h2`-like `Skeleton` + 3 lignes
   `Skeleton` calmes (`animate-pulse` shadcn, pas de balayage) ; `streaming` = `border-l-2 border-primary pl-4` et
   le mot « En cours » (0.75 rem, `muted-foreground`) sous un `aria-label` accessible = `label` ; `done` = rien.
6. **`PdfPreview`** (même API, aucune prop) : la seule carte (`bg-card border border-border rounded-xl`) ; en-tête
   fin `px-4 py-2` : `h2` « Aperçu » 0.9375 rem, à droite `ghost` `icon-sm` plein écran (`aria-label`) et
   « Télécharger » `outline` `sm` ; iframe ; état vide = une phrase `text-sm text-muted-foreground` centrée ;
   chargement = `Spinner` discret en coin, pas de voile. `Dialog` plein écran conservé.
   Mesure JavaScript de la hauteur : **conservée** (c'est elle qui donne la hauteur réelle du document pour le
   défilement de la page sous `lg`) mais bornée par le conteneur sticky au-dessus de `lg`.
7. **Avant toute donnée** (`!cvData && !isLoading`) : plus d'écran centré ; le même établi vide — `PageHeader`
   « CV à extraire » (ou « Chargement… » en description tant que `candidateData` n'est pas là), action
   « Lancer l'extraction » / « Relancer l'extraction » en `default`, Supprimer en `ghost`, zone `status` avec
   l'erreur persistée s'il y en a une, et deux colonnes de squelettes (cinq `SectionShell` `pending` à gauche,
   carte d'aperçu vide à droite).
8. **Mouvement** : rien d'autre que les transitions shadcn ; `animate-pulse` des `Skeleton` uniquement.

## Fichiers

Modifier :
- `app/review/[id]/page.tsx` — tampon, `PageHeader`, actions, grille 7/5, état vide en établi.
- `app/review/components/ExtractionProgress.tsx` — zone d'état en trois états ; `getSectionStatus` inchangé.
- `app/review/components/SectionShell.tsx` — trois rendus calmes, même API.
- `app/review/components/PdfPreview.tsx` — carte unique, en-tête fin, état vide texte.
- `app/review/components/PersonalInfo.tsx`, `Summary.tsx`, `Skills.tsx`, `Education.tsx`, `Experiences.tsx` —
  en-tête de section partagé, libellés français, retrait des cartes de verre et des couleurs nommées
  (`amber`, `accent` violet), listes sur filets.

Créer :
- `app/review/components/SectionHeading.tsx` — `h2` sur filet + action optionnelle (petit composant partagé des
  cinq sections).
- `app/review/components/format-extraction-summary.ts` + `.test.ts` — fonction pure
  `formatExtractionSummary({ durationMs, stepCount })` → « Extraction terminée en 42 s · 5 étapes ».
- `app/review/components/candidate-file-name.ts` + `.test.ts` — `candidateFileName(originalFileUrl)` (nom de
  fichier sans le préfixe horodaté), pour la ligne `meta`.

Supprimer :
- `app/review/components/Strengths.tsx` — importé nulle part (`grep -rn Strengths` ne renvoie que le fichier).

Inchangés : `PdfPreviewSync.tsx`, `loading.tsx` (déjà `route-loading`, conforme à DESIGN.md).

## Ce que je retire et pourquoi

- Barre haute en verre, icône lumineuse, pastille « CV Builder », titre en dégradé : doublon du fil d'Ariane et
  tics interdits (« Ce qui disparaît »).
- Barre de progression néon + compteur + bandeaux de phase + pastilles : deux à trois indicateurs pour le même
  travail ; un seul `WorkflowStepList` reste, avec une ligne de phase.
- Balayage et point pulsant de `SectionShell`, badge coché « fini » : le contenu présent est la preuve.
- Cartes de verre par section et `h2` 1.125 rem : un seul niveau de carte, celle de l'aperçu.
- Badges `amber`/`emerald` : jetons `warning`/`success`.
- Titres et libellés anglais, placeholders « Degree », « New Role », « Company » : français, casse de phrase.
- `hover:border-accent`, `text-accent` violet, `bg-overlay/*` : jetons shadcn seulement.

## Questions ouvertes (non bloquantes)

- `Skeleton` shadcn utilise `animate-pulse` (opacité, 2 s) : je le considère comme « calme » au sens de DESIGN.md
  (pas de balayage), sans y toucher (`components/ui/**` gelé).
- La zone sticky de l'aperçu : `top-16` suppose la hauteur de l'en-tête de coque ; à ajuster si la coque change.
