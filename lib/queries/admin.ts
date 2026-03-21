import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
    /** Estimation USD (barème `lib/pricing.ts`), hors modèles non référencés */
    estimatedCostUsd: number
    /** `ai_model` présents en base mais absents du barème — coût ignoré pour ces lignes */
    pricingUnknownModels: string[]
  }
  organizations: {
    orgId: string
    name: string
    slug: string | null
    candidates: number
    positionings: number
    inputTokens: number
    outputTokens: number
    estimatedCostUsd: number
    cvCodeTemplate: string
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

export function useUpdateOrgCvCodeTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      orgId,
      cvCodeTemplate,
    }: {
      orgId: string
      cvCodeTemplate: string
    }) => {
      const res = await fetch(
        `/api/admin/organizations/${encodeURIComponent(orgId)}/cv-code-template`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvCodeTemplate }),
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg =
          typeof err.error === 'string'
            ? err.error
            : JSON.stringify(err.error ?? err)
        throw new Error(msg || 'Mise à jour impossible')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
  })
}
