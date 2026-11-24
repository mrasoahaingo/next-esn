import { memo } from 'react';
import { ExtractedCV } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FIELD_LABEL_CLASS, SectionHeading } from './SectionHeading';

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
    <section aria-labelledby="cv-section-identity">
      <SectionHeading id="cv-section-identity" title="Identité" />
      <FieldGroup className="gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="pi-firstName" className={FIELD_LABEL_CLASS}>
              Prénom
            </FieldLabel>
            <Input
              id="pi-firstName"
              value={data?.firstName ?? ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              disabled={readOnly}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pi-lastName" className={FIELD_LABEL_CLASS}>
              Nom
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
          <FieldLabel htmlFor="pi-title" className={FIELD_LABEL_CLASS}>
            Titre
          </FieldLabel>
          <Input
            id="pi-title"
            value={data?.title ?? ''}
            onChange={(e) => handleChange('title', e.target.value)}
            disabled={readOnly}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="pi-email" className={FIELD_LABEL_CLASS}>
              E-mail
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
            <FieldLabel htmlFor="pi-phone" className={FIELD_LABEL_CLASS}>
              Téléphone
            </FieldLabel>
            <Input
              id="pi-phone"
              value={data?.phone ?? ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              disabled={readOnly}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="pi-location" className={FIELD_LABEL_CLASS}>
            Localisation
          </FieldLabel>
          <Input
            id="pi-location"
            value={data?.location ?? ''}
            onChange={(e) => handleChange('location', e.target.value)}
            disabled={readOnly}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="pi-yoe" className={FIELD_LABEL_CLASS}>
              Années d&apos;expérience
            </FieldLabel>
            <Input
              id="pi-yoe"
              value={data?.yearsOfExperience ?? ''}
              onChange={(e) => handleChange('yearsOfExperience', e.target.value)}
              disabled={readOnly}
              placeholder="8 ans"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pi-avail" className={FIELD_LABEL_CLASS}>
              Disponibilité
            </FieldLabel>
            <Input
              id="pi-avail"
              value={data?.availability ?? ''}
              onChange={(e) => handleChange('availability', e.target.value)}
              disabled={readOnly}
              placeholder="Immédiate"
            />
          </Field>
        </div>
      </FieldGroup>
    </section>
  );
});
