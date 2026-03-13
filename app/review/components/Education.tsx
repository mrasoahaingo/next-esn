
import { ExtractedCV } from '@/lib/schema';
import { Input } from '@/components/ui/Input';
import { Trash2, Plus } from 'lucide-react';

type EducationItem = ExtractedCV['education'][number];

interface EducationProps {
  data: Partial<EducationItem>[] | undefined;
  onChange: (data: Partial<EducationItem>[]) => void;
  readOnly?: boolean;
}

export function Education({ data, onChange, readOnly }: EducationProps) {
  const handleUpdate = (index: number, field: keyof EducationItem, value: string) => {
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
      ...(data || []),
      {
        degree: 'Degree',
        school: 'School',
        year: 'Year',
      },
    ]);
  };

  return (
    <section className="glass-panel p-6 rounded-2xl transition-colors">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
        <h2 className="text-lg font-semibold text-white">
          Education
        </h2>
        {!readOnly && (
          <button
            onClick={handleAdd}
            className="text-neon hover:text-neon/80 flex items-center text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Education
          </button>
        )}
      </div>

      <div className="space-y-4">
        {Array.isArray(data) && data.map((edu, i) => edu ? (
          <div key={i} className="flex justify-between items-start group border-b border-white/10 pb-4 last:border-0 last:pb-0">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
               {readOnly ? (
                   <>
                       <div className="col-span-2">
                            <div className="font-bold text-white">{edu.degree}</div>
                            <div className="text-slate-300">{edu.school}</div>
                       </div>
                       <div className="text-right">
                           <div className="text-sm font-medium text-slate-300 bg-white/10 px-2 py-1 rounded inline-block">{edu.year}</div>
                       </div>
                   </>
               ) : (
                   <>
                        <div className="col-span-2 space-y-2">
                            <Input 
                                value={edu.degree} 
                                onChange={(e) => handleUpdate(i, 'degree', e.target.value)} 
                                placeholder="Degree"
                                className="font-bold"
                            />
                             <Input 
                                value={edu.school} 
                                onChange={(e) => handleUpdate(i, 'school', e.target.value)} 
                                placeholder="School"
                            />
                        </div>
                        <div className="flex items-start gap-2 justify-end">
                            <Input 
                                value={edu.year} 
                                onChange={(e) => handleUpdate(i, 'year', e.target.value)} 
                                placeholder="Year"
                                className="w-24 text-center"
                            />
                             <button
                                onClick={() => handleRemove(i)}
                                className="text-gray-400 hover:text-red-500 p-2 mt-1"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                   </>
               )}
            </div>
          </div>
        ) : null)}
      </div>
    </section>
  );
}
