import { useEffect, useRef } from 'react';
import { usePositioningStore } from '@/lib/stores/positioning.store';

export function usePositioningPdfPreview() {
  const tailoredCv = usePositioningStore((s) => s.tailoredCv);
  const setPdfBlobUrl = usePositioningStore((s) => s.setPdfBlobUrl);
  const setIsPdfLoading = usePositioningStore((s) => s.setIsPdfLoading);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tailoredCv) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsPdfLoading(true);
      try {
        const res = await fetch('/api/pdf-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: tailoredCv }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error('PDF generation failed');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('PDF preview error:', e);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsPdfLoading(false);
        }
      }
    }, 600);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tailoredCv, setPdfBlobUrl, setIsPdfLoading]);
}
