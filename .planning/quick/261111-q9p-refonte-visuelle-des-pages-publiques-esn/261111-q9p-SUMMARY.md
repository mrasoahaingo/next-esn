---
quick_id: 261111-q9p
status: complete
date: 2026-11-12
---

# Quick 261111-q9p — Refonte visuelle des pages publiques Esneo

## Livré
- Landing `/` refaite (direction « The product performs », design-taste-frontend seed 1220771710) : fragments
  d'interface vivants (relecture d'un positionnement avec Valider/Écarter et génération verrouillée, tableau des
  statuts, quatre temps épinglés sur photo, mosaïque des preuves, contrat de l'IA, FAQ) ; onglets de dossier en
  escalier ; graphite + azur du produit ; Hanken Grotesk ; mot-symbole pleine largeur ; OG image.
- `/sign-in`, `/sign-up` (photo légendée, Clerk sans filets, en-tête photo sur téléphone), 404 avec photo.
- 35 photos GPT Image 2.6 générées via l'AI Gateway (13 retenues) + 10 planches d'inspiration ; prompts et outil
  dans `docs/media/esneo/`. Ancien système `.lp-root`/`kin-*`, Archivo, IBM Plex, Fraunces retirés.

## Jury (3 juges subagents, 10 itérations)
| Itération | Direction artistique | Acheteur ESN | UX / mobile / a11y |
|---|---|---|---|
| 1 | 6.5 | 7.5 | 6.8 |
| 3 | 8.3 | 8.8 | 8.3 |
| 5 | 8.6 | 9.1 | 8.7 (provisoire) |
| 7 | 8.9 | 9.2 | 8.7 (nouveau juge) |
| 8 | **9.0** | 9.2 | 8.9 |
| 10 | 9.0 | **9.2** | **9.0** |
Objectif ≥ 9 atteint par les trois juges (itération 10). Restes mineurs signalés par le juge UX : retrait de 3 px
du pied Clerk, score absent du tableau sur téléphone.

## Vérifications
`tsc` (hors 19 erreurs préexistantes de `lib/radar`), ESLint 0 erreur sur les fichiers touchés, design-taste lint
0 FAIL, inspecteur 0 FAIL (avertissement « pas de vidéo » assumé : aucun clip honnête trouvé).

## Hors périmètre / à fournir
Mentions légales, région d'hébergement, accord de sous-traitance RGPD, contact commercial, prix : n'existent pas,
non inventés. Badge « Secured by Clerk » (offre Clerk). Validation native du navigateur en anglais.
