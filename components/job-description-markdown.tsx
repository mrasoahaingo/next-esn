'use client';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { markdownDisplay } from '@/lib/markdown-display-classes';
import { cn } from '@/lib/utils';

const markdownComponents: Components = {
  h1: ({ className, ...props }) => <h1 className={cn(markdownDisplay.h1, className)} {...props} />,
  h2: ({ className, ...props }) => <h2 className={cn(markdownDisplay.h2, className)} {...props} />,
  h3: ({ className, ...props }) => <h3 className={cn(markdownDisplay.h3, className)} {...props} />,
  p: ({ className, ...props }) => <p className={cn(markdownDisplay.p, className)} {...props} />,
  ul: ({ className, ...props }) => <ul className={cn(markdownDisplay.ul, className)} {...props} />,
  ol: ({ className, ...props }) => <ol className={cn(markdownDisplay.ol, className)} {...props} />,
  li: ({ className, ...props }) => <li className={cn(markdownDisplay.li, className)} {...props} />,
  strong: ({ className, ...props }) => (
    <strong className={cn(markdownDisplay.strong, className)} {...props} />
  ),
  em: ({ className, ...props }) => <em className={cn(markdownDisplay.em, className)} {...props} />,
  a: ({ className, ...props }) => (
    <a
      className={cn(markdownDisplay.a, className)}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code className={cn(markdownDisplay.code, className)} {...props} />
  ),
  pre: ({ className, ...props }) => (
    <pre className={cn(markdownDisplay.pre, className)} {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote className={cn(markdownDisplay.blockquote, className)} {...props} />
  ),
  hr: ({ className, ...props }) => <hr className={cn(markdownDisplay.hr, className)} {...props} />,
  table: ({ children, className, ...props }) => (
    <div className={markdownDisplay.tableScroll}>
      <table className={cn(markdownDisplay.table, className)} {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ className, ...props }) => <thead className={cn(className)} {...props} />,
  tbody: ({ className, ...props }) => <tbody className={cn(className)} {...props} />,
  tr: ({ className, ...props }) => <tr className={cn(className)} {...props} />,
  th: ({ className, ...props }) => <th className={cn(markdownDisplay.th, className)} {...props} />,
  td: ({ className, ...props }) => <td className={cn(markdownDisplay.td, className)} {...props} />,
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
