import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/utils/auth'
import { getSupabase } from '@/lib/utils/supabase'
import { estimateUsageCostUsd, type ModelPricingUsd } from '@/lib/pricing'

const AI_USAGE_PAGE = 1000

type AiUsageLogRow = {
  id: string
  /** Absent si la colonne n’existe pas encore en base (migration org_id non appliquée). */
  org_id?: string | null
  ai_model: string
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  candidate_id: string | null
  positioning_id: string | null
  mission_id: string | null
  created_at: string
}

/** PostgREST limite par défaut (~1000 lignes) : sans pagination, totaux et répartition org sont faux. */
async function fetchAllAiUsageLogRows(supabase: SupabaseClient): Promise<AiUsageLogRow[]> {
  const rows: AiUsageLogRow[] = []
  for (let from = 0; ; from += AI_USAGE_PAGE) {
    const { data, error } = await supabase
      .from('ai_usage_log')
      .select(
        // Ne pas inclure org_id : certaines bases n’ont pas encore la migration ; l’org est déduite via les FK.
        'id, ai_model, input_tokens, output_tokens, cache_read_tokens, candidate_id, positioning_id, mission_id, created_at',
      )
      .order('created_at', { ascending: false })
      .range(from, from + AI_USAGE_PAGE - 1)

    if (error) {
      console.error('admin stats ai_usage_log', error)
      throw error
    }
    if (!data?.length) break
    rows.push(...(data as AiUsageLogRow[]))
    if (data.length < AI_USAGE_PAGE) break
  }
  return rows
}

