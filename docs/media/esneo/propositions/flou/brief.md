# Le flou se lève

*Tour 2 — direction de l'utilisateur : verre façon iOS, sombre d'abord, lumière, animé.*

**Thèse.** La paperasse, c'est la vitre givrée entre vous et les gens : chaque document qu'Esneo traite fait
reculer le givre, jusqu'à ce que la rencontre soit nette.

## L'idée de scène

Derrière toute la page, une vraie photo : un chasseur de têtes et un candidat face à face, dans le café d'un
hall d'hôtel au crépuscule, suspensions ambrées, ville à l'heure bleue derrière la vitre. Devant, une grande
vitre de **Liquid Glass sombre et givrée** porte le texte et la paperasse (CV à reformater, fiche de mission,
dossier de compétences). Le flou n'est pas une décoration : il *est* la paperasse. Quand l'IA a fini et que
vous avez validé, le verre s'éclaircit et les visages apparaissent. La page raconte la promesse sans la dire :
moins de papier, plus de face-à-face.

## Matière et lumière

- Verre sombre : fond `rgba(13,14,17,0.45–0.6)`, `backdrop-filter: blur(28px) saturate(160%)`, arête
  spéculaire de 1 px en haut à gauche (blanc à 35 %), reflet intérieur léger, ombre portée douce sous les
  cartes. Les petites cartes sont plus légères (moins de flou, plus claires) que la grande vitre : la matière
  dit la hiérarchie (skill apple-design §12).
- Deux lumières, toutes deux dans la scène : l'ambre des suspensions (chaude, dans la photo) et l'azur qui
  émane des cartes de verre (froide, l'action). Aucun halo flottant.

## Palette

| Rôle | Valeur |
|---|---|
| Nuit, graphite | `#07080b`, `#0d0e11` |
| Verre | `rgba(13,14,17,0.45)` à `rgba(255,255,255,0.08)` |
| Action, lumière froide | azur `#3466e6` ; lueur `#6f94ff` (seulement là où le verre éclaire) |
| Lumière chaude (photo seulement) | ambre `#f2a65a` |
| Texte | `#f5f7fa` ; secondaire `#a6abb4` |
| Statuts | `#2fa36b` Validé · `#e9b54c` À valider · `#e0533c` Échec |

## Typographie

**Inter** (Google Fonts, variable avec taille optique) : titres en taille optique « display », 500,
interlettrage −0,03 em, deux lignes au plus ; texte en 400, 17–19 px. Sur le verre, texte un peu plus gras
(450) et légèrement espacé (+0,01 em) pour rester lisible (vibrance). Fragments d'interface en Geist, comme
dans l'app. Boutons en capsule : azur plein pour l'action, verre clair pour la seconde.

## Copie

- **Titre :** « Moins de paperasse. Plus de face-à-face. »
- **Sous-titre :** « Esneo lit vos CV, décortique les fiches de mission et prépare les dossiers de
  compétences. Vous gardez le temps qui compte : vos candidats, vos consultants, vos clients. »
- **Actions :** « Essayer sur vos CV » (azur) · « Voir comment ça marche » (verre) · navigation « Se
  connecter », « Créer un compte ».
- **Chapitres :** « Ce que vous ne ferez plus. » · « L'IA lit le CV. » · « L'IA décortique la mission. » ·
  « L'IA propose un positionnement. » · « L'IA propose, vous validez. » · « Rien ne tourne en silence. » ·
  « Bientôt » · « Questions » · fin : « Reprenez du temps pour les gens. »

## Composition

| Section | Composition |
|---|---|
| Héros | photo plein cadre sous la vitre givrée ; bande nette sur le tiers droit ; titre, sous-titre et deux boutons sur le verre à gauche ; trois petites cartes de verre (CV extrait · Validé, Analyse en cours 3/5, Dossier · À valider) à la frontière du net et du givré ; navigation en capsule de verre flottante |
| Ce que vous ne ferez plus | trois feuilles de verre givré déployées en éventail : reformater un CV, décortiquer une fiche de mission, refaire un dossier de compétences — « Esneo s'en charge, vous relisez. » |
| Fonctionnement (épinglé) | la photo à droite, un peu plus nette à chaque étape ; à gauche une seule grande vitre qui change d'état : CV lu, mission décortiquée, positionnement (Camille Durand · 84/100, Point fort / Point faible / À clarifier, Valider / Écarter) |
| Le contrat | « L'IA propose, vous validez. » et la carte azur « Générer le CV adapté » → « CV adapté et e-mails prêts à relire » |
| Statuts | une vitre large : quatre lignes, point de couleur + mot, l'échec avec sa cause et « Relancer » |
| Bientôt | deux vitres qui restent givrées, le mot « Bientôt » en tête : « Prospection » ; « Branchez votre propre Claude » (serveur MCP, connecteur) |
| Questions | accordéon de verre |
| Action | la photo entièrement nette et chaude, une vitre claire porte « Reprenez du temps pour les gens. » et les deux boutons ; pied : mot-symbole pleine largeur, mention « Photographies générées par IA, personnes fictives. » |

## L'animation signature : « le givre recule »

1. **Chargement (0–1,2 s).** La photo apparaît entièrement givrée. Le titre monte (opacité + 24 px, ressort
   amorti `bounce 0`, `0,4 s`). Les trois cartes de paperasse entrent par la droite l'une après l'autre
   (décalage 80 ms), avec un ressort à léger rebond (`bounce 0.2`, `0,4 s`) et leur flou qui passe de 0 à sa
   valeur en même temps que l'échelle passe de 0,96 à 1 : elles se *matérialisent* au lieu d'apparaître.
2. **Défilement (héros → fonctionnement).** Le givre recule de droite à gauche, piloté par le défilement :
   la bande nette s'élargit, les cartes affichent leur progression (Extraction 2/5 → Validé). Le flou n'est
   pas animé : deux versions de la photo, l'une floutée à l'avance, l'autre nette, et un masque
   (`clip-path` / `mask-image`) qui avance. Seuls `transform`, `opacity` et le masque bougent.
3. **Validation (geste du visiteur).** Dans la carte de positionnement, « Valider » réagit à l'appui
   (échelle 0,97 au `pointerdown`). Une fois les trois points relus, la carte se rétracte en une petite
   pastille de verre qui file vers un dock en bas de l'écran (animation FLIP, ressort `bounce 0`, origine à
   la carte, chemin symétrique si on rouvre). « Générer le CV adapté » reste bloqué tant que tout n'est pas
   relu, puis pendant la génération (pas de doublon).
