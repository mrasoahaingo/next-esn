'use client';

import { useId, useState, type DragEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = '.pdf,.docx,.doc';

export type CvDropzoneProps = {
  onFile: (file: File) => void;
  isUploading: boolean;
  /**
   * `button` : l'action de l'en-tête de page, un bouton qui accepte aussi le
   * glisser-déposer. `panel` : le panneau d'invitation du premier lancement.
   */
  variant?: 'button' | 'panel';
  /** Phrase complémentaire du panneau (mode démo, par exemple). */
  note?: string;
  className?: string;
};

/**
 * Zone de dépôt d'un CV. L'`input type="file"` reste dans le DOM (focus clavier,
 * lecteurs d'écran) ; le `label` est la surface visible et la cible du
 * glisser-déposer.
 */
export function CvDropzone({
  onFile,
  isUploading,
  variant = 'button',
  note,
  className,
}: CvDropzoneProps): React.JSX.Element {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const dragHandlers = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      if (!isUploading) setIsDragging(true);
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && !isUploading) onFile(file);
    },
  };

  const input = (
    <input
      id={inputId}
      type="file"
      accept={ACCEPTED_TYPES}
      className="sr-only"
      disabled={isUploading}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onFile(file);
        e.target.value = '';
      }}
    />
  );

  const label = (
    <label
      htmlFor={inputId}
      aria-busy={isUploading || undefined}
      className={cn(
        buttonVariants({ variant: 'default', size: 'lg' }),
        'cursor-pointer hover:bg-primary/90 active:translate-y-px transition-[background-color,box-shadow] duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
        'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
        'max-md:h-11 max-md:px-4',
        isDragging && 'ring-3 ring-ring/50',
        isUploading && 'pointer-events-none opacity-50',
        variant === 'button' && className,
      )}
      {...(variant === 'button' ? dragHandlers : {})}
    >
      {input}
      {isUploading ? (
        <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <Upload aria-hidden="true" />
      )}
      {isUploading ? 'Import en cours…' : 'Importer un CV'}
    </label>
  );

  if (variant === 'button') return label;

  return (
    <Empty
      className={cn(
        'items-start rounded-xl border border-dashed border-border bg-panel p-6 text-left shadow-sm md:p-10 dark:shadow-none',
        'transition-[border-color,background-color] duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
        isDragging && 'border-primary bg-primary/5',
        className,
      )}
      {...dragHandlers}
    >
      <EmptyHeader className="max-w-md items-start text-left">
        <EmptyTitle className="text-lg font-semibold tracking-[-0.01em]">Importez votre premier CV.</EmptyTitle>
        <EmptyDescription>
          Déposez un fichier PDF ou Word ici. L&rsquo;extraction démarre aussitôt et vous ouvre la fiche du
          candidat.
          {note ? ` ${note}` : null}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="items-start text-left">{label}</EmptyContent>
    </Empty>
  );
}
