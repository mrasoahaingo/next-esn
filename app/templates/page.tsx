'use client';

import { Palette } from 'lucide-react';

export default function TemplatesPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card/50">
          <Palette className="h-5 w-5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Sélectionne un template ou crée-en un nouveau
          </p>
          <p className="mt-0.5 text-xs">
            Les templates définissent les couleurs, le pied de page et l'ordre des sections du CV
          </p>
        </div>
      </div>
    </div>
  );
}
