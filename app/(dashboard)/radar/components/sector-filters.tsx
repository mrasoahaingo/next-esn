'use client';

import Link from 'next/link';
import { useRef, useTransition } from 'react';
import type { FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { HEAT_LABELS, HEAT_STYLES } from '@/lib/radar/ui';
import { cn } from '@/lib/utils';

type FilterState = {
  sector?: string;
  heat?: string;
  city?: string;
  technology?: string;
};

function normalizeValue(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '';
}

export function SectorFilters({
  current,
  sectorOptions = [],
  heatCounts,
}: {
  current: FilterState;
  sectorOptions?: Array<{ value: string; count: number }>;
  heatCounts?: Partial<Record<'burning' | 'hot' | 'warm' | 'cold', number>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function navigateWithFilters(nextFilters: FilterState) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(nextFilters)) {
      const normalized = normalizeValue(value);
      if (normalized) searchParams.set(key, normalized);
    }

    const query = searchParams.toString();

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    navigateWithFilters({
      sector: String(formData.get('sector') ?? ''),
      city: String(formData.get('city') ?? ''),
      technology: String(formData.get('technology') ?? ''),
      heat: String(formData.get('heat') ?? ''),
    });
  }

  function handleReset() {
    formRef.current?.reset();
    navigateWithFilters({});
  }

  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
          Filtres
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link href="/radar">
            <span className={cn('inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors', !current.sector ? 'border-violet-300 bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' : 'border-border/70 bg-background/80 text-muted-foreground hover:border-border hover:text-foreground')}>
              Tous
            </span>
          </Link>
          {sectorOptions.slice(0, 8).map((sector) => (
            <Link key={sector.value} href={`/radar?sector=${encodeURIComponent(sector.value)}`}>
              <span className={cn('inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors', current.sector === sector.value ? 'border-violet-300 bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' : 'border-border/70 bg-background/80 text-muted-foreground hover:border-border hover:text-foreground')}>
                {sector.value} ({sector.count})
              </span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(['burning', 'hot', 'warm', 'cold'] as const).map((heat) => (
            <Link key={heat} href={current.heat === heat ? '/radar' : `/radar?heat=${heat}`}>
              <span
                className={cn(
                  'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium',
                  HEAT_STYLES[heat],
                  current.heat !== heat && 'opacity-80',
                )}
              >
                {HEAT_LABELS[heat]} {heatCounts?.[heat] ?? 0}
              </span>
            </Link>
          ))}
        </div>

        <form
          key={[current.sector, current.city, current.technology, current.heat].map(normalizeValue).join('|')}
          ref={formRef}
          className="grid gap-3 md:grid-cols-4"
          onSubmit={handleSubmit}
        >
          <Input
            name="sector"
            defaultValue={current.sector}
            placeholder="Secteur"
          />
          <Input
            name="city"
            defaultValue={current.city}
            placeholder="Ville"
          />
          <Input
            name="technology"
            defaultValue={current.technology}
            placeholder="Techno"
          />
          <Input
            name="heat"
            defaultValue={current.heat}
            placeholder="cold | warm | hot | burning"
          />
          <div className="flex gap-2 md:col-span-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Application...' : 'Appliquer'}
            </Button>
            <Button variant="outline" type="button" onClick={handleReset} disabled={isPending}>
              Reinitialiser
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
