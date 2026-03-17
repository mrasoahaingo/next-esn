export const queryKeys = {
  candidates: {
    all: ['candidates'] as const,
    list: () => [...queryKeys.candidates.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.candidates.all, 'detail', id] as const,
  },
  missions: {
    all: ['missions'] as const,
    list: () => [...queryKeys.missions.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.missions.all, 'detail', id] as const,
  },
  positionings: {
    all: ['positionings'] as const,
    list: () => [...queryKeys.positionings.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.positionings.all, 'detail', id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
  templates: {
    all: ['templates'] as const,
    list: () => [...queryKeys.templates.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.templates.all, 'detail', id] as const,
  },
};
