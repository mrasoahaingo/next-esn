/**
 * Libellés et dérivations du détail d'une mission : titre de page, bandes de
 * niveau, niveaux d'exigence, statut d'une ligne de positionnement (le CV
 * importé peut encore s'extraire), phrase d'état de l'en-tête. Fonctions pures,
 * testées dans `mission-format.test.ts`.
 */

import type { StatusTone } from '@/components/app/status-badge';
import type { JobPostingExpertiseBand, JobPostingRequirementTier, JobPostingEvidenceTypeExpected } from '@/lib/schema';
import { positioningStatus, type StatusMeta } from '@/components/cvs/cv-status';

export const EXPERTISE_BAND_LABEL: Record<JobPostingExpertiseBand, string> = {
  junior: 'Junior',
  confirmed: 'Confirmé',
  senior: 'Senior',
  expert_lead: 'Expert / lead',
  unclear: 'Indéterminé',
};

export const REQUIREMENT_TIER_LABEL: Record<JobPostingRequirementTier, string> = {
  hard_constraint: 'Bloquant',
  must_have: 'Indispensable',
  should_have: 'Important',
  nice_to_have: 'Souhaitable',
};

export const REQUIREMENT_TIER_TONE: Record<JobPostingRequirementTier, StatusTone> = {
  hard_constraint: 'err',
  must_have: 'warn',
  should_have: 'info',
  nice_to_have: 'neutral',
};

export const EVIDENCE_TYPE_LABEL: Record<JobPostingEvidenceTypeExpected, string> = {
  explicit: 'explicite',
  implicit_acceptable: 'implicite acceptée',
  transferable_proven: 'transférable prouvée',
};

/** « Tech lead Java — Acme », ou l'intitulé seul. */
export function missionPageTitle(mission: { title?: string | null; company?: string | null }): string {
  const title = mission.title?.trim() || 'Mission';
  const company = mission.company?.trim();
  return company ? `${title} — ${company}` : title;
}

/** « 0 % » → « 35 % » : poids d'un critère, arrondi. */
export function formatWeight(weight: number | null | undefined): string | null {
  if (weight == null || !Number.isFinite(weight)) return null;
  return `${Math.round(weight * 100)} %`;
}

export function formatPositioningCount(count: number): string {
  if (count <= 0) return 'Aucun positionnement';
  return `${count} positionnement${count > 1 ? 's' : ''}`;
}

export type MissionAnalysisPhase = 'todo' | 'running' | 'failed' | 'done' | 'stale';

/** Phrase d'état de l'en-tête quand le niveau attendu n'est pas disponible. */
export function missionAnalysisPhrase(phase: MissionAnalysisPhase): string {
  switch (phase) {
    case 'running':
      return 'Analyse de la fiche en cours.';
    case 'failed':
      return 'L’analyse de la fiche a échoué.';
    case 'stale':
      return 'La fiche a changé depuis la dernière analyse.';
    case 'done':
      return 'Fiche analysée.';
    default:
      return 'Fiche à analyser.';
  }
}

/** Description de l'en-tête : le niveau attendu quand il est connu, sinon la phrase d'état. */
export function missionHeaderDescription({
  phase,
  band,
  statedLevel,
}: {
  phase: MissionAnalysisPhase;
  band?: JobPostingExpertiseBand | null;
  statedLevel?: string | null;
}): string {
  if ((phase === 'done' || phase === 'stale') && band && band !== 'unclear') {
    const stated = statedLevel?.trim();
    const base = `Niveau attendu : ${EXPERTISE_BAND_LABEL[band]}`;
    return stated && stated !== 'Non précisé dans la fiche.' ? `${base} — ${stated}` : `${base}.`;
  }
  return missionAnalysisPhrase(phase);
}

/**
 * Statut affiché d'une ligne de positionnement. Un CV importé sur la mission
 * passe d'abord par l'extraction : tant qu'elle tourne, c'est elle que l'on montre.
 */
export function missionPositioningStatus({
  status,
  addedVia,
  candidateStatus,
}: {
  status: string;
  addedVia?: 'cv_upload' | 'existing_candidate' | null;
  candidateStatus?: string | null;
}): StatusMeta {
  if (addedVia === 'cv_upload') {
    if (candidateStatus === 'error') return { label: 'Échec de l’extraction', tone: 'err', pulse: false };
    if ((candidateStatus === 'uploaded' || candidateStatus === 'extracting') && status === 'draft') {
      return { label: 'En extraction', tone: 'info', pulse: true };
    }
  }
  if (status === 'draft') return { label: 'En attente d’analyse', tone: 'neutral', pulse: false };
  return positioningStatus(status);
}

/** Tri des positionnements : score décroissant, les lignes sans score à la fin, puis la plus récente. */
export function sortPositioningsByScore<T extends { analysis: { matchScore?: number } | null; created_at: string }>(
  positionings: T[],
): T[] {
  return [...positionings].sort((a, b) => {
    const sa = a.analysis?.matchScore;
    const sb = b.analysis?.matchScore;
    if (sa != null && sb != null && sa !== sb) return sb - sa;
    if (sa != null && sb == null) return -1;
    if (sa == null && sb != null) return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

/** « 2 candidats sélectionnés ». */
export function formatSelectedCount(count: number): string {
  return `${count} candidat${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
}
