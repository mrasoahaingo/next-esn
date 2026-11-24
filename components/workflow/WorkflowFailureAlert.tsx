'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WorkflowStepList } from '@/components/workflow/WorkflowStepList';
import type { StepStateRow } from '@/lib/workflow/compute-step-status';

export type WorkflowFailureAlertProps = {
  title: string;
  /** Message présentable (déjà traduit / assaini). */
  message: string;
  /** Étapes du workflow : affichées si l’une d’elles est en erreur (porte alors le message). */
  rows?: StepStateRow[];
  summaryLine?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  retryDisabled?: boolean;
};

/** État d’échec persistant d’un workflow : quelle étape, pourquoi, et comment relancer. */
export function WorkflowFailureAlert({
  title,
  message,
  rows,
  summaryLine,
  onRetry,
  retryLabel = 'Relancer',
  retryDisabled,
}: WorkflowFailureAlertProps) {
  const failedRow = rows?.find((r) => r.status === 'error');

  return (
    <Alert variant="destructive" className="border-destructive/40 p-4">
      <AlertTriangle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        {failedRow && rows ? (
          <WorkflowStepList rows={rows} summaryLine={summaryLine ?? null} />
        ) : (
          <p>{message}</p>
        )}
        {onRetry ? (
          <div>
            <Button type="button" size="sm" variant="outline" onClick={onRetry} disabled={retryDisabled}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {retryLabel}
            </Button>
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
