import type { LanguageModelUsage } from 'ai';
import type { ExtractedCV } from '@/lib/schema';

function addNum(a?: number, b?: number): number | undefined {
  const hasA = a !== undefined && a !== null;
  const hasB = b !== undefined && b !== null;
  if (!hasA && !hasB) return undefined;
  return (a ?? 0) + (b ?? 0);
}

export function aggregateLanguageModelUsage(usages: LanguageModelUsage[]): LanguageModelUsage {
  if (usages.length === 0) {
    return {
      inputTokens: undefined,
      outputTokens: undefined,
      totalTokens: undefined,
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: undefined,
        reasoningTokens: undefined,
      },
    };
  }
  return usages.reduce((acc, u) => ({
    inputTokens: addNum(acc.inputTokens, u.inputTokens),
    outputTokens: addNum(acc.outputTokens, u.outputTokens),
    totalTokens: addNum(acc.totalTokens, u.totalTokens),
    inputTokenDetails: {
      noCacheTokens: addNum(acc.inputTokenDetails?.noCacheTokens, u.inputTokenDetails?.noCacheTokens),
      cacheReadTokens: addNum(acc.inputTokenDetails?.cacheReadTokens, u.inputTokenDetails?.cacheReadTokens),
      cacheWriteTokens: addNum(acc.inputTokenDetails?.cacheWriteTokens, u.inputTokenDetails?.cacheWriteTokens),
    },
    outputTokenDetails: {
      textTokens: addNum(acc.outputTokenDetails?.textTokens, u.outputTokenDetails?.textTokens),
      reasoningTokens: addNum(acc.outputTokenDetails?.reasoningTokens, u.outputTokenDetails?.reasoningTokens),
    },
  }));
}

/** Fusionne un patch partiel dans l’accumulateur (snapshots NDJSON côté client). */
export function mergeExtractedPartial(
  acc: Partial<ExtractedCV>,
  patch: Partial<ExtractedCV>,
): void {
  if (patch.personalInfo !== undefined) {
    acc.personalInfo = {
      ...acc.personalInfo,
      ...patch.personalInfo,
    } as ExtractedCV['personalInfo'];
  }
  if (patch.summary !== undefined) acc.summary = patch.summary;
  if (patch.experiences !== undefined) acc.experiences = patch.experiences as ExtractedCV['experiences'];
  if (patch.education !== undefined) acc.education = patch.education as ExtractedCV['education'];
  if (patch.skills !== undefined) {
    acc.skills = {
      technologies:
        patch.skills.technologies !== undefined
          ? patch.skills.technologies
          : (acc.skills?.technologies ?? []),
      softSkills:
        patch.skills.softSkills !== undefined ? patch.skills.softSkills : (acc.skills?.softSkills ?? []),
      expertises:
        patch.skills.expertises !== undefined ? patch.skills.expertises : (acc.skills?.expertises ?? []),
      methodologies:
        patch.skills.methodologies !== undefined
          ? patch.skills.methodologies
          : (acc.skills?.methodologies ?? []),
    };
  }
  if (patch.strengths !== undefined) acc.strengths = patch.strengths;
}
