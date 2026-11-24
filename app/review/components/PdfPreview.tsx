'use client';

import { useEffect, useRef, useState } from 'react';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';
import { buildCvPdfFilename } from '@/lib/utils/cv-pdf-filename';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Download, Maximize2 } from 'lucide-react';
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
  /** Classes de la carte (ex. une hauteur maximale quand elle est collante). */
  className?: string;
};

/**
 * Aperçu PDF de l'établi : la seule carte de l'écran (`bg-card border rounded-xl`),
 * un en-tête fin (titre, plein écran, « Télécharger »), le document, et un état vide
 * en texte simple. Sans props, lit tout dans `useCvBuilderStore` (écran CV) ;
 * le positionnement passe ses propres valeurs, chaque prop absente retombe sur le store.
 */
export function PdfPreview({
  pdfBlobUrl: pdfBlobUrlProp,
  isPdfLoading: isPdfLoadingProp,
  pdfPageCount: pdfPageCountProp,
  downloadFilename,
  title = 'Aperçu PDF',
  emptyLabel = 'Le PDF apparaîtra ici',
  className,
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

  // Hauteur du document : largeur × √2 (format A4) × nombre de pages, mesurée sur la carte.
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

  const emptyText = isPdfLoading && !pdfBlobUrl ? 'Génération du PDF…' : emptyLabel;

  return (
    <>
      <div
        ref={containerRef}
        className={cn('flex flex-col overflow-hidden rounded-xl border border-border bg-card', className)}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
          <h2 className="text-[0.9375rem] font-semibold leading-6 text-foreground">{title}</h2>
          <div className="flex items-center gap-1">
            {isPdfLoading ? (
              <Spinner className="mr-1 text-muted-foreground" aria-label="Génération du PDF en cours" />
            ) : null}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setFullscreen(true)}
              disabled={!pdfBlobUrl}
              aria-label="Afficher en plein écran"
            >
              <Maximize2 />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!pdfBlobUrl}>
              <Download data-icon="inline-start" />
              Télécharger
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-background">
          {pdfBlobUrl ? (
            <iframe
              src={pdfEmbedSrc(pdfBlobUrl)}
              style={{ height: iframeHeight || undefined }}
              className="block w-full bg-background"
              title="Aperçu du CV"
            />
          ) : (
            <p className="flex h-64 items-center justify-center px-4 text-center text-sm text-muted-foreground">
              {emptyText}
            </p>
          )}
        </div>
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex h-[90vh] flex-col gap-0 p-0 sm:max-w-[90vw]" showCloseButton={false}>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
            <DialogTitle className="text-[0.9375rem] font-semibold leading-6 text-foreground">{title}</DialogTitle>
            <div className="flex items-center gap-1">
              {isPdfLoading ? (
                <Spinner className="mr-1 text-muted-foreground" aria-label="Génération du PDF en cours" />
              ) : null}
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!pdfBlobUrl}>
                <Download data-icon="inline-start" />
                Télécharger
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setFullscreen(false)}>
                Fermer
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 bg-background">
            {pdfBlobUrl ? (
              <iframe
                src={pdfEmbedSrc(pdfBlobUrl)}
                className="block h-full w-full bg-background"
                title="Aperçu du CV en plein écran"
              />
            ) : (
              <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                {emptyText}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
