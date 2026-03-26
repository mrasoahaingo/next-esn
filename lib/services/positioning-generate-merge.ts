import type {
  ExtractedCV,
  PositioningEmail,
  PositioningExpertiseConfirmationItem,
  PositioningOutput,
} from '@/lib/schema';
import { mergeExtractedPartial } from '@/lib/services/extraction-merge';

/** Accumulateur streaming (partiels imbriqués) avant safeParse(positioningOutputSchema). */
export type PositioningGenerateAccumulator = {
  tailoredCv?: Partial<ExtractedCV>;
  email?: Partial<PositioningEmail>;
  emailFirstContact?: Partial<PositioningEmail>;
  emailBulletPoints?: Partial<PositioningEmail>;
  candidateEmail?: Partial<PositioningEmail>;
  expertiseConfirmations?: PositioningExpertiseConfirmationItem[];
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

  if (patch.expertiseConfirmations !== undefined) {
    acc.expertiseConfirmations = patch.expertiseConfirmations.map((x, i) => ({
      ...x,
      id: x.id && x.id.trim() ? x.id.trim() : `ec-${i}`,
    }));
  }
}
