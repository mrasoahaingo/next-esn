import { ExtractedCV, Skill } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Trash2, Plus, ChevronDown, ChevronUp, X, Briefcase } from 'lucide-react';
import { memo, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CvSectionPanel, FIELD_LABEL_CLASS, type CvSectionStatus } from './CvSectionPanel';
import { SpacingSlider } from './SpacingSlider';

type ExperienceItem = ExtractedCV['experiences'][number];
type SkillsData = ExtractedCV['skills'];

interface ExperiencesProps {
  data: Partial<ExperienceItem>[] | undefined;
  onChange: (data: Partial<ExperienceItem>[]) => void;
  skills?: Partial<SkillsData>;
  onSkillsChange?: (skills: Partial<SkillsData>) => void;
  readOnly?: boolean;
  status?: CvSectionStatus;
  /** Dans le panneau « Dossier » à onglets : en-tête en simple ligne, sans contour. */
  embedded?: boolean;
}

function getAllSkillNames(skills: Partial<SkillsData> | undefined): string[] {
  if (!skills) return [];
  const all: string[] = [];
  for (const cat of ['technologies', 'softSkills', 'expertises', 'methodologies'] as const) {
    const items = skills[cat];
    if (Array.isArray(items)) {
      for (const s of items) {
        const name = typeof s === 'string' ? s : s.name;
        if (name) all.push(name);
      }
    }
  }
  return all;
}

