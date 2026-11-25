import { memo } from 'react';
import { AlignLeft } from 'lucide-react';
import { JobDescriptionMarkdown } from '@/components/job-description-markdown';
import { MarkdownEditor } from '@/components/markdown-editor';
import { Field, FieldLabel } from '@/components/ui/field';
import { CvSectionPanel, type CvSectionStatus } from './CvSectionPanel';
import { SpacingSlider } from './SpacingSlider';

interface SummaryProps {
  data: string | undefined;
  onChange: (data: string) => void;
  readOnly?: boolean;
  spacingAfter?: number;
  onSpacingChange?: (value: number) => void;
  status?: CvSectionStatus;
}

export const Summary = memo(function Summary({
  data,
  onChange,
  readOnly,
  spacingAfter,
  onSpacingChange,
  status,
}: SummaryProps) {
  return (
    <CvSectionPanel
      id="cv-section-summary"
      title="Résumé"
      icon={AlignLeft}
      status={status}
      footer={
        !readOnly && onSpacingChange ? (
          <SpacingSlider id="summary-spacing" value={spacingAfter} onChange={onSpacingChange} />
        ) : undefined
      }
    >
      {readOnly ? (
        data?.trim() ? (
          <JobDescriptionMarkdown content={data} className="text-sm" />
        ) : (
          <p className="text-sm text-muted-foreground">Le résumé apparaîtra ici.</p>
        )
      ) : (
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
      )}
    </CvSectionPanel>
  );
});
