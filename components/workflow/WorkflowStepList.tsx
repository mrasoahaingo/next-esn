'use client';

import { Badge } from '@/components/ui/badge';
import type { StepStateRow, StepStatus } from '@/lib/workflow/compute-step-status';

function badgeVariant(status: StepStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'running':
      return 'default';
    case 'error':
      return 'destructive';
    case 'done':
    case 'pending':
    default:
      return 'secondary';
  }
}

function statusLabel(status: StepStatus): string {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'running':
      return 'En cours';
    case 'done':
      return 'Terminé';
    case 'error':
      return 'Erreur';
    default:
      return status;
  }
}

export type WorkflowStepListProps = {
  rows: StepStateRow[];
  summaryLine: string | null;
};

/**
 * Liste compacte d’étapes workflow (SUB-01 / SUB-02) — uniquement présentation.
 * `errorStepKey` et les libellés sont fournis par le parent via `compute*StepStates`.
 */
export function WorkflowStepList({ rows, summaryLine }: WorkflowStepListProps) {
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {summaryLine ? (
        <p className="text-sm font-medium text-foreground">{summaryLine}</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.stepKey} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">{row.label}</span>
              <Badge variant={badgeVariant(row.status)} className="shrink-0">
                {statusLabel(row.status)}
              </Badge>
            </div>
            {row.status === 'error' && row.errorMessage ? (
              <p className="text-xs text-destructive">{row.errorMessage}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
