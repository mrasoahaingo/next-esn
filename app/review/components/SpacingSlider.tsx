import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FIELD_LABEL_CLASS } from './CvSectionPanel';

/**
 * Curseur de marge sous une section ou une ligne du PDF (en points). Une ligne :
 * le libellé avec la valeur en mono à gauche, le curseur à droite. Vit dans un
 * `PanelFooter` (section) ou en bas d'un dépliant (expérience, formation).
 */
export function SpacingSlider({
  id,
  value,
  onChange,
  className,
}: {
  id: string;
  value: number | undefined;
  onChange: (value: number) => void;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex w-full items-center justify-between gap-4', className)}>
      <Label htmlFor={id} className={cn(FIELD_LABEL_CLASS, 'shrink-0')}>
        Marge en dessous ·{' '}
        <span className="font-mono tabular-nums text-foreground">{value ?? 0}&nbsp;pt</span>
      </Label>
      <div className="w-40 shrink-0 sm:w-56">
        <Slider
          id={id}
          min={0}
          max={100}
          step={2}
          value={[value ?? 0]}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        />
      </div>
    </div>
  );
}
