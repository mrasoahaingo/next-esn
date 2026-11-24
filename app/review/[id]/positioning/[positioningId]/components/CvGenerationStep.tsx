'use client';

import type { PositioningGenerateStreamMeta } from '@/lib/types/positioning-generate-stream';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TailoredCvForm } from './TailoredCvForm';
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';

interface CvGenerationStepProps {
  isStreaming: boolean;
  streamMeta?: PositioningGenerateStreamMeta | null;
  onGenerateCv: () => void;
  /** Ouvre la comparaison CV extrait / CV retravaillé. */
  onCompare: () => void;
  compareDisabled?: boolean;
  positioningStatus?: string | null;
  /** Détail par tâche LLM des modèles utilisés lors de la dernière génération. */
  generationModelsByTask?: Record<string, string> | null;
}

/**
 * Étape 3, colonne de gauche : le CV retravaillé en formulaire sur le papier.
 * « Exporter le PDF » est la primaire de l'en-tête ; ici, « Régénérer » et « Comparer ».
 */
export function CvGenerationStep({
  isStreaming,
  streamMeta,
  onGenerateCv,
  onCompare,
  compareDisabled,
  positioningStatus,
  generationModelsByTask,
}: CvGenerationStepProps) {
  const { tailoredCv, updateTailoredCvField } = usePositioningStore();

  const hasCv = !!tailoredCv;
  const generateMode = streamMeta?.generateMode;
  const cvRun =
    isStreaming && (generateMode === 'cv' || generateMode === 'all' || generateMode === undefined);
  const emailsOnlyRun = isStreaming && generateMode === 'emails';

  const regenLabel =
    positioningStatus === 'error' ? 'Relancer la génération' : hasCv ? 'Régénérer' : 'Générer le CV';

  return (
    <section aria-labelledby="tailored-cv-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-2">
        <div className="flex min-w-0 items-center gap-1">
          <h2 id="tailored-cv-heading" className="text-[0.9375rem] font-semibold text-foreground">
            CV retravaillé
          </h2>
          <AiGenerationInfoIcon
            variant="positioning_generate"
            modelsByTask={generationModelsByTask}
            className="h-7 w-7"
          />
          {cvRun ? (
            <span className="ml-2 border-l-2 border-primary pl-2 text-xs text-muted-foreground">En cours</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCompare} disabled={compareDisabled}>
            Comparer
          </Button>
          {!isStreaming ? (
            <Button type="button" variant="outline" size="sm" onClick={onGenerateCv}>
              {regenLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {tailoredCv ? (
        <TailoredCvForm
          data={tailoredCv}
          onUpdateField={updateTailoredCvField}
          readOnly={isStreaming}
        />
      ) : cvRun ? (
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="Génération du CV retravaillé">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-4 w-1/4 animate-none" />
              <Skeleton className="h-3 w-full animate-none" />
              <Skeleton className="h-3 w-5/6 animate-none" />
              <Skeleton className="h-3 w-2/3 animate-none" />
            </div>
          ))}
        </div>
      ) : emailsOnlyRun ? (
        <p className="text-sm text-muted-foreground">
          Cette exécution ne régénère pas le CV : ouvrez l’étape « E-mails ».
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun CV retravaillé pour l’instant. Lancez la génération pour obtenir une version alignée sur la fiche.
        </p>
      )}
    </section>
  );
}
