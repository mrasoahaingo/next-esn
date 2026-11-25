/**
 * Statuts des CV et des positionnements : libellé français et ton de pastille
 * (`StatusBadge`), partagés par la page `/cvs`, le tableau de bord et tout
 * écran qui liste des candidats. Même statut, même pastille, partout.
 * Fonctions pures, testées dans `cv-status.test.ts`.
 */

import type { StatusTone } from '@/components/app/status-badge';

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  /** Un travail de l'IA est en cours : la pastille respire. */
  pulse: boolean;
}

export const CV_STATUS: Record<string, StatusMeta> = {
  uploaded: { label: 'Importé', tone: 'neutral', pulse: false },
  extracting: { label: 'En extraction', tone: 'info', pulse: true },
  reviewing: { label: 'En relecture', tone: 'warn', pulse: false },
  ready: { label: 'Prêt', tone: 'ok', pulse: false },
  generated: { label: 'Généré', tone: 'ok', pulse: false },
  error: { label: 'Échec', tone: 'err', pulse: false },
};

export const POSITIONING_STATUS: Record<string, StatusMeta> = {
  draft: { label: 'Brouillon', tone: 'neutral', pulse: false },
  analyzing: { label: 'Analyse en cours', tone: 'info', pulse: true },
  analyzed: { label: 'Analysé', tone: 'ok', pulse: false },
  generating: { label: 'Génération en cours', tone: 'info', pulse: true },
  generated: { label: 'Généré', tone: 'ok', pulse: false },
  exported: { label: 'Exporté', tone: 'ok', pulse: false },
  error: { label: 'Échec', tone: 'err', pulse: false },
};

/** Méta d'un statut de CV ; un statut inconnu est traité comme « Importé ». */
export function cvStatus(status: string): StatusMeta {
  return CV_STATUS[status] ?? CV_STATUS.uploaded;
}

/** Méta d'un statut de positionnement ; un statut inconnu est traité comme « Brouillon ». */
export function positioningStatus(status: string): StatusMeta {
  return POSITIONING_STATUS[status] ?? POSITIONING_STATUS.draft;
}

/** Statuts de CV pour lesquels un workflow tourne et peut être annulé. */
export function isCvWorkflowRunning(status: string): boolean {
  return status === 'extracting';
}

/** Statuts de positionnement pour lesquels un workflow tourne et peut être annulé. */
export function isPositioningWorkflowRunning(status: string): boolean {
  return status === 'analyzing' || status === 'generating';
}

/** Statut auquel revient un positionnement dont on annule le workflow (comme dans la barre latérale). */
export function positioningResetStatus(status: string): 'draft' | 'analyzed' {
  return status === 'analyzing' ? 'draft' : 'analyzed';
}
