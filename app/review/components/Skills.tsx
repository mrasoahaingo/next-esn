
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

interface SkillsProps {
  data: (string | undefined)[] | undefined;
  onChange: (data: string[]) => void;
  readOnly?: boolean;
}

export function Skills({ data, onChange, readOnly }: SkillsProps) {
  const [newSkill, setNewSkill] = useState('');
  const normalizedData = (data || []).filter((item): item is string => Boolean(item));

  const handleAdd = () => {
    if (newSkill.trim()) {
      onChange([...normalizedData, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemove = (index: number) => {
    const newData = [...normalizedData];
    newData.splice(index, 1);
    onChange(newData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <section className="glass-panel p-6 rounded-2xl transition-colors">
      <h2 className="text-lg font-semibold mb-4 text-white border-b border-white/10 pb-2">
        Skills
      </h2>

      {!readOnly && (
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="Add a skill..."
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button size="default" onClick={handleAdd}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {normalizedData.map((skill, i) => (
          <Badge
            key={i}
            variant="outline"
            className="gap-1 border-accent/30 bg-accent/15 text-accent-foreground"
          >
            {skill}
            {!readOnly && (
              <button
                onClick={() => handleRemove(i)}
                className="hover:text-destructive transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
    </section>
  );
}