function ExperienceSkills({
  expIndex,
  expSkills,
  globalSkills,
  onAdd,
  onRemove,
}: {
  expIndex: number;
  expSkills: string[];
  globalSkills: Partial<SkillsData> | undefined;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const allNames = getAllSkillNames(globalSkills);
  const suggestions = input.trim()
    ? allNames.filter(
        (n) => n.toLowerCase().includes(input.toLowerCase()) && !expSkills.includes(n)
      )
    : [];

  const handleAdd = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || expSkills.includes(trimmed)) return;
    onAdd(trimmed);
    setInput('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd(input);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Fermer les suggestions au clic à l'extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="space-y-2">
      <p className={FIELD_LABEL_CLASS}>Compétences mobilisées</p>
      {expSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {expSkills.map((name) => (
            <Badge key={name} variant="outline" className="gap-1 border-border bg-background pr-1 text-foreground">
              {name}
              <button
                type="button"
                onClick={() => onRemove(name)}
                aria-label={`Retirer ${name}`}
                className="rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div ref={containerRef} className="relative">
        <Field orientation="horizontal" className="flex-row items-end gap-2">
          <div className="min-w-0 flex-1">
            <FieldLabel htmlFor={`exp-skill-add-${expIndex}`} className="sr-only">
              Ajouter une compétence à cette expérience
            </FieldLabel>
            <Input
              id={`exp-skill-add-${expIndex}`}
              type="text"
              placeholder="Compétence mobilisée"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleAdd(input)}
            aria-label="Ajouter cette compétence"
          >
            <Plus />
          </Button>
        </Field>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md">
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAdd(name);
                  }}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Période d'une expérience, en mono : « 01/2022 – Aujourd’hui ». */
function formatPeriod(exp: Partial<ExperienceItem>): string {
  const start = exp.startDate?.trim();
  const end = exp.endDate?.trim() || 'Aujourd’hui';
  if (!start) return '';
  return `${start} – ${end}`;
}

export const Experiences = memo(function Experiences({
  data,
  onChange,
  skills,
  onSkillsChange,
  readOnly,
  status,
  embedded,
}: ExperiencesProps) {
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
        role: '',
        company: '',
        startDate: '',
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
    const newDesc = [...(newData[expIndex].description || []), ''];
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

  const handleAddSkill = (expIndex: number, name: string) => {
    const newData = [...(data || [])];
    const current = newData[expIndex].skills ?? [];
    newData[expIndex] = { ...newData[expIndex], skills: [...current, name] };
    onChange(newData);

    // Ajout au référentiel global s'il n'y est pas déjà
    if (onSkillsChange && skills) {
      const allNames = getAllSkillNames(skills);
      if (!allNames.includes(name)) {
        const currentTech = (skills.technologies ?? []) as Skill[];
        const newSkill: Skill = { name, source: 'extracted', starred: false, added: true };
        onSkillsChange({ ...skills, technologies: [...currentTech, newSkill] });
      }
    }
  };

  const handleRemoveSkill = (expIndex: number, name: string) => {
    const newData = [...(data || [])];
    const current = newData[expIndex].skills ?? [];
    newData[expIndex] = { ...newData[expIndex], skills: current.filter((s) => s !== name) };
    onChange(newData);
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
      id="cv-section-experiences"
      title="Expériences"
      icon={Briefcase}
      count={items.length > 0 ? items.length : undefined}
      status={status}
      embedded={embedded}
      flush
      actions={!readOnly && items.length > 0 ? addButton : undefined}
    >
      {items.length === 0 ? (
        readOnly ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Les expériences apparaîtront ici.</p>
        ) : (
          <Empty className="py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="rounded-full">
                <Briefcase className="size-5" />
              </EmptyMedia>
              <EmptyTitle>Aucune expérience</EmptyTitle>
              <EmptyDescription>Le CV n’en mentionne pas. Vous pouvez en saisir une.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
                <Plus data-icon="inline-start" />
                Ajouter une expérience
              </Button>
            </EmptyContent>
          </Empty>
        )
      ) : (
        <ul className="divide-y divide-border">
          {items.map((exp, i) => {
            if (!exp) return null;
            const expanded = readOnly || expandedIndex === i;
            const period = formatPeriod(exp);
            const role = exp.role?.trim();
            const company = exp.company?.trim();
            const missionCount = Array.isArray(exp.description)
              ? exp.description.filter((d) => d != null).length
              : 0;
            return (
              <li key={i} className="px-4 py-3">
                {/* En-tête de ligne : poste, entreprise · lieu, dates en mono ; chevron et corbeille à droite */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className={cn('truncate text-sm font-medium', role ? 'text-foreground' : 'text-muted-foreground')}>
                      {role || (readOnly ? '—' : 'Nouvelle expérience')}
                    </h3>
                    <p className="truncate text-sm text-muted-foreground">
                      {company || (readOnly ? '' : 'Entreprise à renseigner')}
                      {company && exp.location ? ` · ${exp.location}` : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {period ? (
                      <span className="mr-2 hidden whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground sm:inline">
                        {period}
                      </span>
                    ) : null}
                    {!readOnly && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setExpandedIndex(expanded ? null : i)}
                          aria-expanded={expanded}
                          aria-controls={`exp-details-${i}`}
                          aria-label={expanded ? 'Replier l’expérience' : 'Déplier l’expérience'}
                        >
                          {expanded ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemove(i)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Supprimer cette expérience"
                        >
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {period ? (
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground sm:hidden">{period}</p>
                ) : null}
                {!readOnly && !expanded && missionCount > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {missionCount} mission{missionCount > 1 ? 's' : ''}
                    {exp.skills?.length ? ` · ${exp.skills.length} compétence${exp.skills.length > 1 ? 's' : ''}` : ''}
                  </p>
                ) : null}

                {/* Dépliant : tous les champs ; en lecture, les missions seulement */}
                <div id={`exp-details-${i}`} className={cn('mt-3 space-y-4', !expanded && 'hidden')}>
                  {!readOnly && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`exp-role-${i}`} className={FIELD_LABEL_CLASS}>
                          Poste
                        </FieldLabel>
                        <Input
                          id={`exp-role-${i}`}
                          value={exp.role ?? ''}
                          onChange={(e) => handleUpdate(i, 'role', e.target.value)}
                          placeholder="Tech lead Java"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`exp-company-${i}`} className={FIELD_LABEL_CLASS}>
                          Entreprise
                        </FieldLabel>
                        <Input
                          id={`exp-company-${i}`}
                          value={exp.company ?? ''}
                          onChange={(e) => handleUpdate(i, 'company', e.target.value)}
                          placeholder="Nom du client"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`exp-start-${i}`} className={FIELD_LABEL_CLASS}>
                          Début
                        </FieldLabel>
                        <Input
                          id={`exp-start-${i}`}
                          value={exp.startDate ?? ''}
                          onChange={(e) => handleUpdate(i, 'startDate', e.target.value)}
                          placeholder="01/2022"
                          className="font-mono tabular-nums"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`exp-end-${i}`} className={FIELD_LABEL_CLASS}>
                          Fin
                        </FieldLabel>
                        <Input
                          id={`exp-end-${i}`}
                          value={exp.endDate ?? ''}
                          onChange={(e) => handleUpdate(i, 'endDate', e.target.value)}
                          placeholder="Aujourd’hui"
                          className="font-mono tabular-nums"
                        />
                      </Field>
                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor={`exp-domain-${i}`} className={FIELD_LABEL_CLASS}>
                          Domaine de l&apos;entreprise
                        </FieldLabel>
                        <Input
                          id={`exp-domain-${i}`}
                          value={exp.companyDomain ?? ''}
                          onChange={(e) => handleUpdate(i, 'companyDomain', e.target.value)}
                          placeholder="client.fr"
                          className="font-mono"
                        />
                      </Field>
                    </div>
                  )}

                  <div className="space-y-2">
                    {!readOnly && <p className={FIELD_LABEL_CLASS}>Missions</p>}
                    <ul className="space-y-2">
                      {Array.isArray(exp.description) &&
                        exp.description.map((desc, j) =>
                          desc != null ? (
                            <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                              {readOnly ? (
                                <>
                                  <span className="mt-px select-none text-muted-foreground" aria-hidden="true">
                                    •
                                  </span>
                                  <span>{desc}</span>
                                </>
                              ) : (
                                <>
                                  <Field className="flex-1">
                                    <FieldLabel htmlFor={`exp-desc-${i}-${j}`} className="sr-only">
                                      Mission {j + 1}
                                    </FieldLabel>
                                    <Textarea
                                      id={`exp-desc-${i}-${j}`}
                                      value={desc}
                                      onChange={(e) => handleDescriptionChange(i, j, e.target.value)}
                                      className="min-h-16 text-sm"
                                    />
                                  </Field>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleRemoveDescription(i, j)}
                                    className="mt-0.5 text-muted-foreground hover:text-destructive"
                                    aria-label={`Supprimer la mission ${j + 1}`}
                                  >
                                    <X />
                                  </Button>
                                </>
                              )}
                            </li>
                          ) : null,
                        )}
                    </ul>
                    {!readOnly && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleAddDescription(i)}>
                        <Plus data-icon="inline-start" />
                        Ajouter une mission
                      </Button>
                    )}
                  </div>

                  {!readOnly && (
                    <ExperienceSkills
                      expIndex={i}
                      expSkills={exp.skills ?? []}
                      globalSkills={skills}
                      onAdd={(name) => handleAddSkill(i, name)}
                      onRemove={(name) => handleRemoveSkill(i, name)}
                    />
                  )}

                  {!readOnly && (
                    <SpacingSlider
                      id={`exp-spacing-${i}`}
                      value={exp.spacingAfter}
                      onChange={(v) => handleUpdate(i, 'spacingAfter', v)}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CvSectionPanel>
  );
});
