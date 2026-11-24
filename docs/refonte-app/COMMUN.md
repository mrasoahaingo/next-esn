# Refonte UI produit — règles communes aux trois agents

Tu es un agent Claude Code lancé par Orca dans un worktree dédié, enfant du worktree `refonte-app-ui`. Trois agents
travaillent en parallèle, un par écran : **tableau de bord**, **édition du CV**, **positionnement**. Le coordinateur
(une session Claude dans Orca) fusionne vos branches dans `refonte-app-ui`, puis ouvre une PR vers `main`.

L'utilisateur a demandé cette refonte avec le skill Hallmark (verbe `redesign`, flux multi-pages) et le CLI Orca.
**Il a explicitement choisi de ne pas passer par les commandes GSD** (`/gsd:*`) pour ce chantier : fais des commits
atomiques conventionnels toi-même (voir « Commits »). Ne lance aucun autre agent, aucun worktree, aucun processus
herdr.

## À lire avant d'écrire une ligne (dans cet ordre)

1. `DESIGN.md`, seconde partie : **« Design System: Esneo — UI produit (« L'établi ») »**. C'est la loi du chantier.
   Là où une référence Hallmark et `DESIGN.md` se contredisent, `DESIGN.md` gagne.
2. Ton brief d'écran dans ce dossier (`dashboard.md`, `cv.md` ou `positionnement.md`).
3. Les références Hallmark, dans `/Users/mrasoahaingo/.claude/skills/hallmark/references/` :
   `anti-patterns.md`, `genres/modern-minimal.md`, `layout-and-space.md`, `typography.md`, `color.md`, `copy.md`,
   `motion.md`, `microinteractions.md`, `interaction-and-states.md`, `responsive.md`. À la fin seulement :
   `slop-test.md` (les 58 portes, à passer avant de rendre).
4. `CLAUDE.md` du dépôt pour les conventions de code (nommage, imports `@/`, guillemets simples, 2 espaces).

Fichiers de socle déjà en place sur la branche de base, à **consommer** :

- `components/app/page-header.tsx` — l'en-tête de page (`title`, `description`, `meta`, `actions`, `status`).
- `lib/utils/score-tone.ts` — `scoreTone()`, `scoreToneText()`, `scoreToneSoftBg()`, `SCORE_TONE_*`.
- Jetons `success` et `warning` dans `app/globals.css` (`text-success`, `bg-warning/12`, …) et `font-mono` = Geist Mono.

## Périmètre : ce que tu possèdes, ce que tu ne touches pas

| Écran | Fichiers possédés (modifiables, déplaçables, remplaçables) |
|---|---|
| Tableau de bord | `app/(dashboard)/**`, `components/dashboard/**` |
| Édition du CV | `app/review/[id]/page.tsx`, `app/review/components/**`, `app/review/loading.tsx` |
| Positionnement | `app/review/[id]/positioning/**`, `components/positioning-mission-analysis-inline.tsx` |

Tu peux **créer** des composants dans ton périmètre (par exemple `components/dashboard/…`,
`app/review/components/…`, `app/review/[id]/positioning/[positioningId]/components/…`).

**Interdit, sans exception** (si tu as besoin d'un changement là-dedans, demande-le par message au coordinateur,
voir « Communication ») :

- `app/globals.css`, `DESIGN.md`, `components/ui/**`, `components/app/**`, `lib/utils/score-tone.ts` ;
- la coque : `components/unified-sidebar.tsx`, `components/app-header.tsx`, `components/authenticated-shell.tsx`,
  `app/layout.tsx` ;
- `components/workflow/**`, `components/ai/**` (gelés ce tour) ;
- les couches données et métier : `lib/queries/**`, `lib/services/**`, `lib/stores/**`, `lib/hooks/**`,
  `lib/workflow/**`, `app/api/**`, `workflows/**`, `supabase/**` ;
- les fichiers des deux autres écrans ;
- `package.json` (aucune dépendance nouvelle), `.env*`, `pnpm-workspace.yaml` (ne les commite jamais).
- Ne supprime aucun fichier hors de ton périmètre. Dans ton périmètre, une suppression est permise si le fichier
  n'est plus importé nulle part (`grep -rn` pour le prouver) ; dis-le dans le compte rendu.

**Comportement à préserver à l'identique** : tous les hooks (React Query, zustand, `useWorkflowStream`,
`useAutoSave`, `usePdfPreview`, `useSessionTimer`…), leurs appels et leur ordre ; les routes ; les actions
(valider, sauvegarder, supprimer, annuler, exporter, relancer) ; les états (chargement, vide, en cours, erreur,
terminé) ; les textes d'erreur venant de l'API ; l'accessibilité existante (noms accessibles, `aria-live`,
`AlertDialog` de suppression). Tu refais la **couche visuelle et d'interaction**, pas la logique.

## Déroulé

