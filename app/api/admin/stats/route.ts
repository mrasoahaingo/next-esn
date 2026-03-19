import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/utils/auth'
import { getSupabase } from '@/lib/utils/supabase'

export async function GET() {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const supabase = getSupabase()

  const [
    { data: candidates },
    { data: positionings },
    { data: aiUsage },
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
      .select('id, org_id, model, input_tokens, output_tokens, created_at')
      .order('created_at', { ascending: false }),
  ])

  const orgMap = new Map<
    string,
    { candidates: number; positionings: number; inputTokens: number; outputTokens: number }
  >()

  for (const c of candidates ?? []) {
    if (!c.org_id) continue
    const entry = orgMap.get(c.org_id) ?? { candidates: 0, positionings: 0, inputTokens: 0, outputTokens: 0 }
    entry.candidates++
    orgMap.set(c.org_id, entry)
  }

  for (const p of positionings ?? []) {
    if (!p.org_id) continue
    const entry = orgMap.get(p.org_id) ?? { candidates: 0, positionings: 0, inputTokens: 0, outputTokens: 0 }
    entry.positionings++
    orgMap.set(p.org_id, entry)
  }

  for (const u of aiUsage ?? []) {
    if (!u.org_id) continue
    const entry = orgMap.get(u.org_id) ?? { candidates: 0, positionings: 0, inputTokens: 0, outputTokens: 0 }
    entry.inputTokens += u.input_tokens ?? 0
    entry.outputTokens += u.output_tokens ?? 0
    orgMap.set(u.org_id, entry)
  }

  const organizations = Array.from(orgMap.entries()).map(([orgId, stats]) => ({
    orgId,
    ...stats,
  }))

  return NextResponse.json({
    totals: {
      organizations: orgMap.size,
      candidates: candidates?.length ?? 0,
      positionings: positionings?.length ?? 0,
      inputTokens: (aiUsage ?? []).reduce((s, u) => s + (u.input_tokens ?? 0), 0),
      outputTokens: (aiUsage ?? []).reduce((s, u) => s + (u.output_tokens ?? 0), 0),
    },
    organizations,
    recentCandidates: (candidates ?? []).slice(0, 20),
    recentPositionings: (positionings ?? []).slice(0, 20),
  })
}
