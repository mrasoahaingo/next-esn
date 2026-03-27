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

export type AdminStats = {
  /** Gabarits PDF globaux (table `templates`). */
  globalTemplates: { id: string; name: string; is_default: boolean }[]
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
    /** `organization_settings.default_template_id` */
    defaultTemplateId: string | null
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

export function useSetOrgDefaultTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { orgId: string; templateId: string }) => {
      const res = await fetch('/api/admin/org-templates/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Failed to set default template')
      }
      return res.json() as Promise<{ ok: boolean }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
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
