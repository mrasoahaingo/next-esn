# Rehearsal: visite de la landing (4 scènes)

Composants : `extract-stage.tsx` (01), `mission-stage.tsx` (02), `ranking-stage.tsx` (03),
`email-stage.tsx` (04), montés par `tour-stage.tsx` (bouton « Rejouer »), styles `stage.css`.
Kit copié dans `components/stageshow/kit/` ; seules les pièces utiles sont importées (`kit.ts`).

Gold :
- 01 `upload` + `loading` : zone de dépôt qui devient une ligne de fichier avec jauge, puis
  rubriques en squelette à leur géométrie, résolues de haut en bas, statut sur sa pastille.
- 02 `choreography` + `loading` : niveau qui change dans sa case, points clés en squelette
  résolus dans l'ordre, leur niveau un temps après (dépendance), point à clarifier en dernier.
- 03 `reorder` + `table-edit` : les scores roulent un à un (Count), puis, tous connus, les lignes
  glissent à leur rang ; la confiance arrive en dernier. Un tiret tant qu'un score n'existe pas.
- 04 `ai-chat` : « Rédaction du brouillon… » en squelette, puis l'e-mail vouvoyé s'écrit mot à
  mot à sa place (Stream), question de disponibilité ; « Brouillon à relire » à la fin.
- Golds lus dans le skill, pas filmés : le serveur d'aperçu du skill demande un `npm install`
  dans le dossier du skill, qu'on ne modifie pas.

Changé par rapport aux golds : look « Verre de nuit » (jetons mappés dans `stage.css`, Geist,
azur seul accent), pas de curseur, `play="once"` à l'entrée à l'écran, poster = état final.
Patchs du kit (commentés « Esneo » dans `stage.tsx`) : premier rendu = poster (serveur, sans
script, avant lecture) ; le poster reste tant que l'IntersectionObserver ne s'est pas prononcé
(hors écran : remise au départ invisible puis lecture à l'entrée ; déjà à l'écran au montage :
poster gardé, sauf `autoplay` après « Rejouer ») ; option `fluid` (la page dimensionne la scène
en CSS, pas d'échelle). La scène est marquée `data-ui="window"` (interface, pas section).

Mise en page : la scène prend la largeur de la colonne, hauteur fixe en CSS, identique au rendu
serveur et après hydratation (CLS 0). Fenêtre calée à gauche, qui file de 40 px (32 en compact)
au-delà du bord droit (seule de la surface vide passe la coupe), pied fondu par masque.
Compact (colonne ≤ 30rem : téléphone, colonnes de 1024) : requête de conteneur, pas de second
script ; marges serrées, lignes plus basses, jauges et sous-titres retirés, hauteur ≤ 352 px
(une fenêtre de bureau visible reste au moins carrée).
Mouvement : opacité et transform seulement, rien ne se remet en page (pas de Collapse ni de
Roll : fondus croisés dans des cases de taille fixe). Exceptions du kit gardées : jauge en
`clip-path` (Meter), coche en `stroke-dashoffset`, pastille de statut en States (léger flou).

Beats : 01 dépôt 0,5 s → envoi 1 s → 5 rubriques (0,43 s chacune) → prête, environ 6 s.
02 niveau 0,6 s → 4 points (0,56 s chacun) → à clarifier, environ 4 s.
03 trois scores (0,65 s) → classement 0,35 s après → confiance, environ 4 s.
04 squelette 1,4 s → 37 mots à 55 ms → badge, environ 4 s. Puis l'état final reste.

Captured : 1440 et 390 (`--width`), thème sombre seulement, mouvement réduit (poster, pas de
bouton), sans JavaScript (poster dans le HTML, pas de bouton).

Gate (`film.mjs --select '.eg-shot--<k> .ss-fit' --gate`, 1440 et 390, les 8 films) :
`rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)`

Film :
- `kit override` (phone, island, status) → faux positif : Next regroupe le CSS du kit et de
  l'app dans un même fichier sans chemin `/kit/`. Copie locale de `film-checks.mjs` qui
  reconnaît le CSS du kit à sa couche `@layer stageshow` ; plus aucune ligne.
- `framing: narrower than tall` à 390 → hauteurs compactes ≤ 352.
- `uneven inset` (barre de titre entière dans la scène) → la fenêtre file au-delà du bord droit.
- `uneven inset` (ligne de point sans niveau) → pastille vide à la taille du niveau dès le
  squelette.
- `empty pane` (02 et 04 au départ) → squelettes à la géométrie du contenu.
- `jump` des chiffres du poids du fichier → taille statique (connue au dépôt).
- `near-empty frames` (03 au départ, scores pas encore là) → reste : c'est l'état « en cours ».
- Le film agrandit la fenêtre à la hauteur de la page : le héros (100svh) grandissait avec et
  repoussait la scène. Copie locale de `film.mjs` qui fige le héros à 900 px (`FILM_CSS`).

Consistency (tasteskill, 1440 et 390, passe complète) : loop-pause, scroll-reveal, reduced-motion,
hidden-content passent. Restent sur les scènes : `cut-text` sur les bandes de chiffres de Count
(masquées par conception), `focus-visible` sur le premier « Rejouer » (anneau de 2 px vérifié à
la main, au clavier ; l'outil capture pendant le défilement doux de la page), `spill` de la
fenêtre de l'écran 04 sous la photo au téléphone (composition d'avant r13, réduite de 394 à 258 px).

Assumptions : rechargée déjà défilée sur la visite, la scène visible garde son poster (rien ne
recule sous les yeux) ; « Rejouer » la joue.
Unresolved : « Layout checks remain deferred » (note manuelle, 01 et 04 à 1440) ; « half-pixel
glyph » sur l'icône de dépôt à 1440 (avertissement, hors liste du gate).
Not checked : revue « fresh eye » (references/review.md) par un autre regard ; Safari et
Firefox ; lecteurs d'écran au-delà du nom accessible du bouton ; golds filmés côte à côte.
