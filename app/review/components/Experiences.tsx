
import { ExtractedCV } from '@/lib/schema';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Trash2, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState } from 'react';

type ExperienceItem = ExtractedCV['experiences'][number];

interface ExperiencesProps {
  data: Partial<ExperienceItem>[] | undefined;
  onChange: (data: Partial<ExperienceItem>[]) => void;
  readOnly?: boolean;
}

export function Experiences({ data, onChange, readOnly }: ExperiencesProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleUpdate = (index: number, field: keyof ExperienceItem, value: string | string[]) => {
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
        role: 'New Role',
        company: 'Company',
        startDate: 'Present',
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
  }

  const handleAddDescription = (expIndex: number) => {
      const newData = [...(data || [])];
      const newDesc = [...(newData[expIndex].description || []), 'New task'];
      newData[expIndex].description = newDesc;
      onChange(newData);
  }

  const handleRemoveDescription = (expIndex: number, descIndex: number) => {
      const newData = [...(data || [])];
      const newDesc = [...(newData[expIndex].description || [])];
      newDesc.splice(descIndex, 1);
      newData[expIndex].description = newDesc;
      onChange(newData);
  }

  return (
    <section className="glass-panel p-6 rounded-2xl transition-colors">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
        <h2 className="text-lg font-semibold text-white">
          Experiences
        </h2>
        {!readOnly && (
          <button
            onClick={handleAdd}
            className="text-neon hover:text-neon/80 flex items-center text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Experience
          </button>
        )}
      </div>

      <div className="space-y-6">
        {Array.isArray(data) && data.map((exp, i) => exp ? (
          <div key={i} className="relative pl-4 border-l-2 border-white/15 hover:border-violet transition-colors group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                {readOnly ? (
                    <>
                        <h3 className="font-bold text-white text-lg">{exp.role}</h3>
                        <div className="text-violet-200 font-medium">{exp.company} {exp.location && `• ${exp.location}`}</div>
                    </>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <Input 
                            value={exp.role} 
                            onChange={(e) => handleUpdate(i, 'role', e.target.value)} 
                            placeholder="Role"
                            className="font-bold"
                        />
                         <Input 
                            value={exp.company} 
                            onChange={(e) => handleUpdate(i, 'company', e.target.value)} 
                            placeholder="Company"
                        />
                    </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                 {!readOnly ? (
                     <div className="flex flex-col items-end gap-1">
                        <Input 
                            value={exp.startDate} 
                            onChange={(e) => handleUpdate(i, 'startDate', e.target.value)} 
                            placeholder="Start"
                            className="w-24 text-xs py-1"
                        />
                        <Input 
                            value={exp.endDate || ''} 
                            onChange={(e) => handleUpdate(i, 'endDate', e.target.value)} 
                            placeholder="End"
                            className="w-24 text-xs py-1"
                        />
                     </div>
                 ) : (
                    <span className="text-sm font-medium text-slate-300 bg-white/10 px-2 py-1 rounded whitespace-nowrap">
                        {exp.startDate} - {exp.endDate || 'Present'}
                    </span>
                 )}
                
                <button
                    onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                    className="p-1 hover:bg-white/10 rounded text-slate-400"
                >
                    {expandedIndex === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {!readOnly && (
                  <button
                    onClick={() => handleRemove(i)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Description - Collapsible or always visible? Let's make it visible if readOnly, collapsible if editable? Or just simple. */}
            <div className={`mt-2 ${expandedIndex !== i && !readOnly ? 'hidden' : 'block'}`}>
                 <ul className="space-y-2">
                    {Array.isArray(exp.description) && exp.description.map((desc, j) => desc ? (
                        <li key={j} className="text-slate-200 text-sm flex items-start group/item">
                            <span className="mr-2 text-neon mt-1">•</span>
                            {readOnly ? (
                                <span>{desc}</span>
                            ) : (
                                <div className="flex-1 flex items-start gap-2">
                                    <Textarea 
                                        value={desc}
                                        onChange={(e) => handleDescriptionChange(i, j, e.target.value)}
                                        className="min-h-[60px] text-sm"
                                    />
                                    <button 
                                        onClick={() => handleRemoveDescription(i, j)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity mt-2"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </li>
                    ) : null)}
                 </ul>
                 {!readOnly && (
                     <button 
                        onClick={() => handleAddDescription(i)}
                        className="mt-2 text-xs text-violet-300 hover:text-violet-200 flex items-center"
                     >
                         <Plus className="w-3 h-3 mr-1" /> Add Task
                     </button>
                 )}
            </div>
          </div>
        ) : null)}
      </div>
    </section>
  );
}
