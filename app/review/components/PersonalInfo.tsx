import { memo } from 'react';
import { User } from 'lucide-react';
import { ExtractedCV } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { CvSectionPanel, FIELD_LABEL_CLASS, type CvSectionStatus } from './CvSectionPanel';

interface PersonalInfoProps {
  data: Partial<ExtractedCV['personalInfo']> | undefined;
  onChange: (data: Partial<ExtractedCV['personalInfo']>) => void;
  readOnly?: boolean;
  status?: CvSectionStatus;
  /** Dans le panneau « Dossier » à onglets : en-tête en simple ligne, sans contour. */
  embedded?: boolean;
}

type PersonalInfoKey = keyof ExtractedCV['personalInfo'];

const FIELDS: { key: PersonalInfoKey; label: string; type?: string; placeholder?: string; full?: boolean }[] = [
  { key: 'firstName', label: 'Prénom' },
  { key: 'lastName', label: 'Nom' },
  { key: 'title', label: 'Titre', full: true },
  { key: 'email', label: 'E-mail', type: 'email' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'location', label: 'Localisation', full: true },
  { key: 'yearsOfExperience', label: 'Années d’expérience', placeholder: '8 ans' },
  { key: 'availability', label: 'Disponibilité', placeholder: 'Immédiate' },
];

export const PersonalInfo = memo(function PersonalInfo({
  data,
  onChange,
  readOnly,
  status,
  embedded,
}: PersonalInfoProps) {
  const handleChange = (field: PersonalInfoKey, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <CvSectionPanel id="cv-section-identity" title="Identité" icon={User} status={status} embedded={embedded}>
      {/* Deux colonnes ; le titre et la localisation prennent toute la largeur */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <Field key={field.key} className={field.full ? 'sm:col-span-2' : undefined}>
            <FieldLabel htmlFor={`pi-${field.key}`} className={FIELD_LABEL_CLASS}>
              {field.label}
            </FieldLabel>
            <Input
              id={`pi-${field.key}`}
              type={field.type}
              value={data?.[field.key] ?? ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              disabled={readOnly}
              placeholder={field.placeholder}
            />
          </Field>
        ))}
      </div>
    </CvSectionPanel>
  );
});
