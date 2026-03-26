import type { ExtractedCV, PositioningEmail, PositioningOutput } from '@/lib/schema';
import { mergeExtractedPartial } from '@/lib/services/extraction-merge';

/** Accumulateur streaming (partiels imbriqués) avant safeParse(positioningOutputSchema). */
export type PositioningGenerateAccumulator = {
  tailoredCv?: Partial<ExtractedCV>;
  email?: Partial<PositioningEmail>;
  emailFirstContact?: Partial<PositioningEmail>;
  emailBulletPoints?: Partial<PositioningEmail>;
  candidateEmail?: Partial<PositioningEmail>;
};

export function mergePositioningOutputPartial(
  acc: PositioningGenerateAccumulator,
  patch: Partial<PositioningOutput>,
): void {
  if (patch.tailoredCv !== undefined) {
    if (!acc.tailoredCv) acc.tailoredCv = {};
    mergeExtractedPartial(acc.tailoredCv, patch.tailoredCv as Partial<ExtractedCV>);
  }

  const keys = ['email', 'emailFirstContact', 'emailBulletPoints', 'candidateEmail'] as const;
  for (const key of keys) {
    if (patch[key] !== undefined) {
      acc[key] = {
        ...(acc[key] ?? {}),
        ...patch[key],
      };
    }
  }
}
