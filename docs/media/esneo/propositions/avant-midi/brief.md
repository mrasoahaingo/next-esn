# Avant midi

> **Tour 1 — rejeté par l'utilisateur.** Conservé pour mémoire, plus développé (voir `../README.md`).

**Thèse.** Dans une ESN, une demande client se gagne dans la matinée : la page est cette matinée, de 9 h 02 à
midi, et l'heure énorme dit où en est chaque traitement.

## L'idée

Sur cette page, **la matinée d'un ingénieur d'affaires** (la demande client qui tombe à 9 h 02, les profils à
proposer avant que la concurrence ne réponde) devient **une horloge géante épinglée et une page dont la lumière
passe de l'aube au plein jour**. L'heure est le seul ornement, et elle porte la promesse du produit : chaque
étape est horodatée, rien ne tourne en silence, on sait toujours où on en est.

Test du concurrent : la réactivité sur la demande client est la douleur propre à l'ESN (l'ATS d'un recruteur
interne ne court pas contre la montre de l'appel d'offres) ; les heures sont les statuts horodatés d'Esneo.

Familles de la bibliothèque : `pinned-poster` (l'heure tient sa place pendant que les panneaux défilent) et
`colour-chapters` (chaque chapitre a son champ de couleur, choisi dans la lumière du sujet).

## Palette (d'accompagnement)

| Rôle | Hex |
|---|---|
| Aube, ouverture | `#1b2436` (bleu d'aube) sur `#0d0e11` (graphite) |
| Milieu de matinée | `#c9d5e8` (ciel d'hiver) |
| Fin de matinée | `#f1f3f6` puis `#ffffff` |
| Midi : champ du contrat, et tous les boutons | `#3466e6` (azur) |
| Statuts, dans les fragments seulement | `#17734b` · `#e9b54c` · `#d0412c` |

Justification : la lumière d'un matin de novembre en haut d'une tour de La Défense (lever du soleil vers 8 h).
Tout reste froid et bleuté, donc cohérent avec l'azur de l'app ; pas de violet, pas de dégradé : les champs
se succèdent à bords francs. Contrastes : blanc sur `#1b2436` ≈ 15:1 ; graphite sur `#c9d5e8` ≈ 13:1.

## Typographie

- **Archivo** (Google Fonts, variable `wdth` 62–125, `wght` 100–900), une seule famille :
  - l'horloge en 800 à la chasse la plus étroite (`font-stretch: 62%`), 20–28 vw, chiffres tabulaires
    (`tabular-nums`, à vérifier dans le fichier) et « h » en bas de casse : « 9 h 02 » ;
  - titres en 500 à chasse normale, −0,03 em, deux lignes au plus ; texte en 400, 17–19 px.
- Fragments `data-ui` en Geist, comme dans l'app.

## Composition

| Section | Composition |
|---|---|
| Héros (aube) | photo plein cadre (bureau en haut d'une tour, aube bleue, ingénieure d'affaires) ; titre deux lignes en haut à gauche ; phrase + « Essayer sur vos CV » ; « 9 h 02 » géant en bas à gauche, rogné par le bord ; fragment « Nouvelle demande client · Analyse en cours 2/5 » posé sur la photo |
| Séquence épinglée (3 écrans, jamais plus de 6) | l'heure reste à gauche et change : 9 h 20, 10 h 05, 11 h 40 ; à droite, la même scène photo de plus en plus claire, portant le fragment de l'étape (L'IA extrait / Analysez la mission / Positionnez) ; le fond passe de l'aube au ciel d'hiver puis au gris |
| Midi (azur) | « 12 h 00 » géant en blanc, « L'IA propose, vous validez. », quatre colonnes |
| Ce matin, rien ne s'est perdu (blanc) | journal horodaté (vrai tableau) : heure, événement, statut ; l'échec avec sa cause et « Relancer » |
| Questions (blanc) | questions à gauche, réponse en grand à droite |
| Action (plein jour) | « Voyez Esneo sur vos propres CV. », bouton azur ; pied : mot-symbole graphite pleine largeur |

## L'élément vivant

La frise de la matinée : sous l'horloge, une règle des heures (8 h → 12 h) que le visiteur fait glisser au
pouce (un `input type="range"` stylé, ou les heures en boutons). L'heure, le fragment et la lumière changent
d'état : demande reçue, analysée, CV extraits, positionnement à relire, validé, CV adapté et e-mails prêts.
À l'étape « Vous validez », la frise s'arrête tant que le visiteur n'a pas relu les points du positionnement :
le contrat du produit en un geste. Sans script : la liste des étapes horodatées.

## Mouvement

Signature : l'horloge qui avance, chiffres qui roulent verticalement d'une heure à la suivante, pilotés par le
défilement ; changement de couleur du fond dans la séquence épinglée ; au chargement, la photo du héros
s'éclaircit très lentement (un second calque plus clair qui monte en opacité sur 6 s : l'aube se lève).
`prefers-reduced-motion` : heures fixes par section, pas de roulement.

## Photos nécessaires

Une série de quatre photos du **même coin de bureau** en haut d'une tour de La Défense : aube bleue (8 h 50),
premier soleil rasant (9 h 40), lumière grise (10 h 30), plein jour (11 h 50), avec la même ingénieure
d'affaires, fictive. En plus : une salle de réunion pour le journal, si besoin.

## Ce qui serait difficile à intégrer fidèlement

- **La série photo cohérente** (même pièce, même cadrage, quatre lumières) est le point le plus dur : la
  maquette peut la montrer, la génération réelle demandera d'éditer une photo maîtresse par référence, avec
  plusieurs essais et sans garantie. Repli : une seule photo et un calque de couleur, nettement moins beau.
- **Heure épinglée lisible au-dessus de photos changeantes** : il faut tester le contraste à chaque panneau ;
  `mix-blend-mode: difference` casserait l'azur. Plus sûr : garder l'heure dans une colonne sans photo.
- **Couleur pilotée par le défilement** : `animation-timeline: view()` (Chrome, Safari récent ; Firefox à
  vérifier), repli `IntersectionObserver`.
- **Archivo à chasse variable** : fichier plus lourd (axes `wdth` + `wght`), à sous-ensembler (chiffres et
  latin).
- **Téléphone** : l'horloge épinglée en haut (16–18 vw) ne doit pas manger l'écran ; la séquence devient des
  sections empilées, chacune avec son heure en tête.
- **Lecture « promesse de délai »** : les heures sont un récit d'exemple, pas un délai garanti. À légender
  (« Un lundi, par exemple ») pour l'acheteur ESN, et aucune durée chiffrée dans les titres.
- Accessibilité : l'horloge est décorative (`aria-hidden`), chaque étape a un vrai titre ; la frise se pilote
  au clavier.
