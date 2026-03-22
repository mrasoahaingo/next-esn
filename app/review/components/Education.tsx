
import { memo } from 'react';
import { ExtractedCV } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Trash2, Plus } from 'lucide-react';

type EducationItem = ExtractedCV['education'][number];

interface EducationProps {
  data: Partial<EducationItem>[] | undefined;
  onChange: (data: Partial<EducationItem>[]) => void;
  readOnly?: boolean;
}

export const Education = memo(function Education({ data, onChange, readOnly }: EducationProps) {
  const handleUpdate = (index: number, field: keyof EducationItem, value: string) => {
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
    onChange([
      ...(data || []),
      {
        degree: 'Degree',
        school: 'School',
        year: 'Year',
      },
    ]);
  };

  return (
    <section className="glass-panel p-6 rounded-2xl transition-colors">
      <div className="flex justify-between items-center mb-4 border-b border-overlay/10 pb-2">
        <h2 className="text-lg font-semibold text-foreground">
          Education
        </h2>
        {!readOnly && (
          <Button variant="ghost" size="sm" onClick={handleAdd} className="text-primary">
            <Plus data-icon="inline-start" />
            Add Education
          </Button>
        )}
      </div>

      <FieldGroup className="gap-4">
        {Array.isArray(data) && data.map((edu, i) => edu ? (
          <div key={i} className="flex justify-between items-start group border-b border-overlay/10 pb-4 last:border-0 last:pb-0">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              {readOnly ? (
                <>
                  <div className="col-span-2">
                    <div className="font-bold text-foreground">{edu.degree}</div>
                    <div className="text-muted-foreground">{edu.school}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-muted-foreground bg-overlay/10 px-2 py-1 rounded inline-block">{edu.year}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-2 flex flex-col gap-2">
                    <Field>
                      <FieldLabel htmlFor={`edu-degree-${i}`} className="sr-only">Degree</FieldLabel>
                      <Input
                        id={`edu-degree-${i}`}
                        value={edu.degree ?? ''}
                        onChange={(e) => handleUpdate(i, 'degree', e.target.value)}
                        placeholder="Degree"
                        className="font-bold"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`edu-school-${i}`} className="sr-only">School</FieldLabel>
                      <Input
                        id={`edu-school-${i}`}
                        value={edu.school ?? ''}
                        onChange={(e) => handleUpdate(i, 'school', e.target.value)}
                        placeholder="School"
                      />
                    </Field>
                  </div>
                  <div className="flex items-start gap-2 justify-end">
                    <Field>
                      <FieldLabel htmlFor={`edu-year-${i}`} className="sr-only">Year</FieldLabel>
                      <Input
                        id={`edu-year-${i}`}
                        value={edu.year ?? ''}
                        onChange={(e) => handleUpdate(i, 'year', e.target.value)}
                        placeholder="Year"
                        className="w-24 text-center"
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemove(i)}
                      className="text-muted-foreground hover:text-destructive mt-1"
                      aria-label="Remove education entry"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null)}
      </FieldGroup>
    </section>
  );
});
