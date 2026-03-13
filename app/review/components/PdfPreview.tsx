'use client';

import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText } from 'lucide-react';

export function PdfPreview() {
  const pdfBlobUrl = useCvBuilderStore((s) => s.pdfBlobUrl);
  const isPdfLoading = useCvBuilderStore((s) => s.isPdfLoading);

  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = 'HIMEO_CV.pdf';
    a.click();
  };

  return (
    <div className="flex h-full flex-col rounded-2xl glass-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="flex items-center text-sm font-semibold text-white">
          <FileText className="mr-2 h-4 w-4 text-accent" />
          Aperçu PDF
        </h2>
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
  );
}
