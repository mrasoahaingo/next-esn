'use client';

import type { ExtractedCV } from '@/lib/schema';
import { PersonalInfo } from '@/app/review/components/PersonalInfo';
import { Summary } from '@/app/review/components/Summary';
import { Experiences } from '@/app/review/components/Experiences';
import { Education } from '@/app/review/components/Education';
import { Skills } from '@/app/review/components/Skills';

interface TailoredCvFormProps {
  data: Partial<ExtractedCV> | null;
  onUpdateField: (field: keyof ExtractedCV, value: unknown) => void;
  readOnly?: boolean;
}

export function TailoredCvForm({ data, onUpdateField, readOnly }: TailoredCvFormProps) {
  if (!data) return null;

  const safeExperiences = (data.experiences ?? []).filter(Boolean);
  const safeEducation = (data.education ?? []).filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <PersonalInfo
        data={data.personalInfo}
        onChange={(val) => onUpdateField('personalInfo', val)}
        readOnly={readOnly}
      />
      <Summary
        data={data.summary}
        onChange={(val) => onUpdateField('summary', val)}
        readOnly={readOnly}
      />
      <Skills
        data={data.skills}
        onChange={(val) => onUpdateField('skills', val)}
        readOnly={readOnly}
      />
      <Education
        data={safeEducation}
        onChange={(val) => onUpdateField('education', val)}
        readOnly={readOnly}
      />
      <Experiences
        data={safeExperiences}
        onChange={(val) => onUpdateField('experiences', val)}
        readOnly={readOnly}
      />
    </div>
  );
}
