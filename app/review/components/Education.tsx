import { memo } from 'react';
import { ExtractedCV } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Field, FieldLabel } from '@/components/ui/field';
import { Trash2, Plus } from 'lucide-react';
import { FIELD_LABEL_CLASS, SectionHeading } from './SectionHeading';

type EducationItem = ExtractedCV['education'][number];

interface EducationProps {
  data: Partial<EducationItem>[] | undefined;
  onChange: (data: Partial<EducationItem>[]) => void;
  readOnly?: boolean;
}

export const Education = memo(function Education({ data, onChange, readOnly }: EducationProps) {
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

  return (
    <section aria-labelledby="cv-section-education">
      <SectionHeading
        id="cv-section-education"
        title="Formations"
        action={
          !readOnly ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleAdd}>
              <Plus data-icon="inline-start" />
              Ajouter une formation
            </Button>
          ) : null
        }
      />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune formation.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((edu, i) =>
            edu ? (
              <li key={i} className="py-4 first:pt-0 last:pb-0">
                {readOnly ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{edu.degree}</p>
                      <p className="text-sm text-muted-foreground">{edu.school}</p>
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
                    <Field>
                      <FieldLabel htmlFor={`edu-spacing-${i}`} className={FIELD_LABEL_CLASS}>
                        Marge en dessous :{' '}
                        <span className="font-mono tabular-nums">{edu.spacingAfter ?? 0}&nbsp;pt</span>
                      </FieldLabel>
                      <Slider
                        id={`edu-spacing-${i}`}
                        min={0}
                        max={100}
                        step={2}
                        value={[edu.spacingAfter ?? 0]}
                        onValueChange={(v) => handleUpdate(i, 'spacingAfter', Array.isArray(v) ? v[0] : v)}
                      />
                    </Field>
                  </div>
                )}
              </li>
            ) : null,
          )}
        </ul>
      )}
    </section>
  );
});
