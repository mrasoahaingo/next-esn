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

  usePdfPreview({
    data,
    setPdfBlobUrl,
    setIsPdfLoading,
    setPdfPageCount,
    templateId,
    onResetPreview,
  });

  return null;
}
