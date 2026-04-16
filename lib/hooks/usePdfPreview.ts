import { useEffect, useMemo, useRef } from 'react';
import { useTemplateStore } from '@/lib/stores/template.store';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';

interface PdfPreviewOptions {
  data: Partial<ExtractedCV> | null;
  setPdfBlobUrl: (url: string | null) => void;
  setIsPdfLoading: (loading: boolean) => void;
  setPdfPageCount?: (count: number) => void;
  onResetPreview?: () => void;
  /** Override the template config from the store (useful for template editor) */
  templateConfigOverride?: Partial<TemplateConfig> | null;
  /**
   * Si défini (y compris `null`), le serveur résout le gabarit via la DB (évite un template Zustand obsolète).
   * Ne pas passer sur l’éditeur de gabarit : le body n’inclut pas `templateId` et le config local est utilisé.
   */
  templateId?: string | null;
  debounceMs?: number;
}

export function usePdfPreview({
  data,
  setPdfBlobUrl,
  setIsPdfLoading,
  setPdfPageCount,
  onResetPreview,
  templateConfigOverride,
  templateId,
  debounceMs = 600,
}: PdfPreviewOptions) {
  const storeConfig = useTemplateStore((s) => s.templateConfig);
  const templateConfig = templateConfigOverride !== undefined ? templateConfigOverride : storeConfig;
  const requestKey = useMemo(
    () =>
      JSON.stringify({
        data,
        templateConfig: templateId === undefined ? templateConfig : undefined,
        templateId,
      }),
    [data, templateConfig, templateId],
  );

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef<typeof data>(data);
  const latestTemplateConfigRef = useRef<typeof templateConfig>(templateConfig);
  const latestTemplateIdRef = useRef<typeof templateId>(templateId);

  latestDataRef.current = data;
  latestTemplateConfigRef.current = templateConfig;
  latestTemplateIdRef.current = templateId;

  useEffect(() => {
    if (!latestDataRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
      onResetPreview?.();
      setPdfPageCount?.(1);
      setIsPdfLoading(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    const queuePreview = async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsPdfLoading(true);
      try {
        const body: Record<string, unknown> = { data: latestDataRef.current };
        if (latestTemplateIdRef.current !== undefined) {
          body.templateId = latestTemplateIdRef.current;
        } else {
          body.templateConfig = latestTemplateConfigRef.current;
        }

        const res = await fetch('/api/pdf-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error('PDF generation failed');

        const pageCount = parseInt(res.headers.get('X-Pdf-Page-Count') ?? '1', 10);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        setPdfPageCount?.(pageCount);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('PDF preview error:', e);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsPdfLoading(false);
        }
      }
    };

    timerRef.current = setTimeout(queuePreview, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [requestKey, setPdfBlobUrl, setIsPdfLoading, setPdfPageCount, onResetPreview, debounceMs]);
}
