'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';

const scoreDistributionConfig: ChartConfig = {
  count: { label: 'Positionnements' },
};

function getBarColor(range: string) {
  if (range === '80-100') return 'var(--neon)';
  if (range === '60-79') return 'var(--violet)';
  if (range === '40-59') return '#d97706';
  return 'var(--destructive)';
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[180px] flex-col items-center justify-center text-muted-foreground">
      <div className="mb-2 h-16 w-16 rounded-xl bg-overlay/[0.03] grid-noise" />
      <p className="text-[10px]">{label}</p>
    </div>
  );
}

interface ScoreDistributionChartProps {
  scoreDistribution: { range: string; count: number }[];
}

export function ScoreDistributionChart({ scoreDistribution }: ScoreDistributionChartProps) {
  return (
    <Card className="col-span-1 glass-panel border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Distribution des scores
        </CardTitle>
      </CardHeader>
      <CardContent>
        {scoreDistribution.some((d) => d.count > 0) ? (
          <ChartContainer config={scoreDistributionConfig} className="h-[180px] w-full">
            <BarChart data={scoreDistribution} layout="vertical" margin={{ left: 10, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="range"
                width={50}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                {scoreDistribution.map((entry) => (
                  <Cell key={entry.range} fill={getBarColor(entry.range)} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyChart label="Aucun positionnement analysé" />
        )}
      </CardContent>
      <CardFooter>
        <p className="text-[10px] text-muted-foreground/60">
          Répartition des scores de matching candidat/poste sur l&apos;ensemble des positionnements analysés par l&apos;IA.
        </p>
      </CardFooter>
    </Card>
  );
}
