import type { PositioningAnalysis } from '@/lib/schema';

export function mergePositioningPartial(
  acc: Partial<PositioningAnalysis>,
  patch: Partial<PositioningAnalysis>,
): void {
  if (patch.skillMatches !== undefined) {
    acc.skillMatches = patch.skillMatches as PositioningAnalysis['skillMatches'];
  }
  if (patch.experienceRelevance !== undefined) {
    acc.experienceRelevance = patch.experienceRelevance as PositioningAnalysis['experienceRelevance'];
  }
  if (patch.gaps !== undefined) {
    acc.gaps = patch.gaps as PositioningAnalysis['gaps'];
  }
  if (patch.candidateQuestions !== undefined) {
    acc.candidateQuestions = patch.candidateQuestions as PositioningAnalysis['candidateQuestions'];
  }
  if (patch.clientQuestions !== undefined) {
    acc.clientQuestions = patch.clientQuestions as PositioningAnalysis['clientQuestions'];
  }
  if (patch.matchScore !== undefined) {
    acc.matchScore = patch.matchScore;
  }
  if (patch.matchSummary !== undefined) {
    acc.matchSummary = patch.matchSummary;
  }
  if (patch.matchScoreConfidence !== undefined) {
    acc.matchScoreConfidence = patch.matchScoreConfidence;
  }
  if (patch.matchScoreConfidenceNote !== undefined) {
    acc.matchScoreConfidenceNote = patch.matchScoreConfidenceNote;
  }
}
