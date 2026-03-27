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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatHistoryModelsDisplayLabel } from '@/lib/types/positioning-analysis-models';
import type { PositioningAnalysisSnapshotReason } from '@/lib/types/positioning-analysis-snapshot-payload';
import { Loader2, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

  const wizardHref = `/review/${candidateId}/positioning/${positioningId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[min(90vh,900px)] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2 border-b border-border/60">
          <DialogTitle className="text-base pr-8">
            Analyse archivée
            {entry ? (
              <span className="block text-xs font-normal text-muted-foreground mt-1">
                {formatHistoryDate(entry.created_at)}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
          {analysis ? (
            <AnalysisView
              analysis={analysis}
              isAnalyzing={false}
              analysisSnapshotRecruiterEntries={snapshotEntries}
              hideRecruiterSnapshot={false}
              modelsSummaryLabel={modelsSummaryLabel}
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

function HistoryRowActions({
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
  const wizardHref = `/review/${candidateId}/positioning/${positioningId}`;
  const reasonLabel = snapshotReasonLabel(row.snapshot_reason);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{formatHistoryDate(row.created_at)}</p>
          {reasonLabel ? (
            <Badge variant="secondary" className="text-[10px] font-normal">
              {reasonLabel}
            </Badge>
          ) : null}
          <AiGenerationInfoIcon
            variant="positioning_analysis"
            modelsLabel={modelsLabel}
            historyHref={wizardHref}
            historyLinkLabel="Historique du positionnement"
            className="h-6 w-6"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Score : {typeof score === 'number' && !Number.isNaN(score) ? `${score} %` : '—'}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="w-full sm:w-auto shrink-0"
        onClick={() => onOpenDetail(row)}
      >
        Voir le détail
      </Button>
    </li>
  );
}

/** Bouton + dialogue liste (ex. pendant une analyse en cours). */
export function PositioningAnalysisHistoryFloatingTrigger({
  positioningId,
  candidateId,
}: {
  positioningId: string;
  candidateId: string;
}) {
  const { data: rows, isLoading } = usePositioningAnalysisHistory(positioningId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dialogEntry, setDialogEntry] = useState<PositioningAnalysisHistoryRow | null>(null);

  const list = rows ?? [];
  const count = list.length;

  if (isLoading || count === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 text-xs"
        onClick={() => setPickerOpen(true)}
      >
        <History className="h-3.5 w-3.5" />
        Historique ({count})
      </Button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Historique des analyses</DialogTitle>
            <p className="text-xs text-muted-foreground text-left font-normal">
              Chaque ligne provient du journal d’usage IA (snapshot dans le payload). L’icône ouvre le
              détail des modèles (tooltip).
            </p>
          </DialogHeader>
          <ul className="space-y-2 max-h-[min(60vh,420px)] overflow-y-auto">
            {list.map((row) => (
              <HistoryRowActions
                key={row.id}
                row={row}
                candidateId={candidateId}
                positioningId={positioningId}
                onOpenDetail={(r) => {
                  setPickerOpen(false);
                  setDialogEntry(r);
                }}
              />
            ))}
          </ul>
        </DialogContent>
      </Dialog>

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
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">Impossible de charger l’historique.</p>;
  }

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/20 px-4 py-6 text-sm text-muted-foreground">
        <p>
          Aucun snapshot enregistré dans le journal IA pour ce positionnement. Les analyses terminées
          et les relances y apparaissent automatiquement.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground mb-4">
        Journal des snapshots d’analyse (fin de workflow, relance, repositionnement). Le badge
        indique l’origine ; l’icône résume les modèles IA.
      </p>
      <ul className="space-y-2">
        {list.map((row) => (
          <HistoryRowActions
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
