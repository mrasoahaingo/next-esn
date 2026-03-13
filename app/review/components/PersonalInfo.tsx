
import { ExtractedCV } from '@/lib/schema';
import { Input } from '@/components/ui/Input';

interface PersonalInfoProps {
  data: Partial<ExtractedCV['personalInfo']> | undefined;
  onChange: (data: Partial<ExtractedCV['personalInfo']>) => void;
  readOnly?: boolean;
}

export function PersonalInfo({ data, onChange, readOnly }: PersonalInfoProps) {
  const handleChange = (field: keyof ExtractedCV['personalInfo'], value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <section className="glass-panel p-6 rounded-2xl transition-colors">
      <h2 className="text-lg font-semibold mb-4 text-white border-b border-white/10 pb-2">
        Personal Info
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={data?.firstName || ''}
            onChange={(e) => handleChange('firstName', e.target.value)}
            disabled={readOnly}
          />
          <Input
            label="Last Name"
            value={data?.lastName || ''}
            onChange={(e) => handleChange('lastName', e.target.value)}
            disabled={readOnly}
          />
        </div>
        <Input
          label="Title"
          value={data?.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Email"
          value={data?.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Phone"
          value={data?.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Location"
          value={data?.location || ''}
          onChange={(e) => handleChange('location', e.target.value)}
          disabled={readOnly}
        />
      </div>
    </section>
  );
}
