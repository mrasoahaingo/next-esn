import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireSuperAdmin } from '@/lib/utils/auth'
import { getSupabase } from '@/lib/utils/supabase'
import { estimateUsageCostUsd } from '@/lib/pricing'

export async function GET() {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const supabase = getSupabase()
  const clerk = await clerkClient()

  const [
    { data: candidates },
    { data: positionings },
    { data: aiUsage },
    clerkOrgsResult,
  ] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, org_id, status, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('positionings')
      .select('id, org_id, status, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('ai_usage_log')
      .select('id, org_id, ai_model, input_tokens, output_tokens, cache_read_tokens, created_at')
      .order('created_at', { ascending: false }),
    clerk.organizations.getOrganizationList({ limit: 200 }),
  ])

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
    const cost = estimateUsageCostUsd({
      ai_model: u.ai_model,
      input_tokens: u.input_tokens,
      output_tokens: u.output_tokens,
      cache_read_tokens: u.cache_read_tokens,
    })
    if (cost === null) {
      pricingUnknownModels.add(u.ai_model)
    } else {
      totalEstimatedCostUsd += cost
    }

    if (!u.org_id) continue
    const entry = orgMap.get(u.org_id) ?? {
      name: u.org_id,
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
    orgMap.set(u.org_id, entry)
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