4. **Fin.** Plus de givre : les deux personnes sont nettes, le dock contient « CV · Validé », « Mission ·
   Validé », « Positionnement · Validé ».
5. **Pointeur (ordinateur).** L'arête spéculaire des cartes suit légèrement le pointeur (variables CSS
   `--lx`, `--ly` dans un `radial-gradient` masqué sur le bord), comme le verre d'iOS qui suit l'inclinaison.

**Mouvement réduit** (`prefers-reduced-motion`) : pas de défilement piloté ni de vol vers le dock ; trois
états en fondu enchaîné de 200 ms (givré, mi-net, net) déclenchés à l'entrée des sections ; le contenu est
intact. **Transparence réduite** (`prefers-reduced-transparency`) : vitres opaques `#16181c`, plus de flou.
**Contraste renforcé** : fond quasi plein et bordure 1 px nette.

## Photos nécessaires

1. Le café au crépuscule, recruteur et candidat face à face (21:9 pour le bureau, recadrage portrait pour le
   téléphone) ; sa version floutée est calculée à la construction (`sharp`), pas dans le navigateur.
2. Facultatif : un second moment humain pour la fin (poignée de main), si la même photo lasse.

## Ce qui serait difficile à intégrer fidèlement

- **Le flou qui recule.** Animer `backdrop-filter: blur()` coûte une re-rastérisation à chaque image et saccade
  sur mobile. D'où la solution prévue : photo pré-floutée + photo nette + masque animé. Rendu très proche, mais
  ce n'est plus un vrai verre qui floute ce qui passe dessous.
- **Coût de `backdrop-filter` sur mobile.** Chaque vitre floutée force un rendu hors écran. Au-delà de deux ou
  trois couches visibles, ou sur une couche plein écran pendant le défilement, les Android d'entrée de gamme
  décrochent. Règles : trois couches visibles au plus, flou ≤ 24 px sur téléphone, la grande vitre du héros
  en image pré-floutée plutôt qu'en `backdrop-filter`.
- **Contraste du texte sur le verre.** La photo a des zones très claires (les suspensions) : le texte blanc
  doit garder 4,5:1 sur le pire pixel, ce qui impose une teinte minimale (≈ 55 % de noir) sous le texte et
  un placement du titre loin des lampes. À mesurer sur la vraie photo, pas sur la maquette.
- **La réfraction et le « lentillage » de Liquid Glass.** Les maquettes montrent des bords qui déforment la
  lumière. En CSS, seule la piste `backdrop-filter: url(#filtre-svg)` (`feDisplacementMap`) s'en approche,
  et elle ne marche que dans Chromium. Ailleurs : arête spéculaire et reflet intérieur, sans déformation.
- **Performance du héros.** Grande photo (LCP) + verre + police variable : AVIF, `priority`, sous-ensemble
  latin, et pas de script lourd avant l'affichage.
- **Défilement piloté.** `animation-timeline: view()` (Chromium, Safari récent) avec repli
  `IntersectionObserver` ; jamais de détournement du défilement.
