
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Sparkles, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { memo, useState } from 'react';
import type { ExtractedCV, Skill } from '@/lib/schema';

type SkillsData = Partial<ExtractedCV['skills']>;

interface SkillsProps {
  data: SkillsData | undefined;
  onChange: (data: SkillsData) => void;
  readOnly?: boolean;
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
            ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
            : 'border-accent/30 bg-accent/15 text-accent-foreground'
          : 'border-white/10 bg-white/5 text-muted-foreground opacity-60'
      }`}
    >
      {skill.starred && (
        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
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
  label,
  items,
  onAdd,
  onToggleAdded,
  readOnly,
}: {
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
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Ajouter..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button size="default" onClick={handleAdd}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
      {/* Added skills — included in PDF */}
      <div className="flex flex-wrap gap-1.5">
        {added.map((skill) => {
          const originalIndex = items.indexOf(skill);
          return (
            <button
              key={`${skill.name}-${originalIndex}`}
              onClick={() => !readOnly && onToggleAdded(originalIndex)}
              disabled={readOnly}
            >
              <SkillBadge skill={skill} />
            </button>
          );
        })}
      </div>
      {/* Not added — click to add to PDF */}
      {notAdded.length > 0 && (
        <>
          <button
            onClick={() => setShowOthers(!showOthers)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOthers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {notAdded.length} autre{notAdded.length > 1 ? 's' : ''}
          </button>
          {showOthers && (
            <div className="flex flex-wrap gap-1.5">
              {notAdded.map((skill) => {
                const originalIndex = items.indexOf(skill);
                return (
                  <button
                    key={`${skill.name}-${originalIndex}`}
                    onClick={() => !readOnly && onToggleAdded(originalIndex)}
                    disabled={readOnly}
                  >
                    <SkillBadge skill={skill} />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const Skills = memo(function Skills({ data, onChange, readOnly }: SkillsProps) {
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
      <h2 className="text-lg font-semibold mb-4 text-white border-b border-white/10 pb-2">
        Compétences
      </h2>
      <div className="space-y-4">
        {CATEGORIES.map((cat) => (
          <CategorySection
            key={cat.key}
            label={cat.label}
            items={normalizeItems(safeData[cat.key])}
            onAdd={(value) => handleAdd(cat.key, value)}
            onToggleAdded={(index) => handleToggleAdded(cat.key, index)}
            readOnly={readOnly}
          />
        ))}
      </div>
    </section>
  );
});
