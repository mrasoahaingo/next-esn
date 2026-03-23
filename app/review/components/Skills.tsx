
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Sparkles, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { memo, useState } from 'react';
import type { ExtractedCV, Skill } from '@/lib/schema';

type SkillsData = Partial<ExtractedCV['skills']>;

interface SkillsProps {
  data: SkillsData | undefined;
  onChange: (data: SkillsData) => void;
  readOnly?: boolean;
  spacingAfter?: number;
  onSpacingChange?: (value: number) => void;
}

const CATEGORIES: { key: keyof NonNullable<SkillsData>; label: string }[] = [
  { key: 'technologies', label: 'Technologies' },
  { key: 'softSkills', label: 'Soft-skills' },
  { key: 'expertises', label: 'Expertises' },
  { key: 'methodologies', label: 'Méthodologies' },
];

function SkillBadge({ skill }: { skill: Skill }) {
  const isInferred = skill.source === 'inferred';
  const isAdded = skill.added;

  const badge = (
    <Badge
      variant="outline"
      className={`gap-1 cursor-pointer transition-all ${
        isAdded
          ? isInferred
            ? 'border-accent/40 bg-muted text-accent dark:border-accent/30 dark:bg-accent/15 dark:text-accent-foreground'
            : 'border-accent/40 bg-muted text-foreground dark:border-accent/30 dark:bg-accent/15 dark:text-accent-foreground'
          : 'border-overlay/10 bg-overlay/[0.06] text-muted-foreground opacity-60'
      }`}
    >
      {skill.starred && (
        <Star className="w-3 h-3 shrink-0 fill-amber-600 text-amber-600 dark:fill-amber-400 dark:text-amber-400" />
      )}
      {isInferred && <Sparkles className="w-3 h-3 shrink-0" />}
      {skill.name}
      {!isAdded && <Plus className="w-3 h-3 shrink-0" />}
    </Badge>
  );

  if (isInferred) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>Déduite par l&apos;IA</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

function CategorySection({
  categoryKey,
  label,
  items,
  onAdd,
  onToggleAdded,
  readOnly,
}: {
  categoryKey: string;
  label: string;
  items: Skill[];
  onAdd: (value: string) => void;
  onToggleAdded: (index: number) => void;
  readOnly?: boolean;
}) {
  const [newItem, setNewItem] = useState('');
  const [showOthers, setShowOthers] = useState(false);

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  // Sort: added first, then starred first, then extracted before inferred
  const sorted = [...items].sort((a, b) => {
    if (a.added !== b.added) return a.added ? -1 : 1;
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    if (a.source !== b.source) return a.source === 'extracted' ? -1 : 1;
    return 0;
  });

  const added = sorted.filter((s) => s.added);
  const notAdded = sorted.filter((s) => !s.added);

  if (added.length === 0 && notAdded.length === 0) return null;

  return (
    <FieldGroup className="gap-2">
      <FieldLabel className="text-xs uppercase tracking-wider text-muted-foreground">{label}</FieldLabel>
      {!readOnly && (
        <Field orientation="horizontal" className="flex-row items-end gap-2">
          <div className="min-w-0 flex-1">
            <FieldLabel htmlFor={`skill-add-${categoryKey}`} className="sr-only">
              Ajouter une compétence — {label}
            </FieldLabel>
            <Input
              id={`skill-add-${categoryKey}`}
              type="text"
              placeholder="Ajouter..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button type="button" size="default" onClick={handleAdd} aria-label={`Ajouter ${label}`}>
            <Plus data-icon="inline-start" />
          </Button>
        </Field>
      )}
      {/* Added skills — included in PDF */}
      <div className="flex flex-wrap gap-1.5">
        {added.map((skill) => {
          const originalIndex = items.indexOf(skill);
          return (
            <Button
              key={`${skill.name}-${originalIndex}`}
              type="button"
              variant="ghost"
              className="h-auto p-0 font-normal hover:bg-transparent"
              onClick={() => !readOnly && onToggleAdded(originalIndex)}
              disabled={readOnly}
            >
              <SkillBadge skill={skill} />
            </Button>
          );
        })}
      </div>
      {/* Not added — click to add to PDF */}
      {notAdded.length > 0 && (
        <>
          <Button
            type="button"
            variant="ghost"
            className="h-auto justify-start gap-1.5 p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowOthers(!showOthers)}
          >
            {showOthers ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {notAdded.length} autre{notAdded.length > 1 ? 's' : ''}
          </Button>
          {showOthers && (
            <div className="flex flex-wrap gap-1.5">
              {notAdded.map((skill) => {
                const originalIndex = items.indexOf(skill);
                return (
                  <Button
                    key={`${skill.name}-${originalIndex}`}
                    type="button"
                    variant="ghost"
                    className="h-auto p-0 font-normal hover:bg-transparent"
                    onClick={() => !readOnly && onToggleAdded(originalIndex)}
                    disabled={readOnly}
                  >
                    <SkillBadge skill={skill} />
                  </Button>
                );
              })}
            </div>
          )}
        </>
      )}
    </FieldGroup>
  );
}

export const Skills = memo(function Skills({ data, onChange, readOnly, spacingAfter, onSpacingChange }: SkillsProps) {
  const safeData = data ?? {};

  const normalizeItems = (items: (Skill | string)[] | undefined): Skill[] =>
    (items ?? []).filter(Boolean).map((item) =>
      typeof item === 'string'
        ? { name: item, source: 'extracted' as const, starred: true, added: true }
        : { ...item, starred: item.starred ?? true, added: item.added ?? item.starred ?? true }
    );

  const handleAdd = (key: keyof NonNullable<SkillsData>, value: string) => {
    const current = normalizeItems(safeData[key]);
    onChange({ ...safeData, [key]: [...current, { name: value, source: 'extracted', starred: false, added: true }] });
  };

  const handleToggleAdded = (key: keyof NonNullable<SkillsData>, index: number) => {
    const current = [...normalizeItems(safeData[key])];
    current[index] = { ...current[index], added: !current[index].added };
    onChange({ ...safeData, [key]: current });
  };

  return (
    <section className="glass-panel p-6 rounded-2xl transition-colors">
      <h2 className="text-lg font-semibold mb-4 text-foreground border-b border-overlay/10 pb-2">
        Compétences
      </h2>
      <FieldGroup className="gap-4">
        {CATEGORIES.map((cat) => (
          <CategorySection
            key={cat.key}
            categoryKey={cat.key}
            label={cat.label}
            items={normalizeItems(safeData[cat.key])}
            onAdd={(value) => handleAdd(cat.key, value)}
            onToggleAdded={(index) => handleToggleAdded(cat.key, index)}
            readOnly={readOnly}
          />
        ))}
      </FieldGroup>
      {!readOnly && onSpacingChange && (
        <Field className="mt-4">
          <FieldLabel htmlFor="skills-spacing" className="text-xs text-muted-foreground">
            Marge en dessous : {spacingAfter ?? 0} pt
          </FieldLabel>
          <Slider
            id="skills-spacing"
            min={0}
            max={100}
            step={2}
            value={[spacingAfter ?? 0]}
            onValueChange={(v) => onSpacingChange(v)}
          />
        </Field>
      )}
    </section>
  );
});
