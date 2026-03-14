'use client';

import type { PositioningAnalysis } from '@/lib/schema';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Loader2, AlertTriangle } from 'lucide-react';

interface AnalysisChartsProps {
  analysis: Partial<PositioningAnalysis> | null;
  isAnalyzing: boolean;
}

const NEON = '#b2ff3f';
const VIOLET = '#a78bfa';
const AMBER = '#fbbf24';
const DESTRUCTIVE = '#ef4444';

const PALETTE = [NEON, VIOLET, '#38bdf8', AMBER, '#f472b6', '#34d399', '#fb923c', '#94a3b8'];

const experienceChartConfig = {
  score: { label: 'Pertinence', color: VIOLET },
} satisfies ChartConfig;

function relevanceToScore(relevance: string): number {
  switch (relevance) {
    case 'strong':
    case 'high':
      return 100;
    case 'partial':
    case 'medium':
      return 60;
    case 'missing':
    case 'low':
      return 20;
    default:
      return 0;
  }
}

function truncateLabel(label: string, maxLen = 18): string {
  return label.length > maxLen ? label.slice(0, maxLen) + '…' : label;
}

type SkillMatch = NonNullable<PositioningAnalysis['skillMatches']>[number];

function groupSkillsByCategory(skills: Partial<SkillMatch>[]) {
  const groups: Record<string, Partial<SkillMatch>[]> = {};
  for (const s of skills) {
    const cat = s.category || 'Autres';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  }
  return groups;
}

function SkillRadar({ category, skills, color }: { category: string; skills: Partial<SkillMatch>[]; color: string }) {
  const chartConfig = {
    score: { label: 'Pertinence', color },
  } satisfies ChartConfig;

  const data = skills.map((s) => ({
    skill: truncateLabel(s.skill ?? ''),
    score: relevanceToScore(s.relevance ?? ''),
  }));

  const strongCount = skills.filter((s) => s.relevance === 'strong').length;
  const total = skills.length;

  if (data.length < 3) {
    return (
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <h4 className="text-sm font-semibold text-white">{category}</h4>
          <span className="text-xs text-slate-400 ml-auto">{strongCount}/{total} fort</span>
        </div>
        <div className="space-y-2">
          {skills.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-slate-300">{s.skill}</span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  backgroundColor:
                    s.relevance === 'strong' ? NEON + '22' :
                    s.relevance === 'partial' ? AMBER + '22' : DESTRUCTIVE + '22',
                  color:
                    s.relevance === 'strong' ? NEON :
                    s.relevance === 'partial' ? AMBER : DESTRUCTIVE,
                }}
              >
                {s.relevance === 'strong' ? 'Fort' : s.relevance === 'partial' ? 'Partiel' : 'Manquant'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <h4 className="text-sm font-semibold text-white">{category}</h4>
        <span className="text-xs text-slate-400 ml-auto">{strongCount}/{total} fort</span>
      </div>
      <ChartContainer config={chartConfig} className="mx-auto h-[200px] w-full">
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Radar
            name={category}
            dataKey="score"
            stroke={color}
            fill={color}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ChartContainer>
    </div>
  );
}

export function AnalysisCharts({ analysis, isAnalyzing }: AnalysisChartsProps) {
  if (!analysis && !isAnalyzing) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">Les visualisations apparaîtront après l&apos;analyse</p>
      </div>
    );
  }

  if (isAnalyzing && !analysis?.skillMatches?.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet" />
        <p className="text-sm">Analyse en cours...</p>
      </div>
    );
  }

  const skills = analysis?.skillMatches ?? [];
  const experiences = analysis?.experienceRelevance ?? [];
  const gaps = analysis?.gaps ?? [];

  const grouped = groupSkillsByCategory(skills);
  const categories = Object.keys(grouped);

  const barData = experiences.map((e) => ({
    name: truncateLabel(e.experience, 25),
    score: relevanceToScore(e.relevance),
    fill:
      e.relevance === 'high'
        ? NEON
        : e.relevance === 'medium'
          ? AMBER
          : DESTRUCTIVE,
  }));

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      {/* Skill radars — one per LLM-generated category */}
      {categories.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat, i) => (
            <SkillRadar
              key={cat}
              category={cat}
              skills={grouped[cat]}
              color={PALETTE[i % PALETTE.length]}
            />
          ))}
        </div>
      )}

      {/* Bar chart - Experience relevance */}
      {barData.length > 0 && (
        <section className="glass-panel rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Pertinence des expériences</h3>
          <ChartContainer config={experienceChartConfig} className="h-[200px] w-full">
            <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </section>
      )}

      {/* Gaps summary */}
      {gaps.length > 0 && (
        <section className="glass-panel rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Lacunes ({gaps.length})
          </h3>
          <ul className="space-y-2">
            {gaps.map((g, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-destructive mt-0.5 shrink-0">!</span>
                <span>{typeof g === 'string' ? g : g.gap}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
