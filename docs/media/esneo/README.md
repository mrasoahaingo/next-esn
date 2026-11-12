# Médias des pages publiques Esneo

Photos de la landing, des pages de connexion / inscription et de la page 404 (refonte du 2026-11-11, puis
direction « Verre de nuit » du 2026-11-12, voir `DESIGN.md`). Méthode reprise de la refonte
`legal-advisor-juris-gps` (ADR-0084) : prompts figés et versionnés, génération par l'AI Gateway, revue à l'œil de
chaque image, finals en WebP.

| Fichier final (`public/media/esneo/`) | Prompt (`prompts/`) | Variante retenue | Usage |
|---|---|---|---|
| `hero-droite.webp` (2000×1125) | `hero-droite.txt` | 2 sur 2 | héros de la landing : la fenêtre de positionnement posée sur la photo, assombrie (légende « Avant Esneo : 21 h, encore des CV à ressaisir. ») |
| `face-a-face.webp` (1024×1536) | `fin.txt` | 1 sur 2 | visite, écran 4 (CV adapté et e-mails) : le face-à-face que l'outil libère. Brut `.media/esneo/fin-1.png`, converti sans retouche (1024 px, WebP q80) |
| `staffing.webp` (1536×1024) | `staffing.txt` | 1 sur 2 | section Fiabilité : le tableau de suivi posé sur le point staffing |
| `connexion-cour.webp` (1024×1536) | `connexion-b.txt` | 1 sur 2 | `/sign-in` (cadrée au bureau pour laisser voir le CV papier) |
| `inscription.webp` (1024×1536) | `inscription.txt` | 2 sur 2 | `/sign-up` |
| `couloir.webp` (2000×1125) | `couloir.txt` | 2 sur 2 | page 404 |
| `og-hero.jpg` (1200×630) | `hero.txt` | 1 | carte de partage (`app/opengraph-image.tsx`), tirée de la première scène du héros |

Supprimées le 2026-11-12 avec l'ancien système des pages publiques, car plus aucune page ne les utilisait :
`hero.webp`, `esplanade-hd.webp`, `consultant-hd.webp`, `dossier-anonyme.webp`, `fin-ecran.webp`, `bureau-hd.webp`.
Leurs prompts restent dans `prompts/` pour mémoire.

Chemins, dimensions et textes de remplacement : `components/site/images.ts` (source unique), sauf
`face-a-face.webp`, déclarée dans `components/landing/landing.tsx`. Une image remplacée change de nom de fichier :
`/_next/image` et le CDN la mettent en cache par URL.

## Règles

- Modèle : **GPT Image 2.6 Flare** (`openai/gpt-image-2.6-flare`) via l'AI Gateway Vercel, qualité `high`.
- Chaque prompt se termine par le bloc commun `prompts/_style.txt` : photo éditoriale réaliste du monde des ESN à
  Paris (La Défense, bureaux haussmanniens, sièges de clients), étalonnage graphite et azur, fin d'automne sans
  neige, peau réelle, **aucun texte lisible**, aucun logo, aucune enseigne.
- Personnes **fictives et anonymes** : jamais nommées, jamais présentées comme des clients, des utilisateurs ou
  l'équipe. Chaque photo porte sa légende (« Photographie générée par IA, personne(s) fictive(s) »), et le pied
  de page le rappelle.
- Chaque image est relue à l'œil (mains, texte fantôme, architecture) avant d'être retenue.

## Outil

**Par défaut : kie.ai.** `outils/kie-image.mjs` (mêmes options, clé `KIE_API_KEY` dans `.env.local`, modèles
`gpt-image-2-6/sunburst-text-to-image` et `gpt-image-2-6/flare-text-to-image`, `--size` converti au rapport kie.ai
le plus proche, `--resolution 2K` par défaut). Les crédits de l'AI Gateway servent d'abord aux appels LLM de
l'application ; l'outil Gateway reste le repli quand kie.ai n'a plus de crédit.

Repli : `outils/gw-image.mjs`, depuis la racine du dépôt ; la clé `AI_GATEWAY_API_KEY` est lue par Node dans `.env.local` :

```bash
node --env-file=.env.local docs/media/esneo/outils/gw-image.mjs \
  --prompt-file docs/media/esneo/prompts/hero.txt --size 2048x1152 --n 2 --out .media/esneo/hero
```

Bruts PNG et journal `prompts.jsonl` dans `.media/esneo/` (ignoré par git). Conversion en WebP q80, 2000 px au
plus, avec `sharp`. Le 2026-11-11 : 35 photos et 10 planches d'inspiration générées, environ 10 s chacune.