export async function GET() {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const supabase = getSupabase()
  const clerk = await clerkClient()

  const [{ data: candidates }, { data: positionings }, { data: llmModels }, clerkOrgsResult, aiUsage] =
    await Promise.all([
      supabase
        .from('candidates')
        .select('id, org_id, status, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('positionings')
        .select('id, org_id, status, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('llm_models')
        .select('gateway_model_id, input_usd_per_1m, output_usd_per_1m, cache_read_usd_per_1m'),
      clerk.organizations.getOrganizationList({ limit: 200 }),
      fetchAllAiUsageLogRows(supabase),
    ])

  const dbPricingByGateway = new Map<string, ModelPricingUsd>()
  for (const m of llmModels ?? []) {
    dbPricingByGateway.set(m.gateway_model_id, {
      inputUsdPer1M: Number(m.input_usd_per_1m),
      outputUsdPer1M: Number(m.output_usd_per_1m),
      cacheReadUsdPer1M:
        m.cache_read_usd_per_1m != null ? Number(m.cache_read_usd_per_1m) : undefined,
    })
  }

  // Lignes historiques ou sans org_id : retrouver l’org via les FK liées au flux.
  const candidateIdsForOrg = new Set<string>()
  const positioningIdsForOrg = new Set<string>()
  const missionIdsForOrg = new Set<string>()
  for (const u of aiUsage ?? []) {
    if (u.org_id) continue
    if (u.candidate_id) candidateIdsForOrg.add(u.candidate_id)
    if (u.positioning_id) positioningIdsForOrg.add(u.positioning_id)
    if (u.mission_id) missionIdsForOrg.add(u.mission_id)
  }

  const [candidatesOrgRows, positioningsOrgRows, missionsOrgRows] = await Promise.all([
    candidateIdsForOrg.size > 0
      ? supabase
          .from('candidates')
          .select('id, org_id')
          .in('id', [...candidateIdsForOrg])
      : Promise.resolve({ data: [] as { id: string; org_id: string | null }[] }),
    positioningIdsForOrg.size > 0
      ? supabase
          .from('positionings')
          .select('id, org_id')
          .in('id', [...positioningIdsForOrg])
      : Promise.resolve({ data: [] as { id: string; org_id: string | null }[] }),
    missionIdsForOrg.size > 0
      ? supabase.from('missions').select('id, org_id').in('id', [...missionIdsForOrg])
      : Promise.resolve({ data: [] as { id: string; org_id: string | null }[] }),
  ])

  const orgIdByCandidateId = new Map<string, string>()
  for (const r of candidatesOrgRows.data ?? []) {
    if (r.org_id) orgIdByCandidateId.set(r.id, r.org_id)
  }
  const orgIdByPositioningId = new Map<string, string>()
  for (const r of positioningsOrgRows.data ?? []) {
    if (r.org_id) orgIdByPositioningId.set(r.id, r.org_id)
  }
  const orgIdByMissionId = new Map<string, string>()
  for (const r of missionsOrgRows.data ?? []) {
    if (r.org_id) orgIdByMissionId.set(r.id, r.org_id)
  }

  function resolveUsageOrgId(u: {
    org_id?: string | null
    candidate_id: string | null
    positioning_id: string | null
    mission_id: string | null
  }): string | null {
    if (u.org_id) return u.org_id
    if (u.candidate_id) {
      const o = orgIdByCandidateId.get(u.candidate_id)
      if (o) return o
    }
    if (u.positioning_id) {
      const o = orgIdByPositioningId.get(u.positioning_id)
      if (o) return o
    }
    if (u.mission_id) {
      const o = orgIdByMissionId.get(u.mission_id)
      if (o) return o
    }
    return null
  }

  // Initialiser la map avec toutes les orgs Clerk (y compris celles sans données)
  const orgMap = new Map<
    string,
    {
      name: string
      slug: string | null
      candidates: number
      positionings: number
      inputTokens: number
      outputTokens: number
      estimatedCostUsd: number
    }
  >()

  for (const org of clerkOrgsResult.data) {
    orgMap.set(org.id, {
      name: org.name,
      slug: org.slug ?? null,
      candidates: 0,
      positionings: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    })
  }

  for (const c of candidates ?? []) {
    if (!c.org_id) continue
    const entry = orgMap.get(c.org_id) ?? {
      name: c.org_id,
      slug: null,
      candidates: 0,
      positionings: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    }
    entry.candidates++
    orgMap.set(c.org_id, entry)
  }

  for (const p of positionings ?? []) {
    if (!p.org_id) continue
    const entry = orgMap.get(p.org_id) ?? {
      name: p.org_id,
      slug: null,
      candidates: 0,
      positionings: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    }
    entry.positionings++
    orgMap.set(p.org_id, entry)
  }

  const pricingUnknownModels = new Set<string>()
  let totalEstimatedCostUsd = 0

  for (const u of aiUsage ?? []) {
    const cost = estimateUsageCostUsd(
      {
        ai_model: u.ai_model,
        input_tokens: u.input_tokens,
        output_tokens: u.output_tokens,
        cache_read_tokens: u.cache_read_tokens,
      },
      dbPricingByGateway,
    )
    if (cost === null) {
      pricingUnknownModels.add(u.ai_model)
    } else {
      totalEstimatedCostUsd += cost
    }

    const usageOrgId = resolveUsageOrgId(u)
    if (!usageOrgId) continue
    const entry = orgMap.get(usageOrgId) ?? {
      name: usageOrgId,
      slug: null,
      candidates: 0,
      positionings: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    }
    entry.inputTokens += u.input_tokens ?? 0
    entry.outputTokens += u.output_tokens ?? 0
    if (cost != null) entry.estimatedCostUsd += cost
    orgMap.set(usageOrgId, entry)
  }

  const orgIdList = Array.from(orgMap.keys())
  const { data: orgSettingsRows } =
    orgIdList.length > 0
      ? await supabase
          .from('organization_settings')
          .select('org_id, cv_code_template')
          .in('org_id', orgIdList)
      : { data: [] as { org_id: string; cv_code_template: string }[] }

  const cvTemplateByOrg = new Map(
    (orgSettingsRows ?? []).map((r) => [r.org_id, r.cv_code_template ?? 'himeo']),
  )

  const organizations = Array.from(orgMap.entries()).map(([orgId, stats]) => ({
    orgId,
    ...stats,
    cvCodeTemplate: cvTemplateByOrg.get(orgId) ?? 'himeo',
  }))

  return NextResponse.json({
    totals: {
      organizations: orgMap.size,
      candidates: candidates?.length ?? 0,
      positionings: positionings?.length ?? 0,
      inputTokens: (aiUsage ?? []).reduce((s, u) => s + (u.input_tokens ?? 0), 0),
      outputTokens: (aiUsage ?? []).reduce((s, u) => s + (u.output_tokens ?? 0), 0),
      estimatedCostUsd: totalEstimatedCostUsd,
      pricingUnknownModels: Array.from(pricingUnknownModels),
    },
    organizations,
    recentCandidates: (candidates ?? []).slice(0, 20),
    recentPositionings: (positionings ?? []).slice(0, 20),
  })
}
