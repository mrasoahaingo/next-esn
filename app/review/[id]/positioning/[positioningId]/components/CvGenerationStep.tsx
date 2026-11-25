'use client';

import { FileText } from 'lucide-react';
import type { PositioningGenerateStreamMeta } from '@/lib/types/positioning-generate-stream';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
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
 * Étape 3, colonne de gauche : le panneau « CV retravaillé », formulaire en sections
 * séparées par des filets. « Exporter le PDF » est la primaire de l'en-tête de page ;
 * ici, « Comparer » et « Régénérer ».
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
    <Panel aria-labelledby="tailored-cv-heading">
      <PanelHeader
        id="tailored-cv-heading"
        icon={FileText}
        title="CV retravaillé"
        description="Version alignée sur la fiche, modifiable avant export."
        actions={
          <>
            {cvRun ? (
              <StatusBadge tone="info" pulse>
                En cours
              </StatusBadge>
            ) : null}
            <AiGenerationInfoIcon
              variant="positioning_generate"
              modelsByTask={generationModelsByTask}
              className="h-7 w-7"
            />
            <Button type="button" variant="ghost" size="sm" onClick={onCompare} disabled={compareDisabled}>
              Comparer
            </Button>
            {!isStreaming ? (
              <Button type="button" variant="outline" size="sm" onClick={onGenerateCv}>
                {regenLabel}
              </Button>
            ) : null}
          </>
        }
      />

      {tailoredCv ? (
        <PanelBody padded={false}>
          <TailoredCvForm
            data={tailoredCv}
            onUpdateField={updateTailoredCvField}
            readOnly={isStreaming}
          />
        </PanelBody>
      ) : cvRun ? (
        <PanelBody className="flex flex-col gap-6" aria-busy="true" aria-label="Génération du CV retravaillé">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-4 w-1/4 animate-none" />
              <Skeleton className="h-3 w-full animate-none" />
              <Skeleton className="h-3 w-5/6 animate-none" />
              <Skeleton className="h-3 w-2/3 animate-none" />
            </div>
          ))}
        </PanelBody>
      ) : emailsOnlyRun ? (
        <PanelBody>
          <p className="text-sm text-muted-foreground">
            Cette exécution ne régénère pas le CV : ouvrez l’étape « E-mails ».
          </p>
        </PanelBody>
      ) : (
        <PanelBody>
          <p className="text-sm text-muted-foreground">
            Aucun CV retravaillé pour l’instant. Lancez la génération pour obtenir une version alignée sur la fiche.
          </p>
        </PanelBody>
      )}
    </Panel>
  );
}
