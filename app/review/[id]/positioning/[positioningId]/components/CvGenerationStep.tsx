'use client';

import { useMemo } from 'react';
import type { PositioningGenerateStreamMeta } from '@/lib/types/positioning-generate-stream';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, FileText, Download } from 'lucide-react';
import { TailoredCvForm } from './TailoredCvForm';

const CV_BRANCHES = ['tailoredCv'] as const;

const CV_BRANCH_LABELS: Record<(typeof CV_BRANCHES)[number], string> = {
  tailoredCv: 'CV retravaillé',
};

function RegenButton({
  onClick,
  disabled,
  hasContent,
}: {
  onClick: () => void;
  disabled: boolean;
  hasContent: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 text-violet hover:text-violet hover:bg-violet/10 h-7 px-2.5 text-xs"
    >
      <RefreshCw className="mr-1.5 h-3 w-3" />
      {hasContent ? 'Relancer' : 'Générer'}
    </Button>
  );
}

interface CvGenerationStepProps {
  isStreaming: boolean;
  streamMeta?: PositioningGenerateStreamMeta | null;
  onGenerateCv: () => void;
  onExport: () => void;
  exportPending: boolean;
}

export function CvGenerationStep({
  isStreaming,
  streamMeta,
  onGenerateCv,
  onExport,
  exportPending,
}: CvGenerationStepProps) {
  const { tailoredCv, updateTailoredCvField } = usePositioningStore();

  const hasCv = !!tailoredCv;
  const activeBranches = streamMeta?.activeBranches ?? [];
  const generateMode = streamMeta?.generateMode;

  const branchesForLoadingList = useMemo(() => {
    if (generateMode === 'cv') {
      return [...CV_BRANCHES];
    }
    if (generateMode === 'emails') {
      return [];
    }
    return [...CV_BRANCHES];
  }, [generateMode]);

  const streamingSummaryLine = useMemo(() => {
    if (generateMode === 'cv') {
      return 'Génération du CV retravaillé en cours.';
    }
    return 'Génération en cours...';
  }, [generateMode]);

  const busy = (branch: (typeof CV_BRANCHES)[number]) => activeBranches.includes(branch);

  const showCvBlockProgressList =
    isStreaming &&
    !tailoredCv &&
    (generateMode === 'cv' || generateMode === 'all' || generateMode === undefined);

  const showCvHeaderBusy =
    isStreaming &&
    (generateMode === 'cv' || generateMode === 'all' || generateMode === undefined);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-overlay/10 bg-overlay/[0.06] overflow-hidden">
        <div className="flex flex-wrap items-start gap-3 px-4 py-3 border-b border-border/60">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">CV retravaillé</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Texte structuré aligné sur l&apos;offre ; l&apos;aperçu PDF est à droite.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0 ml-auto">
            {!isStreaming && (
              <RegenButton onClick={onGenerateCv} disabled={isStreaming} hasContent={hasCv} />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={exportPending || isStreaming || !tailoredCv}
              className="h-7 shrink-0"
            >
              {exportPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              Exporter
            </Button>
            {showCvHeaderBusy && (
              <div className="flex items-center gap-1.5 text-xs text-violet shrink-0">
                <Loader2 className="h-3 w-3 animate-spin" />
                En cours…
              </div>
            )}
          </div>
        </div>
        <div className="p-4">
          {isStreaming && !tailoredCv && generateMode === 'emails' ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Cette exécution ne régénère pas le CV — ouvrez l&apos;étape « Emails » pour les propositions.
            </p>
          ) : showCvBlockProgressList ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet" />
              <p className="text-sm font-medium text-foreground">Génération en cours...</p>
              <p className="text-xs text-muted-foreground max-w-md">{streamingSummaryLine}</p>
              <ul className="mt-2 flex w-full max-w-md flex-col gap-2 text-left">
                {branchesForLoadingList.map((branch) => {
                  const b = branch as (typeof CV_BRANCHES)[number];
                  const isBusy = busy(b);
                  return (
                    <li
                      key={branch}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                        isBusy
                          ? 'border-violet/40 bg-violet/10 text-violet'
                          : 'border-overlay/10 bg-overlay/[0.02] text-muted-foreground'
                      }`}
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
                      )}
                      <span className={isBusy ? 'font-medium' : ''}>{CV_BRANCH_LABELS[b]}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : tailoredCv ? (
            <TailoredCvForm
              data={tailoredCv}
              onUpdateField={updateTailoredCvField}
              readOnly={isStreaming}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6 rounded-lg border border-dashed border-border bg-overlay/[0.02]">
              Aucun contenu pour l&apos;instant — utilisez le bouton « Générer » ci-dessus.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