1. **Plan** (30 minutes au plus). Lis tout ce qui précède, puis écris `docs/refonte-app/<écran>-PLAN.md` :
   composition retenue (sections dans l'ordre, grille, ce qui est sticky), liste des fichiers que tu vas modifier /
   créer / supprimer, ce que tu retires et pourquoi, les questions ouvertes. Commite-le (`docs(refonte-<écran>): plan`).
   N'attends pas de réponse pour continuer, sauf si une question bloque vraiment (alors envoie-la, type `question`).
2. **Implémentation**, en commits atomiques (une intention par commit). Garde l'app compilable à chaque commit.
3. **Vérifications**, toutes, avant de rendre :
   - `./node_modules/.bin/tsc --noEmit` → 0 erreur (c'est le cas sur la base).
   - `./node_modules/.bin/eslint <chaque fichier que tu as touché>` → 0 erreur. (`eslint .` sur tout le dépôt
     échoue déjà sur la base à cause de `.claude/` et `.cursor/` : ne cherche pas à le corriger.)
   - `./node_modules/.bin/vitest run` → tout passe (base : 28 fichiers, 233 tests). Ajoute un test si tu crées une
     fonction pure (formatage, regroupement).
   - **Contrôle visuel, si possible** : `./node_modules/.bin/next dev -p <port libre>` a besoin de `.env.local` ;
     copie-le depuis `/Users/mrasoahaingo/Projects/perso/next-esn/.env.local` (fichier local, jamais commité, ne
     l'affiche pas). Si Clerk te laisse entrer (session déjà ouverte dans le navigateur intégré d'Orca : charge
     `orca skills get orca-cli --reference references/browser.md` avant de piloter un onglet), capture ton écran à
     1440 et 375 px, en clair et en sombre, et compare à `DESIGN.md`. Si tu es bloqué par la connexion après deux
     essais, arrête et dis-le dans le compte rendu : l'utilisateur fera la revue visuelle dans Orca.
   - **Auto-contrôle Hallmark** : passe `slop-test.md` (portes universelles + modern-minimal), la grille
     « Ce qui disparaît » de `DESIGN.md`, et la critique pré-émission sur six axes (Philosophie, Hiérarchie,
     Exécution, Spécificité, Retenue, Variété, notés 1–5 ; < 3 = on refait). Note les scores dans le tampon.
4. **Tampon** en première ligne non vide de chaque page refaite (`page.tsx`) :
   `/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P? H? E? S? R? V? */`
5. **Compte rendu** (voir « Communication »), puis arrête-toi. Ne pousse pas (`git push`), n'ouvre pas de PR.

## Commits

Conventionnels, sujet en français, périmètre `refonte-<écran>` (`refonte-dashboard`, `refonte-cv`,
`refonte-positionnement`) :

```
feat(refonte-cv): en-tête de page et zone d'état de l'extraction
refactor(refonte-cv): sections du formulaire sur le papier, sans cartes
docs(refonte-cv): plan de la refonte
```

Termine chaque message de commit par la ligne `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
Écris le message dans un fichier et passe-le avec `git commit -F <fichier>` (pas de heredoc).

## Synchronisation avec la base

Le coordinateur peut enrichir la branche de base (`refonte-app-ui`) pendant ton travail (un jeton, une prop sur
`PageHeader`). Il te l'annonce par message ; tu fais alors `git merge refonte-app-ui` dans ta branche et tu
résous les conflits (il n'y en aura pas si tu es resté dans ton périmètre).

## Communication

Tout passe par le courrier Orca, jamais par le terminal d'un autre agent. Le coordinateur est le chat
`orca_session_id:8324598d-d9aa-4060-98e7-2f991c17d3d3`. Écris le corps dans un fichier (pas de heredoc) :

```
orca orchestration send --to orca_session_id:8324598d-d9aa-4060-98e7-2f991c17d3d3 --type question --subject "refonte-cv : <sujet>" --body-file <fichier> --json
orca orchestration send --to orca_session_id:8324598d-d9aa-4060-98e7-2f991c17d3d3 --type merge_ready --subject "refonte-cv : prêt à fusionner" --body-file <fichier> --json
```

- `question` : tu as besoin d'une décision ou d'un changement hors de ton périmètre. Continue ce qui n'en dépend pas.
- `merge_ready` : le compte rendu final. Il contient : la branche et le dernier commit ; la liste des fichiers
  modifiés / créés / supprimés ; ce qui a été retiré de l'écran et pourquoi ; les résultats de tsc, eslint, vitest ;
  si le contrôle visuel a eu lieu (et où sont les captures) ; les scores de la critique ; les portes du slop-test
  qui restent discutables ; ce que tu proposes pour les composants gelés (`WorkflowStepList`, coque) sans l'avoir
  fait ; les questions restées ouvertes.
- À chaque jalon (plan commité, implémentation finie, vérifications passées), mets à jour la ligne de ton
  workspace : `orca worktree set --worktree active --comment "<état en une ligne>" --json`.
- Si tu reçois du courrier (`orca orchestration check --peek --format --json`), lis-le avant de continuer.

## Ce que « fini » veut dire

L'écran respecte `DESIGN.md` § L'établi à la lettre, ne contient plus aucun des interdits listés dans « Ce qui
disparaît », garde tout son comportement, passe tsc / eslint / vitest, porte son tampon, et le compte rendu
`merge_ready` est parti.
