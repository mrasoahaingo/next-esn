export const queryKeys = {
  candidates: {
    all: (orgId: string) => ['candidates', orgId] as const,
    list: (orgId: string) => [...queryKeys.candidates.all(orgId), 'list'] as const,
    detail: (orgId: string, id: string) => [...queryKeys.candidates.all(orgId), 'detail', id] as const,
  },
  missions: {
    all: (orgId: string) => ['missions', orgId] as const,
    list: (orgId: string) => [...queryKeys.missions.all(orgId), 'list'] as const,
    detail: (orgId: string, id: string) => [...queryKeys.missions.all(orgId), 'detail', id] as const,
  },
  positionings: {
    all: (orgId: string) => ['positionings', orgId] as const,
    list: (orgId: string) => [...queryKeys.positionings.all(orgId), 'list'] as const,
    detail: (orgId: string, id: string) => [...queryKeys.positionings.all(orgId), 'detail', id] as const,
    analysisHistory: (orgId: string, id: string) =>
      [...queryKeys.positionings.all(orgId), 'analysisHistory', id] as const,
  },
  dashboard: {
    all: (orgId: string) => ['dashboard', orgId] as const,
  },
  recruiterSkills: {
    all: (orgId: string) => ['recruiterSkills', orgId] as const,
  },
  orgRecruiterSkills: {
    all: (orgId: string) => ['orgRecruiterSkills', orgId] as const,
  },
  templates: {
    all: (orgId: string) => ['templates', orgId] as const,
    list: (orgId: string) => [...queryKeys.templates.all(orgId), 'list'] as const,
    detail: (orgId: string, id: string) => [...queryKeys.templates.all(orgId), 'detail', id] as const,
  },
  team: {
    all: (orgId: string) => ['team', orgId] as const,
    members: (orgId: string) => [...queryKeys.team.all(orgId), 'members'] as const,
    invitations: (orgId: string) => [...queryKeys.team.all(orgId), 'invitations'] as const,
  },
  org: {
    settings: (orgId: string) => ['org', 'settings', orgId] as const,
  },
};
