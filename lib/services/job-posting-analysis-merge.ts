import type { JobPostingAnalysis } from '@/lib/schema';
import type { JobPostingAnalysisBranch } from '@/lib/types/job-posting-analysis-stream';

/**
 * Fusionne un patch partiel dans l’accumulateur en fonction de la branche LLM.
 * La branche executive ne doit jamais écraser keyPoints / openQuestions / redFlags / expectedExpertiseLevel :
 * le flux partiel peut contenir des clés parasites ou des tableaux vides qui effaçaient
 * le travail de la branche keyPoints.
 */
export function mergeJobPostingPartial(
  acc: Partial<JobPostingAnalysis>,
  patch: Partial<JobPostingAnalysis>,
  branch: JobPostingAnalysisBranch,
): void {
  if (branch === 'executive') {
    if (patch.executiveSummary !== undefined) {
      acc.executiveSummary = patch.executiveSummary;
    }
    return;
  }

  if (patch.keyPoints !== undefined) {
    acc.keyPoints = patch.keyPoints as JobPostingAnalysis['keyPoints'];
  }
  if (patch.openQuestions !== undefined) {
    acc.openQuestions = patch.openQuestions;
  }
  if (patch.redFlags !== undefined) {
    acc.redFlags = patch.redFlags;
  }
  if (patch.cvSearchKeywords !== undefined) {
    acc.cvSearchKeywords = patch.cvSearchKeywords;
  }
  if (patch.expectedExpertiseLevel !== undefined) {
    acc.expectedExpertiseLevel = patch.expectedExpertiseLevel as JobPostingAnalysis['expectedExpertiseLevel'];
  }
}
