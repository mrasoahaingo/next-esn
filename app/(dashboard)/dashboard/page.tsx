/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P4 H4 E4 S4 R5 V4 */
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
import { DashboardFacts } from '@/components/dashboard/dashboard-facts';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { RecentPositionings } from '@/components/dashboard/recent-positionings';
import { CvPipeline } from '@/components/dashboard/cv-pipeline';
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
 * Tableau de bord : la table du matin. Ce qu'il y a à reprendre, ce qui vient
 * de se passer, et les chiffres qui situent. Une seule action : importer un CV.
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
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-5 md:px-6">
      <PageHeader
        title="Tableau de bord"
        description={displayName ? `Activité de ${displayName}` : 'Activité de votre organisation'}
        actions={isLoading || isError || isEmpty ? undefined : dropzone}
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <Alert variant="destructive" className="border-destructive/40 p-4">
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
        <CvDropzone
          variant="panel"
          onFile={handleFile}
          isUploading={isUploading}
          note={isDemoMode ? 'Mode démo : les données de l’organisation sont masquées.' : undefined}
        />
      ) : (
        <>
          <DashboardFacts stats={stats} />

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <RecentPositionings items={recentPositionings} analyzedCount={stats.analyzed.length} />
            </div>
            <div className="space-y-8 lg:col-span-4">
              <CvPipeline stages={pipeline} totalCvs={stats.totalCvs} toReview={toReview} />
              <ScoreDistributionChart scoreDistribution={scoreDistribution} />
            </div>
          </div>

          <SkillsDemand
            skills={skillDemand}
            coverage={skillCoverage}
            analyzedCount={stats.analyzed.length}
            recruiterSkills={data.recruiter_skills}
          />
        </>
      )}
    </div>
  );
}
