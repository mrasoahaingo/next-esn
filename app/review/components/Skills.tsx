import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Sparkles, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { memo, useState } from 'react';
import type { ExtractedCV, Skill } from '@/lib/schema';
import { FIELD_LABEL_CLASS, SectionHeading } from './SectionHeading';

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
  { key: 'softSkills', label: 'Savoir-être' },
  { key: 'expertises', label: 'Expertises' },
  { key: 'methodologies', label: 'Méthodologies' },
];

/**
 * Une compétence : incluse dans le PDF (filet plein, texte normal) ou mise de côté
 * (filet pointillé, gris, « + » pour l'ajouter). Une étoile = compétence clé ;
 * une étincelle = déduite par l'IA (info-bulle).
 */
function SkillBadge({ skill }: { skill: Skill }) {
  const isInferred = skill.source === 'inferred';
  const isAdded = skill.added;

  const badge = (
    <Badge
      variant="outline"
      className={
        isAdded
          ? 'gap-1 border-border bg-background text-foreground'
          : 'gap-1 border-dashed border-border bg-transparent text-muted-foreground'
      }
    >
      {skill.starred && <Star className="shrink-0 fill-current" aria-label="Compétence clé" />}
      {isInferred && <Sparkles className="shrink-0" />}
      {skill.name}
      {!isAdded && <Plus className="shrink-0" />}
    </Badge>
  );

  if (isInferred) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>{badge}</TooltipTrigger>
        <TooltipContent>Déduite par l&apos;IA</TooltipContent>
      </Tooltip>
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

  // Tri : incluses d'abord, puis clés, puis extraites avant déduites
  const sorted = [...items].sort((a, b) => {
    if (a.added !== b.added) return a.added ? -1 : 1;
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    if (a.source !== b.source) return a.source === 'extracted' ? -1 : 1;
    return 0;
  });

  const added = sorted.filter((s) => s.added);
  const notAdded = sorted.filter((s) => !s.added);

  if (added.length === 0 && notAdded.length === 0) return null;

  const toggleButton = (skill: Skill) => {
    const originalIndex = items.indexOf(skill);
    return (
      <Button
        key={`${skill.name}-${originalIndex}`}
        type="button"
        variant="ghost"
        className="h-auto rounded-full p-0 font-normal hover:bg-transparent"
        onClick={() => !readOnly && onToggleAdded(originalIndex)}
        disabled={readOnly}
        aria-pressed={skill.added}
        aria-label={skill.added ? `Retirer ${skill.name} du CV` : `Ajouter ${skill.name} au CV`}
      >
        <SkillBadge skill={skill} />
      </Button>
    );
  };

  return (
    <FieldGroup className="gap-2">
      <p className={FIELD_LABEL_CLASS}>{label}</p>
      {!readOnly && (
        <Field orientation="horizontal" className="flex-row items-end gap-2">
          <div className="min-w-0 flex-1">
            <FieldLabel htmlFor={`skill-add-${categoryKey}`} className="sr-only">
              Ajouter une compétence : {label}
            </FieldLabel>
            <Input
              id={`skill-add-${categoryKey}`}
              type="text"
              placeholder="Nouvelle compétence"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAdd}
            aria-label={`Ajouter à ${label}`}
          >
            <Plus />
          </Button>
        </Field>
      )}
      {/* Incluses dans le PDF */}
      <div className="flex flex-wrap gap-1.5">{added.map(toggleButton)}</div>
      {/* Mises de côté : un clic les inclut */}
      {notAdded.length > 0 && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => setShowOthers(!showOthers)}
            aria-expanded={showOthers}
          >
            {showOthers ? <ChevronUp /> : <ChevronDown />}
            {notAdded.length} autre{notAdded.length > 1 ? 's' : ''}
          </Button>
          {showOthers && <div className="flex flex-wrap gap-1.5">{notAdded.map(toggleButton)}</div>}
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
    <section aria-labelledby="cv-section-skills">
      <SectionHeading id="cv-section-skills" title="Compétences" />
      <FieldGroup className="gap-5">
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
        <Field className="mt-5">
          <FieldLabel htmlFor="skills-spacing" className={FIELD_LABEL_CLASS}>
            Marge en dessous : <span className="font-mono tabular-nums">{spacingAfter ?? 0}&nbsp;pt</span>
          </FieldLabel>
          <Slider
            id="skills-spacing"
            min={0}
            max={100}
            step={2}
            value={[spacingAfter ?? 0]}
            onValueChange={(v) => onSpacingChange(Array.isArray(v) ? v[0] : v)}
          />
        </Field>
      )}
    </section>
  );
});
