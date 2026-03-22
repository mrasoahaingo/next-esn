
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
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
      <h2 className="text-lg font-semibold mb-4 text-foreground border-b border-overlay/10 pb-2">
        Strengths
      </h2>

      {!readOnly && (
        <FieldGroup className="mb-4 gap-3">
          <Field orientation="horizontal" className="flex-row items-end gap-2">
            <div className="min-w-0 flex-1">
              <FieldLabel htmlFor="new-strength" className="sr-only">
                Add a strength
              </FieldLabel>
              <Input
                id="new-strength"
                type="text"
                placeholder="Add a strength..."
                value={newStrength}
                onChange={(e) => setNewStrength(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button type="button" size="default" onClick={handleAdd} aria-label="Add strength">
              <Plus data-icon="inline-start" />
            </Button>
          </Field>
        </FieldGroup>
      )}

      <ul className="flex flex-col gap-2">
        {normalizedData.map((strength, i) => (
          <li key={i} className="flex items-start justify-between text-sm text-foreground group">
            <div className="flex items-start">
              <span className="mr-2 text-primary mt-1">•</span>
              {strength}
            </div>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => handleRemove(i)}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove strength"
              >
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
