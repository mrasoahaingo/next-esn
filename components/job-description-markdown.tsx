'use client';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const markdownComponents: Components = {
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        'text-sm font-semibold text-foreground first:mt-0 mt-4 mb-2 border-b border-border/40 pb-1',
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn('text-sm font-semibold text-foreground/95 first:mt-0 mt-3 mb-1.5', className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn('text-xs font-semibold text-foreground/90 first:mt-0 mt-2.5 mb-1', className)}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p className={cn('mb-2 last:mb-0 text-xs leading-relaxed text-muted-foreground/90', className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn('my-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground/90 last:mb-0', className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn('my-2 list-decimal space-y-1 pl-4 text-xs text-muted-foreground/90 last:mb-0', className)}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn('leading-relaxed', className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong className={cn('font-semibold text-foreground/90', className)} {...props} />
  ),
  em: ({ className, ...props }) => (
    <em className={cn('italic text-muted-foreground', className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn(
        'text-violet underline underline-offset-2 break-words hover:text-violet/80',
        className,
      )}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code
      className={cn(
        'rounded bg-overlay/10 px-1 py-0.5 font-mono text-[11px] text-foreground/90',
        className,
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        'my-2 overflow-x-auto rounded-lg border border-border/50 bg-overlay/[0.06] p-3 text-[11px] text-muted-foreground',
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        'my-2 border-l-2 border-violet/40 pl-3 text-xs italic text-muted-foreground/85',
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn('my-4 border-border/60', className)} {...props} />
  ),
  table: ({ children, className, ...props }) => (
    <div className="my-3 w-full max-w-full overflow-x-auto rounded-lg border border-border/45 bg-overlay/[0.04]">
      <table
        className={cn(
          'w-full min-w-max border-collapse text-left text-xs text-muted-foreground/95',
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead className={cn(className)} {...props} />
  ),
  tbody: ({ className, ...props }) => (
    <tbody className={cn(className)} {...props} />
  ),
  tr: ({ className, ...props }) => (
    <tr className={cn(className)} {...props} />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        'border border-border/50 bg-overlay/[0.1] px-2.5 py-2 text-left align-top font-semibold text-foreground/90 whitespace-normal',
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        'border border-border/35 px-2.5 py-2 align-top text-xs leading-relaxed text-muted-foreground/90 break-words whitespace-normal',
        className,
      )}
      {...props}
    />
  ),
};

export type JobDescriptionMarkdownProps = {
  content: string;
  /** Classes sur le conteneur racine */
  className?: string;
  /** Ex. line-clamp-6 ou max-h + overflow-hidden */
  clampClassName?: string;
};

/**
 * Rendu Markdown pour les fiches de poste (transcription LLM, saisie avec ## / listes).
 */
export function JobDescriptionMarkdown({ content, className, clampClassName }: JobDescriptionMarkdownProps) {
  const trimmed = content?.trim() ?? '';
  if (!trimmed) {
    return <p className="text-xs text-muted-foreground/60">—</p>;
  }

  return (
    <div
      className={cn(
        'min-w-0 wrap-break-word [&_a]:break-words [&_img]:max-w-full',
        clampClassName,
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
