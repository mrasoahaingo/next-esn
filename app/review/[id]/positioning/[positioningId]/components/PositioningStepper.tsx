'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type PositioningStep = 1 | 2 | 3;

const STEPS: ReadonlyArray<{ step: PositioningStep; label: string; shortLabel: string }> = [
  { step: 1, label: 'Analyse du matching', shortLabel: 'Analyse' },
  { step: 2, label: 'E-mails', shortLabel: 'E-mails' },
  { step: 3, label: 'CV retravaillé', shortLabel: 'CV' },
];

interface PositioningStepperProps {
  current: PositioningStep;
  onSelect: (step: PositioningStep) => void;
  /** Une étape injoignable est désactivée ; la raison va dans l'info-bulle. */
  disabledReason: (step: PositioningStep) => string | null;
}

/**
 * Navigation des trois temps du positionnement : une liste ordonnée sur un filet,
 * numéros en mono, l'étape courante marquée par un point `primary` sous son libellé.
 * Les étapes faites restent cliquables ; les étapes à venir disent pourquoi elles attendent.
 */
export function PositioningStepper({ current, onSelect, disabledReason }: PositioningStepperProps) {
  return (
    <nav aria-label="Étapes du positionnement" className="border-b border-border">
      <ol className="flex items-stretch gap-6 md:gap-8">
        {STEPS.map(({ step, label, shortLabel }) => {
          const isCurrent = step === current;
          const isDone = step < current;
          const reason = isCurrent ? null : disabledReason(step);
          const disabled = !!reason;

          const button = (
            <button
              type="button"
              onClick={() => onSelect(step)}
              disabled={disabled}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'relative flex min-h-11 items-center gap-2 py-2 text-sm outline-none',
                'transition-colors duration-[120ms] ease-out motion-reduce:transition-none',
                'rounded-md focus-visible:ring-2 focus-visible:ring-ring/50',
                'disabled:cursor-not-allowed disabled:opacity-50',
                isCurrent
                  ? 'font-medium text-foreground'
                  : isDone
                    ? 'text-foreground/80 hover:text-foreground'
                    : 'text-muted-foreground',
                isCurrent &&
                  'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary',
              )}
            >
              <span className="font-mono text-xs tabular-nums">{step}</span>
              <span className="md:hidden">{shortLabel}</span>
              <span className="hidden md:inline">{label}</span>
            </button>
          );

          return (
            <li key={step} className="flex">
              {disabled ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{reason}</TooltipContent>
                </Tooltip>
              ) : (
                button
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
