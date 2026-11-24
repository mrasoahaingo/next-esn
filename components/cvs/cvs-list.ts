/**
 * Logique de la liste des candidats (`/cvs`) : nom et titre affichés, filtre
 * par recherche et statut, tri, résumé des positionnements. Reprise de la
 * barre latérale d'origine, en fonctions pures testées dans `cvs-list.test.ts`.
 */

import { CV_STATUS } from './cv-status';

export interface CvListCandidate {
  id: string;
  status: string;
  /** Présent seulement si l'API le renvoie : conditionne le bouton d'annulation. */
  workflow_run_id?: string | null;
  extracted_data: {
    personalInfo?: { firstName?: string; lastName?: string; title?: string };
  } | null;
  created_at: string;
  updated_at?: string | null;
  original_file_url: string;
}

export interface CvListPositioning {
  id: string;
  candidate_id: string;
  mission_id: string | null;
  job_description: string;
  status: string;
  workflow_run_id: string | null;
  analysis: { matchScore?: number } | null;
  missions: { id: string; title: string; company: string | null } | null;
  created_at: string;
}

/** Nom d'un candidat : état civil extrait, sinon le nom du fichier importé, nettoyé. */
export function candidateName(c: Pick<CvListCandidate, 'extracted_data' | 'original_file_url'>): string {
  const pi = c.extracted_data?.personalInfo;
  if (pi?.firstName || pi?.lastName) {
    return `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim();
  }
  const fileName = c.original_file_url.split('/').pop() ?? '';
  const cleaned = fileName
    .replace(/^\d+_/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/_/g, ' ')
    .trim();
  return cleaned || 'Sans nom';
}

export function candidateTitle(c: Pick<CvListCandidate, 'extracted_data'>): string | null {
  return c.extracted_data?.personalInfo?.title?.trim() || null;
}

/** Titre d'un positionnement : la mission quand elle existe, sinon la première ligne de la fiche. */
export function positioningLabel(p: Pick<CvListPositioning, 'missions' | 'job_description'>, max = 60): string {
  if (p.missions?.title) {
    return p.missions.company ? `${p.missions.title}, ${p.missions.company}` : p.missions.title;
  }
  const line = p.job_description.trim().split('\n')[0] ?? '';
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line || 'Sans titre';
}

/** Date de référence pour le tri et la colonne « Importé » : `updated_at` si l'API le renvoie. */
export function candidateDate(c: Pick<CvListCandidate, 'created_at' | 'updated_at'>): string {
  return c.updated_at ?? c.created_at;
}

/** Filtres de statut proposés en chips, dans l'ordre d'affichage. `all` = tous les statuts. */
export const CV_FILTERS = ['all', 'extracting', 'reviewing', 'ready', 'generated', 'error'] as const;
export type CvFilter = (typeof CV_FILTERS)[number];

export function cvFilterLabel(filter: CvFilter): string {
  return filter === 'all' ? 'Tous' : CV_STATUS[filter].label;
}

/** Minuscules sans accents, pour une recherche indifférente à la casse et aux diacritiques. */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesQuery(c: CvListCandidate, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const haystack = normalizeSearch(`${candidateName(c)} ${candidateTitle(c) ?? ''}`);
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

export function matchesFilter(c: Pick<CvListCandidate, 'status'>, filter: CvFilter): boolean {
  return filter === 'all' || c.status === filter;
}

/** Candidats filtrés par recherche et statut, du plus récent au plus ancien. */
export function filterCandidates(
  candidates: CvListCandidate[],
  { query, filter }: { query: string; filter: CvFilter },
): CvListCandidate[] {
  return candidates
    .filter((c) => matchesFilter(c, filter) && matchesQuery(c, query))
    .sort((a, b) => candidateDate(b).localeCompare(candidateDate(a)));
}

/** Compteur de chaque chip, sur la liste déjà filtrée par la recherche (pas par le statut). */
export function countByFilter(candidates: CvListCandidate[], query: string): Record<CvFilter, number> {
  const counts = Object.fromEntries(CV_FILTERS.map((f) => [f, 0])) as Record<CvFilter, number>;
  for (const c of candidates) {
    if (!matchesQuery(c, query)) continue;
    counts.all++;
    if (c.status in counts && c.status !== 'all') counts[c.status as CvFilter]++;
  }
  return counts;
}

/** Positionnements regroupés par candidat, triés par score décroissant (comme dans la barre latérale). */
export function groupPositioningsByCandidate(
  positionings: CvListPositioning[],
): Map<string, CvListPositioning[]> {
  const map = new Map<string, CvListPositioning[]>();
  for (const p of positionings) {
    const list = map.get(p.candidate_id) ?? [];
    list.push(p);
    map.set(p.candidate_id, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (b.analysis?.matchScore ?? -1) - (a.analysis?.matchScore ?? -1));
  }
  return map;
}

export interface PositioningSummary {
  count: number;
  /** Meilleur score, ou `null` si aucun positionnement n'est analysé. */
  best: number | null;
}

export function summarizePositionings(positionings: CvListPositioning[] | undefined): PositioningSummary {
  const list = positionings ?? [];
  const scores = list.map((p) => p.analysis?.matchScore).filter((s): s is number => s != null);
  return { count: list.length, best: scores.length > 0 ? Math.max(...scores) : null };
}
