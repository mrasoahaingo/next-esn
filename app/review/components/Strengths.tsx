
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
          <input
            type="text"
            className="flex-1 rounded-xl border border-white/10 bg-[#0d111b] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet/60"
            placeholder="Add a strength..."
            value={newStrength}
            onChange={(e) => setNewStrength(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleAdd}
            className="rounded-xl bg-neon p-2 text-black transition-colors hover:bg-neon/90"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {normalizedData.map((strength, i) => (
          <li key={i} className="flex items-start justify-between text-sm text-slate-200 group">
            <div className="flex items-start">
              <span className="mr-2 text-neon mt-1">•</span>
              {strength}
            </div>
            {!readOnly && (
              <button
                onClick={() => handleRemove(i)}
                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
