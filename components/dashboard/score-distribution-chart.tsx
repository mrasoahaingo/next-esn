'use client';

import { BarChart3 } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { PanelEmpty } from './panel-empty';

const scoreDistributionConfig: ChartConfig = {
  count: { label: 'Positionnements', color: 'var(--primary)' },
};

interface ScoreDistributionChartProps {
  scoreDistribution: { range: string; count: number }[];
  analyzedCount: number;
}

/**
 * Distribution des scores de matching en quatre tranches, dans un panneau.
 * Une seule teinte, `primary`.
 */
export function ScoreDistributionChart({
  scoreDistribution,
  analyzedCount,
}: ScoreDistributionChartProps): React.JSX.Element {
  const hasData = scoreDistribution.some((d) => d.count > 0);

  return (
    <Panel aria-labelledby="score-distribution-title">
      <PanelHeader
        id="score-distribution-title"
        icon={BarChart3}
        title="Distribution des scores"
        count={analyzedCount > 0 ? analyzedCount : undefined}
      />
      <PanelBody padded={hasData}>
        {hasData ? (
          <ChartContainer config={scoreDistributionConfig} className="h-[150px] w-full">
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
          <PanelEmpty
            icon={BarChart3}
            title="Aucun score à distribuer."
            description="Les tranches se remplissent avec les analyses."
            action={{ label: 'Créer un positionnement', href: '/cvs' }}
          />
        )}
      </PanelBody>
    </Panel>
  );
}
