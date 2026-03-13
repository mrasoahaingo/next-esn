'use client';

import { User, FileText, Briefcase, GraduationCap, Wrench, Zap } from 'lucide-react';
import type { ExtractedCV } from '@/lib/schema';

interface Step {
  key: string;
  label: string;
  streamingLabel: string;
  icon: React.ElementType;
  check: (data: Partial<ExtractedCV> | null) => boolean;
}

const steps: Step[] = [
  {
    key: 'personalInfo',
    label: 'Identité',
    streamingLabel: 'Extraction de l\'identité...',
    icon: User,
    check: (d) => !!d?.personalInfo?.firstName || !!d?.personalInfo?.lastName,
  },
  {
    key: 'summary',
    label: 'Résumé',
    streamingLabel: 'Rédaction du résumé...',
    icon: FileText,
    check: (d) => !!d?.summary,
  },
  {
    key: 'skills',
    label: 'Compétences',
    streamingLabel: 'Analyse des compétences...',
    icon: Wrench,
    check: (d) => (d?.skills?.length ?? 0) > 0,
  },
  {
    key: 'experiences',
    label: 'Expériences',
    streamingLabel: 'Analyse des expériences...',
    icon: Briefcase,
    check: (d) => (d?.experiences?.length ?? 0) > 0,
  },
  {
    key: 'education',
    label: 'Formations',
    streamingLabel: 'Extraction des formations...',
    icon: GraduationCap,
    check: (d) => (d?.education?.length ?? 0) > 0,
  },
  {
    key: 'strengths',
    label: 'Points forts',
    streamingLabel: 'Génération des points forts...',
    icon: Zap,
    check: (d) => (d?.strengths?.length ?? 0) > 0,
  },
];

interface ExtractionProgressProps {
  data: Partial<ExtractedCV> | null;
  isStreaming: boolean;
}

export function ExtractionProgress({ data, isStreaming }: ExtractionProgressProps) {
  const completedCount = steps.filter((s) => s.check(data)).length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  // Find current active step (first incomplete one)
  const activeStep = isStreaming ? steps.find((s) => !s.check(data)) : null;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-neon transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-400 tabular-nums">
          {completedCount}/{steps.length}
        </span>
      </div>

      {/* Step pills */}
      <div className="flex flex-wrap gap-1.5">
        {steps.map((step) => {
          const done = step.check(data);
          const active = isStreaming && activeStep?.key === step.key;
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-300 ${
                done
                  ? 'bg-neon/15 text-neon border border-neon/25'
                  : active
                    ? 'bg-violet/15 text-violet-200 border border-violet/30 animate-pulse'
                    : 'bg-white/5 text-slate-500 border border-white/5'
              }`}
            >
              <Icon className="h-3 w-3" />
              {active ? step.streamingLabel : step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Returns the section status for a given field during streaming.
 */
export function getSectionStatus(
  data: Partial<ExtractedCV> | null,
  isStreaming: boolean,
  field: keyof ExtractedCV,
): 'pending' | 'streaming' | 'done' {
  if (!isStreaming) return 'done';

  const step = steps.find((s) => s.key === field);
  if (!step) return 'done';

  const hasData = step.check(data);
  if (hasData) return 'done';

  // Check if all previous steps are done → this one is streaming
  const idx = steps.indexOf(step);
  const allPreviousDone = steps.slice(0, idx).every((s) => s.check(data));

  return allPreviousDone ? 'streaming' : 'pending';
}
