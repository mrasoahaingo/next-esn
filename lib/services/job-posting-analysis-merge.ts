import type { JobPostingAnalysis } from '@/lib/schema';

export function mergeJobPostingPartial(
  acc: Partial<JobPostingAnalysis>,
  patch: Partial<JobPostingAnalysis>,
): void {
  if (patch.executiveSummary !== undefined) {
    acc.executiveSummary = patch.executiveSummary;
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
}
