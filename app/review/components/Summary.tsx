
import { Textarea } from '@/components/ui/Textarea';

interface SummaryProps {
  data: string | undefined;
  onChange: (data: string) => void;
  readOnly?: boolean;
}

export function Summary({ data, onChange, readOnly }: SummaryProps) {
  return (
    <section className="glass-panel p-6 rounded-2xl transition-colors">
      <h2 className="text-lg font-semibold mb-4 text-white border-b border-white/10 pb-2">
        Professional Summary
      </h2>
      {readOnly ? (
        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
          {data}
        </p>
      ) : (
        <Textarea
          value={data || ''}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[150px]"
          placeholder="Enter professional summary..."
        />
      )}
    </section>
  );
}
