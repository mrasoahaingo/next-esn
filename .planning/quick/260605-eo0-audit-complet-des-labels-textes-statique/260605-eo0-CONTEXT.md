# Quick Task 260605-eo0: Audit complet des labels/textes statiques du template CV - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Task Boundary

Audit complet des labels/textes statiques du template CV pour vérifier que tous sont traduits en anglais quand la langue est 'en' — section COMPÉTENCES et toutes les autres sections.

</domain>

<decisions>
## Implementation Decisions

### Périmètre de l'audit
- **Audit complet bout-en-bout** : labels statiques codés en dur (titres de sections, sous-labels) + vérifier que les champs extraits sont en anglais + ce que voit l'utilisateur sur le PDF généré final
- Couvre : CV_LABELS, buildCvDossierLayoutSpec, composants PDF React, tout texte hardcodé dans les templates

### Comportement attendu
- Identifier tous les labels manquants ou non traduits
- Fixer les manques dans le même task (pas seulement lister)

### Claude's Discretion
- Ordre de priorité des fixes si plusieurs problèmes trouvés
- Structure exacte des corrections (CV_LABELS vs inline)

</decisions>

<specifics>
## Specific Ideas

- La section COMPÉTENCES est le point de départ signalé par l'utilisateur (labels Technologies, Soft skills, Langues, etc.)
- CV_LABELS existe déjà dans le codebase — c'est la source de vérité pour fr/en
- Le fix cv.transcription (260605-e30) vient d'être appliqué — l'extraction devrait maintenant produire du texte anglais

</specifics>
