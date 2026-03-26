import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/utils/auth'
import { getSupabase } from '@/lib/utils/supabase'
import type { AiOperation } from '@/lib/services/ai-usage.service'
import type { AdminLlmUsageRow } from '@/lib/types/admin-llm-usage'

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 50

const OPERATIONS: AiOperation[] = ['extraction', 'analysis', 'generation']

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  )
  const offset = Math.max(0, Number.parseInt(searchParams.get('offset') ?? '0', 10) || 0)

  const orgId = searchParams.get('org_id')?.trim() || undefined
  const taskKey = searchParams.get('task_key')?.trim() || undefined
  const operationParam = searchParams.get('operation')?.trim() || undefined
  const from = searchParams.get('from')?.trim() || undefined
  const to = searchParams.get('to')?.trim() || undefined

  if (operationParam && !OPERATIONS.includes(operationParam as AiOperation)) {
    return NextResponse.json({ error: 'operation invalide' }, { status: 400 })
  }

  const supabase = getSupabase()

  let query = supabase
    .from('ai_usage_log')
    .select(
      [
        'id',
        'created_at',
        'operation',
        'task_key',
        'ai_model',
        'duration_ms',
        'input_tokens',
        'output_tokens',
        'total_tokens',
        'candidate_id',
        'positioning_id',
        'mission_id',
        'org_id',
        'workflow_run_id',
        'call_status',
        'branch',
        'input_payload',
        'output_payload',
      ].join(','),
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)

  if (orgId) {
    query = query.eq('org_id', orgId)
  }
  if (taskKey) {
    query = query.eq('task_key', taskKey)
  }
  if (operationParam) {
    query = query.eq('operation', operationParam)
  }
  if (from) {
    query = query.gte('created_at', from)
  }
  if (to) {
    query = query.lte('created_at', to)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('admin llm-usage', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    rows: (data ?? []) as unknown as AdminLlmUsageRow[],
    total: count ?? 0,
    limit,
    offset,
  })
}
