import { useQuery } from '@tanstack/react-query'

export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
}

export interface AdminStats {
  totals: {
    organizations: number
    candidates: number
    positionings: number
    inputTokens: number
    outputTokens: number
  }
  organizations: {
    orgId: string
    candidates: number
    positionings: number
    inputTokens: number
    outputTokens: number
  }[]
  recentCandidates: {
    id: string
    org_id: string
    status: string
    created_at: string
  }[]
  recentPositionings: {
    id: string
    org_id: string
    status: string
    created_at: string
  }[]
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch admin stats')
      return res.json()
    },
  })
}
