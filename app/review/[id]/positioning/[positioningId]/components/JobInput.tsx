'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';

interface JobInputProps {
  jobDescription: string;
  onJobDescriptionChange: (text: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  disabled?: boolean;
}

export function JobInput({
  jobDescription,
  onJobDescriptionChange,
  onAnalyze,
  isAnalyzing,
  disabled,
}: JobInputProps) {
  return (
    <div className="space-y-4">
      <section className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-semibold mb-4 text-white border-b border-white/10 pb-2">
          Fiche de poste
        </h2>
        <Textarea
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          placeholder="Collez ici la fiche de poste..."
          className="min-h-[300px] text-sm"
          disabled={isAnalyzing || disabled}
        />
        <div className="mt-4 flex justify-end">
          <Button
            onClick={onAnalyze}
            disabled={!jobDescription.trim() || isAnalyzing || disabled}
          >
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {isAnalyzing ? 'Analyse en cours...' : 'Analyser le matching'}
          </Button>
        </div>
      </section>
    </div>
  );
}
