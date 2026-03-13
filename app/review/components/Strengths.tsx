
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface StrengthsProps {
  data: (string | undefined)[] | undefined;
  onChange: (data: string[]) => void;
  readOnly?: boolean;
}

export function Strengths({ data, onChange, readOnly }: StrengthsProps) {
  const [newStrength, setNewStrength] = useState('');
  const normalizedData = (data || []).filter((item): item is string => Boolean(item));

  const handleAdd = () => {
    if (newStrength.trim()) {
      onChange([...normalizedData, newStrength.trim()]);
      setNewStrength('');
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
        Strengths
      </h2>

      {!readOnly && (
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="Add a strength..."
            value={newStrength}
            onChange={(e) => setNewStrength(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button size="default" onClick={handleAdd}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      )}

      <ul className="space-y-2">
        {normalizedData.map((strength, i) => (
          <li key={i} className="flex items-start justify-between text-sm text-slate-200 group">
            <div className="flex items-start">
              <span className="mr-2 text-primary mt-1">•</span>
              {strength}
            </div>
            {!readOnly && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleRemove(i)}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
