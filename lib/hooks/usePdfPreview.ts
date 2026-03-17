import { useEffect, useRef } from 'react';
import { useTemplateStore } from '@/lib/stores/template.store';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';

interface PdfPreviewOptions {
  data: Partial<ExtractedCV> | null;
  setPdfBlobUrl: (url: string | null) => void;
  setIsPdfLoading: (loading: boolean) => void;
  /** Override the template config from the store (useful for template editor) */
  templateConfigOverride?: Partial<TemplateConfig> | null;
  debounceMs?: number;
}

export function usePdfPreview({
  data,
  setPdfBlobUrl,
  setIsPdfLoading,
  templateConfigOverride,
  debounceMs = 600,
}: PdfPreviewOptions) {
  const storeConfig = useTemplateStore((s) => s.templateConfig);
  const templateConfig = templateConfigOverride !== undefined ? templateConfigOverride : storeConfig;

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!data) return;

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
          body: JSON.stringify({ data, templateConfig }),
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
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, templateConfig, setPdfBlobUrl, setIsPdfLoading, debounceMs]);
}
