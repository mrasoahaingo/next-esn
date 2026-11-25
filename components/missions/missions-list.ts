/**
 * Logique de la liste des missions (`/positions`) : état de l'analyse de la fiche
 * dérivé des champs serveur, filtres par état, recherche sur l'intitulé et
 * l'entreprise, tri, résumé des positionnements par mission. Fonctions pures,
 * testées dans `missions-list.test.ts`.
 */

import type { StatusTone } from '@/components/app/status-badge';
import { hasPersistedJobAnalysis } from '@/lib/utils/mission-positioning-gate';
import { normalizeSearch } from '@/components/cvs/cvs-list';

/** Une ligne de `GET /api/missions` (toutes les colonnes, plus `positioning_count`). */
export interface MissionListItem {
  id: string;
  title: string;
  company: string | null;
  job_description: string;
  positioning_count: number;
  created_at: string;
  job_analysis?: unknown;
  job_analysis_workflow_run_id?: string | null;
  job_analysis_stale?: boolean;
  workflow_last_error?: unknown;
}

/** Un positionnement de `GET /api/positionings`, réduit à ce que la liste utilise. */
export interface MissionListPositioning {
  id: string;
  mission_id: string | null;
  analysis: { matchScore?: number } | null;
}

export interface MissionAnalysisStatus {
  tone: StatusTone;
  label: string;
  pulse: boolean;
  key: MissionAnalysisKey;
}

export type MissionAnalysisKey = 'todo' | 'analyzing' | 'analyzed' | 'error';

/**
 * État de l'analyse de la fiche, dérivé des seuls champs serveur (même
 * dérivation que la page « Nouveau positionnement »).
 */
export function missionAnalysisStatus(
  mission: Pick<MissionListItem, 'job_analysis' | 'job_analysis_workflow_run_id' | 'workflow_last_error'>,
): MissionAnalysisStatus {
  if (mission.workflow_last_error) return { tone: 'err', label: 'Échec', pulse: false, key: 'error' };
  if (mission.job_analysis_workflow_run_id) {
    return { tone: 'info', label: 'Analyse en cours', pulse: true, key: 'analyzing' };
  }
  if (hasPersistedJobAnalysis(mission.job_analysis ?? null)) {
    return { tone: 'ok', label: 'Analysée', pulse: false, key: 'analyzed' };
  }
  return { tone: 'neutral', label: 'À analyser', pulse: false, key: 'todo' };
}

/** Filtres proposés en chips, dans l'ordre d'affichage. */
export const MISSION_FILTERS = ['all', 'todo', 'analyzing', 'analyzed', 'error'] as const;
export type MissionFilter = (typeof MISSION_FILTERS)[number];

const FILTER_LABEL: Record<MissionFilter, string> = {
  all: 'Toutes',
  todo: 'À analyser',
  analyzing: 'Analyse en cours',
  analyzed: 'Analysée',
  error: 'Échec',
};

export function missionFilterLabel(filter: MissionFilter): string {
  return FILTER_LABEL[filter];
}

/** Intitulé et entreprise sur une ligne (« Tech lead Java, Acme »). */
export function missionHeadline(mission: Pick<MissionListItem, 'title' | 'company'>): string {
  const title = mission.title.trim() || 'Sans intitulé';
  const company = mission.company?.trim();
  return company ? `${title}, ${company}` : title;
}

export function matchesMissionQuery(mission: Pick<MissionListItem, 'title' | 'company'>, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const haystack = normalizeSearch(`${mission.title} ${mission.company ?? ''}`);
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

export function matchesMissionFilter(mission: MissionListItem, filter: MissionFilter): boolean {
  return filter === 'all' || missionAnalysisStatus(mission).key === filter;
}

/** Missions filtrées par recherche et état, de la plus récente à la plus ancienne. */
export function filterMissions(
  missions: MissionListItem[],
  { query, filter }: { query: string; filter: MissionFilter },
): MissionListItem[] {
  return missions
    .filter((m) => matchesMissionFilter(m, filter) && matchesMissionQuery(m, query))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Compteur de chaque chip, sur la liste déjà filtrée par la recherche (pas par l'état). */
export function countMissionsByFilter(missions: MissionListItem[], query: string): Record<MissionFilter, number> {
  const counts = Object.fromEntries(MISSION_FILTERS.map((f) => [f, 0])) as Record<MissionFilter, number>;
  for (const m of missions) {
    if (!matchesMissionQuery(m, query)) continue;
    counts.all++;
    counts[missionAnalysisStatus(m).key]++;
  }
  return counts;
}

export interface MissionPositioningSummary {
  count: number;
  /** Meilleur score, ou `null` si aucun positionnement n'est analysé. */
  best: number | null;
}

/**
 * Résumé des positionnements par mission : nombre (celui de l'API, source de
 * vérité) et meilleur score, lu dans la liste des positionnements de l'organisation.
 */
export function summarizeMissionPositionings(
  mission: Pick<MissionListItem, 'id' | 'positioning_count'>,
  positionings: MissionListPositioning[],
): MissionPositioningSummary {
  const scores = positionings
    .filter((p) => p.mission_id === mission.id)
    .map((p) => p.analysis?.matchScore)
    .filter((s): s is number => typeof s === 'number');
  return { count: mission.positioning_count ?? 0, best: scores.length > 0 ? Math.max(...scores) : null };
}

/** Description de l'en-tête de la liste : « 3 fiches de mission », « Aucune fiche de mission ». */
export function missionsCountLabel(count: number): string {
  if (count <= 0) return 'Aucune fiche de mission';
  return `${count} fiche${count > 1 ? 's' : ''} de mission`;
}
