# Le surligneur

> **Tour 1 — rejeté par l'utilisateur.** Conservé pour mémoire, plus développé (voir `../README.md`).

**Thèse.** Un positionnement, c'est une demande client et un CV qu'on lit côte à côte, surligneur en main :
Esneo tient le surligneur, vous gardez le dernier mot.

## L'idée

Sur cette page, **les deux documents que tout ingénieur d'affaires lit côte à côte, la demande client et le CV
du consultant,** deviennent **une double page imprimée**, et le travail de l'IA devient **un surlignage azur
avec ses notes dans la marge**. La page a deux voix typographiques : les documents humains en serif, la lecture
de l'IA en Geist (la police du produit). On voit au premier regard qui a écrit quoi, ce qui est exactement la
promesse « L'IA propose, vous validez ».

Test du concurrent : un outil d'analyse de CV ou un ATS montre des champs extraits, pas la confrontation
demande / CV. Le face-à-face, c'est le geste du positionnement en ESN.

Familles de la bibliothèque design-taste-frontend : `page-is-the-object` (l'objet : la double page annotée) et
`editorial-report` (axe strict, texte de lecture, colonnes de marge).

## Palette (strictement celle du produit)

| Rôle | Hex |
|---|---|
| Fond « bureau » sous les feuilles | `#f1f3f6` |
| Feuilles, sections du milieu | `#ffffff` |
| Encre, champ de clôture | `#0d0e11` |
| Surlignage actif, boutons, champ du contrat | `#3466e6` |
| Surlignage passif (seule teinte dérivée, azur ≈ 20 %) | `#d6e0fa` |
| Statuts, dans les notes seulement | `#17734b` Validé · `#e9b54c` À valider · `#d0412c` Échec |

Contrastes : graphite sur `#d6e0fa` ≈ 15:1 ; blanc sur azur ≈ 4,8:1 (AA, boutons de 16 px et plus).

## Typographie

- **Newsreader** (Google Fonts, variable `opsz` 6–72, `wght` 200–800) : titres en 500, taille optique 72,
  interlettrage −0,03 em, deux lignes au plus ; texte des documents en 400, 18–20 px, interligne 1,55.
- **Geist** (Google Fonts) 400/500, 13–15 px : notes de marge, boutons, navigation et fragments `data-ui`.
- Le mot-symbole « esneo » ne change pas.

Cela remplace la règle actuelle « une seule police de page (Hanken Grotesk) » : c'est à faire valider par
l'utilisateur.

## Composition (12 colonnes, marges 40 px)

| Section | Composition |
|---|---|
| Héros (gris) | titre serif colonnes 1–8, deux lignes ; phrase + « Essayer sur vos CV » colonnes 1–4 ; double page colonnes 5–12, débordant en bas : demande client · gouttière (84/100, notes, Valider / Écarter) · CV |
| L'IA extrait (blanc) | une feuille de CV ; chaque surlignage devient, dans la marge, un champ structuré (Expériences, Compétences, Langues, Durée totale) avec son statut |
| Analysez la mission (blanc) | la demande client composée en grand (24–28 px, serif) sur toute la largeur, comme une page de livre ; notes de marge Indispensable / Souhaité / Bonus / À clarifier / Point de vigilance |
| Photo pleine largeur | mains, surligneur azur, demande imprimée (texte illisible), légendée « générée par IA » |
| Un score qui s'explique (gris) | le face-à-face complet, le score 84/100 dans la gouttière |
| Rien ne part sans vous (blanc) | registre des documents (vrai tableau) : statut en point + mot, une ligne ouverte avec sa cause et « Relancer » |
| Contrat (azur) | « L'IA propose, vous validez. » en quatre colonnes ; les lignes de « Vous arrêtez » barrées comme une correction d'épreuve |
| Questions (blanc) | questions dans la marge gauche, réponse en grand serif à droite |
| Action (graphite) | « Voyez Esneo sur vos propres CV. », « Essayer sur vos CV », « Se connecter » ; pied : mot-symbole pleine largeur |

## L'élément vivant

Dans le héros, le visiteur clique (ou atteint au clavier) un passage surligné de la demande client : sa preuve
s'allume dans le CV (surlignage actif) et la note correspondante de la gouttière prend le focus avec
« Valider » / « Écarter ». Quatre notes ; « Générer le CV adapté » ne se débloque qu'une fois tout relu, puis se
bloque pendant la génération (pas de doublon). Sur téléphone, un sélecteur à deux onglets « Demande » / « CV »
et la note qui se glisse sous le passage. Sans script : surlignages fixes et notes listées sous le texte.

## Mouvement

Signature, « le surligneur passe » : chaque surlignage se dessine de gauche à droite quand sa section entre
(`background-size` d'un `<mark>`, 450 ms, décalage 60–90 ms), les notes de marge suivent ; le trait des lignes
barrées se dessine de la même façon. `prefers-reduced-motion` : surlignages affichés d'emblée.

## Photos nécessaires

1. Mains tenant un surligneur azur au-dessus d'une demande imprimée, bureau près d'une fenêtre (texte illisible).
2. Ingénieur d'affaires au téléphone, la demande imprimée à la main, bureau haussmannien.
3. Facultatif : le point staffing (la photo actuelle `staffing.webp` convient).

Les fragments `data-ui` (feuilles, notes, registre) comptent dans le plancher d'images de la skill.

## Ce qui serait difficile à intégrer fidèlement

- **Notes alignées sur chaque surlignage.** La maquette montre des notes au niveau exact des phrases, dans les
  deux documents. En CSS, il faut le positionnement par ancre (`anchor-name` / `position-anchor`, disponible
  dans Chrome et Safari récents ; à vérifier pour Firefox à la date de l'intégration) ou une mesure en JS
  (`ResizeObserver`), qui reste fragile au zoom du texte. Repli : la note dans le flux, sous son paragraphe.
- **Face-à-face exact.** Pour qu'une preuve tombe en face de son exigence, il faut écrire les textes d'exemple
  sur mesure et vérifier à chaque largeur. Sur téléphone, le face-à-face disparaît au profit des onglets :
  l'idée y perd de sa force.
- **Surlignage sur plusieurs lignes.** `box-decoration-break: clone` (préfixe `-webkit-` pour Safari) tient
  le rendu, mais l'animation se dessine sur toutes les lignes en même temps, pas ligne après ligne comme un vrai
  surligneur. Le séquentiel demande de découper le texte en lignes en JS.
- **Beaucoup de texte de document.** La maquette remplit les feuilles ; en vrai, il faut des extraits courts,
  sinon la page devient lourde à lire.
- **Deux polices de page** (Newsreader + Geist) au lieu de Hanken seule : changement de la règle du jury.
- Accessibilité : `<mark>` relié à sa note (`aria-describedby`), le statut jamais porté par la seule couleur.
