import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Sparkles, Star, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { memo, useState } from 'react';
import type { ExtractedCV, Skill } from '@/lib/schema';
import { CvSectionPanel, FIELD_LABEL_CLASS, type CvSectionStatus } from './CvSectionPanel';
import { SpacingSlider } from './SpacingSlider';
import { countIncludedSkills } from './count-included-skills';

type SkillsData = Partial<ExtractedCV['skills']>;

interface SkillsProps {
  data: SkillsData | undefined;
  onChange: (data: SkillsData) => void;
  readOnly?: boolean;
  spacingAfter?: number;
  onSpacingChange?: (value: number) => void;
  status?: CvSectionStatus;
  /** Dans le panneau « Dossier » à onglets : en-tête en simple ligne, sans contour. */
  embedded?: boolean;
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

function CategoryRow({
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
    <div className="space-y-2.5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className={FIELD_LABEL_CLASS}>
          {label}
          <span className="ml-1.5 font-mono font-normal tabular-nums">{added.length}</span>
        </p>
        {!readOnly && (
          <Field orientation="horizontal" className="w-auto flex-row items-center gap-1.5">
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
              className="h-7 w-40 text-[0.8rem] sm:w-52"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleAdd}
              aria-label={`Ajouter à ${label}`}
            >
              <Plus />
            </Button>
          </Field>
        )}
      </div>
      {/* Incluses dans le PDF */}
      {added.length > 0 ? <div className="flex flex-wrap gap-1.5">{added.map(toggleButton)}</div> : null}
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
            {notAdded.length} mise{notAdded.length > 1 ? 's' : ''} de côté
          </Button>
          {showOthers && <div className="flex flex-wrap gap-1.5">{notAdded.map(toggleButton)}</div>}
        </>
      )}
    </div>
  );
}

export const Skills = memo(function Skills({
  data,
  onChange,
  readOnly,
  spacingAfter,
  onSpacingChange,
  status,
  embedded,
}: SkillsProps) {
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

  const includedCount = countIncludedSkills(safeData);
  const rows = CATEGORIES.map((cat) => ({ ...cat, items: normalizeItems(safeData[cat.key]) })).filter(
    (cat) => cat.items.length > 0,
  );

  return (
    <CvSectionPanel
      id="cv-section-skills"
      title="Compétences"
      icon={Wrench}
      count={includedCount > 0 ? includedCount : undefined}
      status={status}
      embedded={embedded}
      flush
      footer={
        !readOnly && onSpacingChange ? (
          <SpacingSlider id="skills-spacing" value={spacingAfter} onChange={onSpacingChange} />
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          {readOnly ? 'Les compétences apparaîtront ici.' : 'Aucune compétence extraite.'}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((cat) => (
            <CategoryRow
              key={cat.key}
              categoryKey={cat.key}
              label={cat.label}
              items={cat.items}
              onAdd={(value) => handleAdd(cat.key, value)}
              onToggleAdded={(index) => handleToggleAdded(cat.key, index)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </CvSectionPanel>
  );
});
