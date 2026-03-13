'use client';

import { Loader2, Check } from 'lucide-react';
import type { ReactNode } from 'react';

type SectionStatus = 'pending' | 'streaming' | 'done';

interface SectionShellProps {
  status: SectionStatus;
  label: string;
  children: ReactNode;
}

export function SectionShell({ status, label, children }: SectionShellProps) {
  if (status === 'pending') {
    return (
      <section className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">En attente</p>
            <p className="text-xs text-slate-600">{label}</p>
          </div>
        </div>
        {/* Skeleton lines */}
        <div className="mt-4 space-y-3">
          <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-white/5 animate-pulse" />
        </div>
      </section>
    );
  }

  if (status === 'streaming') {
    return (
      <section className="glass-panel rounded-2xl relative overflow-hidden ring-1 ring-neon/20">
        {/* Top streaming indicator */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
          </span>
          <span className="text-xs font-medium text-neon">{label}</span>
        </div>
        <div className="px-0">{children}</div>
      </section>
    );
  }

  // done
  return (
    <section className="relative">
      <div className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-neon text-black">
        <Check className="h-3 w-3" strokeWidth={3} />
      </div>
      {children}
    </section>
  );
}
