'use client';

import type { PositioningEmail } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EmailEditorProps {
  email: Partial<PositioningEmail> | null;
  onChange: (email: Partial<PositioningEmail>) => void;
  readOnly?: boolean;
  title?: string;
}

export function EmailEditor({ email, onChange, readOnly, title = 'Email de positionnement' }: EmailEditorProps) {
  return (
    <section className="glass-panel p-6 rounded-2xl">
      <h2 className="text-lg font-semibold mb-4 text-white border-b border-white/10 pb-2">
        {title}
      </h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Objet</Label>
          <Input
            value={email?.subject ?? ''}
            onChange={(e) => onChange({ ...email, subject: e.target.value })}
            disabled={readOnly}
            placeholder="Objet de l'email..."
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Corps</Label>
          <Textarea
            value={email?.body ?? ''}
            onChange={(e) => onChange({ ...email, body: e.target.value })}
            disabled={readOnly}
            className="min-h-[300px] text-sm"
            placeholder="Corps de l'email..."
          />
        </div>
      </div>
    </section>
  );
}
