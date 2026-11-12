# Rehearsal: visite de la landing (4 scènes)

Composants : `extract-stage.tsx` (01), `mission-stage.tsx` (02), `ranking-stage.tsx` (03),
`email-stage.tsx` (04), montés par `tour-stage.tsx` (bouton « Rejouer »), styles `stage.css`.
Kit copié dans `components/stageshow/kit/` ; seules les pièces utiles sont importées (`kit.ts`).
Les feuilles posées au-dessus des écrans 01 et 02 (`tour-windows.tsx`) restent hors de la
scène (son cadrage reste la fenêtre) et suivent son état par un repère caché lu en `:has()`.

Gold (r14 : filmés par la relecture à froid, `scratchpad/review/gold/`) :
- 01 `upload` + `loading` : le CV papier se soulève, son fichier s'en détache au bord de la
  fenêtre et descend (Fly, 900 ms) ; la zone de dépôt s'allume et son libellé sort avant
  l'arrivée ; le fichier s'y pose et devient la ligne (même géométrie, un seul objet). Puis
  jauge, puis rubriques de haut en bas : la barre part, les mots arrivent ensuite.
- 02 `choreography` + `loading` : niveau en `Roll` ; les deux indispensables ensemble (60 ms),
  puis le souhaité, puis le bonus (en contour) ; chaque passage source se marque dans la
  demande du client ; le point à clarifier, en squelette dès le départ, se résout en dernier.
- 03 `reorder` + `table-edit` : scores (Count et barre sur la même horloge, 700 ms), puis le
  classement une ligne à la fois : la ligne déplacée se soulève (z-index, ombre, 1,02), voyage
  700 ms sur la courbe de trajet ; celle qu'elle passe glisse 320 ms, 200 ms après. Camille
  (en azur, la personne de l'histoire) monte, puis Yanis passe Hugo. La place du haut n'est
  jamais vide.
- 04 `ai-chat` : « Rédaction du brouillon… » et son squelette sortent entièrement (220 ms), puis
  l'e-mail vouvoyé s'écrit mot à mot à sa place (Stream).

Règle de r14 : plus aucun fondu croisé où deux textes se superposent. Statuts et niveau en
`Roll` (kit) ; barre puis mots, pastille vide puis niveau, tiret puis score : la sortie finit
avant l'entrée (`--eg-ss-out`, 140 ms).

Patchs du kit (commentés « Esneo » dans `stage.tsx`) : premier rendu = poster ; le poster reste
tant que l'IntersectionObserver ne s'est pas prononcé ; hors écran, remise au départ invisible
puis lecture quand un quart de la scène est visible ; déjà à l'écran au montage (lien direct),
`data-rewind` : le contenu sort en fondu, revient au départ, rentre en fondu, et la scène joue
(toujours la même lecture, cinq essais sur cinq) ; `autoplay` après « Rejouer » ; option `fluid`.
« Rejouer » : le contenu de la fenêtre sort en fondu (280 ms, la fenêtre reste), la scène est
remontée sur son ouverture, son contenu rentre en fondu (300 ms), puis elle joue.

Mise en page (inchangée) : largeur de la colonne, hauteur fixe en CSS (CLS 0), fenêtre calée à
gauche qui file de 40 px (32 en compact) au-delà du bord droit, pied fondu. Compact sous 30rem
de colonne. En 04, photo recadrée (`object-position` 42 % 38 %) et voile plus dense à partir de
40rem : les visages au-dessus de la fenêtre, l'e-mail d'abord.
Exceptions du kit gardées : `Roll` (largeur), jauge en `clip-path`, coche en
`stroke-dashoffset`, teinte de la pastille (transition de couleur du kit).

Captured (r14) : 1440 et 390, `--states` à 1440 et 390, zooms au ralenti x5, « Rejouer » sur
les quatre scènes, lien direct `/#fonctionnement` ×5, mouvement réduit, sans JavaScript.
Comparaisons avec les images de la relecture : `.media/esneo/apercu/r14/`.

Gate (`film.mjs` de la copie du relecteur, qui centre la scène, avec `film-checks.mjs` qui
reconnaît `@layer stageshow`), 16 films (4 scènes × 1440/390 × planche/`--states`) :
`rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)`

Film :
- `kit override` (`.ss-avatar`, `.ss-check__fill`) → faux positif : Next regroupe le CSS du kit
  sans chemin `/kit/` ; écarté par la reconnaissance de la couche `@layer stageshow`.
- `framing` (feuille dans la scène, gouttières inégales) → la feuille reste hors scène.
- `loose stack` (« À clarifier » au-dessus de son point) → libellé et point en frères.
- `fly size` / `handoff shift` → le vol garde la taille de la ligne d'arrivée.
- Restent, hors gate : `appears with no entrance` et `jump` au tout début de a (remplacement
  du poster par l'ouverture, scène hors écran) ; `vanishes with no exit` du fichier qui vole
  (relais voulu avec la ligne identique) ; `near-empty frames` en c (scores pas encore là) et
  en d (le temps vide voulu entre le squelette et le premier mot, 200 ms).

Consistency : voir le rapport de r14.
Not checked : build de production ; Safari, Firefox, tactile ; lecteurs d'écran au-delà du
nom accessible du bouton.
