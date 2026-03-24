import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminLlmUsageRow } from '@/lib/types/admin-llm-usage'

export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  llmUsage: (params: AdminLlmUsageQueryParams) =>
    [...adminKeys.all, 'llm-usage', params] as const,
}

export type AdminLlmUsageQueryParams = {
  limit?: number
  offset?: number
  org_id?: string
  task_key?: string
  operation?: string
  from?: string
  to?: string
}

export type AdminLlmUsageResponse = {
  rows: AdminLlmUsageRow[]
  total: number
  limit: number
  offset: number
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

function buildLlmUsageSearchParams(params: AdminLlmUsageQueryParams): URLSearchParams {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  if (params.org_id) sp.set('org_id', params.org_id)
  if (params.task_key) sp.set('task_key', params.task_key)
  if (params.operation) sp.set('operation', params.operation)
  if (params.from) sp.set('from', params.from)
  if (params.to) sp.set('to', params.to)
  return sp
}

export function useAdminLlmUsage(
  params: AdminLlmUsageQueryParams,
  options?: { enabled?: boolean; refetchInterval?: number | false },
) {
  return useQuery<AdminLlmUsageResponse>({
    queryKey: adminKeys.llmUsage(params),
    queryFn: async () => {
      const sp = buildLlmUsageSearchParams(params)
      const res = await fetch(`/api/admin/llm-usage?${sp}`)
      if (!res.ok) throw new Error('Historique LLM indisponible')
      return res.json()
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? false,
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
