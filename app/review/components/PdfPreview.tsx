'use client';

import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';
import { buildCvPdfFilename } from '@/lib/utils/cv-pdf-filename';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { Download, FileText, Maximize2 } from 'lucide-react';
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
  /** Phrase sous le titre de l'état vide. */
  emptyDescription?: string;
  /** Icône de l'en-tête du panneau (défaut `FileText`). */
  icon?: LucideIcon;
  /** Classes du panneau (ex. une hauteur maximale quand il est collant). */
  className?: string;
};

function formatPageCount(count: number): string {
  return `${count} page${count > 1 ? 's' : ''}`;
}

/**
 * Aperçu PDF de l'établi (DESIGN.md § Révision v2) : un panneau comme les autres,
 * en-tête (icône, titre, pages en compteur, plein écran, « Télécharger »), le document
 * dans le corps, et un `Empty` tant qu'il n'y a pas de PDF. Sans props, lit tout dans
 * `useCvBuilderStore` (écran CV) ; le positionnement passe ses propres valeurs, chaque
 * prop absente retombe sur le store.
 */
export function PdfPreview({
  pdfBlobUrl: pdfBlobUrlProp,
  isPdfLoading: isPdfLoadingProp,
  pdfPageCount: pdfPageCountProp,
  downloadFilename,
  title = 'Aperçu PDF',
  emptyLabel = 'Le PDF apparaîtra ici',
  emptyDescription = 'La génération démarre d’elle-même, sans action de votre part.',
  icon = FileText,
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
  const containerRef = useRef<HTMLElement>(null);
  const [iframeHeight, setIframeHeight] = useState(0);

  // Hauteur du document : largeur × √2 (format A4) × nombre de pages, mesurée sur le panneau.
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

  const generating = isPdfLoading && !pdfBlobUrl;
  const Icon = icon;

  const emptyState = (
    <Empty className="h-full min-h-40 py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="rounded-full">
          {generating ? <Spinner className="size-4" /> : <Icon className="size-5" />}
        </EmptyMedia>
        <EmptyTitle>{generating ? 'Génération du PDF…' : emptyLabel}</EmptyTitle>
        {generating ? null : <EmptyDescription>{emptyDescription}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  );

  return (
    <>
      <Panel ref={containerRef} className={cn('overflow-hidden', className)} aria-label={title}>
        <PanelHeader
          title={title}
          icon={icon}
          count={pdfBlobUrl && pdfPageCount > 0 ? formatPageCount(pdfPageCount) : undefined}
          className="shrink-0"
          actions={
            <>
              {isPdfLoading && pdfBlobUrl ? (
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
            </>
          }
        />

        <PanelBody padded={false} className="min-h-0 overflow-auto bg-background">
          {pdfBlobUrl ? (
            <iframe
              src={pdfEmbedSrc(pdfBlobUrl)}
              style={{ height: iframeHeight || undefined }}
              className="block w-full bg-background"
              title="Aperçu du CV"
            />
          ) : (
            emptyState
          )}
        </PanelBody>
      </Panel>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex h-[90vh] flex-col gap-0 p-0 sm:max-w-[90vw]" showCloseButton={false}>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
            <DialogTitle className="text-sm font-semibold leading-6 text-foreground">{title}</DialogTitle>
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
              emptyState
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
