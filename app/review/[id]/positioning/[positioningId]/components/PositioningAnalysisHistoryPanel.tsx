'use client';

import { useMemo, useState } from 'react';
import type { PositioningAnalysis } from '@/lib/schema';
import {
  analysisPhaseAnswersOnly,
  extractRecruiterEntriesFromParsed,
  parsePositioningAnswers,
} from '@/lib/services/positioning.service';
import type { PositioningAnalysisHistoryRow } from '@/lib/queries/positionings';
import { usePositioningAnalysisHistory } from '@/lib/queries/positionings';
import { AnalysisView } from './AnalysisView';
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatHistoryModelsDisplayLabel, parsePositioningAnalysisModelsSnapshot } from '@/lib/types/positioning-analysis-models';
import type { PositioningAnalysisSnapshotReason } from '@/lib/types/positioning-analysis-snapshot-payload';

const HISTORY_MODELS_MISSING = 'Non renseigné';

function snapshotReasonLabel(
  r: PositioningAnalysisSnapshotReason | null | undefined,
): string | null {
  switch (r) {
    case 'archive_before_clear':
      return 'Avant relance';
    case 'workflow_completed':
      return 'Analyse terminée';
    case 'migrated_from_history_table':
      return 'Historique migré';
    default:
      return null;
  }
}

function formatHistoryDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function HistoryDetailDialog({
  entry,
  open,
  onOpenChange,
  candidateId,
  positioningId,
}: {
  entry: PositioningAnalysisHistoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  positioningId: string;
}) {
  const analysis = (entry?.analysis ?? null) as Partial<PositioningAnalysis> | null;

  const snapshotEntries = useMemo(() => {
    if (!entry?.answers) return {};
    return extractRecruiterEntriesFromParsed(
      analysisPhaseAnswersOnly(parsePositioningAnswers(entry.answers)),
    );
  }, [entry]);

  const modelsSummaryLabel = useMemo(() => {
    return formatHistoryModelsDisplayLabel(entry?.ai_analysis_models) ?? HISTORY_MODELS_MISSING;
  }, [entry]);

  const modelsSnapshot = useMemo(
    () => parsePositioningAnalysisModelsSnapshot(entry?.ai_analysis_models) ?? null,
    [entry],
  );

  const wizardHref = `/review/${candidateId}/positioning/${positioningId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,900px)] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-3 pt-6">
          <DialogTitle className="pr-8 text-base">
            Analyse archivée
            {entry ? (
              <span className="mt-1 block font-mono text-xs font-normal tabular-nums text-muted-foreground">
                {formatHistoryDate(entry.created_at)}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {analysis ? (
            <AnalysisView
              analysis={analysis}
              isAnalyzing={false}
              analysisSnapshotRecruiterEntries={snapshotEntries}
              hideRecruiterSnapshot={false}
              modelsSummaryLabel={modelsSummaryLabel}
              modelsByTask={modelsSnapshot?.byTask}
              aiInfoHistoryHref={wizardHref}
              aiInfoHistoryLinkLabel="Positionnement et onglet Historique"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Aucune donnée d’analyse.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoryRow({
  row,
  candidateId,
  positioningId,
  onOpenDetail,
}: {
  row: PositioningAnalysisHistoryRow;
  candidateId: string;
  positioningId: string;
  onOpenDetail: (row: PositioningAnalysisHistoryRow) => void;
}) {
  const a = row.analysis as { matchScore?: number } | null;
  const score = a?.matchScore;
  const modelsLabel = formatHistoryModelsDisplayLabel(row.ai_analysis_models);
  const rowModelsSnapshot = parsePositioningAnalysisModelsSnapshot(row.ai_analysis_models);
  const wizardHref = `/review/${candidateId}/positioning/${positioningId}`;
  const reasonLabel = snapshotReasonLabel(row.snapshot_reason);
  const scoreLabel = typeof score === 'number' && !Number.isNaN(score) ? `${score} / 100` : '—';

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-foreground">{formatHistoryDate(row.created_at)}</p>
          <AiGenerationInfoIcon
            variant="positioning_analysis"
            modelsLabel={modelsLabel}
            modelsByTask={rowModelsSnapshot?.byTask}
            historyHref={wizardHref}
            historyLinkLabel="Historique du positionnement"
            className="h-7 w-7"
          />
        </div>
        <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
          Score {scoreLabel}
          {reasonLabel ? ` · ${reasonLabel}` : ''}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full shrink-0 sm:w-auto"
        onClick={() => onOpenDetail(row)}
      >
        Voir le détail
      </Button>
    </li>
  );
}

/** Contenu de l’onglet Historique (liste + détail). */
export function PositioningAnalysisHistoryTabContent({
  positioningId,
  candidateId,
}: {
  positioningId: string;
  candidateId: string;
}) {
  const { data: rows, isLoading, isError } = usePositioningAnalysisHistory(positioningId);
  const [dialogEntry, setDialogEntry] = useState<PositioningAnalysisHistoryRow | null>(null);

  const list = rows ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-3" aria-busy="true" aria-label="Chargement de l’historique">
        <Skeleton className="h-4 w-1/2 animate-none" />
        <Skeleton className="h-4 w-2/5 animate-none" />
        <Skeleton className="h-4 w-1/2 animate-none" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">Impossible de charger l’historique.</p>;
  }

  if (list.length === 0) {
    return (
      <p className="py-3 text-sm text-muted-foreground">
        Aucune analyse archivée pour ce positionnement. Les analyses terminées et les relances
        apparaissent ici automatiquement.
      </p>
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Chaque ligne est une analyse archivée (fin de workflow ou relance) ; l’icône résume les modèles IA.
      </p>
      <ul className="mt-2 divide-y divide-border">
        {list.map((row) => (
          <HistoryRow
            key={row.id}
            row={row}
            candidateId={candidateId}
            positioningId={positioningId}
            onOpenDetail={setDialogEntry}
          />
        ))}
      </ul>

      <HistoryDetailDialog
        entry={dialogEntry}
        open={dialogEntry != null}
        onOpenChange={(open) => {
          if (!open) setDialogEntry(null);
        }}
        candidateId={candidateId}
        positioningId={positioningId}
      />
    </>
  );
}
