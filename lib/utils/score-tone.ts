/**
 * Ton d'un score de matching (0–100), partagé par toute l'UI produit.
 *
 * Les seuils étaient recopiés dans le tableau de bord, la barre latérale et
 * l'analyse de positionnement ; ils vivent désormais ici, avec les classes
 * Tailwind correspondantes (jetons `success`, `warning`, `destructive` de
 * `app/globals.css`). Même score, même couleur, partout.
 */
export type ScoreTone = 'strong' | 'partial' | 'weak';

export const SCORE_THRESHOLDS = {
  /** À partir de ce score, le matching est jugé solide. */
  strong: 70,
  /** À partir de ce score (et sous `strong`), le matching est partiel. */
  partial: 40,
} as const;

export function scoreTone(score: number): ScoreTone {
  if (score >= SCORE_THRESHOLDS.strong) return 'strong';
  if (score >= SCORE_THRESHOLDS.partial) return 'partial';
  return 'weak';
}

/** Couleur du texte (chiffre du score, libellé). */
export const SCORE_TONE_TEXT: Record<ScoreTone, string> = {
  strong: 'text-success',
  partial: 'text-warning',
  weak: 'text-destructive',
};

/** Fond doux derrière un score (pastille, tuile), à combiner avec `SCORE_TONE_TEXT`. */
export const SCORE_TONE_SOFT_BG: Record<ScoreTone, string> = {
  strong: 'bg-success/12',
  partial: 'bg-warning/12',
  weak: 'bg-destructive/12',
};

/** Couleur pleine (barre de progression, segment de graphique). */
export const SCORE_TONE_FILL: Record<ScoreTone, string> = {
  strong: 'bg-success',
  partial: 'bg-warning',
  weak: 'bg-destructive',
};

/** Libellé court, en français, pour une légende ou un titre accessible. */
export const SCORE_TONE_LABEL: Record<ScoreTone, string> = {
  strong: 'Solide',
  partial: 'Partiel',
  weak: 'Faible',
};

export function scoreToneText(score: number): string {
  return SCORE_TONE_TEXT[scoreTone(score)];
}

export function scoreToneSoftBg(score: number): string {
  return SCORE_TONE_SOFT_BG[scoreTone(score)];
}
