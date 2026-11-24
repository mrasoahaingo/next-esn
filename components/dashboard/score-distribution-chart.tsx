'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { ChartEmpty } from './chart-empty';
import { SectionHeading } from './section-heading';

const scoreDistributionConfig: ChartConfig = {
  count: { label: 'Positionnements', color: 'var(--primary)' },
};

interface ScoreDistributionChartProps {
  scoreDistribution: { range: string; count: number }[];
}

/**
 * Distribution des scores de matching en quatre tranches. Un graphique est un
 * objet à part : il vit dans une carte. Une seule teinte, `primary`.
 */
export function ScoreDistributionChart({ scoreDistribution }: ScoreDistributionChartProps): React.JSX.Element {
  const hasData = scoreDistribution.some((d) => d.count > 0);

  return (
    <section
      aria-labelledby="score-distribution-title"
      className="rounded-xl border border-border bg-card p-4"
    >
      <SectionHeading id="score-distribution-title" title="Distribution des scores" />
      {hasData ? (
        <ChartContainer config={scoreDistributionConfig} className="mt-3 h-[160px] w-full">
          <BarChart data={scoreDistribution} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="range"
              width={52}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      ) : (
        <ChartEmpty title="Aucun score à distribuer." description="Les tranches se remplissent avec les analyses." />
      )}
    </section>
  );
}
