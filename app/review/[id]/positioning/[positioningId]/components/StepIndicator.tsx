'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
  onStepClick: (step: 1 | 2 | 3) => void;
  canGoToStep: (step: 1 | 2 | 3) => boolean;
}

const steps = [
  { num: 1 as const, label: 'Analyse & affinage' },
  { num: 2 as const, label: 'Emails (Client & Candidat)' },
  { num: 3 as const, label: 'CV retravaillé' },
];

export function StepIndicator({ currentStep, onStepClick, canGoToStep }: StepIndicatorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => {
        const isActive = currentStep === step.num;
        const canClick = canGoToStep(step.num);
        const isDone = canClick && !isActive;

        return (
          <div key={step.num} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`hidden sm:block h-px w-6 shrink-0 ${canClick || isActive ? 'bg-neon/50' : 'bg-border'}`} />
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => canClick && onStepClick(step.num)}
              disabled={!canClick}
              className={`h-auto max-w-[min(100%,280px)] gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'border border-neon/30 bg-neon/15 text-neon'
                  : isDone
                    ? 'cursor-pointer border border-neon/20 bg-neon/10 text-neon/70 hover:bg-overlay/10'
                    : 'cursor-not-allowed border border-border bg-overlay/[0.04] text-muted-foreground'
              }`}
            >
              {isDone ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-overlay/10 text-[10px]">
                  {step.num}
                </span>
              )}
              <span className="text-left leading-snug">{step.label}</span>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
