---
name: Esneo
description: IA de staffing pour ESN — extraction de CV, analyse de mission, positionnement
colors:
  soot: "#0d0e11"
  soot-2: "#16181c"
  soot-3: "#1e2126"
  paper: "#ffffff"
  paper-2: "#f1f3f6"
  azur: "#3466e6"
  azur-hover: "#2853c9"
  on-soot-soft: "#a6abb4"
  on-paper-soft: "#565c68"
typography:
  display:
    fontFamily: "Hanken Grotesk"
    fontSize: "clamp(2rem, 0.6rem + 5.6vw, 5rem)"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.048em"
  head:
    fontFamily: "Hanken Grotesk"
    fontSize: "clamp(2rem, 1.3rem + 3.2vw, 4rem)"
    fontWeight: 500
  body:
    fontFamily: "Hanken Grotesk"
    fontSize: "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.45
  interface:
    fontFamily: "Geist"
    fontSize: "13–15px"
rounded:
  page: "0"
  interface: "10px"
---

# Design System: Esneo — pages publiques

Deux systèmes coexistent et restent séparés. **L'UI produit** (tout ce qui est derrière la connexion) garde
« Graphite Pro » (`app/globals.css`, jetons shadcn). **Les pages publiques** — landing `/`, `/sign-in`, `/sign-up`,
404 — suivent le système ci-dessous, entièrement sous la classe `.es` (`app/esneo-site.css`) : rien ne fuit vers
l'app.

## Historique

1. *Dossier* (papier, ruban rouge) — jugé trop administratif.
2. *Kinetic* (dégradé violet → magenta → ambre, capitales italiques) — générique.
3. *Deep Signal* (fond quasi noir, halo bleu, puces flottantes, illustration réseau) — non commité ; copie de
   sauvegarde locale dans `.media/wip-deep-signal/`.
4. **« Le produit en action »** (2026-11-11, ce document) — sur le modèle de la refonte `legal-advisor-juris-gps`
   (ADR-0084) : direction tirée au sort par design-taste-frontend (`product-performs`, seed 1220771710), photos
   éditoriales générées, planches d'inspiration « Site of the Day » générées (`docs/media/esneo/prompts/inspi/`),
   jury de trois juges (direction artistique, acheteur ESN, UX/accessibilité) itéré jusqu'à 9/10.

## Thèse

Le logiciel convainc quand il fait son travail devant vous. Au lieu de décrire les fonctions, la page montre de vrais
fragments de l'interface Esneo (attribut `data-ui`), avec un contenu crédible, qui réagissent. Autour, des photos du
monde des ESN (La Défense, le point staffing, le premier jour chez le client) disent pour qui c'est fait.

**L'idée.** Le dossier de compétences — le document que toute ESN envoie pour gagner une mission — devient la forme
de la page : chaque chapitre s'ouvre sur un **onglet de dossier** (trapèze à 45°, `clip-path`), décalé de deux
colonnes d'un chapitre à l'autre comme les dossiers suspendus d'un tiroir (`data-tab` 0 → 5, le dernier à droite ;
trois positions calées sur téléphone). Le même gabarit découpe les photos qui portent les fragments (héros, quatre
temps). C'est la seule décoration du site.

**L'élément vivant.** Dans le héros, un positionnement tel que l'IA le propose (Camille Durand, tech lead Java,
84/100) : le visiteur valide ou écarte chaque point (point fort, écart, à clarifier), « Générer le CV adapté » reste
bloqué tant que tout n'est pas relu, puis pendant la génération. C'est le contrat produit en un geste : l'IA propose,
vous validez, pas de doublon.

## Couleurs

