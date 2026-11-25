/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P4 H4 E4 S4 R4 V4 · v2 */
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/app/page-header';
import { useDemoModeStore } from '@/lib/stores/demo-mode.store';
import { useCandidates, useCancelWorkflow, usePositionings, useUploadCv } from '@/lib/queries';
import { CvDropzone } from '@/components/dashboard/cv-dropzone';
import { plural } from '@/components/dashboard/dashboard-format';
import { CvsSkeleton } from '@/components/cvs/cvs-skeleton';
import { CvsTable } from '@/components/cvs/cvs-table';
import { CvsToolbar } from '@/components/cvs/cvs-toolbar';
import { positioningResetStatus } from '@/components/cvs/cv-status';
import {
  countByFilter,
  filterCandidates,
  groupPositioningsByCandidate,
  type CvFilter,
  type CvListCandidate,
  type CvListPositioning,
} from '@/components/cvs/cvs-list';

/**
 * Liste des candidats : l'ancienne liste de la barre latérale, à sa place.
 * Recherche, filtres par statut, tableau dépliable sur les positionnements,
 * annulation d'un workflow en cours, import d'un CV.
 */
export default function CvsPage(): React.JSX.Element {
  const router = useRouter();
  const isDemoMode = useDemoModeStore((s) => s.isDemoMode);
  const {
    data: candidatesData,
    isLoading: isLoadingCandidates,
    isError: isCandidatesError,
    error: candidatesError,
    refetch: refetchCandidates,
  } = useCandidates();
  const { data: positioningsData, isLoading: isLoadingPositionings, refetch: refetchPositionings } = usePositionings();
  const uploadCv = useUploadCv();
  const cancelWorkflow = useCancelWorkflow();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CvFilter>('all');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const candidates: CvListCandidate[] = useMemo(
    () => (isDemoMode ? [] : Array.isArray(candidatesData) ? (candidatesData as CvListCandidate[]) : []),
    [isDemoMode, candidatesData],
  );
  const positionings: CvListPositioning[] = useMemo(
    () => (isDemoMode ? [] : Array.isArray(positioningsData) ? (positioningsData as CvListPositioning[]) : []),
    [isDemoMode, positioningsData],
  );
  const positioningsByCandidate = useMemo(() => groupPositioningsByCandidate(positionings), [positionings]);
  const visible = useMemo(() => filterCandidates(candidates, { query, filter }), [candidates, query, filter]);
  const counts = useMemo(() => countByFilter(candidates, query), [candidates, query]);

  const isLoading = !isDemoMode && (isLoadingCandidates || isLoadingPositionings);
  const isUploading = uploadCv.isPending;

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

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelCv = (c: CvListCandidate) => {
    if (!c.workflow_run_id) return;
    cancelWorkflow.mutate({ runId: c.workflow_run_id, table: 'candidates', recordId: c.id, resetStatus: 'uploaded' });
  };

  const cancelPositioning = (p: CvListPositioning) => {
    if (!p.workflow_run_id) return;
    cancelWorkflow.mutate({
      runId: p.workflow_run_id,
      table: 'positionings',
      recordId: p.id,
      resetStatus: positioningResetStatus(p.status),
    });
  };

  const dropzone = <CvDropzone onFile={handleFile} isUploading={isUploading} />;
  const total = candidates.length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
      <PageHeader
        title="CVs"
        description={
          isLoading ? 'Chargement des candidats…' : total > 0 ? `${total} ${plural(total, 'candidat')}` : 'Aucun candidat'
        }
        actions={isLoading || isCandidatesError || total === 0 ? undefined : dropzone}
      />

      {isLoading ? (
        <CvsSkeleton />
      ) : isCandidatesError ? (
        <Alert variant="destructive" className="border-destructive/40 bg-panel p-4">
          <AlertTriangle />
          <AlertTitle>La liste des candidats n&rsquo;a pas pu être chargée.</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>Vérifiez votre connexion, puis réessayez.</p>
            {candidatesError instanceof Error && candidatesError.message ? (
              <p className="font-mono text-xs text-muted-foreground">{candidatesError.message}</p>
            ) : null}
            <div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void refetchCandidates();
                  void refetchPositionings();
                }}
              >
                <RotateCcw />
                Réessayer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : total === 0 ? (
        <CvDropzone
          variant="panel"
          onFile={handleFile}
          isUploading={isUploading}
          note={isDemoMode ? 'Mode démo : les données de l’organisation sont masquées.' : undefined}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <CvsToolbar query={query} onQueryChange={setQuery} filter={filter} onFilterChange={setFilter} counts={counts} />
          <CvsTable
            candidates={visible}
            positioningsByCandidate={positioningsByCandidate}
            totalCount={total}
            expanded={expanded}
            onToggle={toggleExpanded}
            onCancelCv={cancelCv}
            onCancelPositioning={cancelPositioning}
            isCancelling={cancelWorkflow.isPending}
            onClearFilters={() => {
              setQuery('');
              setFilter('all');
            }}
          />
        </div>
      )}
    </div>
  );
}
