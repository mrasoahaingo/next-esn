'use client';

import { Palette } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export default function TemplatesPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-md border-dashed border-border/60 bg-card/40">
        <CardContent className="pt-6">
          <Empty className="min-h-0 border-0 p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Palette />
              </EmptyMedia>
              <EmptyTitle>Sélectionne un gabarit ou crée-en un nouveau</EmptyTitle>
              <EmptyDescription>
                Les gabarits définissent le theme, le logo, l&apos;entete, le pied de page, les blocs
                actifs, leur ordre et le prefixe d&apos;export PDF. Utilise le bouton + dans la colonne
                « Templates » a gauche pour en creer un, puis clique sur son nom pour l&apos;editer.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
