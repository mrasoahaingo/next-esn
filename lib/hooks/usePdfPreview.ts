import { useEffect, useRef } from 'react';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';

export function usePdfPreview() {
  const cvData = useCvBuilderStore((s) => s.cvData);
  const setPdfBlobUrl = useCvBuilderStore((s) => s.setPdfBlobUrl);
  const setIsPdfLoading = useCvBuilderStore((s) => s.setIsPdfLoading);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!cvData) return;

    // Debounce 600ms
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Abort previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsPdfLoading(true);
      try {
        const res = await fetch('/api/pdf-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: cvData }),
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
  }, [cvData, setPdfBlobUrl, setIsPdfLoading]);
}
