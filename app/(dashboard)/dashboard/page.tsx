/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P4 H4 E4 S4 R4 V4 · v2 */
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/app/page-header';
import { useDemoModeStore } from '@/lib/stores/demo-mode.store';
import { useDashboard, useUploadCv } from '@/lib/queries';
import { useOrgBranding } from '@/components/org-branding-provider';
import { CvDropzone } from '@/components/dashboard/cv-dropzone';
import { DashboardKpis } from '@/components/dashboard/dashboard-kpis';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { RecentPositionings } from '@/components/dashboard/recent-positionings';
import { CvPipeline } from '@/components/dashboard/cv-pipeline';
import { ToReview } from '@/components/dashboard/to-review';
import { SkillsDemand } from '@/components/dashboard/skills-demand';
import { ScoreDistributionChart } from '@/components/dashboard/score-distribution-chart';
import {
  buildCvPipeline,
  buildScoreDistribution,
  buildSkillDemand,
  buildToReview,
  computeDashboardStats,
  computeSkillCoverage,
  EMPTY_DASHBOARD_DATA,
  pickRecentPositionings,
  type DashboardData,
} from '@/components/dashboard/dashboard-stats';

/**
 * Tableau de bord : la table du matin. Quatre chiffres clés, ce qui vient de se
 * passer, ce qu'il y a à reprendre, chaque bloc dans son panneau. Une seule
 * action : importer un CV.
 */
export default function Dashboard(): React.JSX.Element {
  const router = useRouter();
  const isDemoMode = useDemoModeStore((s) => s.isDemoMode);
  const { displayName } = useOrgBranding();

  const { data: dashboardData, isLoading, isError, error, refetch } = useDashboard();
  const uploadCv = useUploadCv();
  const isUploading = uploadCv.isPending;

  const data: DashboardData | null = useMemo(
    () => (isDemoMode ? EMPTY_DASHBOARD_DATA : ((dashboardData as DashboardData | null) ?? null)),
    [isDemoMode, dashboardData],
  );

  const stats = useMemo(() => (data ? computeDashboardStats(data) : null), [data]);
  const scoreDistribution = useMemo(() => buildScoreDistribution(stats?.analyzed ?? []), [stats]);
  const skillDemand = useMemo(() => buildSkillDemand(data?.positionings ?? []), [data]);
  const skillCoverage = useMemo(() => computeSkillCoverage(data?.positionings ?? []), [data]);
  const pipeline = useMemo(() => buildCvPipeline(data?.candidates ?? []), [data]);
  const toReview = useMemo(() => (data ? buildToReview(data) : []), [data]);
  const recentPositionings = useMemo(() => pickRecentPositionings(data?.positionings ?? []), [data]);

  const handleFile = (file: File) => {
    uploadCv.mutate(file, {
      onSuccess: (d) => {
        toast.success('CV importé', { description: 'Extraction en cours…' });
        router.push(`/review/${d.id}`);
      },
      onError: () => {
        toast.error('L’import a échoué', { description: 'Vérifiez le fichier (PDF ou Word) et réessayez.' });
      },
    });
  };

  const isEmpty = !!data && data.candidates.length === 0 && data.positionings.length === 0;
  const dropzone = <CvDropzone onFile={handleFile} isUploading={isUploading} />;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
      <PageHeader
        title="Tableau de bord"
        description={displayName ? `Activité de ${displayName}` : 'Activité de votre organisation'}
        actions={isLoading || isError || isEmpty ? undefined : dropzone}
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <Alert variant="destructive" className="border-destructive/40 bg-panel p-4">
          <AlertTriangle />
          <AlertTitle>Le tableau de bord n&rsquo;a pas pu être chargé.</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>Vérifiez votre connexion, puis réessayez.</p>
            {error instanceof Error && error.message ? (
              <p className="font-mono text-xs text-muted-foreground">{error.message}</p>
            ) : null}
            <div>
              <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
                <RotateCcw />
                Réessayer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : isEmpty || !data || !stats ? (
        <div className="flex flex-col gap-4">
          <DashboardKpis stats={null} />
          <CvDropzone
            variant="panel"
            onFile={handleFile}
            isUploading={isUploading}
            note={isDemoMode ? 'Mode démo : les données de l’organisation sont masquées.' : undefined}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <DashboardKpis stats={stats} />

          <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
            <div className="flex flex-col gap-4 lg:col-span-8">
              <RecentPositionings
                items={recentPositionings}
                analyzedCount={stats.analyzed.length}
                timeByOperation={stats.timeByOperation}
              />
              <SkillsDemand
                skills={skillDemand}
                coverage={skillCoverage}
                analyzedCount={stats.analyzed.length}
                recruiterSkills={data.recruiter_skills}
              />
            </div>
            <div className="flex flex-col gap-4 lg:col-span-4">
              <CvPipeline stages={pipeline} totalCvs={stats.totalCvs} emptyAction={dropzone} />
              <ToReview items={toReview} />
              <ScoreDistributionChart scoreDistribution={scoreDistribution} analyzedCount={stats.analyzed.length} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
