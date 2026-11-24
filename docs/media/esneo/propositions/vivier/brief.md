# Le vivier

> **Tour 1 — rejeté par l'utilisateur.** Conservé pour mémoire, plus développé (voir `../README.md`).

**Thèse.** Le capital d'une ESN, c'est son vivier : la page en est la planche-contact, et chaque demande client
la réordonne sous vos yeux.

## L'idée

Sur cette page, **le vivier de consultants de l'ESN** devient **une planche-contact** : des dizaines de tuiles
identiques, toutes au même petit corps, où rien n'est mis en avant tant qu'aucune demande client n'est choisie.
Choisir une demande, c'est voir trois tuiles passer en azur avec leur score et remonter en tête : le
positionnement rendu visible comme un tri. La page est composée en Geist, la police du produit : elle parle la
langue de l'app.

Test du concurrent : l'ATS d'un recruteur classe des candidats qui postulent à une offre ; l'ESN, elle, place
des consultants qu'elle a déjà sur des demandes qui arrivent. Le vivier réordonné par demande est propre au
métier.

Familles de la bibliothèque : `contact-sheet` (tout montrer, petit, en ordre ; le volume est le propos) avec la
rigueur de `dense-tiles` (tuiles pleines, jamais cernées, quatre tailles au plus).

## Palette (d'accompagnement, « ardoise »)

| Rôle | Hex |
|---|---|
| Fond | `#dde2e8` (ardoise claire) |
| Tuiles, sections blanches | `#ffffff` |
| Encre | `#0d0e11` |
| Champ profond | `#273041` (ardoise) |
| Clôture | `#0d0e11` (graphite) |
| Tuiles choisies, boutons, champ du contrat | `#3466e6` (azur) |
| Statuts, en points dans les tuiles | `#17734b` · `#e9b54c` · `#d0412c` |

Justification : le gris des cloisons et du tableau du point staffing ; les tuiles blanches comme des fiches
posées dessus. Plus froid et plus « bureau » que le `#f1f3f6` actuel. Une tuile estompée change de fond, pas de
couleur de texte, pour garder 4,5:1.

## Typographie

- **Geist** (Google Fonts, variable 100–900), une seule famille : titres en 500, 7–9 vw, −0,05 em, deux lignes
  au plus ; tout le reste en 400 à une seule petite taille (14–15 px), paragraphes en 17–19 px.
- C'est la police des fragments du produit : la page et l'app ne font plus qu'un. Hanken disparaît.

## Composition

| Section | Composition |
|---|---|
| Héros (ardoise) | titre géant deux lignes colonnes 1–9 ; phrase + « Essayer sur vos CV » colonnes 10–12 ; moitié basse bord à bord : bandeau « Demande client : Tech lead Java · assureur, La Défense », puis la planche (5 rangées × 10 tuiles, 8 px d'écart) ; trois tuiles azur en tête (84, 79, 71), la première ouverte en fiche de positionnement (Valider / Écarter) |
| L'IA extrait (blanc) | une tuile agrandie en fiche complète : miniature du CV, puis les champs structurés avec leur statut |
| Analysez la mission (ardoise) | une grande tuile « demande client » (points clés classés) et deux petites : « À clarifier », « Point de vigilance » |
| Rien ne tourne en silence (blanc) | la planche en mode statut (nom, point de couleur, mot) ; une tuile rouge ouverte avec la cause et « Relancer » |
| Bande photo | grande tuile photo du point staffing du lundi + tuile ardoise profonde portant une phrase |
| Contrat (azur) | « L'IA propose, vous validez. » en quatre colonnes |
| Questions (ardoise) | les questions en tuiles, une ouverte en grand |
| Action (graphite) | « Voyez Esneo sur vos propres CV. », bouton azur ; pied : mot-symbole pleine largeur |

## L'élément vivant

Le sélecteur de demande client, avec trois demandes d'exemple (Tech lead Java · assureur ; Data engineer ·
enseigne retail ; DevOps Kubernetes · énergéticien). À chaque choix, la planche se réordonne, les trois
meilleures tuiles passent en azur avec leur score, les autres s'estompent ; un clic sur une tuile azur ouvre sa
fiche de positionnement à relire (Valider / Écarter). Sur téléphone : planche en deux colonnes, sélecteur
segmenté, les trois proposées en tête. Sans script : la planche figée sur la première demande.

## Mouvement

Signature, « le tri » : les tuiles glissent vers leur nouvelle place (FLIP ou View Transitions, 500 ms,
12 ms de décalage par tuile) et l'azur remplit les trois tuiles choisies. Entrée : la planche apparaît rangée
par rangée (opacité + 12 px). `prefers-reduced-motion` : changement direct, sans glissement.

## Photos nécessaires

Une ou deux : le point staffing du lundi (la photo actuelle `staffing.webp` convient) et, au besoin,
l'ingénieur d'affaires sur l'esplanade (`esplanade.webp`). Les tuiles et fiches `data-ui` comptent dans le
plancher d'images.

## Ce qui serait difficile à intégrer fidèlement

- **Densité.** La maquette montre une cinquantaine de tuiles nettes ; en vrai, du texte à 12–13 px dans les
  tuiles échoue au contrôle de taille et gêne la lecture. Sur téléphone, 50 tuiles font une page sans fin :
  il faut n'en montrer qu'une douzaine.
- **Réordonnancement accessible.** L'ordre du DOM doit suivre l'ordre visuel (lecteurs d'écran), annoncer
  « 3 consultants proposés » (`aria-live="polite"`), garder le focus. View Transitions avec repli.
- **Vérité produit, à vérifier avant d'intégrer.** Si Esneo ne calcule pas d'office le score de tout le vivier
  pour une mission (les positionnements se lancent par paire consultant × mission), la démonstration doit
  montrer des positionnements déjà lancés, pas un tri instantané du vivier entier.
- **Règle « pas de rangées de cartes identiques ».** La planche est une donnée (`data-ui`), mais un juge peut
  la lire comme une grille de cartes : le contraste avec les titres géants et la bande photo doit être net.
- **Une cinquantaine de noms fictifs** à écrire, variés et plausibles, sans personne réelle.
- **Geist en police de page** : risque que la landing ressemble à l'app (« tableau de bord ») ; les titres
  géants et la photo font contrepoids.
