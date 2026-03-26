import { cn } from '@/lib/utils';

/**
 * Tokens visuels partagés : react-markdown (fiche mission, aperçus) et Tiptap (MarkdownEditor).
 */
export const markdownDisplay = {
  h1: 'text-sm font-semibold text-foreground first:mt-0 mt-4 mb-2 border-b border-border/40 pb-1',
  h2: 'text-sm font-semibold text-foreground/95 first:mt-0 mt-3 mb-1.5',
  h3: 'text-xs font-semibold text-foreground/90 first:mt-0 mt-2.5 mb-1',
  p: 'mb-2 last:mb-0 text-xs leading-relaxed text-muted-foreground/90',
  ul: 'my-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground/90 last:mb-0',
  ol: 'my-2 list-decimal space-y-1 pl-4 text-xs text-muted-foreground/90 last:mb-0',
  li: 'leading-relaxed',
  strong: 'font-semibold text-foreground/90',
  em: 'italic text-muted-foreground',
  a: 'text-violet underline underline-offset-2 break-words hover:text-violet/80',
  code: 'rounded bg-overlay/10 px-1 py-0.5 font-mono text-[11px] text-foreground/90',
  pre: 'my-2 overflow-x-auto rounded-lg border border-border/50 bg-overlay/[0.06] p-3 text-[11px] text-muted-foreground',
  blockquote: 'my-2 border-l-2 border-violet/40 pl-3 text-xs italic text-muted-foreground/85',
  hr: 'my-4 border-border/60',
  tableScroll:
    'my-3 w-full max-w-full overflow-x-auto rounded-lg border border-border/45 bg-overlay/[0.04]',
  table: 'w-full min-w-max border-collapse text-left text-xs text-muted-foreground/95',
  th: 'border border-border/50 bg-overlay/[0.1] px-2.5 py-2 text-left align-top font-semibold text-foreground/90 whitespace-normal',
  td: 'border border-border/35 px-2.5 py-2 align-top text-xs leading-relaxed text-muted-foreground/90 break-words whitespace-normal',
} as const;

/**
 * Racine éditeur Tiptap : sélecteurs [&_*] alignés sur {@link markdownDisplay}.
 */
export const markdownEditorContentClass = cn(
  'max-w-none min-h-[180px] overflow-x-auto px-3 py-2 text-foreground focus:outline-none',
  '[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:border-b [&_h1]:border-border/40 [&_h1]:pb-1 [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:first:mt-0',
  '[&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground/95 [&_h2]:first:mt-0',
  '[&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-foreground/90 [&_h3]:first:mt-0',
  '[&_p]:mb-2 [&_p]:text-xs [&_p]:leading-relaxed [&_p]:text-muted-foreground/90 [&_p]:last:mb-0',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-4 [&_ul]:text-xs [&_ul]:text-muted-foreground/90 [&_ul]:last:mb-0',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-4 [&_ol]:text-xs [&_ol]:text-muted-foreground/90 [&_ol]:last:mb-0',
  '[&_li]:leading-relaxed',
  '[&_strong]:font-semibold [&_strong]:text-foreground/90',
  '[&_em]:italic [&_em]:text-muted-foreground',
  '[&_a]:break-words [&_a]:text-violet [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-violet/80',
  '[&_code]:rounded [&_code]:bg-overlay/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-foreground/90',
  '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border/50 [&_pre]:bg-overlay/[0.06] [&_pre]:p-3 [&_pre]:text-[11px] [&_pre]:text-muted-foreground',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
  '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-violet/40 [&_blockquote]:pl-3 [&_blockquote]:text-xs [&_blockquote]:italic [&_blockquote]:text-muted-foreground/85',
  '[&_hr]:my-4 [&_hr]:border-border/60',
  // Tableaux : même lecture que la fiche (scroll + bordures)
  '[&_.tableWrapper]:my-3 [&_.tableWrapper]:max-w-full [&_.tableWrapper]:overflow-x-auto [&_.tableWrapper]:rounded-lg [&_.tableWrapper]:border [&_.tableWrapper]:border-border/45 [&_.tableWrapper]:bg-overlay/[0.04]',
  '[&_table]:w-full [&_table]:min-w-max [&_table]:border-collapse [&_table]:text-left [&_table]:text-xs [&_table]:text-muted-foreground/95',
  '[&_th]:border [&_th]:border-border/50 [&_th]:bg-overlay/[0.1] [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_th]:align-top [&_th]:font-semibold [&_th]:text-foreground/90 [&_th]:whitespace-normal [&_th_p]:my-0',
  '[&_td]:border [&_td]:border-border/35 [&_td]:px-2.5 [&_td]:py-2 [&_td]:align-top [&_td]:text-xs [&_td]:leading-relaxed [&_td]:text-muted-foreground/90 [&_td]:break-words [&_td]:whitespace-normal [&_td_p]:my-0',
);
