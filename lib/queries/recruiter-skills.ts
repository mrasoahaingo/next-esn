import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { queryKeys } from './keys';

export type RecruiterSkillItem = {
  skill_key: string;
  understood_at: string;
};

export type RecruiterSkillsResponse = {
  skills: RecruiterSkillItem[];
};

export function useRecruiterSkills() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: queryKeys.recruiterSkills.all(orgId ?? ''),
    queryFn: async (): Promise<RecruiterSkillsResponse> => {
      const res = await fetch('/api/recruiter/skill-understood');
      if (!res.ok) throw new Error('Failed to fetch recruiter skills');
      return res.json();
    },
    enabled: !!orgId,
  });
}

export type OrgSkillAggregate = { skill_key: string; member_count: number };
export type OrgUserAggregate = { user_id: string; skill_count: number };

export type OrgRecruiterSkillsResponse = {
  bySkill: OrgSkillAggregate[];
  byUser: OrgUserAggregate[];
};

export function useOrgRecruiterSkills(enabled: boolean) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: queryKeys.orgRecruiterSkills.all(orgId ?? ''),
    queryFn: async (): Promise<OrgRecruiterSkillsResponse> => {
      const res = await fetch('/api/org/recruiter-skills');
      if (!res.ok) throw new Error('Failed to fetch org recruiter skills');
      return res.json();
    },
    enabled: enabled && !!orgId,
  });
}
