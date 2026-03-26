import { memo } from 'react';
import { JobDescriptionMarkdown } from '@/components/job-description-markdown';
import { MarkdownEditor } from '@/components/markdown-editor';
import { Slider } from '@/components/ui/slider';
import { Field, FieldLabel } from '@/components/ui/field';

interface SummaryProps {
  data: string | undefined;
  onChange: (data: string) => void;
  readOnly?: boolean;
  spacingAfter?: number;
  onSpacingChange?: (value: number) => void;
}

export const Summary = memo(function Summary({ data, onChange, readOnly, spacingAfter, onSpacingChange }: SummaryProps) {
  return (
    <section className="glass-panel p-6 rounded-2xl transition-colors">
      <h2 className="text-lg font-semibold mb-4 text-foreground border-b border-overlay/10 pb-2">
        Professional Summary
      </h2>
      {readOnly ? (
        data?.trim() ? (
          <JobDescriptionMarkdown
            content={data}
            className="[&_p]:text-foreground/90 [&_li]:text-foreground/85 [&_ul]:text-foreground/85 [&_ol]:text-foreground/85 [&_td]:text-foreground/85 [&_th]:text-foreground"
          />
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )
      ) : (
        <>
          <Field>
            <FieldLabel htmlFor="cv-summary-md" className="sr-only">
              Résumé professionnel (Markdown)
            </FieldLabel>
            <MarkdownEditor
              id="cv-summary-md"
              value={data ?? ''}
              onChange={onChange}
              placeholder="Résumé professionnel — gras, italique, titres, listes…"
              className="border-overlay/15 bg-panel/30"
            />
          </Field>
          {onSpacingChange && (
            <Field className="mt-3">
              <FieldLabel htmlFor="summary-spacing" className="text-xs text-muted-foreground">
                Marge en dessous : {spacingAfter ?? 0} pt
              </FieldLabel>
              <Slider
                id="summary-spacing"
                min={0}
                max={100}
                step={2}
                value={[spacingAfter ?? 0]}
                onValueChange={(v) => onSpacingChange(Array.isArray(v) ? v[0] : v)}
              />
            </Field>
          )}
        </>
      )}
    </section>
  );
});
