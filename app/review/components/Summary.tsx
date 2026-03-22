
import { memo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';

interface SummaryProps {
  data: string | undefined;
  onChange: (data: string) => void;
  readOnly?: boolean;
}

export const Summary = memo(function Summary({ data, onChange, readOnly }: SummaryProps) {
  return (
    <section className="glass-panel p-6 rounded-2xl transition-colors">
      <h2 className="text-lg font-semibold mb-4 text-foreground border-b border-overlay/10 pb-2">
        Professional Summary
      </h2>
      {readOnly ? (
        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
          {data}
        </p>
      ) : (
        <Field>
          <FieldLabel htmlFor="cv-summary" className="sr-only">
            Professional summary
          </FieldLabel>
          <Textarea
            id="cv-summary"
            value={data ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[150px]"
            placeholder="Enter professional summary..."
          />
        </Field>
      )}
    </section>
  );
});
