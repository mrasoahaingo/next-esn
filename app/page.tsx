'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Target,
  TrendingUp,
  Clock,
  Upload,
  Loader2,
  ArrowRight,
  Zap,
  Users,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  status: string;
  extracted_data: {
    personalInfo?: { firstName?: string; lastName?: string; title?: string };
  } | null;
  created_at: string;
}

interface Positioning {
  id: string;
  candidate_id: string;
  job_description: string;
  status: string;
  analysis: {
    matchScore?: number;
    matchSummary?: string;
    skillMatches?: {
      skill: string;
      category?: string;
      relevance: 'strong' | 'partial' | 'missing';
    }[];
  } | null;
  created_at: string;
  candidates: {
    id: string;
    extracted_data: {
      personalInfo?: { firstName?: string; lastName?: string; title?: string };
    } | null;
  } | null;
}

interface DashboardData {
  candidates: Candidate[];
  positionings: Positioning[];
}

// ─── Chart configs ─────────────────────────────────────────────────

const scoreDistributionConfig: ChartConfig = {
  count: { label: 'Positionnements' },
};

const skillCoverageConfig: ChartConfig = {
  strong: { label: 'Maîtrisé', color: '#b2ff3f' },
  partial: { label: 'Partiel', color: '#fbbf24' },
  missing: { label: 'Manquant', color: '#f87171' },
};

// ─── Helpers ───────────────────────────────────────────────────────

