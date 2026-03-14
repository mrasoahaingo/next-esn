'use client';

import type { ExtractedCV } from '@/lib/schema';
import { PersonalInfo } from '@/app/review/components/PersonalInfo';
import { Summary } from '@/app/review/components/Summary';
import { Experiences } from '@/app/review/components/Experiences';
import { Education } from '@/app/review/components/Education';
import { Skills } from '@/app/review/components/Skills';
import { Strengths } from '@/app/review/components/Strengths';

interface TailoredCvFormProps {
  data: Partial<ExtractedCV> | null;
  onUpdateField: (field: keyof ExtractedCV, value: unknown) => void;
  readOnly?: boolean;
}

export function TailoredCvForm({ data, onUpdateField, readOnly }: TailoredCvFormProps) {
  if (!data) return null;

  const safeExperiences = (data.experiences ?? []).filter(Boolean);
  const safeEducation = (data.education ?? []).filter(Boolean);
  const safeSkills = (data.skills ?? []).filter(Boolean);
  const safeStrengths = (data.strengths ?? []).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skills
          data={safeSkills}
          onChange={(val) => onUpdateField('skills', val)}
          readOnly={readOnly}
        />
        <Strengths
          data={safeStrengths}
          onChange={(val) => onUpdateField('strengths', val)}
          readOnly={readOnly}
        />
      </div>
      <Experiences
        data={safeExperiences}
        onChange={(val) => onUpdateField('experiences', val)}
        readOnly={readOnly}
      />
      <Education
        data={safeEducation}
        onChange={(val) => onUpdateField('education', val)}
        readOnly={readOnly}
      />
    </div>
  );
}
