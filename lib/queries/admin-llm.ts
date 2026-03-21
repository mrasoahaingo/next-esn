import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from './admin'

export type LlmModelRow = {
  id: string
  gateway_model_id: string
  display_name: string
  input_usd_per_1m: number
  output_usd_per_1m: number
  cache_read_usd_per_1m: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type LlmTaskRow = {
  id: string
  task_key: string
  label: string
  description: string | null
  model_id: string
  system_prompt_template: string
  use_extract_json_middleware: boolean
  llm_models: LlmModelRow | null
}

export function useLlmModels() {
  return useQuery({
    queryKey: [...adminKeys.all, 'llm-models'] as const,
    queryFn: async () => {
      const res = await fetch('/api/admin/llm-models')
      if (!res.ok) throw new Error('Impossible de charger les modèles')
      const data = (await res.json()) as { models: LlmModelRow[] }
      return data.models
    },
  })
}

export function useLlmTasks() {
  return useQuery({
    queryKey: [...adminKeys.all, 'llm-tasks'] as const,
    queryFn: async () => {
      const res = await fetch('/api/admin/llm-tasks')
      if (!res.ok) throw new Error('Impossible de charger les tâches')
      const data = (await res.json()) as { tasks: LlmTaskRow[] }
      return data.tasks
    },
  })
}

export function useOrgLlmOverrides(orgId: string | null) {
  return useQuery({
    queryKey: [...adminKeys.all, 'org-llm-overrides', orgId] as const,
    queryFn: async () => {
      if (!orgId) return []
      const res = await fetch(
        `/api/admin/org-llm-overrides?${new URLSearchParams({ orgId })}`,
      )
      if (!res.ok) throw new Error('Impossible de charger les surcharges')
      const data = (await res.json()) as { overrides: unknown[] }
      return data.overrides
    },
    enabled: !!orgId,
  })
}

export function useCreateLlmModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      gatewayModelId: string
      displayName: string
      inputUsdPer1m: number
      outputUsdPer1m: number
      cacheReadUsdPer1m?: number | null
      notes?: string | null
    }) => {
      const res = await fetch('/api/admin/llm-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(typeof e.error === 'string' ? e.error : 'Erreur')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.stats() })
      qc.invalidateQueries({ queryKey: [...adminKeys.all, 'llm-models'] })
    },
  })
}

export function useUpdateLlmModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string
      gatewayModelId?: string
      displayName?: string
      inputUsdPer1m?: number
      outputUsdPer1m?: number
      cacheReadUsdPer1m?: number | null
      notes?: string | null
    }) => {
      const res = await fetch(`/api/admin/llm-models/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(typeof e.error === 'string' ? e.error : 'Erreur')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.stats() })
      qc.invalidateQueries({ queryKey: [...adminKeys.all, 'llm-models'] })
    },
  })
}

export function useCreateLlmTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      taskKey: string
      label: string
      description?: string | null
      modelId: string
      systemPromptTemplate: string
      useExtractJsonMiddleware: boolean
    }) => {
      const res = await fetch('/api/admin/llm-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(typeof e.error === 'string' ? e.error : 'Erreur')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...adminKeys.all, 'llm-tasks'] })
    },
  })
}

export function useUpdateLlmTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string
      taskKey?: string
      label?: string
      description?: string | null
      modelId?: string
      systemPromptTemplate?: string
      useExtractJsonMiddleware?: boolean
    }) => {
      const res = await fetch(`/api/admin/llm-tasks/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(typeof e.error === 'string' ? e.error : 'Erreur')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...adminKeys.all, 'llm-tasks'] })
    },
  })
}
