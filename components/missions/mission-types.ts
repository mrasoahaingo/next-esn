/**
 * Formes de `GET /api/missions/[id]` telles que le détail de mission les lit
 * (repris de l'ancienne page, inchangé).
 */

import type { JobPostingAnalysis } from '@/lib/schema';
import type { WorkflowLastError } from '@/lib/types/workflow-last-error';

export interface PositioningCandidate {
  id: string;
  workflow_run_id?: string | null;
  workflow_last_error?: WorkflowLastError | null;
  extracted_data: {
    personalInfo?: {
      firstName?: string;
      lastName?: string;
      title?: string;
      yearsOfExperience?: string;
      availability?: string;
      location?: string;
    };
    skills?: {
      technologies?: Array<{ name: string; starred?: boolean; added?: boolean }>;
      expertises?: Array<{ name: string; starred?: boolean; added?: boolean }>;
      methodologies?: Array<{ name: string; starred?: boolean; added?: boolean }>;
    };
  } | null;
  original_file_url: string;
  status: string;
}

export interface SkillMatch {
  skill: string;
  category: string;
  relevance: 'strong' | 'partial' | 'missing';
  comment: string;
}

export interface ExperienceRelevance {
  experience: string;
  relevance: 'high' | 'medium' | 'low';
  comment: string;
}

export interface Gap {
  gap: string;
  note: string;
}

export interface MissionPositioning {
  id: string;
  candidate_id: string;
  status: string;
  workflow_run_id: string | null;
  workflow_last_error?: WorkflowLastError | null;
  added_via?: 'cv_upload' | 'existing_candidate' | null;
  /** Snapshot modèles gateway après dernière analyse (JSON). */
  ai_analysis_models?: unknown;
  analysis: {
    matchScore?: number;
    matchSummary?: string;
    skillMatches?: SkillMatch[];
    experienceRelevance?: ExperienceRelevance[];
    gaps?: Gap[];
  } | null;
  created_at: string;
  candidates: PositioningCandidate | null;
}

export interface MissionDetail {
  id: string;
  title: string;
  company: string | null;
  job_description: string;
  created_at: string;
  positionings: MissionPositioning[];
  job_analysis?: JobPostingAnalysis | null;
  job_analysis_input_hash?: string | null;
  job_analysis_workflow_run_id?: string | null;
  job_analysis_stale?: boolean;
  workflow_last_error?: WorkflowLastError | null;
  global_skill_keys_understood?: string[];
  ai_job_analysis_models?: unknown;
}

export interface CandidateItem {
  id: string;
  extracted_data: {
    personalInfo?: { firstName?: string; lastName?: string; title?: string };
  } | null;
  original_file_url: string;
  status: string;
}

/** Nom d'un candidat : état civil extrait, sinon le nom du fichier importé, nettoyé. */
export function getCandidateName(c: PositioningCandidate | CandidateItem | null): string {
  if (!c) return 'Candidat';
  const pi = c.extracted_data?.personalInfo;
  if (pi?.firstName || pi?.lastName) {
    return `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim();
  }
  const fileName = c.original_file_url.split('/').pop() ?? '';
  return fileName.replace(/^\d+_/, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ');
}

/** Statuts prêts : analyse terminée (la génération se lance depuis le positionnement). */
export const READY_STATUSES = new Set(['analyzed', 'generating', 'generated', 'exported']);

export const MAX_COMPARE = 4;
