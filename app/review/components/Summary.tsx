import { memo } from 'react';
import { JobDescriptionMarkdown } from '@/components/job-description-markdown';
import { MarkdownEditor } from '@/components/markdown-editor';
import { Slider } from '@/components/ui/slider';
import { Field, FieldLabel } from '@/components/ui/field';
import { FIELD_LABEL_CLASS, SectionHeading } from './SectionHeading';

interface SummaryProps {
  data: string | undefined;
  onChange: (data: string) => void;
  readOnly?: boolean;
  spacingAfter?: number;
  onSpacingChange?: (value: number) => void;
}

export const Summary = memo(function Summary({ data, onChange, readOnly, spacingAfter, onSpacingChange }: SummaryProps) {
  return (
    <section aria-labelledby="cv-section-summary">
      <SectionHeading id="cv-section-summary" title="Résumé" />
      {readOnly ? (
        data?.trim() ? (
          <JobDescriptionMarkdown content={data} className="text-sm" />
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )
      ) : (
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="cv-summary-md" className="sr-only">
              Résumé professionnel (Markdown)
            </FieldLabel>
            <MarkdownEditor
              id="cv-summary-md"
              value={data ?? ''}
              onChange={onChange}
              placeholder="Résumé professionnel : gras, italique, titres, listes…"
            />
          </Field>
          {onSpacingChange && (
            <Field>
              <FieldLabel htmlFor="summary-spacing" className={FIELD_LABEL_CLASS}>
                Marge en dessous : <span className="font-mono tabular-nums">{spacingAfter ?? 0}&nbsp;pt</span>
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
        </div>
      )}
    </section>
  );
});
