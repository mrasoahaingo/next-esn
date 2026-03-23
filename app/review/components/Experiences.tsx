
import { ExtractedCV } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';
import { Trash2, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { memo, useState } from 'react';

type ExperienceItem = ExtractedCV['experiences'][number];

interface ExperiencesProps {
  data: Partial<ExperienceItem>[] | undefined;
  onChange: (data: Partial<ExperienceItem>[]) => void;
  readOnly?: boolean;
}

export const Experiences = memo(function Experiences({ data, onChange, readOnly }: ExperiencesProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleUpdate = (index: number, field: keyof ExperienceItem, value: string | string[] | number | number[]) => {
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
      {
        role: 'New Role',
        company: 'Company',
        startDate: 'Present',
        isCurrent: true,
        description: [],
      },
      ...(data || []),
    ]);
    setExpandedIndex(0);
  };

  const handleDescriptionChange = (expIndex: number, descIndex: number, value: string) => {
    const newData = [...(data || [])];
    const newDesc = [...(newData[expIndex].description || [])];
    newDesc[descIndex] = value;
    newData[expIndex].description = newDesc;
    onChange(newData);
  };

  const handleAddDescription = (expIndex: number) => {
    const newData = [...(data || [])];
    const newDesc = [...(newData[expIndex].description || []), 'New task'];
    newData[expIndex].description = newDesc;
    onChange(newData);
  };

  const handleRemoveDescription = (expIndex: number, descIndex: number) => {
    const newData = [...(data || [])];
    const newDesc = [...(newData[expIndex].description || [])];
    newDesc.splice(descIndex, 1);
    newData[expIndex].description = newDesc;
    onChange(newData);
  };

  return (
    <section className="glass-panel p-6 rounded-2xl transition-colors">
      <div className="flex justify-between items-center mb-4 border-b border-overlay/10 pb-2">
        <h2 className="text-lg font-semibold text-foreground">
          Experiences
        </h2>
        {!readOnly && (
          <Button variant="ghost" size="sm" onClick={handleAdd} className="text-primary">
            <Plus data-icon="inline-start" />
            Add Experience
          </Button>
        )}
      </div>

      <FieldGroup className="gap-6">
        {Array.isArray(data) && data.map((exp, i) => exp ? (
          <div key={`${exp.role}-${exp.company}-${exp.startDate}-${i}`} className="relative pl-4 border-l-2 border-border hover:border-accent transition-colors group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                {readOnly ? (
                  <>
                    <h3 className="font-bold text-foreground text-lg">{exp.role}</h3>
                    <div className="text-accent font-medium">{exp.company} {exp.location && `• ${exp.location}`}</div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <Field>
                      <FieldLabel htmlFor={`exp-role-${i}`} className="sr-only">Role</FieldLabel>
                      <Input
                        id={`exp-role-${i}`}
                        value={exp.role ?? ''}
                        onChange={(e) => handleUpdate(i, 'role', e.target.value)}
                        placeholder="Role"
                        className="font-bold"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`exp-company-${i}`} className="sr-only">Company</FieldLabel>
                      <Input
                        id={`exp-company-${i}`}
                        value={exp.company ?? ''}
                        onChange={(e) => handleUpdate(i, 'company', e.target.value)}
                        placeholder="Company"
                      />
                    </Field>
                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor={`exp-domain-${i}`} className="sr-only">Company domain</FieldLabel>
                      <Input
                        id={`exp-domain-${i}`}
                        value={exp.companyDomain ?? ''}
                        onChange={(e) => handleUpdate(i, 'companyDomain', e.target.value)}
                        placeholder="Domaine entreprise (ex: google.com)"
                        className="text-xs"
                      />
                    </Field>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                {!readOnly ? (
                  <div className="flex flex-col items-end gap-1">
                    <Field>
                      <FieldLabel htmlFor={`exp-start-${i}`} className="sr-only">Start date</FieldLabel>
                      <Input
                        id={`exp-start-${i}`}
                        value={exp.startDate ?? ''}
                        onChange={(e) => handleUpdate(i, 'startDate', e.target.value)}
                        placeholder="Start"
                        className="w-24 text-xs py-1"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`exp-end-${i}`} className="sr-only">End date</FieldLabel>
                      <Input
                        id={`exp-end-${i}`}
                        value={exp.endDate ?? ''}
                        onChange={(e) => handleUpdate(i, 'endDate', e.target.value)}
                        placeholder="End"
                        className="w-24 text-xs py-1"
                      />
                    </Field>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground bg-overlay/10 px-2 py-1 rounded whitespace-nowrap">
                    {exp.startDate} - {exp.endDate || 'Present'}
                  </span>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                  aria-expanded={expandedIndex === i}
                  aria-label={expandedIndex === i ? 'Collapse experience' : 'Expand experience'}
                >
                  {expandedIndex === i ? <ChevronUp /> : <ChevronDown />}
                </Button>

                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemove(i)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove experience"
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </div>

            <div className={`mt-2 ${expandedIndex !== i && !readOnly ? 'hidden' : 'block'}`}>
              <ul className="flex flex-col gap-2">
                {Array.isArray(exp.description) && exp.description.map((desc, j) => desc ? (
                  <li key={`${desc.slice(0, 30)}-${j}`} className="text-foreground text-sm flex items-start group/item">
                    <span className="mr-2 text-primary mt-1">•</span>
                    {readOnly ? (
                      <span>{desc}</span>
                    ) : (
                      <div className="flex-1 flex items-start gap-2">
                        <Field className="flex-1">
                          <FieldLabel htmlFor={`exp-desc-${i}-${j}`} className="sr-only">Task description</FieldLabel>
                          <Textarea
                            id={`exp-desc-${i}-${j}`}
                            value={desc}
                            onChange={(e) => handleDescriptionChange(i, j, e.target.value)}
                            className="min-h-[60px] text-sm"
                          />
                        </Field>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleRemoveDescription(i, j)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover/item:opacity-100 transition-opacity mt-2"
                          aria-label="Remove task"
                        >
                          <X />
                        </Button>
                      </div>
                    )}
                  </li>
                ) : null)}
              </ul>
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleAddDescription(i)}
                  className="mt-2 text-accent"
                >
                  <Plus data-icon="inline-start" />
                  Add Task
                </Button>
              )}
            </div>

            {!readOnly && (
              <Field className="mt-3">
                <FieldLabel htmlFor={`exp-spacing-${i}`} className="text-xs text-muted-foreground">
                  Marge en dessous : {exp.spacingAfter ?? 0} pt
                </FieldLabel>
                <Slider
                  id={`exp-spacing-${i}`}
                  min={0}
                  max={100}
                  step={2}
                  value={[exp.spacingAfter ?? 0]}
                  onValueChange={(v) => handleUpdate(i, 'spacingAfter', Array.isArray(v) ? v[0] : v)}
                />
              </Field>
            )}
          </div>
        ) : null)}
      </FieldGroup>
    </section>
  );
});
