'use client';

import { Check } from 'lucide-react';

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
            <button
              onClick={() => canClick && onStepClick(step.num)}
              disabled={!canClick}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-neon/15 text-neon border border-neon/30'
                  : isDone
                    ? 'bg-neon/10 text-neon/70 border border-neon/20 cursor-pointer hover:bg-overlay/10'
                    : 'bg-overlay/[0.04] text-muted-foreground border border-border cursor-not-allowed'
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
            </button>
          </div>
        );
      })}
    </div>
  );
}
