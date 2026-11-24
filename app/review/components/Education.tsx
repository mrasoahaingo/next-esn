import { memo } from 'react';
import { ExtractedCV } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Trash2, Plus, GraduationCap } from 'lucide-react';
import { CvSectionPanel, FIELD_LABEL_CLASS, type CvSectionStatus } from './CvSectionPanel';
import { SpacingSlider } from './SpacingSlider';

type EducationItem = ExtractedCV['education'][number];

interface EducationProps {
  data: Partial<EducationItem>[] | undefined;
  onChange: (data: Partial<EducationItem>[]) => void;
  readOnly?: boolean;
  status?: CvSectionStatus;
}

export const Education = memo(function Education({ data, onChange, readOnly, status }: EducationProps) {
  const handleUpdate = (index: number, field: keyof EducationItem, value: string | number) => {
    const newData = [...(data || [])];
    newData[index] = { ...newData[index], [field]: value };
    onChange(newData);
  };

  const handleRemove = (index: number) => {
    const newData = [...(data || [])];
    newData.splice(index, 1);
    onChange(newData);
  };

  const handleAdd = () => {
    onChange([...(data || []), { degree: '', school: '', year: '' }]);
  };

  const items = Array.isArray(data) ? data : [];
  const addButton = (
    <Button type="button" variant="ghost" size="sm" onClick={handleAdd}>
      <Plus data-icon="inline-start" />
      Ajouter
    </Button>
  );

  return (
    <CvSectionPanel
      id="cv-section-education"
      title="Formations"
      icon={GraduationCap}
      count={items.length > 0 ? items.length : undefined}
      status={status}
      flush
      actions={!readOnly && items.length > 0 ? addButton : undefined}
    >
      {items.length === 0 ? (
        readOnly ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Les formations apparaîtront ici.</p>
        ) : (
          <Empty className="py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="rounded-full">
                <GraduationCap className="size-5" />
              </EmptyMedia>
              <EmptyTitle>Aucune formation</EmptyTitle>
              <EmptyDescription>Le CV n’en mentionne pas. Vous pouvez en saisir une.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
                <Plus data-icon="inline-start" />
                Ajouter une formation
              </Button>
            </EmptyContent>
          </Empty>
        )
      ) : (
        <ul className="divide-y divide-border">
          {items.map((edu, i) =>
            edu ? (
              <li key={i} className="px-4 py-3">
                {readOnly ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{edu.degree}</p>
                      <p className="truncate text-sm text-muted-foreground">{edu.school}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{edu.year}</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
                      <Field>
                        <FieldLabel htmlFor={`edu-degree-${i}`} className={FIELD_LABEL_CLASS}>
                          Diplôme
                        </FieldLabel>
                        <Input
                          id={`edu-degree-${i}`}
                          value={edu.degree ?? ''}
                          onChange={(e) => handleUpdate(i, 'degree', e.target.value)}
                          placeholder="Master informatique"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`edu-school-${i}`} className={FIELD_LABEL_CLASS}>
                          École
                        </FieldLabel>
                        <Input
                          id={`edu-school-${i}`}
                          value={edu.school ?? ''}
                          onChange={(e) => handleUpdate(i, 'school', e.target.value)}
                          placeholder="Université de Lyon"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`edu-year-${i}`} className={FIELD_LABEL_CLASS}>
                          Année
                        </FieldLabel>
                        <Input
                          id={`edu-year-${i}`}
                          value={edu.year ?? ''}
                          onChange={(e) => handleUpdate(i, 'year', e.target.value)}
                          placeholder="2018"
                          className="font-mono tabular-nums"
                        />
                      </Field>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemove(i)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Supprimer cette formation"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    <SpacingSlider
                      id={`edu-spacing-${i}`}
                      value={edu.spacingAfter}
                      onChange={(v) => handleUpdate(i, 'spacingAfter', v)}
                    />
                  </div>
                )}
              </li>
            ) : null,
          )}
        </ul>
      )}
    </CvSectionPanel>
  );
});
