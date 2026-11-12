# La lampe

*Tour 2 — direction de l'utilisateur : verre façon iOS, sombre d'abord, lumière, animé.*

**Thèse.** Le soir, la paperasse attend sous la lampe ; Esneo la change en verre, et vous rendez la journée
aux gens.

## L'idée de scène

Une nature morte de nuit, filmée comme une publicité produit : un bureau en noyer dans un bureau éteint, une
lampe de laiton qui fait une flaque de lumière chaude, une pile de CV et de fiches de mission imprimés. Au-dessus
du papier flottent des dalles épaisses de **Liquid Glass** : le travail de l'IA. Chaque feuille se soulève et
devient verre (le CV devient fiche structurée, la fiche de mission devient analyse, les deux fusionnent en
positionnement). Le verre émet une faible lumière azur qui retombe sur le papier. À la fin, le bureau est libre,
et la dernière image est une photo de jour : une poignée de main au café. La page passe de la nuit à la
rencontre.

## Matière et lumière

- Dalles épaisses : `backdrop-filter: blur(20px) saturate(150%)`, fond `rgba(255,255,255,0.06–0.1)`, double
  arête (chaude côté lampe, azur de l'autre), ombre de contact douce sur le bureau.
- Deux lumières réelles : la lampe (chaude, `#f2a65a`, justifiée par la scène) et l'azur émis par le verre (la
  lumière de l'action). Le reste est noir : la retenue fait le luxe.

## Palette

| Rôle | Valeur |
|---|---|
| Obscurité | `#07080b`, `#0d0e11` |
| Lumière chaude (la lampe, seule source chaude) | `#f2a65a` |
| Action, lumière du verre | azur `#3466e6` ; lueur `#6f94ff` |
| Verre | `rgba(255,255,255,0.06–0.1)` |
| Texte | `#f5f7fa` ; secondaire `#a6abb4` |
| Statuts | `#2fa36b` · `#e9b54c` · `#e0533c` |

## Typographie

- **Instrument Serif** (Google Fonts, 400) pour les titres : grand, serré (−0,02 em), deux lignes au plus. Le
  serif sur fond nuit donne le ton « film » et sophistiqué.
- **Inter** (Google Fonts) pour le texte et l'interface : 400 à 17–19 px, 450 et +0,01 em sur le verre.
- Fragments d'interface en Geist. Boutons en capsule : azur plein, verre clair.

## Copie

- **Titre :** « Le papier pour l'IA. Les gens pour vous. »
- **Sous-titre :** « CV à reformater, fiches de mission à décortiquer, dossiers de compétences à monter :
  Esneo prépare tout, vous relisez et validez. »
- **Actions :** « Essayer sur vos CV » · « Voir la démonstration » · « Se connecter », « Créer un compte ».
- **Chapitres :** « De la feuille au verre. » (« L'IA lit le CV. », « L'IA décortique la mission. »,
  « L'IA propose un positionnement. ») · « L'IA propose, vous validez. » · « Rien ne tourne en silence. » ·
  « Bientôt » · « Questions » · fin : « Laissez le papier. Gardez les gens. »

## Composition

| Section | Composition |
|---|---|
| Héros | photo plein cadre du bureau de nuit ; trois dalles de verre au-dessus de la pile (la plus proche nette : Camille Durand, Expériences, Compétences, Langues, CV extrait · Validé ; derrière : fiche de mission ; au fond : positionnement 84/100) ; titre serif en haut à gauche dans le noir |
| De la feuille au verre | trois plans rapprochés sous la lampe : la feuille posée, son double de verre au-dessus, avec le contenu extrait ; le troisième plan fusionne les deux dalles en une carte azur |
| Le contrat | « L'IA propose, vous validez. » et la carte de positionnement éclairée de l'intérieur (Point fort / Point faible / À clarifier, Valider / Écarter, « Générer le CV adapté ») |
| Statuts | une étagère de verre posée sur le bureau : quatre étiquettes Validé, À valider, En cours 3/5, Échec (cause + « Relancer ») |
| Bientôt | au bout du bureau, hors de la lumière de la lampe, deux dalles éteintes et givrées : « Prospection » et « Branchez votre propre Claude », avec le mot « Bientôt ». Ce qui n'existe pas encore n'est littéralement pas éclairé |
| Questions | accordéon de verre |
| Action | photo de jour, poignée de main au café ; vitre claire : « Laissez le papier. Gardez les gens. » et les deux boutons ; pied : mot-symbole pleine largeur, mention photos IA |

## L'animation signature : « de la feuille au verre »

1. **La lampe s'allume (0–0,9 s).** La photo part sombre ; un calque « lampe allumée » monte en opacité sur
   900 ms (courbe douce, pas de clignotement) ; le titre apparaît ensuite (opacité + 20 px, ressort
   `bounce 0`, `0,4 s`).
2. **La feuille se lève (défilement).** Pilotée par le défilement dans le héros : la feuille du dessus de la
   pile se soulève et se change en verre. En pratique : une courte vidéo pré-rendue (ou une suite d'images)
   lue au rythme du défilement, sur laquelle se superpose la vraie dalle de verre en HTML qui prend le relais
   à la fin de la transformation (même position, même taille).
3. **Le verre suit le pointeur (ordinateur).** L'arête spéculaire et le reflet intérieur des dalles suivent le
   pointeur (variables CSS mises à jour au `pointermove`, lissées par un ressort `bounce 0`, `0,3 s`) ; les
   dalles s'inclinent de 2° au plus (X et Y animés séparément, §3 de la skill). Sur téléphone, l'inclinaison
   suit le gyroscope seulement si l'utilisateur l'autorise ; sinon une lente dérive de lumière.
4. **Le bureau se libère (fin du héros).** La pile disparaît, une dalle reste dans la lumière : « CV adapté et
   e-mails prêts · Validé ».
5. **Chapitres suivants.** Chaque dalle « se pose » en entrant (échelle 0,96 → 1 avec le flou qui monte en
   même temps, ressort à léger rebond `bounce 0.15`).

**Mouvement réduit** : la lampe est allumée d'emblée, pas de vidéo ni d'inclinaison ; la transformation est
remplacée par un fondu enchaîné feuille → verre de 200 ms. **Transparence réduite** : dalles opaques `#16181c`
avec bordure. **Contraste renforcé** : fond plein, bordure nette.

## Photos et médias nécessaires

1. Le bureau de nuit vide de verre (lampe allumée et éteinte, même cadrage), 16:9 et recadrage portrait.
2. Trois plans rapprochés de feuilles sous la lampe (CV, fiche de mission, les deux côte à côte).
3. La transformation feuille → verre : 2–3 s de vidéo (ou 24 images) générée et retouchée.
4. La photo de jour : poignée de main au café, personnes fictives.

## Ce qui serait difficile à intégrer fidèlement

- **La feuille qui devient verre.** C'est l'image la plus forte des maquettes et la plus difficile : impossible
  en CSS. Il faut une vidéo pré-rendue (cohérente avec la photo : même lumière, même cadrage) ou un shader
  WebGL. La vidéo pèse (≈ 1–2 Mo en AV1/H.265) et doit se caler sur le défilement sans saccade
  (`requestVideoFrameCallback`, images clés serrées).
- **La lumière azur qui tombe sur le papier.** Dans la maquette, le verre éclaire la pile. En vrai, c'est dans
  la photo (une version « éclairée » à générer) ou un calque en mode de fusion `screen` placé à la main, qui
  ne suivra pas exactement les dalles si elles bougent.
- **Coût de `backdrop-filter`.** Les dalles floutent une photo sombre : peu de différence visible pour un coût
  réel. Sur téléphone, mieux vaut un verre « peint » (fond semi-opaque + arêtes) sans `backdrop-filter`, et
  garder le vrai flou pour la navigation et la carte de positionnement.
- **Contraste.** Le texte blanc sur la photo très sombre est facile, mais la flaque de la lampe est claire :
  aucun texte au-dessus. Le serif fin d'Instrument Serif doit rester à 40 px et plus.
- **Réfraction.** Comme pour toutes les variantes : la déformation du verre des maquettes n'existe en CSS que
  dans Chromium (`backdrop-filter: url()`) ; ailleurs, arêtes et reflets seulement.
- **Deux polices de page** (Instrument Serif + Inter) en plus de Geist pour les fragments.
