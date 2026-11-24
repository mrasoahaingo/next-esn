'use client';

import { useEffect, useRef, useState } from 'react';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';
import { buildCvPdfFilename } from '@/lib/utils/cv-pdf-filename';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Loader2, FileText, Maximize2 } from 'lucide-react';
import { pdfEmbedSrc } from '@/lib/utils/pdf-embed';

export type PdfPreviewProps = {
  /** `undefined` = lecture dans le store ; `null` = aucun PDF, volontairement. */
  pdfBlobUrl?: string | null;
  isPdfLoading?: boolean;
  pdfPageCount?: number;
  /** Nom du fichier téléchargé (sinon construit depuis `cvData` du store). */
  downloadFilename?: string;
  /** Titre du panneau (défaut « Aperçu PDF »). */
  title?: string;
  /** Texte de l'état vide (défaut « Le PDF apparaîtra ici »). */
  emptyLabel?: string;
};

/**
 * Aperçu PDF de l'établi. Sans props, lit tout dans `useCvBuilderStore` (écran CV) ;
 * le positionnement passe ses propres valeurs, chaque prop absente retombe sur le store.
 */
export function PdfPreview({
  pdfBlobUrl: pdfBlobUrlProp,
  isPdfLoading: isPdfLoadingProp,
  pdfPageCount: pdfPageCountProp,
  downloadFilename,
  title = 'Aperçu PDF',
  emptyLabel = 'Le PDF apparaîtra ici',
}: PdfPreviewProps = {}) {
  const storePdfBlobUrl = useCvBuilderStore((s) => s.pdfBlobUrl);
  const storeIsPdfLoading = useCvBuilderStore((s) => s.isPdfLoading);
  const storePdfPageCount = useCvBuilderStore((s) => s.pdfPageCount);
  const cvData = useCvBuilderStore((s) => s.cvData);
  const pdfBlobUrl = pdfBlobUrlProp === undefined ? storePdfBlobUrl : pdfBlobUrlProp;
  const isPdfLoading = isPdfLoadingProp ?? storeIsPdfLoading;
  const pdfPageCount = pdfPageCountProp ?? storePdfPageCount;
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeHeight, setIframeHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setIframeHeight(entry.contentRect.width * Math.SQRT2 * pdfPageCount);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [pdfPageCount]);

  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const name = [cvData?.personalInfo?.firstName, cvData?.personalInfo?.lastName]
      .filter(Boolean)
      .join(' ');
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = downloadFilename ?? buildCvPdfFilename(name);
    a.click();
  };

  return (
    <>
      <div ref={containerRef} className="flex flex-col rounded-2xl glass-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center text-sm font-semibold text-foreground">
            <FileText className="mr-2 h-4 w-4 text-accent" />
            {title}
          </h2>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setFullscreen(true)}
              disabled={!pdfBlobUrl}
              className="text-muted-foreground hover:text-foreground hover:bg-overlay/10"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!pdfBlobUrl}
              className="border-accent/40 text-accent hover:bg-accent/15 hover:text-accent-foreground dark:text-accent-foreground"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Télécharger
            </Button>
          </div>
        </div>

        <div className="relative bg-background dark:bg-shell">
          {isPdfLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 dark:bg-shell/70">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {pdfBlobUrl ? (
            <iframe
              src={pdfEmbedSrc(pdfBlobUrl)}
              style={{ height: iframeHeight || undefined }}
              className="w-full bg-background dark:bg-shell"
              title="CV Preview"
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <FileText className="mb-2 h-10 w-10" />
              <p className="text-sm">{emptyLabel}</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          className="sm:max-w-[90vw] h-[90vh] flex flex-col gap-0 p-0 bg-background dark:bg-shell border border-border"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <DialogTitle className="flex items-center text-sm font-semibold text-foreground">
              <FileText className="mr-2 h-4 w-4 text-accent" />
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!pdfBlobUrl}
                className="border-accent/40 text-accent hover:bg-accent/15 hover:text-accent-foreground dark:text-accent-foreground"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Télécharger
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullscreen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-overlay/10"
              >
                Fermer
              </Button>
            </div>
          </div>

          <div className="relative flex-1 min-h-0 bg-background dark:bg-shell">
            {isPdfLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 dark:bg-shell/70">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {pdfBlobUrl ? (
              <iframe
                src={pdfEmbedSrc(pdfBlobUrl)}
                className="h-full w-full bg-background dark:bg-shell"
                title="CV Preview — Plein écran"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <FileText className="mb-2 h-10 w-10" />
                <p className="text-sm">{emptyLabel}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
