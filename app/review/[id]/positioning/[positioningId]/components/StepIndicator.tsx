'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepIndicatorProps {
  currentStep: 1 | 2;
  onStepClick: (step: 1 | 2) => void;
  canGoToStep: (step: 1 | 2) => boolean;
}

const steps = [
  { num: 1 as const, label: 'Analyse & Affinage' },
  { num: 2 as const, label: 'Email & CV retravaillé' },
];

export function StepIndicator({ currentStep, onStepClick, canGoToStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isActive = currentStep === step.num;
        const canClick = canGoToStep(step.num);
        const isDone = canClick && !isActive;

        return (
          <div key={step.num} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`h-px w-8 ${canClick || isActive ? 'bg-neon/50' : 'bg-border'}`} />
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => canClick && onStepClick(step.num)}
              disabled={!canClick}
              className={`h-auto gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'border border-neon/30 bg-neon/15 text-neon'
                  : isDone
                    ? 'cursor-pointer border border-neon/20 bg-neon/10 text-neon/70 hover:bg-overlay/10'
                    : 'cursor-not-allowed border border-border bg-overlay/[0.04] text-muted-foreground'
              }`}
            >
              {isDone ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-overlay/10 text-[10px]">
                  {step.num}
                </span>
              )}
              {step.label}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
