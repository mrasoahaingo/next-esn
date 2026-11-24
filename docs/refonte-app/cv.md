# Brief — Édition du CV (`/review/[id]`)

Lis d'abord `docs/refonte-app/COMMUN.md` et `DESIGN.md` § L'établi. Périmètre : `app/review/[id]/page.tsx`,
`app/review/components/**`, `app/review/loading.tsx`. Branche `refonte-cv`, périmètre de commit `refonte-cv`.
Tu possèdes `SectionShell.tsx` et `PdfPreview.tsx`, que l'écran de positionnement consomme : **tu peux changer
leur rendu, pas leur API** (props existantes gardées ; des props optionnelles peuvent s'ajouter).

## Ce que l'écran fait (à préserver)

Regarder l'IA extraire un CV (workflow `/api/extract`, cinq étapes, `useWorkflowStream`), puis corriger les données
structurées à côté de l'aperçu PDF en direct. **Action principale : « Valider le CV »** (statut prêt) ; action
suivante : « Positionner le CV ». Hooks : `useCandidate`, `useUpdateCandidate`, `useDeleteCandidate`,
`useCancelWorkflow`, `useWorkflowStream`, `useCvBuilderStore`, `useTemplateStore` + `fetchTemplateConfig`,
`useSessionTimer`, `usePdfPreview` (via `PdfPreviewSync`), `computeCvStepStates`, `formatStepSummaryLine`.

État actuel (inventaire du 2026-11-24) :

1. Barre haute `glass-panel` : icône carrée `neon-ring`, pastille « CV Builder », `h1` « Edition du CV » /
   « Extraction en cours... » en `title-gradient` ; à droite six contrôles et plus : Annuler (pendant
   l'extraction), corbeille (`AlertDialog`), puce de temps avec info-bulle, badges « Modifications non
   sauvegardées » / « Prêt », Sauvegarder, Valider le CV, Positionner le CV (info-bulle quand désactivé).
2. Dans la barre, `ExtractionProgress` : bandeaux de phase (« Transcription du PDF… », « Lecture du document
   Word… »), barre de progression néon avec compteur n/5 et `AiGenerationInfoIcon`, `WorkflowStepList` ou
   puces par étape ; une fois fini, `<details>` « Détail des étapes d'extraction ».
3. Diptyque `lg:grid-cols-2` : à gauche, bandeau d'erreur avec « Réessayer », puis cinq `SectionShell`
   (attente = squelette balayé ; en cours = halo + point qui pulse + libellé ; fini = badge coché) : « Personal
   Info », « Professional Summary » (éditeur markdown + `Slider` d'espacement), « Compétences », « Formations »,
   « Experiences » (dépliables). À droite, `PdfPreview` : carte « Aperçu PDF », plein écran, « Télécharger »,
   iframe, état vide « Le PDF apparaîtra ici », `Dialog` plein écran. La colonne PDF n'est pas sticky : la
   hauteur de l'iframe est calculée.
4. Avant toute donnée : écran centré « Lancer l'extraction » / « Chargement... », annuler, supprimer.

Tics à retirer : titre en dégradé, icône lumineuse, pastille-surtitre ; toutes les sections en carte de verre
`p-6 rounded-2xl` avec `h2` souligné ; balayage et point pulsant ; six contrôles serrés dans l'en-tête ; titres en
anglais ; `animate-shimmer`, `animate-ping`, `neon-ring`, `glass-panel`, `title-gradient`.

## Direction

L'écran est **le CV sur l'établi** : à gauche le dossier qu'on corrige, à droite ce qu'il devient, au-dessus
l'état de l'extraction au même endroit du début à la fin.

1. **En-tête** (`PageHeader`) : titre = le nom du candidat dès qu'il est connu (sinon « CV en cours
   d'extraction ») ; description = « CV importé le {date} » ; `meta` = nom du fichier · durée de session (puce de
   temps actuelle, en mono, info-bulle conservée). Actions : « Valider le CV » (`default`) ; « Positionner le
   CV » (`outline`, info-bulle quand désactivé) ; « Sauvegarder » (`ghost`, visible seulement quand il y a des
   modifications, sinon le libellé « Enregistré » en `meta`) ; « Annuler l'extraction » (`ghost`, pendant
   l'extraction) ; « Supprimer » en `ghost` icône, derrière l'`AlertDialog` existant. L'état « Modifications
   non sauvegardées » / « Prêt » devient un seul `Badge` `outline` à côté du titre ou dans `meta`, pas deux.
2. **Zone `status`** : `ExtractionProgress` refait : une ligne (phase en cours en texte, compteur « 2/5 » en
   mono) + `WorkflowStepList` (inchangé) ; pas de barre néon ; terminé = une ligne mono « Extraction terminée
   en 42 s · 5 étapes » et le `<details>` conservé ; erreur = `Alert` `destructive` avec le message d'étape et
   « Réessayer » (le bandeau d'erreur actuel remonte ici, il n'y en a qu'un).
3. **Diptyque asymétrique** `lg:grid-cols-12` : formulaire `lg:col-span-7`, aperçu `lg:col-span-5`
   `lg:sticky lg:top-16` avec une hauteur de `calc(100vh - …)` au lieu de la mesure JavaScript si elle devient
   inutile (garde `usePdfPreview` et `PdfPreviewSync`). Sous `lg`, une colonne : formulaire puis aperçu.
4. **Sections sur le papier**, pas en cartes : `h2` 0.9375 rem / 600 sur un filet `border-b`, `space-y-8` entre
   sections. Titres en français : « Identité », « Résumé », « Compétences », « Formations », « Expériences ».
   `SectionShell` refait : attente = `Skeleton` calme ; en cours = `border-l-2 border-primary pl-4` et le mot
   « En cours » en 0.75 rem ; fini = rien de plus. Même API.
5. **Aperçu PDF** (`PdfPreview`) : la seule carte de l'écran (`bg-card border rounded-xl`), en-tête fin
   (« Aperçu », boutons `ghost` icône plein écran et « Télécharger » en `outline` `sm`), iframe, état vide en
   texte simple. `Dialog` plein écran conservé.
6. **Avant toute donnée** : plus un écran centré mais le même établi, vide : en-tête avec le titre « CV à
   extraire », l'action « Lancer l'extraction » en `default`, et deux colonnes de squelettes.
7. Densité : corps 0.875 rem, champs shadcn `Input` / `Textarea` / `Field`, libellés 0.75 rem ; le `Slider`
   d'espacement du résumé reste, en fin de section.

## Conserver

Tout ce qui est listé dans « hooks » ; le flux d'extraction et ses étapes ; la sauvegarde et son état « dirty » ;
la suppression avec `AlertDialog` ; le plein écran et le téléchargement du PDF ; l'éditeur markdown ;
`AiGenerationInfoIcon` (gelé, à placer dans la zone d'état).
