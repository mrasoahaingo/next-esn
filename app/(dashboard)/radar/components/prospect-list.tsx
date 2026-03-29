import { Radar } from 'lucide-react';
import Link from 'next/link';
import type { ProspectListItem } from '@/lib/radar/schemas';
import { ProspectCard } from '@/app/(dashboard)/radar/components/prospect-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ProspectList({
  prospects,
  hasActiveFilters = false,
}: {
  prospects: ProspectListItem[];
  hasActiveFilters?: boolean;
}) {
  if (prospects.length === 0) {
    return (
      <Card className="border-dashed border-border/70 bg-card/60 shadow-sm backdrop-blur-sm">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Radar className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-base font-medium text-foreground">
            {hasActiveFilters
              ? 'Aucun prospect ne correspond a ces filtres'
              : 'Le radar est en cours de calibrage'}
          </p>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'Essayez d’elargir vos criteres ou de reinitialiser les filtres.'
              : 'La premiere collecte de signaux est en cours. Les resultats apparaitront dans quelques minutes.'}
          </p>
          {hasActiveFilters ? (
            <Link href="/radar">
              <Button variant="outline" className="mt-4" type="button">
                Reinitialiser les filtres
              </Button>
            </Link>
          ) : (
            <div className="mt-5 h-2 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-muted-foreground/40" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {prospects.map((prospect) => (
        <ProspectCard key={prospect.companyId} prospect={prospect} />
      ))}
    </div>
  );
}
