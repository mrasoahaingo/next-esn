/**
 * Pastilles de l'analyse de matching (DESIGN.md § Révision v2) : un niveau de
 * pertinence ou de fiabilité → ton `StatusBadge` + libellé. Fonctions pures,
 * testées dans `relevance-badge.test.ts`.
 */

import type { StatusTone } from '@/components/app/status-badge';
import { normalizeRelevance, type SkillRelevance } from './matching-readout';

export type RelevanceBadge = { label: string; tone: StatusTone };

const RELEVANCE_TONE: Record<SkillRelevance, StatusTone> = {
  strong: 'ok',
  partial: 'warn',
  missing: 'err',
};

const SKILL_LABEL: Record<SkillRelevance, string> = {
  strong: 'Fort',
  partial: 'Partiel',
  missing: 'Manquant',
};

const EXPERIENCE_LABEL: Record<SkillRelevance, string> = {
  strong: 'Forte',
  partial: 'Moyenne',
  missing: 'Faible',
};

/** Compétence : « Fort » / « Partiel » / « Manquant » (schéma `strong/partial/missing`). */
export function skillRelevanceBadge(relevance: string | undefined): RelevanceBadge | null {
  const level = normalizeRelevance(relevance);
  if (!level) return null;
  return { label: SKILL_LABEL[level], tone: RELEVANCE_TONE[level] };
}

/** Expérience : pertinence « Forte » / « Moyenne » / « Faible » (schéma `high/medium/low`). */
export function experienceRelevanceBadge(relevance: string | undefined): RelevanceBadge | null {
  const level = normalizeRelevance(relevance);
  if (!level) return null;
  return { label: EXPERIENCE_LABEL[level], tone: RELEVANCE_TONE[level] };
}

/** Fiabilité du score : « Fiabilité élevée » en `ok`, moyenne en `warn`, faible en `err`, absente en `neutral`. */
export function confidenceBadge(
  confidence: 'low' | 'medium' | 'high' | null | undefined,
): RelevanceBadge {
  switch (confidence) {
    case 'high':
      return { label: 'Fiabilité élevée', tone: 'ok' };
    case 'medium':
      return { label: 'Fiabilité moyenne', tone: 'warn' };
    case 'low':
      return { label: 'Fiabilité faible', tone: 'err' };
    default:
      return { label: 'Fiabilité non évaluée', tone: 'neutral' };
  }
}

/** « 12 fortes sur 15 » pour le compteur du panneau Compétences ; `null` sans compétence évaluée. */
export function formatStrongSkillsCount({ strong, total }: { strong: number; total: number }): string | null {
  if (total <= 0) return null;
  return `${strong} forte${strong > 1 ? 's' : ''} sur ${total}`;
}

/** Nombre + nom accordé (« 1 lacune », « 3 lacunes ») ; `null` à zéro quand `zero` n'est pas fourni. */
export function formatCount(count: number, singular: string, plural: string, zero?: string): string | null {
  if (count <= 0) return zero ?? null;
  return `${count} ${count > 1 ? plural : singular}`;
}
