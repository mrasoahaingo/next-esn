import { requireOrgId } from '@/lib/utils/auth';
import { getProspectsCached } from '@/lib/radar/queries';
import { ProspectFiltersSchema } from '@/lib/radar/schemas';
import { ProspectList } from '@/app/(dashboard)/radar/components/prospect-list';
import { SectorFilters } from '@/app/(dashboard)/radar/components/sector-filters';
import { RadarPageLinks } from '@/app/(dashboard)/radar/components/radar-page-links';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/radar/ui';

function normalizeSearchParam(value: string | string[] | undefined) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const orgId = await requireOrgId();
  const rawParams = await searchParams;
  const filters = ProspectFiltersSchema.parse({
    sector: normalizeSearchParam(rawParams.sector),
    heat: normalizeSearchParam(rawParams.heat),
    city: normalizeSearchParam(rawParams.city),
    technology: normalizeSearchParam(rawParams.technology),
  });

  const prospects = await getProspectsCached(orgId, filters);
  const hasActiveFilters = Boolean(filters.sector || filters.city || filters.technology || filters.heat);
  const now = new Date();
  const last24hThreshold = now.getTime() - 24 * 60 * 60 * 1000;
  const hotProspects = prospects.filter((prospect) => prospect.heat === 'burning' || prospect.heat === 'hot').length;
  const newSignals = prospects.filter((prospect) => {
    if (!prospect.latestSignalAt) return false;
    return new Date(prospect.latestSignalAt).getTime() >= last24hThreshold;
  }).length;
  const matchCount = prospects.filter((prospect) => (prospect.breakdown.vivier_match ?? 0) > 0).length;
  const sectorCounts = prospects.reduce<Record<string, number>>((accumulator, prospect) => {
    if (!prospect.sector) return accumulator;
    accumulator[prospect.sector] = (accumulator[prospect.sector] ?? 0) + 1;
    return accumulator;
  }, {});
  const heatCounts = prospects.reduce<Record<'burning' | 'hot' | 'warm' | 'cold', number>>(
    (accumulator, prospect) => {
      accumulator[prospect.heat] += 1;
      return accumulator;
    },
    { burning: 0, hot: 0, warm: 0, cold: 0 },
  );
  const latestActivity = prospects
    .map((prospect) => prospect.latestSignalAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Radar prospect</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('fr-FR')} — {newSignals} nouveaux signaux aujourd&apos;hui
          </p>
        </div>
        <Link href="/radar/settings">
          <Button variant="outline" type="button">
            Parametres
          </Button>
        </Link>
      </div>

      <RadarPageLinks current="dashboard" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Prospects chauds</div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-red-700 dark:text-red-400">
              {hotProspects}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Nouveaux signaux</div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{newSignals}</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Matchs vivier</div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{matchCount}</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Derniere activite</div>
            <div className="mt-1 text-sm font-semibold">
              {latestActivity ? formatRelativeTime(latestActivity) : 'Aucune'}
            </div>
          </CardContent>
        </Card>
      </div>

      <SectorFilters
        current={filters}
        sectorOptions={Object.entries(sectorCounts)
          .sort(([, left], [, right]) => right - left)
          .map(([value, count]) => ({ value, count }))}
        heatCounts={heatCounts}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/70 px-4 py-3 text-sm shadow-sm backdrop-blur-sm">
        <div className="text-muted-foreground">
          {prospects.length} prospect{prospects.length > 1 ? 's' : ''} trouve{prospects.length > 1 ? 's' : ''}
        </div>
        <div className="text-muted-foreground">Tri: score decroissant</div>
      </div>

      <ProspectList prospects={prospects} hasActiveFilters={hasActiveFilters} />
    </div>
  );
}