Palette du produit (Graphite Pro), à la place du « soot and lime » tiré : graphite en ouverture et en clôture,
blanc au milieu, azur comme seule couleur d'action et d'un champ plein (le contrat de l'IA).

| Jeton (`--es-*`) | Valeur | Rôle |
|---|---|---|
| `soot` / `soot-2` / `soot-3` | `#0d0e11` · `#20242c` · `#2b3039` | fond graphite, lignes du tableau des statuts, tons |
| `paper` / `paper-2` | `#ffffff` · `#f1f3f6` | sections du milieu, panneaux des preuves |
| `azur` / `azur-hover` | `#3466e6` · `#2853c9` | boutons, ligne ouverte, scène épinglée, champ du contrat, tuile d'action |
| `on-soot-soft` / `on-paper-soft` | `#a6abb4` · `#565c68` | texte secondaire uniquement |
| statuts | vert `#17734b`, ambre `#e9b54c`, rouge `#d0412c`, bleu pâle `#c9d6f7` | Validé, À valider, Échec, À clarifier |

## Typographie

**Hanken Grotesk** 400/500 pour toute la page (`--font-hanken`, `app/layout.tsx`), sans gras, casse de phrase.
Les fragments `data-ui` gardent **Geist**, la police du produit, à leur vraie taille (13–15 px).
Échelle : `--es-small` 13–14, `--es-body` 17–19, `--es-lead` 20–26, `--es-sub` 26–36, `--es-head` 32–64,
`--es-display` 32–80 (héros). Titres : interlettrage −0,045 à −0,048 em, deux lignes au plus à toutes les largeurs.

## Composition

Grille de 12 colonnes, marges `clamp(20px, 2,8vw, 40px)`, sections espacées de 120–200 px.

| Section | Composition |
|---|---|
| Héros | titre colonnes 1–9 ; texte et action colonnes 1–4 ; scène photo en onglet de dossier colonnes 5–12, débordant à droite, fragment de positionnement dessus |
| Intro | phrase d'ouverture, puis planche éditoriale : photo du point staffing pleine largeur portant deux fragments (nouvelle demande client, positionnements de la semaine), deux portraits et quatre faits courts ; mention « générées par IA » |
| Statuts | tableau d'affichage pleine largeur, une ligne ouverte en azur, cliquable |
| Fonctionnement | quatre temps à gauche, fragment épinglé sur la photo du bureau (onglet) qui change d'état ; sur téléphone, une seule bande photo en onglet puis chaque étape avec sa carte sur papier, en décalé alterné |
| Fiabilité | mosaïque : grande case (photo + dossier de compétences) et quatre petites preuves ; carrousel horizontal sur téléphone |
| Contrat | champ azur : titre de chapitre, quatre groupes titrés (fait / ne fera jamais / arrêtez / gagnez) |
| Questions | index des questions à gauche, réponse en grand à droite (accordéon sur téléphone) |
| Action | tuile azur (titre, action, « sans carte bancaire ») et photo portant le fragment « CV adapté et e-mails prêts » |
| Pied | le mot-symbole esneo pleine largeur, puis une ligne |

## Règles

- Aucun surtitre, aucune pastille, pas de monospace, pas de numérotation 01/02, pas de filets ni de boîtes
  cerclées, pas de dégradé (sauf le voile neutre sous le texte des pages d'authentification), pas d'ombre au repos.
  À l'intérieur de `data-ui`, les conventions du produit s'appliquent (bordures 1 px, rayons 7–10 px, ombre du
  fragment posé sur la photo).
- Boutons : rectangles à angles droits, un seul remplissage (azur ; graphite sur la tuile azur).
- Aucune preuve sociale inventée (PRODUCT.md) ; consultants, missions et membres affichés sont des exemples.
- Photos : `components/site/images.ts`, prompts `docs/media/esneo/` ; personnes fictives, légendées.

## Mouvement

Signature : la photo du héros s'ouvre en volet (`clip-path`, 1,1 s) pendant qu'elle se pose (échelle 1,12 → 1).
Apparitions décalées par section (`components/site/reveal.tsx`, rien n'est masqué sans script), léger travelling
des photos de la planche, retours sur chaque commande. `prefers-reduced-motion` : mouvements coupés, contenu
intact.
