
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
          <input
            type="text"
            className="flex-1 rounded-xl border border-white/10 bg-[#0d111b] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet/60"
            placeholder="Add a skill..."
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
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

      <div className="flex flex-wrap gap-2">
        {normalizedData.map((skill, i) => (
          <span
            key={i}
            className="group flex items-center gap-1 rounded-full border border-violet/30 bg-violet/15 px-3 py-1 text-sm font-medium text-violet-100"
          >
            {skill}
            {!readOnly && (
              <button
                onClick={() => handleRemove(i)}
                className="hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>
    </section>
  );
}
