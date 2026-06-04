'use client';

import type { ExtractedCV } from '@/lib/schema';
import { usePdfPreview } from '@/lib/hooks/usePdfPreview';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';

interface PdfPreviewSyncProps {
  data: Partial<ExtractedCV> | null;
  onResetPreview?: () => void;
  templateId?: string | null;
}

export function PdfPreviewSync({
  data,
  onResetPreview,
  templateId,
}: PdfPreviewSyncProps) {
  const setPdfBlobUrl = useCvBuilderStore((s) => s.setPdfBlobUrl);
  const setIsPdfLoading = useCvBuilderStore((s) => s.setIsPdfLoading);
  const setPdfPageCount = useCvBuilderStore((s) => s.setPdfPageCount);

  // Gate: do not trigger PDF generation until the identity step has resolved.
  // The LLM emits `personalInfo` and `language` in the same step — once
  // firstName/lastName or summary is present, `language` reflects the real
  // detected value (not the Zod default 'fr'), avoiding a fr→en blink.
  const identityResolved = !!(
    data?.personalInfo?.firstName ||
    data?.personalInfo?.lastName ||
    data?.summary
  );

  usePdfPreview({
    data: identityResolved ? data : null,
    setPdfBlobUrl,
    setIsPdfLoading,
    setPdfPageCount,
    templateId,
    onResetPreview,
  });

  return null;
}
