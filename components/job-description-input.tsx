'use client';

import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { Upload, Loader2, FileUp, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownEditor } from '@/components/markdown-editor';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const MAX_JOB_DESCRIPTION_CHARS = 50_000;
const ACCEPT =
  '.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

function isPlainTextJobFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'txt') return true;
  if (file.type === 'text/plain' || file.type.startsWith('text/plain;')) return true;
  return false;
}

export type JobDescriptionInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Classes sur le textarea (hauteur, etc.) */
  textareaClassName?: string;
  /** Conteneur autour du bloc */
  className?: string;
  /** Indique une extraction en cours (ex. désactiver « Analyser » côté parent). */
  onExtractingChange?: (busy: boolean) => void;
  /** Texte d’aide au-dessus des onglets (ex. modale). */
  formDescription?: ReactNode;
  /** Onglet affiché au montage : `upload` pour les modales création mission, `manual` pour le wizard. */
  initialMode?: 'upload' | 'manual';
};

export function JobDescriptionInput({
  id,
  value,
  onChange,
  placeholder = 'Collez ici la fiche de poste…',
  disabled = false,
  textareaClassName,
  className,
  onExtractingChange,
  formDescription,
  initialMode = 'manual',
}: JobDescriptionInputProps) {
  const [mode, setMode] = useState<'upload' | 'manual'>(() =>
    value.trim() ? 'manual' : initialMode,
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleMarkdownChange = useCallback(
    (md: string) => {
      if (md.length > MAX_JOB_DESCRIPTION_CHARS) {
        onChange(md.slice(0, MAX_JOB_DESCRIPTION_CHARS));
        toast.warning(
          `Texte tronqué à ${MAX_JOB_DESCRIPTION_CHARS.toLocaleString('fr-FR')} caractères (limite fiche de poste).`,
        );
        return;
      }
      onChange(md);
    },
    [onChange],
  );

  const applyExtractedText = useCallback(
    (raw: string) => {
      let next = raw.trim();
      if (next.length > MAX_JOB_DESCRIPTION_CHARS) {
        next = next.slice(0, MAX_JOB_DESCRIPTION_CHARS);
        toast.warning(
          `Texte tronqué à ${MAX_JOB_DESCRIPTION_CHARS.toLocaleString('fr-FR')} caractères (limite fiche de poste).`,
        );
      }
      onChange(next);
      setMode('manual');
    },
    [onChange],
  );

  const extractFile = useCallback(
    async (file: File) => {
      if (disabled || isExtracting) return;
      setIsExtracting(true);
      onExtractingChange?.(true);
      try {
        if (isPlainTextJobFile(file)) {
          const raw = await file.text();
          if (!raw.trim()) {
            throw new Error('Fichier texte vide');
          }
          applyExtractedText(raw);
          toast.success('Fiche importée — vous pouvez la relire ou la modifier ci-dessous.');
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/job-description/extract', {
          method: 'POST',
          body: formData,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'Échec de l’extraction');
        }
        if (typeof payload?.text !== 'string' || !payload.text.trim()) {
          throw new Error('Texte extrait vide');
        }
        applyExtractedText(payload.text);
        toast.success('Fiche importée — vous pouvez la relire ou la modifier ci-dessous.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur lors de l’import');
      } finally {
        setIsExtracting(false);
        onExtractingChange?.(false);
      }
    },
    [applyExtractedText, disabled, isExtracting, onExtractingChange],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void extractFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void extractFile(f);
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {formDescription ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{formDescription}</p>
      ) : null}

      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as 'upload' | 'manual')}
        className="flex flex-col gap-3"
      >
        <TabsList variant="segmented" className="grid w-full grid-cols-2 shrink-0">
          <TabsTrigger value="upload" disabled={disabled} className="gap-1.5">
            <FileUp className="size-3.5 shrink-0 opacity-80" />
            Importer un fichier
          </TabsTrigger>
          <TabsTrigger value="manual" disabled={disabled} className="gap-1.5">
            <PenLine className="size-3.5 shrink-0 opacity-80" />
            Saisie manuelle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-0 flex flex-col gap-2 data-[state=inactive]:hidden">
          {value.trim() ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
              Un texte est déjà présent. Utilisez « Saisie manuelle » pour le consulter ou l’éditer ; un nouvel import le remplacera.
            </div>
          ) : null}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            PDF, Word (.doc, .docx) ou fichier texte (.txt). Après import, le texte s’affiche dans l’onglet « Saisie manuelle ».
          </p>
          <div
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled && !isExtracting) setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            className={cn(
              'relative min-h-[120px] rounded-lg border border-dashed transition-colors sm:min-h-[140px]',
              disabled || isExtracting
                ? 'border-border/40 opacity-60 pointer-events-none'
                : isDragging
                  ? 'border-violet/50 bg-violet/5'
                  : 'border-overlay/20 hover:border-violet/30',
            )}
          >
            <label className="flex h-full min-h-[inherit] cursor-pointer flex-col items-center justify-center gap-2 px-4 py-6">
              <Input
                type="file"
                onChange={onFileChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                accept={ACCEPT}
                disabled={disabled || isExtracting}
                aria-label="Importer une fiche de poste (PDF, Word ou fichier texte)"
              />
              {isExtracting ? (
                <Loader2 className="h-8 w-8 shrink-0 animate-spin text-violet" />
              ) : (
                <Upload className="h-8 w-8 shrink-0 text-muted-foreground" />
              )}
              <span className="text-center text-xs text-muted-foreground">
                {isExtracting
                  ? 'Extraction en cours…'
                  : 'Glisser-déposer ou cliquer pour choisir un fichier'}
              </span>
            </label>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-0 flex flex-col gap-1.5 data-[state=inactive]:hidden">
          {mode === 'manual' ? (
            <MarkdownEditor
              id={id}
              value={value}
              onChange={handleMarkdownChange}
              disabled={disabled || isExtracting}
              placeholder={placeholder}
              className="border-overlay/15 bg-panel/30"
              editorClassName={cn(
                'overflow-y-auto text-sm',
                textareaClassName,
              )}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
