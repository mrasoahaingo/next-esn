'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { PieChart, Pie } from 'recharts';

const skillCoverageConfig: ChartConfig = {
  strong: { label: 'Maîtrisé', color: '#b5ff40' },
  partial: { label: 'Partiel', color: '#fbbf24' },
  missing: { label: 'Manquant', color: '#f87171' },
};

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[180px] flex-col items-center justify-center text-muted-foreground">
      <div className="mb-2 h-16 w-16 rounded-xl bg-white/[0.03] grid-noise" />
      <p className="text-[10px]">{label}</p>
    </div>
  );
}

interface SkillCoverageChartProps {
  skillCoverage: { strong: number; partial: number; missing: number; total: number };
}

export function SkillCoverageChart({ skillCoverage }: SkillCoverageChartProps) {
  return (
    <Card className="col-span-1 glass-panel border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Couverture compétences
        </CardTitle>
      </CardHeader>
      <CardContent>
        {skillCoverage.total > 0 ? (
          <div>
            <ChartContainer config={skillCoverageConfig} className="mx-auto aspect-square h-[160px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={[
                    { name: 'strong', value: skillCoverage.strong, fill: '#b5ff40' },
                    { name: 'partial', value: skillCoverage.partial, fill: '#fbbf24' },
                    { name: 'missing', value: skillCoverage.missing, fill: '#f87171' },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  strokeWidth={2}
                  stroke="rgba(0,0,0,0.3)"
                />
                <text
                  x="50%"
                  y="47%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-2xl font-bold"
                >
                  {Math.round(
                    ((skillCoverage.strong + skillCoverage.partial * 0.5) /
                      skillCoverage.total) *
                      100
                  )}%
                </text>
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  couverture
                </text>
              </PieChart>
            </ChartContainer>
            <div className="mt-1 flex justify-center gap-4">
              {[
                { label: 'Maîtrisé', count: skillCoverage.strong, color: 'bg-neon' },
                { label: 'Partiel', count: skillCoverage.partial, color: 'bg-amber-400' },
                { label: 'Manquant', count: skillCoverage.missing, color: 'bg-destructive' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className={`h-2 w-2 rounded-full ${item.color}`} />
                  <span>{item.count} {item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyChart label="Aucune compétence analysée" />
        )}
      </CardContent>
      <CardFooter>
        <p className="text-[10px] text-muted-foreground/60">
          Taux de couverture global des compétences demandées. Les compétences partielles comptent pour 50%.
        </p>
      </CardFooter>
    </Card>
  );
}
