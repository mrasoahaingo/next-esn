'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Search, RefreshCw, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface JobInputProps {
  jobDescription: string;
  onJobDescriptionChange: (text: string) => void;
  onAnalyze: () => void;
  onReAnalyze?: () => void;
  isAnalyzing: boolean;
  readOnly?: boolean;
  disabled?: boolean;
}

const PREVIEW_LENGTH = 180;

export function JobInput({
  jobDescription,
  onJobDescriptionChange,
  onAnalyze,
  onReAnalyze,
  isAnalyzing,
  readOnly = false,
  disabled,
}: JobInputProps) {
  const [expanded, setExpanded] = useState(false);

  if (readOnly) {
    const isTruncated = jobDescription.length > PREVIEW_LENGTH;
    const displayText = isTruncated && !expanded
      ? jobDescription.slice(0, PREVIEW_LENGTH) + '…'
      : jobDescription;

    return (
      <div className="flex items-start gap-3 rounded-xl border border-overlay/10 bg-overlay/[0.06] px-4 py-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap wrap-break-word">
            {displayText}
          </p>
          {isTruncated && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="h-3 w-3" /> Réduire</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> Voir tout</>
              )}
            </button>
          )}
        </div>
        {onReAnalyze && !isAnalyzing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReAnalyze}
            className="ml-2 shrink-0 text-violet hover:text-violet hover:bg-violet/10 h-7 px-2.5 text-xs"
          >
            <RefreshCw className="mr-1.5 h-3 w-3" />
            Relancer
          </Button>
        )}
        {isAnalyzing && (
          <div className="ml-2 flex items-center gap-1.5 text-xs text-violet shrink-0">
            <Loader2 className="h-3 w-3 animate-spin" />
            En cours…
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="glass-panel p-6 rounded-2xl">
      <h2 className="text-lg font-semibold mb-4 text-foreground border-b border-overlay/10 pb-2">
        Fiche de poste
      </h2>
      <Textarea
        value={jobDescription}
        onChange={(e) => onJobDescriptionChange(e.target.value)}
        placeholder="Collez ici la fiche de poste..."
        className="min-h-[160px] text-sm max-h-[400px]"
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
  );
}