function getCandidateName(c: { extracted_data: Candidate['extracted_data'] }) {
  const pi = c.extracted_data?.personalInfo;
  if (pi?.firstName || pi?.lastName) {
    return `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim();
  }
  return 'Sans nom';
}

function getJobTitle(desc: string) {
  const line = desc.trim().split('\n')[0];
  return line.length > 50 ? line.slice(0, 47) + '...' : line;
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-neon';
  if (score >= 40) return 'text-amber-400';
  return 'text-destructive';
}

function getScoreBg(score: number) {
  if (score >= 70) return 'bg-neon/15';
  if (score >= 40) return 'bg-amber-400/15';
  return 'bg-destructive/15';
}

function getBarColor(range: string) {
  if (range === '80-100') return '#b2ff3f';
  if (range === '60-79') return '#a78bfa';
  if (range === '40-59') return '#fbbf24';
  return '#f87171';
}

// ─── Component ─────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // ─── Derived stats ─────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!data) return null;
    const { candidates, positionings } = data;

    const totalCvs = candidates.length;
    const readyCvs = candidates.filter(
      (c) => c.status === 'ready' || c.status === 'generated'
    ).length;
    const totalPos = positionings.length;
    const analyzedPos = positionings.filter(
      (p) => p.analysis?.matchScore != null
    );
    const generatedPos = positionings.filter(
      (p) => p.status === 'generated' || p.status === 'exported'
    ).length;
    const avgScore =
      analyzedPos.length > 0
        ? Math.round(
            analyzedPos.reduce((s, p) => s + (p.analysis?.matchScore ?? 0), 0) /
              analyzedPos.length
          )
        : 0;
    const timeSaved = totalCvs * 40 + generatedPos * 90;

    return { totalCvs, readyCvs, totalPos, generatedPos, avgScore, timeSaved, analyzedPos };
  }, [data]);

  // ─── Score distribution ────────────────────────────────────────

  const scoreDistribution = useMemo(() => {
    if (!stats?.analyzedPos) return [];
    const buckets = { '0-39': 0, '40-59': 0, '60-79': 0, '80-100': 0 };
    for (const p of stats.analyzedPos) {
      const s = p.analysis?.matchScore ?? 0;
      if (s >= 80) buckets['80-100']++;
      else if (s >= 60) buckets['60-79']++;
      else if (s >= 40) buckets['40-59']++;
      else buckets['0-39']++;
    }
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [stats]);

  // ─── Skill coverage ───────────────────────────────────────────

  const skillCoverage = useMemo(() => {
    if (!data) return { strong: 0, partial: 0, missing: 0, total: 0 };
    let strong = 0,
      partial = 0,
      missing = 0;
    for (const p of data.positionings) {
      for (const sm of p.analysis?.skillMatches ?? []) {
        if (sm.relevance === 'strong') strong++;
        else if (sm.relevance === 'partial') partial++;
        else missing++;
      }
    }
    const total = strong + partial + missing;
    return { strong, partial, missing, total };
  }, [data]);

  // ─── Top skills (most evaluated across all positionings) ─────

  const topSkills = useMemo(() => {
    if (!data) return [];
    const skillMap = new Map<
      string,
      { strong: number; partial: number; missing: number; total: number }
    >();
    for (const p of data.positionings) {
      for (const sm of p.analysis?.skillMatches ?? []) {
        const key = sm.skill;
        const entry = skillMap.get(key) ?? { strong: 0, partial: 0, missing: 0, total: 0 };
        entry[sm.relevance]++;
        entry.total++;
        skillMap.set(key, entry);
      }
    }
    return Array.from(skillMap.entries())
      .map(([skill, counts]) => ({
        skill,
        ...counts,
        matchRate: Math.round(
          ((counts.strong + counts.partial * 0.5) / counts.total) * 100
        ),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [data]);

  // ─── CV pipeline ──────────────────────────────────────────────

  const pipeline = useMemo(() => {
    if (!data) return [];
    const stages = [
      { key: 'uploaded', label: 'Uploadé', color: 'bg-muted-foreground' },
      { key: 'extracting', label: 'Extraction', color: 'bg-amber-400' },
      { key: 'reviewing', label: 'En revue', color: 'bg-violet' },
      { key: 'ready', label: 'Prêt', color: 'bg-accent' },
      { key: 'generated', label: 'Généré', color: 'bg-neon' },
    ];
    const counts: Record<string, number> = {};
    for (const c of data.candidates) {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    }
    const total = data.candidates.length || 1;
    return stages.map((s) => ({
      ...s,
      count: counts[s.key] ?? 0,
      pct: Math.round(((counts[s.key] ?? 0) / total) * 100),
    }));
  }, [data]);

  // ─── Recent positionings (top 5) ─────────────────────────────

  const recentPositionings = useMemo(() => {
    if (!data) return [];
    return data.positionings
      .filter((p) => p.analysis?.matchScore != null)
      .slice(0, 6);
  }, [data]);

  // ─── Upload handlers ──────────────────────────────────────────

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const d = await res.json();
      toast.success('CV uploadé', { description: 'Extraction automatique en cours...' });
      router.push(`/review/${d.id}`);
    } catch {
      toast.error("Erreur lors de l'upload", { description: 'Vérifie le fichier et réessaie.' });
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleUpload(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
  };

  // ─── Loading state ────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold title-gradient inline-block">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vue d&apos;ensemble de l&apos;activité Himeo
            </p>
          </div>

          {/* Compact upload */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            className={`relative rounded-lg border border-dashed transition-all ${
              isDragging ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/20'
            }`}
          >
            <label className="flex cursor-pointer items-center gap-2 px-4 py-2.5">
              <input
                type="file"
                onChange={handleFileChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                accept=".pdf,.docx,.doc"
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs font-medium text-muted-foreground">
                {isUploading ? 'Upload...' : 'Importer un CV'}
              </span>
            </label>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-5 gap-3">
          {[
            {
              icon: FileText,
              label: 'CVs analysés',
              value: stats?.totalCvs ?? 0,
              accent: 'text-accent bg-accent/15',
            },
            {
              icon: TrendingUp,
              label: 'CVs finalisés',
              value: stats?.readyCvs ?? 0,
              accent: 'text-neon bg-neon/15',
            },
            {
              icon: Target,
              label: 'Positionnements',
              value: stats?.totalPos ?? 0,
              accent: 'text-violet bg-violet/15',
            },
            {
              icon: Zap,
              label: 'Score moyen',
              value: stats?.avgScore ? `${stats.avgScore}%` : '–',
              accent: 'text-amber-400 bg-amber-400/15',
            },
            {
              icon: Clock,
              label: 'Temps gagné',
              value: stats?.timeSaved ? `${stats.timeSaved}min` : '0min',
              accent: 'text-primary bg-primary/15',
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl glass-panel px-4 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.accent}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{card.value}</p>
                    <p className="text-[11px] text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main grid: charts + matching list */}
        <div className="grid grid-cols-3 gap-4">
          {/* ─── Score distribution (bar chart) ─────────────────────── */}
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
                      tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
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

          {/* ─── Skill coverage (radial gauge) ──────────────────────── */}
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
                          { name: 'strong', value: skillCoverage.strong, fill: '#b2ff3f' },
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

          {/* ─── Pipeline CVs ───────────────────────────────────────── */}
          <Card className="col-span-1 glass-panel border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pipeline CVs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data && data.candidates.length > 0 ? (
                <div className="space-y-3">
                  {pipeline.map((stage) => (
                    <div key={stage.key}>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                          <span className="text-xs text-muted-foreground">{stage.label}</span>
                        </div>
                        <span className="text-xs font-medium text-foreground">{stage.count}</span>
                      </div>
                      <Progress
                        value={stage.pct}
                        className="h-1.5 bg-white/[0.06]"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyChart label="Aucun CV importé" />
              )}
            </CardContent>
            <CardFooter>
              <p className="text-[10px] text-muted-foreground/60">
                Progression des CVs dans le workflow : de l&apos;upload initial jusqu&apos;à la génération du PDF Himeo final.
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* ─── Top Skills ─────────────────────────────────────────── */}
        <Card className="mt-4 glass-panel border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Zap className="h-4 w-4 text-neon" />
                Top compétences demandées
              </CardTitle>
              {topSkills.length > 0 && (
                <span className="text-[10px] text-muted-foreground/60">
                  Basé sur {stats?.analyzedPos?.length ?? 0} analyses
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {topSkills.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                {topSkills.map((s) => {
                  const total = s.strong + s.partial + s.missing;
                  return (
                    <div key={s.skill} className="group flex items-center gap-3">
                      <span className="w-[140px] shrink-0 truncate text-xs text-foreground">
                        {s.skill}
                      </span>
                      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        {s.strong > 0 && (
                          <div
                            className="h-full bg-neon transition-all"
                            style={{ width: `${(s.strong / total) * 100}%` }}
                          />
                        )}
                        {s.partial > 0 && (
                          <div
                            className="h-full bg-amber-400 transition-all"
                            style={{ width: `${(s.partial / total) * 100}%` }}
                          />
                        )}
                        {s.missing > 0 && (
                          <div
                            className="h-full bg-destructive transition-all"
                            style={{ width: `${(s.missing / total) * 100}%` }}
                          />
                        )}
                      </div>
                      <Tooltip>
                        <TooltipTrigger className="shrink-0">
                          <span
                            className={`text-xs font-semibold tabular-nums ${
                              s.matchRate >= 70
                                ? 'text-neon'
                                : s.matchRate >= 40
                                  ? 'text-amber-400'
                                  : 'text-destructive'
                            }`}
                          >
                            {s.matchRate}%
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          <span className="text-neon">{s.strong}</span> maîtrisé ·{' '}
                          <span className="text-amber-400">{s.partial}</span> partiel ·{' '}
                          <span className="text-destructive">{s.missing}</span> manquant
                          <br />
                          <span className="text-muted-foreground">
                            Évalué dans {s.total} positionnement{s.total > 1 ? 's' : ''}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/50">
                  <Zap className="h-4 w-4" />
                </div>
                <p className="text-[10px]">Aucune compétence évaluée</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-[10px] text-muted-foreground/60">
              Compétences les plus fréquemment évaluées dans les positionnements. Le pourcentage indique le taux de maîtrise moyen de vos candidats sur cette compétence.
            </p>
          </CardFooter>
        </Card>

        {/* ─── Matchings table ────────────────────────────────────── */}
        <Card className="mt-4 glass-panel border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4 text-violet" />
                Derniers matchings
              </CardTitle>
              {recentPositionings.length > 0 && (
                <span className="text-[10px] text-muted-foreground/60">
                  {stats?.analyzedPos?.length ?? 0} positionnements analysés
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentPositionings.length > 0 ? (
              <div className="space-y-1">
                {recentPositionings.map((p) => {
                  const score = p.analysis?.matchScore ?? 0;
                  const candidateName = p.candidates
                    ? getCandidateName(p.candidates)
                    : 'Candidat';
                  const jobTitle = getJobTitle(p.job_description);
                  const skillStats = (p.analysis?.skillMatches ?? []).reduce(
                    (acc, sm) => {
                      acc[sm.relevance]++;
                      return acc;
                    },
                    { strong: 0, partial: 0, missing: 0 } as Record<string, number>
                  );

                  return (
                    <button
                      key={p.id}
                      onClick={() =>
                        router.push(
                          `/review/${p.candidate_id}/positioning/${p.id}`
                        )
                      }
                      className="group flex w-full items-center gap-4 rounded-lg px-3 py-3 text-left transition hover:bg-white/[0.03]"
                    >
                      {/* Score badge */}
                      <div
                        className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${getScoreBg(score)}`}
                      >
                        <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                          {score}
                        </span>
                        <span className={`text-[8px] font-medium ${getScoreColor(score)} opacity-70`}>
                          / 100
                        </span>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {candidateName}
                          </span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                          <span className="text-sm text-muted-foreground truncate">
                            {jobTitle}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                          {/* Skill mini-bars */}
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">
                              <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                                {skillStats.strong > 0 && (
                                  <div
                                    className="h-full bg-neon"
                                    style={{
                                      width: `${(skillStats.strong / (skillStats.strong + skillStats.partial + skillStats.missing)) * 100}%`,
                                    }}
                                  />
                                )}
                                {skillStats.partial > 0 && (
                                  <div
                                    className="h-full bg-amber-400"
                                    style={{
                                      width: `${(skillStats.partial / (skillStats.strong + skillStats.partial + skillStats.missing)) * 100}%`,
                                    }}
                                  />
                                )}
                                {skillStats.missing > 0 && (
                                  <div
                                    className="h-full bg-destructive"
                                    style={{
                                      width: `${(skillStats.missing / (skillStats.strong + skillStats.partial + skillStats.missing)) * 100}%`,
                                    }}
                                  />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              <span className="text-neon">{skillStats.strong}</span> maîtrisées ·{' '}
                              <span className="text-amber-400">{skillStats.partial}</span> partielles ·{' '}
                              <span className="text-destructive">{skillStats.missing}</span> manquantes
                            </TooltipContent>
                          </Tooltip>

                          <span className="text-[10px] text-muted-foreground/50">
                            {new Date(p.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Status + arrow */}
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant={
                            p.status === 'generated' || p.status === 'exported'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-[9px]"
                        >
                          {p.status === 'exported'
                            ? 'Exporté'
                            : p.status === 'generated'
                              ? 'Généré'
                              : p.status === 'analyzed'
                                ? 'Analysé'
                                : 'Brouillon'}
                        </Badge>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 transition group-hover:text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/50">
                  <Target className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium text-foreground">Aucun matching</p>
                <p className="mt-0.5 text-[10px]">
                  Crée un positionnement depuis un CV pour voir les résultats ici
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-[10px] text-muted-foreground/60">
              Les derniers positionnements analysés par l&apos;IA. Chaque barre montre la répartition compétences maîtrisées / partielles / manquantes. Cliquez pour accéder au détail.
            </p>
          </CardFooter>
        </Card>

        {/* Bottom hint */}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/40">
          <Users className="h-3 w-3" />
          Sélectionne un CV dans la barre latérale pour commencer
        </p>
      </div>
    </div>
  );
}

// ─── Empty chart placeholder ───────────────────────────────────────

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[180px] flex-col items-center justify-center text-muted-foreground">
      <div className="mb-2 h-16 w-16 rounded-xl bg-white/[0.03] grid-noise" />
      <p className="text-[10px]">{label}</p>
    </div>
  );
}
