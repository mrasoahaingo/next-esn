
import { memo } from 'react';
import { ExtractedCV } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';

interface PersonalInfoProps {
  data: Partial<ExtractedCV['personalInfo']> | undefined;
  onChange: (data: Partial<ExtractedCV['personalInfo']>) => void;
  readOnly?: boolean;
}

export const PersonalInfo = memo(function PersonalInfo({ data, onChange, readOnly }: PersonalInfoProps) {
  const handleChange = (field: keyof ExtractedCV['personalInfo'], value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <section className="glass-panel p-6 rounded-2xl transition-colors">
      <h2 className="text-lg font-semibold mb-4 text-foreground border-b border-overlay/10 pb-2">
        Personal Info
      </h2>
      <FieldGroup className="gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="pi-firstName" className="text-xs uppercase tracking-wider text-muted-foreground">
              First Name
            </FieldLabel>
            <Input
              id="pi-firstName"
              value={data?.firstName ?? ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              disabled={readOnly}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pi-lastName" className="text-xs uppercase tracking-wider text-muted-foreground">
              Last Name
            </FieldLabel>
            <Input
              id="pi-lastName"
              value={data?.lastName ?? ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              disabled={readOnly}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="pi-title" className="text-xs uppercase tracking-wider text-muted-foreground">
            Title
          </FieldLabel>
          <Input
            id="pi-title"
            value={data?.title ?? ''}
            onChange={(e) => handleChange('title', e.target.value)}
            disabled={readOnly}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="pi-email" className="text-xs uppercase tracking-wider text-muted-foreground">
            Email
          </FieldLabel>
          <Input
            id="pi-email"
            type="email"
            value={data?.email ?? ''}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={readOnly}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="pi-phone" className="text-xs uppercase tracking-wider text-muted-foreground">
            Phone
          </FieldLabel>
          <Input
            id="pi-phone"
            value={data?.phone ?? ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            disabled={readOnly}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="pi-location" className="text-xs uppercase tracking-wider text-muted-foreground">
            Location
          </FieldLabel>
          <Input
            id="pi-location"
            value={data?.location ?? ''}
            onChange={(e) => handleChange('location', e.target.value)}
            disabled={readOnly}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="pi-yoe" className="text-xs uppercase tracking-wider text-muted-foreground">
              Années d&apos;expérience
            </FieldLabel>
            <Input
              id="pi-yoe"
              value={data?.yearsOfExperience ?? ''}
              onChange={(e) => handleChange('yearsOfExperience', e.target.value)}
              disabled={readOnly}
              placeholder="Ex: 8 ans"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pi-avail" className="text-xs uppercase tracking-wider text-muted-foreground">
              Disponibilité
            </FieldLabel>
            <Input
              id="pi-avail"
              value={data?.availability ?? ''}
              onChange={(e) => handleChange('availability', e.target.value)}
              disabled={readOnly}
              placeholder="Ex: Immédiate"
            />
          </Field>
        </div>
      </FieldGroup>
    </section>
  );
});
