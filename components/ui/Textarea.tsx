
import React, { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "w-full rounded-xl border border-white/10 bg-[#0d111b] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet/60 focus:border-transparent transition-colors min-h-[100px]",
            error && "border-red-500/60 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
