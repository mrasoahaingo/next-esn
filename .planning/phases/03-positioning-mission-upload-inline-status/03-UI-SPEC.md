---
phase: 3
slug: positioning-mission-upload-inline-status
status: approved
reviewed_at: 2026-03-26
shadcn_initialized: true
preset: base-nova
created: 2026-03-26
extends: ../02-sub-step-progress-step-error-attribution/02-UI-SPEC.md
---

# Phase 3 — UI Design Contract

> Contrat visuel et d’interaction pour **FLOW-01…03** sur `/review/[id]/positioning` : état d’analyse mission **inline** dans la rangée mission sélectionnée, CTA « Analyser le matching » **gated** par la vérité serveur. Étend Phase 2 (liste d’étapes job posting) et Phase 1 (toasts, badges sémantiques).

**Requirements mapped:** FLOW-01, FLOW-02, FLOW-03

---

## Parent contracts

| Document | Role |
|----------|------|
| `.planning/phases/01-server-contract-core-ui-reliability/01-UI-SPEC.md` | Typo Geist, tokens Esneo, toasts Sonner, variantes badge workflow |
| `.planning/phases/02-sub-step-progress-step-error-attribution/02-UI-SPEC.md` | `WorkflowStepList`, ligne résumé « Étape i/n », badges par étape, toasts préfixés |

En cas de conflit sur les **sous-étapes** d’analyse mission : **Phase 2** fait foi. Ce document ajoute uniquement la **surface liste positionnement** et le **gating** du CTA violet.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn v4 |
| Preset | base-nova |
| Component library | @base-ui/react |
| Icon library | lucide-react |
| Font | Geist (`--font-geist-sans`) |

**Spécifique écran :** la page « Nouveau positionnement » utilise déjà **violet** (`text-violet`, `bg-violet`, `border-violet/30`) pour le CTA principal et les accents de section — **conserver** cette accentuation pour ne pas casser la cohérence de l’écran (exception au CTA « neon » des autres flux documentés en Phase 1 pour cet hub uniquement).

---

## Spacing Scale

Hérite Phase 1 + 2. Ajouts pour le bloc inline sous la fiche :

| Token | Value | Usage |
|-------|-------|-------|
| sm | 8px | Entre le sous-titre du bloc analyse et la `WorkflowStepList` |
| md | 16px | Padding interne du conteneur du bloc d’analyse (même ordre que `CardContent` Phase 2) |
| lg | 24px | Marge au-dessus du bloc « Analyse de la fiche mission » (séparation nette du markdown fiche) |

Le bloc d’analyse est **aligné** avec le contenu déjà indenté (`ml-8` côté liste) — rester aligné sur la même colonne que la carte « Fiche de poste ».

---

## Typography

Hérite rôles Body / Label / Caption Phase 2.

| Role | Usage Phase 3 |
|------|----------------|
| Label | Titre du bloc : `Analyse de la fiche mission` — `text-[10px] font-medium uppercase tracking-wider text-muted-foreground` (cohérent avec le label « Fiche de poste » existant) **ou** `text-sm font-medium` si on unifie avec une seule hiérarchie — **privilégier cohérence avec la ligne « Fiche de poste » déjà sur la page** |
| Body | Texte d’aide sous le CTA (raison du disabled / prêt à lancer) |
| Caption | Horodatage secondaire si affiché (optionnel, Phase 4 LAT-02 peut compléter) |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Accent CTA (cet écran) | `violet` (utility Tailwind existante sur la page) | Bouton « Analyser le matching », focus ring violet |
| Étapes analyse | Identique Phase 2 — badges `secondary` / `default` / `destructive` | Lignes `WorkflowStepList` |
| Bordure bloc analyse | `border-border/60` ou `border-violet/20` léger | Encadrer le bloc sans concurrencer la carte fiche |

**Ne pas** introduire une troisième couleur d’accent sur cet écran.

---

## Surfaces — `/review/[id]/positioning`

### Structure (mission sélectionnée, zone étendue)

Ordre vertical **obligatoire** :

1. Carte aperçu markdown « Fiche de poste » (existant)
2. **Nouveau — Bloc analyse mission** (FLOW-02)
   - Si `job_analysis_workflow_run_id` et flux joignable : **`WorkflowStepList`** + ligne résumé Phase 2
   - Sinon : état compact (spinner + texte **ou** message d’erreur persisté + action secondaire si produit le prévoit)
3. Rangée **CTA + aide** (FLOW-03)
   - Bouton principal à droite (sm breakpoint : pleine largeur comme aujourd’hui)
   - Texte d’aide à gauche ou au-dessus (11px `text-muted-foreground` cohérent avec la ligne existante « Mission sélectionnée — … »)

### États du CTA « Analyser le matching »

| État serveur (conceptuel) | Bouton | Texte d’aide (visible, lié par `aria-describedby`) |
|---------------------------|--------|---------------------------------------------------|
| Analyse en cours (run actif ou statut intermédiaire) | `disabled` | « Analyse de la fiche mission en cours… » |
| Analyse pas encore démarrée / données manquantes | `disabled` | « En attente du démarrage de l’analyse… » (wording exact ajustable en implémentation) |
| Analyse terminée avec succès, matching autorisé | `enabled` | « Analyse terminée — vous pouvez lancer le matching. » |
| Analyse en erreur | `disabled` (sauf bouton relance explicite ailleurs) | Message actionnable ERR-02 : problème + « Réessayez » / lien fiche mission **secondaire** si pertinent |

Le **libellé du bouton** reste **« Analyser le matching »** en idle ; en chargement **mutation** `createPositioning`, conserver spinner + désactivation comme aujourd’hui.

---

## Copywriting Contract

Tout en **français**. Ajouts par rapport aux phases 1–2 :

| Element | Copy |
|---------|------|
| Titre bloc analyse | `Analyse de la fiche mission` |
| Aide — analyse en cours | `Analyse de la fiche mission en cours…` |
| Aide — prêt | `Analyse terminée — vous pouvez lancer le matching.` |
| Aide — erreur (générique) | `L'analyse de la fiche a échoué. Réessayez ou ouvrez la fiche mission pour plus de détails.` |
| CTA principal | `Analyser le matching` (inchangé) |
| Lien secondaire (optionnel) | `Ouvrir la fiche mission` — `text-violet` lien discret sous le bloc, ne remplace pas le CTA |

---

## Comportement & accessibilité

- **`aria-busy="true"`** sur le conteneur du bloc analyse pendant chargement initial des données mission si pertinent.
- **Bouton désactivé :** toujours **`aria-describedby`** pointant vers l’id du paragraphe d’aide immédiatement au-dessus ou à côté (FLOW-03 / D-09 CONTEXT).
- **Liste d’étapes :** réutiliser **`aria-live="polite"`** comme Phase 2 sur le conteneur de liste.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `Button`, `Badge`, `Card` (si enveloppe), `Dialog` (existant création mission) | not required |

Pas de nouveau registre tiers.

---

## Checker Sign-Off

| Dimension | Verdict |
|-----------|---------|
| 1 Copywriting | PASS — copies FR listées, CTA stable |
| 2 Visuals | PASS — prolonge Phase 2 liste + carte existante |
| 3 Color | PASS — violet écran + tokens sémantiques étapes |
| 4 Typography | PASS — max 3 rôles + line summary Phase 2 |
| 5 Spacing | PASS — grille 4px, alignement `ml-8` |
| 6 Registry Safety | PASS — shadcn only |

**Approval:** approved 2026-03-26 (intégration CONTEXT Phase 3 + alignement pages existantes)
