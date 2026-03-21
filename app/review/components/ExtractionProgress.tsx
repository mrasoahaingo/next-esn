'use client';

import { User, FileText, Briefcase, GraduationCap, Wrench, FileSearch, ScanText } from 'lucide-react';
import type { ExtractedCV } from '@/lib/schema';
import type { CvExtractionStreamMeta } from '@/lib/types/cv-extraction-stream';

interface Step {
  key: string;
  label: string;
  streamingLabel: string;
  icon: React.ElementType;
  check: (data: Partial<ExtractedCV> | null) => boolean;
}

function hasSkills(d: Partial<ExtractedCV> | null): boolean {
  const s = d?.skills;
  if (!s) return false;
  return (
    (s.technologies?.length ?? 0) > 0 ||
    (s.softSkills?.length ?? 0) > 0 ||
    (s.expertises?.length ?? 0) > 0 ||
    (s.methodologies?.length ?? 0) > 0
  );
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
    label: 'Synthèse',
    streamingLabel: 'Rédaction de la synthèse...',
    icon: FileText,
    check: (d) => !!d?.summary,
  },
  {
    key: 'skills',
    label: 'Compétences',
    streamingLabel: 'Analyse des compétences...',
    icon: Wrench,
    check: hasSkills,
  },
  {
    key: 'education',
    label: 'Formations',
    streamingLabel: 'Extraction des formations...',
    icon: GraduationCap,
    check: (d) => (d?.education?.length ?? 0) > 0,
  },
  {
    key: 'experiences',
    label: 'Expériences',
    streamingLabel: 'Analyse des expériences...',
    icon: Briefcase,
    check: (d) => (d?.experiences?.length ?? 0) > 0,
  },
];

interface ExtractionProgressProps {
  data: Partial<ExtractedCV> | null;
  isStreaming: boolean;
  streamMeta?: CvExtractionStreamMeta | null;
}

function branchPulsesStep(branchMeta: CvExtractionStreamMeta | null | undefined, stepKey: string): boolean {
  const branches = branchMeta?.activeBranches;
  if (!branches?.length) return false;
  if (stepKey === 'personalInfo' || stepKey === 'summary') return branches.includes('identity');
  if (stepKey === 'skills') return branches.includes('skills');
  if (stepKey === 'education') return branches.includes('education');
  if (stepKey === 'experiences') return branches.includes('experiences');
  return false;
}

export function ExtractionProgress({ data, isStreaming, streamMeta }: ExtractionProgressProps) {
  const completedCount = steps.filter((s) => s.check(data)).length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  const activeStep = isStreaming ? steps.find((s) => !s.check(data)) : null;
  const parallelExtracting =
    isStreaming && streamMeta?.phase === 'extracting' && (streamMeta.activeBranches?.length ?? 0) > 0;

  return (
    <div className="space-y-3" aria-live="polite" aria-atomic="false">
      {isStreaming && streamMeta?.phase === 'transcription' && (
        <div className="flex items-center gap-2 rounded-lg border border-violet/25 bg-violet/10 px-3 py-2 text-xs text-violet-100">
          <ScanText className="h-3.5 w-3.5 shrink-0 animate-pulse" />
          <span>
            Transcription du PDF…
            {streamMeta.transcriptionChars != null && streamMeta.transcriptionChars > 0 && (
              <span className="ml-1.5 tabular-nums text-violet-200/80">
                {streamMeta.transcriptionChars.toLocaleString('fr-FR')} caractères
              </span>
            )}
          </span>
        </div>
      )}

      {isStreaming && streamMeta?.phase === 'reading' && (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
          <FileSearch className="h-3.5 w-3.5 shrink-0 animate-pulse" />
          <span>Lecture du document Word…</span>
        </div>
      )}

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
          const activeParallel = parallelExtracting && branchPulsesStep(streamMeta, step.key);
          const activeSequential = isStreaming && !parallelExtracting && activeStep?.key === step.key;
          const active = activeParallel || activeSequential;
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
  streamMeta?: CvExtractionStreamMeta | null,
): 'pending' | 'streaming' | 'done' {
  if (!isStreaming) return 'done';

  const step = steps.find((s) => s.key === field);
  if (!step) return 'done';

  const hasData = step.check(data);
  if (hasData) return 'done';

  if (streamMeta?.phase === 'transcription' || streamMeta?.phase === 'reading') {
    return 'pending';
  }

  if (streamMeta?.phase === 'extracting' && streamMeta.activeBranches?.length) {
    if (branchPulsesStep(streamMeta, step.key)) return 'streaming';
  }

  const idx = steps.indexOf(step);
  const allPreviousDone = steps.slice(0, idx).every((s) => s.check(data));

  return allPreviousDone ? 'streaming' : 'pending';
}
