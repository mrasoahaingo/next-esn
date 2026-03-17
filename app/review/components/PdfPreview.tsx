'use client';

import { useState } from 'react';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Loader2, FileText, Maximize2 } from 'lucide-react';

export function PdfPreview() {
  const pdfBlobUrl = useCvBuilderStore((s) => s.pdfBlobUrl);
  const isPdfLoading = useCvBuilderStore((s) => s.isPdfLoading);
  const [fullscreen, setFullscreen] = useState(false);

  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = 'HIMEO_CV.pdf';
    a.click();
  };

  return (
    <>
      <div className="flex h-full flex-col rounded-2xl glass-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="flex items-center text-sm font-semibold text-white">
            <FileText className="mr-2 h-4 w-4 text-accent" />
            Aperçu PDF
          </h2>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setFullscreen(true)}
              disabled={!pdfBlobUrl}
              className="text-muted-foreground hover:text-white hover:bg-white/10"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!pdfBlobUrl}
              className="border-accent/30 text-accent-foreground hover:bg-accent/10"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Télécharger
            </Button>
          </div>
        </div>

        <div className="relative flex-1 bg-[#0a0d16]">
          {isPdfLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0d16]/70">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              className="h-full w-full"
              title="CV Preview"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <FileText className="mb-2 h-10 w-10" />
              <p className="text-sm">Le PDF apparaîtra ici</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          className="sm:max-w-[90vw] h-[90vh] flex flex-col gap-0 p-0 bg-[#0a0d16] border border-white/10"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <DialogTitle className="flex items-center text-sm font-semibold text-white">
              <FileText className="mr-2 h-4 w-4 text-accent" />
              Aperçu PDF
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!pdfBlobUrl}
                className="border-accent/30 text-accent-foreground hover:bg-accent/10"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Télécharger
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullscreen(false)}
                className="text-muted-foreground hover:text-white hover:bg-white/10"
              >
                Fermer
              </Button>
            </div>
          </div>

          <div className="relative flex-1 min-h-0">
            {isPdfLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0d16]/70">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                className="h-full w-full"
                title="CV Preview — Plein écran"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <FileText className="mb-2 h-10 w-10" />
                <p className="text-sm">Le PDF apparaîtra ici</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
